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
 * very same object every Skia internal already holds a reference to. Components
 * wait on `useSkiaReady()` before drawing.
 */

type CanvasKitInitFn = (opts: { locateFile: (file: string) => string }) => Promise<CanvasKitApi>;
type SkiaApiFactory = (canvasKit: CanvasKitApi) => typeof Skia;

/**
 * Pulled in with `require` so TypeScript never compiles the package's own
 * sources, while Metro still returns the very module instance the rest of the
 * app uses — the package's `react-native` entry resolves to `src`, so the API
 * built here shares its classes with Skia's renderer.
 */
function skiaApiFactory(): SkiaApiFactory {
  const mod: unknown = require('@shopify/react-native-skia/src/skia/web');
  return (mod as { JsiSkApi: SkiaApiFactory }).JsiSkApi;
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

async function initFrom(base: string): Promise<boolean> {
  await loadScript(`${base}canvaskit.js`);
  const init = globals.CanvasKitInit;
  if (!init) return false;

  const canvasKit = await init({ locateFile: (file) => `${base}${file}` });
  // Skia's web views read the bare `CanvasKit` global at draw time.
  globals.CanvasKit = canvasKit;
  Object.assign(Skia, skiaApiFactory()(canvasKit));
  return true;
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

async function load(): Promise<boolean> {
  if (globals.CanvasKit) return true;
  try {
    if (await servesCanvasKit(LOCAL_BASE)) {
      if (await initFrom(LOCAL_BASE)) return true;
    }
  } catch {
    // Local copy unusable — fall back to the public CDN below.
  }
  try {
    return await initFrom(CDN_BASE);
  } catch {
    return false;
  }
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
