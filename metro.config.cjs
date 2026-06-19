/** @type {import('expo/metro-config').MetroConfig} */
const { getDefaultConfig } = require('expo/metro-config');
const { withUniwindConfig } = require('uniwind/metro');

const cleanHostHeader = (headerValue) => {
  if (!headerValue) return undefined;
  const value = Array.isArray(headerValue) ? headerValue[0] : String(headerValue);
  // Extract first value if comma-separated (common in proxy scenarios)
  return value.split(',')[0].trim();
};

const config = getDefaultConfig(__dirname);

// Configure resolver for proper asset handling and module resolution
config.resolver = {
  ...config.resolver,
  // Asset extensions - file types Metro should treat as assets
  assetExts: [
    // Start with default asset extensions from Expo
    ...config.resolver.assetExts,
    // Additional asset types (avoid duplicates using Set below)
    // Fonts
    'ttf',
    'otf',
    'woff',
    'woff2',
    // Images
    'png',
    'jpg',
    'jpeg',
    'gif',
    'webp',
    'svg',
    'ico',
    // Audio/Video
    'mp3',
    'wav',
    'mp4',
    'webm',
    'm4a',
    'aac',
    // Documents
    'pdf',
  ].filter((ext, index, arr) => arr.indexOf(ext) === index), // Remove duplicates
  // Source extensions - prioritize platform-specific and module files
  sourceExts: [...config.resolver.sourceExts, 'mjs', 'cjs'].filter(
    (ext, index, arr) => arr.indexOf(ext) === index,
  ), // Remove duplicates
};

// Configure transformer for proper asset processing
config.transformer = {
  ...config.transformer,
  // Enable asset plugins for proper asset handling
  assetPlugins: config.transformer?.assetPlugins || [],
  // Ensure inline requires are disabled for proper asset loading
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: false,
    },
  }),
};

// Configure watcher to properly handle asset changes
config.watchFolders = config.watchFolders || [];

