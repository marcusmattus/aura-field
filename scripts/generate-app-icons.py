#!/usr/bin/env python3
"""Generate App Store / store-ready icon assets from the source artwork.

The source artwork (assets/source-icon.png) is an icon mockup: a rounded
navy tile floating on a black frame. Apple and Google apply their own corner
mask, so shipping the baked-in rounded corners + black frame produces an ugly
double-rounded border. This script derives full-bleed, compliant assets:

  - icon.png          1024x1024 RGB (no alpha)  -> iOS / App Store marketing icon
  - adaptive-icon.png 1024x1024 RGB             -> Android adaptive foreground (safe zone)
  - splash-icon.png   1024x1024 RGB             -> splash screen logo
  - favicon.png       48x48     RGB             -> web favicon

Run: python3 scripts/generate-app-icons.py
"""

from __future__ import annotations

import pathlib

import numpy as np
from PIL import Image

ASSETS = pathlib.Path(__file__).resolve().parent.parent / "assets"
SOURCE = ASSETS / "source-icon.png"
BG = (5, 6, 10)  # #05060A — matches Android adaptiveIcon backgroundColor


def load_full_bleed() -> Image.Image:
    """Crop the navy tile out of the black frame and extend its background to
    every edge so the result is a clean, full-bleed square (no baked corners)."""
    im = Image.open(SOURCE).convert("RGB")
    arr = np.asarray(im).astype(int)
    lum = 0.2126 * arr[..., 0] + 0.7152 * arr[..., 1] + 0.0722 * arr[..., 2]
    mask = lum > 10  # non-black = the tile

    ys, xs = np.where(mask)
    x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    tile = arr[y0 : y1 + 1, x0 : x1 + 1].copy()
    m = mask[y0 : y1 + 1, x0 : x1 + 1]
    h, w, _ = tile.shape

    # Horizontally extend each row's navy edge into the black rounded corners.
    row_has = m.any(axis=1)
    for y in range(h):
        cols = np.where(m[y])[0]
        if len(cols) == 0:
            continue
        l, r = cols[0], cols[-1]
        tile[y, :l] = tile[y, l]
        tile[y, r + 1 :] = tile[y, r]

    # Fully-black rows (above/below the arcs) copy from the nearest filled row.
    good = np.where(row_has)[0]
    for y in range(h):
        if not row_has[y]:
            nearest = good[np.argmin(np.abs(good - y))]
            tile[y] = tile[nearest]

    # Pad to a square by replicating the edge pixels, then it is full-bleed.
    side = max(h, w)
    pad_t = (side - h) // 2
    pad_b = side - h - pad_t
    pad_l = (side - w) // 2
    pad_r = side - w - pad_l
    tile = np.pad(tile, ((pad_t, pad_b), (pad_l, pad_r), (0, 0)), mode="edge")

    return Image.fromarray(tile.astype("uint8"), "RGB").resize((1024, 1024), Image.LANCZOS)


def edge_inset(full: Image.Image, scale: float) -> Image.Image:
    """Inset the subject to `scale` while keeping the navy background full-bleed
    by replicating the outermost pixels — no visible seam under the mask."""
    size = int(1024 * scale)
    small = np.asarray(full.resize((size, size), Image.LANCZOS))
    pad_a = (1024 - size) // 2
    pad_b = 1024 - size - pad_a
    padded = np.pad(small, ((pad_a, pad_b), (pad_a, pad_b), (0, 0)), mode="edge")
    return Image.fromarray(padded.astype("uint8"), "RGB")


def logo_on_bg(full: Image.Image, scale: float) -> Image.Image:
    """Center the artwork as a logo on a solid background (for the splash)."""
    canvas = Image.new("RGB", (1024, 1024), BG)
    size = int(1024 * scale)
    canvas.paste(full.resize((size, size), Image.LANCZOS), ((1024 - size) // 2, (1024 - size) // 2))
    return canvas


def main() -> None:
    full = load_full_bleed()

    full.save(ASSETS / "icon.png")  # iOS + App Store, full-bleed, opaque
    edge_inset(full, 0.88).save(ASSETS / "adaptive-icon.png")  # Android safe zone
    logo_on_bg(full, 0.62).save(ASSETS / "splash-icon.png")  # splash logo
    full.resize((48, 48), Image.LANCZOS).save(ASSETS / "favicon.png")  # web

    for name in ("icon.png", "adaptive-icon.png", "splash-icon.png", "favicon.png"):
        with Image.open(ASSETS / name) as out:
            print(f"{name:20} {out.size} {out.mode}")


if __name__ == "__main__":
    main()
