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

LUM_LO = 0.02
LUM_HI = 0.25
JPEG_QUALITY = 92
DEFAULT_SHADOW_GAIN = 52.0


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


def bake_albedo(rgb: np.ndarray, shadow_gain: float = DEFAULT_SHADOW_GAIN) -> np.ndarray:
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


def stats(arr: np.ndarray) -> dict[str, float]:
    luma = 0.2126 * arr[..., 0] + 0.7152 * arr[..., 1] + 0.0722 * arr[..., 2]
    return {
        "mean_r": float(arr[..., 0].mean()),
        "mean_g": float(arr[..., 1].mean()),
        "mean_b": float(arr[..., 2].mean()),
        "median_luma": float(np.median(luma)),
        "p95_luma": float(np.percentile(luma, 95)),
    }


def main():
    import argparse

    parser = argparse.ArgumentParser(description="Bake display albedo for nokki-preview PBR")
    parser.add_argument(
        "--shadow-gain",
        type=float,
        default=DEFAULT_SHADOW_GAIN,
        help="Dark-coat lift multiplier (e.g. 48–56)",
    )
    args = parser.parse_args()
    gain = args.shadow_gain

    root = Path(__file__).resolve().parents[1]
    models = root / "models"
    for name in ("nokki", "nokkane"):
        glb = models / f"{name}.glb"
        if not glb.is_file():
            print("skip", glb, file=sys.stderr)
            continue
        src = extract_basecolor_image(glb)
        arr = np.array(src)
        baked = bake_albedo(arr, shadow_gain=gain)
        out_path = models / f"{name}-albedo.jpg"
        Image.fromarray(baked, "RGB").save(out_path, "JPEG", quality=JPEG_QUALITY)
        st = stats(baked)
        print(
            f"{name}: gain={gain} -> {out_path.name} "
            f"mean RGB [{st['mean_r']:.1f}, {st['mean_g']:.1f}, {st['mean_b']:.1f}] "
            f"median_luma={st['median_luma']:.1f} p95_luma={st['p95_luma']:.1f}"
        )


if __name__ == "__main__":
    main()
