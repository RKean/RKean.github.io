#!/usr/bin/env python3
"""Bake display albedo from TRELLIS GLB baseColor for mobile PBR readability."""
from __future__ import annotations

import io
import struct
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from pygltflib import GLTF2

SHADOW_GAIN = 22.0
LUM_LO = 0.02
LUM_HI = 0.25
JPEG_QUALITY = 92


def srgb_to_linear(c: np.ndarray) -> np.ndarray:
    c = np.clip(c, 0.0, 1.0)
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def linear_to_srgb(c: np.ndarray) -> np.ndarray:
    c = np.clip(c, 0.0, 1.0)
    return np.where(c <= 0.0031308, c * 12.92, 1.055 * (c ** (1.0 / 2.4)) - 0.055)


def read_buffer(gltf: GLTF2, buffer_view_index: int) -> bytes:
    bv = gltf.bufferViews[buffer_view_index]
    blob = gltf.binary_blob()
    if blob is None:
        raise RuntimeError("GLB has no binary blob")
    start = bv.byteOffset or 0
    return blob[start : start + bv.byteLength]


def extract_basecolor_image(gltf_path: Path) -> Image.Image:
    gltf = GLTF2().load(str(gltf_path))
    if not gltf.images:
        raise RuntimeError(f"No images in {gltf_path}")
    img = gltf.images[0]
    data = read_buffer(gltf, img.bufferView)
    return Image.open(io.BytesIO(data)).convert("RGB")


def bake_albedo(rgb: np.ndarray, shadow_gain: float = SHADOW_GAIN) -> np.ndarray:
    """Per-channel sRGB bake: dark coat lifted, bright muzzle/eyes preserved."""
    srgb = rgb.astype(np.float64) / 255.0
    luma = (
        0.2126 * srgb[..., 0] + 0.7152 * srgb[..., 1] + 0.0722 * srgb[..., 2]
    )
    t = np.clip((luma - LUM_LO) / max(LUM_HI - LUM_LO, 1e-6), 0.0, 1.0)
    # smoothstep
    t = t * t * (3.0 - 2.0 * t)
    lifted = np.clip(srgb * shadow_gain, 0.0, 1.0)
    out = lifted * (1.0 - t[..., np.newaxis]) + srgb * t[..., np.newaxis]
    return (np.clip(out, 0.0, 1.0) * 255.0 + 0.5).astype(np.uint8)


def main():
    root = Path(__file__).resolve().parents[1]
    models = root / "models"
    for name in ("nokki", "nokkane"):
        glb = models / f"{name}.glb"
        if not glb.is_file():
            print("skip", glb, file=sys.stderr)
            continue
        src = extract_basecolor_image(glb)
        arr = np.array(src)
        baked = bake_albedo(arr)
        out_path = models / f"{name}-albedo.jpg"
        Image.fromarray(baked, "RGB").save(
            out_path, "JPEG", quality=JPEG_QUALITY, optimize=True, subsampling=0
        )
        mean = baked.mean(axis=(0, 1))
        print(f"{name}: {src.size[0]}x{src.size[1]} -> {out_path.name} mean RGB {mean}")


if __name__ == "__main__":
    main()
