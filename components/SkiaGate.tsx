import { Component, type ReactNode } from 'react';

import { useSkiaReady } from '@/lib/skia';

interface SkiaGateProps {
  /** Shown until Skia can draw, and if a canvas ever fails to draw. */
  fallback: ReactNode;
  children: ReactNode;
}

/**
 * Guards every Skia canvas in the app. On web the CanvasKit (WASM) backend is
 * fetched at runtime, so children must not render — and must not build paths —
 * until it is ready. Pass the canvas as a child *component*; its body then only
 * runs once drawing is possible.
 */
export function SkiaGate({ fallback, children }: SkiaGateProps) {
  const ready = useSkiaReady();
  if (!ready) return fallback;
  return <CanvasErrorBoundary fallback={fallback}>{children}</CanvasErrorBoundary>;
}

/**
 * Last line of defence: a canvas that throws swaps to the placeholder instead of
 * tearing down the screen it lives on.
 */
class CanvasErrorBoundary extends Component<SkiaGateProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.warn('[skia] canvas failed to draw', error);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
