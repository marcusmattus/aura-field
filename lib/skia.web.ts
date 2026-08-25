import { Skia } from '@shopify/react-native-skia';
import type { CanvasKit as CanvasKitApi } from 'canvaskit-wasm';
import { useEffect, useState } from 'react';

/**
 * Skia on web runs on CanvasKit, a WebAssembly build that has to be fetched at
 * runtime. `@shopify/react-native-skia` builds its API object the moment it is
 * imported — `JsiSkApi(global.CanvasKit)` — and Metro evaluates our screens long
 * before any WASM could arrive, so that object starts out backed by nothing and
 * every call (`Skia.Path.Make()`, `<Canvas>`) throws.
 *
 * We therefore load CanvasKit ourselves and copy a freshly built API onto the
 * very same object every Skia internal already holds a reference to. The copy is
 * smoke-tested before anything is allowed to draw, and `components/SkiaGate`
 * keeps a canvas that still fails from taking a screen down.
 */

type CanvasKitInitFn = (opts: { locateFile: (file: string) => string }) => Promise<CanvasKitApi>;
type SkiaApi = typeof Skia;
type SkiaApiFactory = (canvasKit: CanvasKitApi) => SkiaApi;

/**
 * Metro resolves this package through `module`/`browser` on web and through
 * `react-native` on native, so the API the app actually holds can come from
 * either build output. Both candidates are collected and the one whose classes
 * match the live `Skia` object is preferred, which keeps objects we create
 * interchangeable with the ones Skia's own renderer creates.
 */
function candidateFactories(): SkiaApiFactory[] {
  const found: SkiaApiFactory[] = [];
  const collect = (loadModule: () => unknown) => {
    try {
      const mod = loadModule();
      if (
        typeof mod === 'object' &&
        mod !== null &&
        'JsiSkApi' in mod &&
        typeof mod.JsiSkApi === 'function'
      ) {
        // Type guards confirm `mod.JsiSkApi` is a function; the untyped `@shopify/react-native-skia`
        // build output gives no further signature info, so matching it to `SkiaApiFactory` needs an
        // assertion. `patchSkia` calls it inside a try/catch and discards the result if it throws.
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- see comment above.
        found.push(mod.JsiSkApi as SkiaApiFactory);
      }
    } catch {
      // Build output missing from this install — try the next one.
    }
  };
  // Deliberately probing both Metro build outputs for JsiSkApi: require() (not a static import) is
  // required so a missing build output throws here instead of failing module resolution at bundle time.
  // oxlint-disable-next-line import/no-unassigned-import -- see comment above.
  collect(() => require('@shopify/react-native-skia/lib/module/skia/web'));
  // oxlint-disable-next-line import/no-unassigned-import -- see comment above.
  collect(() => require('@shopify/react-native-skia/src/skia/web'));
  return found;
}

/** Identity of the class behind `api.Path`, used to match build outputs. */
function pathFactoryClass(api: SkiaApi): unknown {
  const path: unknown = api.Path;
  return typeof path === 'object' && path !== null ? path.constructor : undefined;
}

interface CanvasKitGlobals {
  CanvasKit?: CanvasKitApi;
  CanvasKitInit?: CanvasKitInitFn;
}

const globals = globalThis as typeof globalThis & CanvasKitGlobals;

/** Served by the dev server from the installed package — see metro.config.cjs. */
const LOCAL_BASE = '/';
/** Matches the `canvaskit-wasm` version pinned by @shopify/react-native-skia. */
const CDN_BASE = 'https://cdn.jsdelivr.net/npm/canvaskit-wasm@0.40.0/bin/full/';