// Add server configuration to handle proxy/forwarded headers
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    // This middleware runs BEFORE Metro's default middleware
    // We need to modify the request so Metro can construct valid URLs
    return (req, res, next) => {
      // Metro constructs URLs using req.headers.host at Server._processRequest
      // When behind a proxy, the Host header is the proxy's host, not the client's
      // We need to replace it with the original client host so Metro can construct valid URLs

      // CRITICAL: Clean all host-related headers FIRST to prevent Metro from seeing comma-separated values
      // Metro's Server._processRequest constructs URLs and will fail if it sees comma-separated hosts

      // Clean all host headers immediately
      if (req.headers.host) {
        req.headers.host = cleanHostHeader(req.headers.host) || req.headers.host;
      }
      if (req.headers['x-forwarded-host']) {
        req.headers['x-forwarded-host'] =
          cleanHostHeader(req.headers['x-forwarded-host']) || req.headers['x-forwarded-host'];
      }
      if (req.headers['x-original-host']) {
        req.headers['x-original-host'] =
          cleanHostHeader(req.headers['x-original-host']) || req.headers['x-original-host'];
      }

      // Priority: X-Original-Host > X-Forwarded-Host > current host
      let hostToUse = cleanHostHeader(req.headers.host);
      let protocol = 'http';

      // Get protocol from forwarded headers
      if (req.headers['x-forwarded-proto']) {
        const proto = Array.isArray(req.headers['x-forwarded-proto'])
          ? req.headers['x-forwarded-proto'][0]
          : req.headers['x-forwarded-proto'];
        protocol = String(proto).split(',')[0].trim();
      } else if (req.secure || req.headers['x-forwarded-ssl'] === 'on') {
        protocol = 'https';
      }

      if (req.headers['x-original-host']) {
        hostToUse = cleanHostHeader(req.headers['x-original-host']);
      } else if (req.headers['x-forwarded-host']) {
        hostToUse = cleanHostHeader(req.headers['x-forwarded-host']);
        // Include port if X-Forwarded-Port is set
        if (req.headers['x-forwarded-port']) {
          const port = Array.isArray(req.headers['x-forwarded-port'])
            ? req.headers['x-forwarded-port'][0]
            : req.headers['x-forwarded-port'];
          hostToUse = `${hostToUse}:${String(port).split(',')[0].trim()}`;
        }
      }

      // CRITICAL: Set these BEFORE any URL construction happens
      // Override the host header so Metro uses it for URL construction
      // IMPORTANT: Ensure the Host header is a single string value, not an array
      // The error shows Metro is getting both hosts, so we need to be very explicit
      if (hostToUse) {
        // Get current host, handling arrays and comma-separated values
        let currentHost = req.headers.host;
        if (Array.isArray(currentHost)) {
          currentHost = currentHost[0];
        }
        // Check if currentHost is a comma-separated string (which would cause the error)
        if (typeof currentHost === 'string' && currentHost.includes(',')) {
          console.error(
            `[METRO] ERROR: Host header contains comma-separated values: ${currentHost}`,
          );
          console.error(`[METRO] This is causing Metro to construct invalid URLs!`);
          // Take the first value before the comma
          currentHost = currentHost.split(',')[0].trim();
        }
        // CRITICAL: Explicitly set as a single clean string value
        // Remove any commas or multiple values
        const cleanHost = String(hostToUse).split(',')[0].trim();
        req.headers.host = cleanHost;

        // Double-check it's not an array after setting
        if (Array.isArray(req.headers.host)) {
          req.headers.host = req.headers.host[0];
        }
      }

      if (Array.isArray(req.headers.host)) {
        console.error(
          `[METRO] ERROR: Host header is an array! This will cause URL construction to fail.`,
        );
      }

      // Check for any other headers that might confuse Metro
      // Metro might be reading from X-Target-Host or other custom headers
      // The error shows Metro is getting both hosts, so we need to be very careful
      if (req.headers['x-target-host']) {
        delete req.headers['x-target-host'];
      }

      // Metro might be reading from multiple host-related headers and combining them
      // Let's ensure only the Host header has a value, and remove/clear others that might confuse Metro
      // Keep X-Forwarded-Host and X-Original-Host for reference, but ensure Host is the single source of truth

      // Final sanity check: ensure Host header is definitely a single clean string
      if (req.headers.host) {
        const finalHost = String(req.headers.host).split(',')[0].trim();
        if (finalHost !== req.headers.host) {
          console.error(
            `[METRO] CRITICAL: Host header had comma-separated values, cleaned to: ${finalHost}`,
          );
          req.headers.host = finalHost;
        }
      }

      // Ensure no other host-related headers have multiple values
      const hostRelatedHeaders = ['host', 'x-forwarded-host', 'x-original-host'];
      hostRelatedHeaders.forEach((headerName) => {
        if (req.headers[headerName] && Array.isArray(req.headers[headerName])) {
          console.error(`[METRO] WARNING: ${headerName} is an array, taking first value`);
          req.headers[headerName] = req.headers[headerName][0];
        }
      });

      // Set protocol on the request object
      // Metro might check req.protocol or construct URLs using the protocol
      req.protocol = protocol;

      // Also set secure flag if HTTPS
      if (protocol === 'https') {
        req.secure = true;
      }

      // Validate and normalize the host format before Metro uses it
      // Some host formats might cause URL construction to fail
      try {
        // Test if the host format is valid for URL construction
        const testBaseUrl = `${protocol}://${hostToUse}`;
        void new URL('/', testBaseUrl); // Test with just root path
      } catch (hostError) {
        console.error(`[METRO] Host format is INVALID for URL construction!`);
        console.error(`[METRO]   Host: ${hostToUse}`);
        console.error(`[METRO]   Protocol: ${protocol}`);
        console.error(`[METRO]   Error: ${hostError.message}`);

        // Try to fix the host - maybe remove port or use a different format
        // For now, fall back to original host if our override is invalid
        console.error(`[METRO] Falling back to original host: ${req.headers.host}`);
        hostToUse = req.headers.host;
        req.headers.host = hostToUse;
      }

      // Now try to validate the full URL Metro will construct
      try {
        const baseUrl = `${protocol}://${hostToUse}`;
        void new URL(req.url || '/', baseUrl);
      } catch (urlError) {
        console.error(`[METRO] Full URL construction will FAIL!`);
        console.error(`[METRO]   Base URL: ${protocol}://${hostToUse}`);
        console.error(`[METRO]   Request URL: ${req.url}`);
        console.error(`[METRO]   Error: ${urlError.message}`);

        // If req.url is malformed, try to fix it
        if (req.url && !req.url.startsWith('/')) {
          console.error(`[METRO]   Fixing req.url: ${req.url} -> /${req.url}`);
          req.url = '/' + req.url;
        }
      }

      // Wrap the next() call to catch any errors Metro might throw
      const originalNext = next;
      const wrappedNext = (err) => {
        if (err) {
          console.error(`[METRO] Error in middleware chain:`, err);
        }
        return originalNext(err);
      };

      // Wrap middleware call to catch URL construction errors
      try {
        return middleware(req, res, wrappedNext);
      } catch (error) {
        console.error(`[METRO] Error calling Metro middleware:`);
        console.error(`[METRO]   Error: ${error.message}`);
        console.error(`[METRO]   Host: ${req.headers.host}`);
        console.error(`[METRO]   Protocol: ${req.protocol}`);
        console.error(`[METRO]   URL: ${req.url}`);
        throw error; // Re-throw so Metro can handle it
      }
    };
  },
};

// Stub out react-native-maps when running in Expo Go (no native module available)
// In dev builds with EXPO_PLATFORM=native, the real module is used.
if (process.env.EXPO_PLATFORM !== 'native') {
  config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (moduleName === 'react-native-maps') {
      return {
        type: 'empty',
      };
    }
    return context.resolveRequest(context, moduleName, platform);
  };
}

module.exports = withUniwindConfig(config, {
  cssEntryFile: './global.css',
  dtsFile: './uniwind-types.d.ts',
});
