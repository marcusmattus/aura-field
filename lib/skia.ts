/**
 * Native builds link Skia directly, so a canvas can render on the first frame.
 * The web implementation lives in `skia.web.ts`, where CanvasKit (WASM) has to
 * be fetched before any Skia drawing can happen.
 */
export function useSkiaReady(): boolean {
  return true;
}

export function loadSkiaWeb(): Promise<boolean> {
  return Promise.resolve(true);
}