let ready = false;
let loadPromise: Promise<boolean> | undefined;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[data-canvaskit="${src}"]`);
    if (existing) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.dataset.canvaskit = src;
    script.addEventListener('load', () => resolve(), { once: true });
    script.addEventListener('error', () => reject(new Error(`Could not load ${src}`)), {
      once: true,
    });
    document.head.appendChild(script);
  });
}

/**
 * The dev server answers unknown paths with the app shell, so confirm the local
 * route really serves the script before handing it to a `<script>` tag.
 */
async function servesCanvasKit(base: string): Promise<boolean> {
  try {
    const response = await fetch(`${base}canvaskit.js`, { method: 'HEAD' });
    return response.ok && (response.headers.get('content-type') ?? '').includes('javascript');
  } catch {
    return false;
  }
}

async function initFrom(base: string): Promise<CanvasKitApi | undefined> {
  await loadScript(`${base}canvaskit.js`);
  const init = globals.CanvasKitInit;
  if (!init) return undefined;
  return await init({ locateFile: (file) => `${base}${file}` });
}

/** Fetches the WASM backend, local dev-server copy first, public CDN second. */
async function resolveCanvasKit(): Promise<CanvasKitApi | undefined> {
  if (globals.CanvasKit) return globals.CanvasKit;

  if (await servesCanvasKit(LOCAL_BASE)) {
    try {
      const local = await initFrom(LOCAL_BASE);
      if (local) return local;
    } catch {
      // Local copy unusable — fall back to the public CDN.
    }
  }
  try {
    return await initFrom(CDN_BASE);
  } catch {
    return undefined;
  }
}

/**
 * Rebuilds the Skia API against a live CanvasKit and proves it can draw. Returns
 * false when no build output produces a working API, so callers keep rendering
 * placeholders instead of crashing on the first `Skia.*` call.
 */
function patchSkia(canvasKit: CanvasKitApi): boolean {
  const liveClass = pathFactoryClass(Skia);
  const built: SkiaApi[] = [];
  for (const factory of candidateFactories()) {
    try {
      built.push(factory(canvasKit));
    } catch {
      // Factory unusable with this CanvasKit build — try the next one.
    }
  }
  // Same-build output first, then anything that works.
  const ordered = [
    ...built.filter((api) => pathFactoryClass(api) === liveClass),
    ...built.filter((api) => pathFactoryClass(api) !== liveClass),
  ];

  for (const api of ordered) {
    try {
      Object.assign(Skia, api);
      // Smoke test: this is the exact call that used to throw.
      const probe: unknown = Skia.Path.Make();
      if (
        typeof probe === 'object' &&
        probe !== null &&
        'dispose' in probe &&
        typeof probe.dispose === 'function'
      ) {
        probe.dispose();
      }
      return true;
    } catch {
      // Leave the object patched by the next candidate instead.
    }
  }
  console.warn('[skia] CanvasKit loaded but no Skia build output could draw — canvases disabled.');
  return false;
}

async function load(): Promise<boolean> {
  const canvasKit = await resolveCanvasKit();
  if (!canvasKit) {
    console.warn('[skia] CanvasKit could not be loaded — canvases render as empty space.');
    return false;
  }
  // Skia's web views read the bare `CanvasKit` global at draw time.
  globals.CanvasKit = canvasKit;
  return patchSkia(canvasKit);
}

/** Loads CanvasKit once per session. Resolves false when it is unavailable. */
export function loadSkiaWeb(): Promise<boolean> {
  loadPromise ??= load().then((ok) => {
    ready = ok;
    return ok;
  });
  return loadPromise;
}

/** True once Skia can draw. Renders as false on the first web paint. */
export function useSkiaReady(): boolean {
  const [isReady, setIsReady] = useState(ready);

  useEffect(() => {
    if (ready) {
      setIsReady(true);
      return undefined;
    }
    let active = true;
    void loadSkiaWeb().then((ok) => {
      if (active && ok) setIsReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  return isReady;
}

// Start on module evaluation rather than from a mount effect: after a hot reload
// the tree is not remounted, and the backend should be on its way before the
// first canvas asks for it.
if (typeof document !== 'undefined') void loadSkiaWeb();
