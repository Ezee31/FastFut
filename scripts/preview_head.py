"""Flat-shaded previews of public/head.json, to check the shape without a GPU.

    python3 scripts/preview_head.py /tmp/head
"""

import json
import os
import sys

import numpy as np
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def rotation(yaw, pitch):
    cy, sy = np.cos(yaw), np.sin(yaw)
    cp, sp = np.cos(pitch), np.sin(pitch)
    ry = np.array([[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]])
    rp = np.array([[1, 0, 0], [0, cp, -sp], [0, sp, cp]])
    return rp @ ry


def render(pos, tris, yaw, pitch, size=520, label="", ao=None):
    rot = rotation(np.radians(yaw), np.radians(pitch))
    p = pos @ rot.T
    center = (p.min(0) + p.max(0)) / 2
    scale = size * 0.80 / max(p.max(0)[0] - p.min(0)[0], p.max(0)[1] - p.min(0)[1])
    sx = (p[:, 0] - center[0]) * scale + size / 2
    sy = size / 2 - (p[:, 1] - center[1]) * scale
    depth = p[:, 2]

    a, b, c = pos[tris[:, 0]], pos[tris[:, 1]], pos[tris[:, 2]]
    normals = np.cross(b - a, c - a)
    lengths = np.linalg.norm(normals, axis=1, keepdims=True)
    normals = normals / np.maximum(lengths, 1e-9)
    normals = normals @ rot.T
    light = np.array([0.25, 0.55, 0.80])
    light = light / np.linalg.norm(light)
    shade = np.clip(normals @ light, 0, 1) * 0.78 + 0.22
    order = np.argsort((depth[tris[:, 0]] + depth[tris[:, 1]] + depth[tris[:, 2]]) / 3)

    img = Image.new("RGB", (size, size), (16, 15, 14))
    draw = ImageDraw.Draw(img)
    for t in order:
        if normals[t, 2] <= 0:
            continue
        tri = tris[t]
        tone = shade[t]
        if ao is not None:
            tone *= float(ao[tri].mean())
        color = (int(212 * tone), int(168 * tone), int(150 * tone))
        draw.polygon(
            [(sx[tri[0]], sy[tri[0]]), (sx[tri[1]], sy[tri[1]]), (sx[tri[2]], sy[tri[2]])],
            fill=color,
        )
    if label:
        draw.text((10, 10), label, fill=(240, 220, 190))
    return img


def main():
    out_dir = sys.argv[1] if len(sys.argv) > 1 else "/tmp/head"
    os.makedirs(out_dir, exist_ok=True)
    with open(os.path.join(ROOT, "public", "head.json"), encoding="utf-8") as handle:
        head = json.load(handle)
    pos = np.array(head["positions"], dtype=np.float64)
    tris = np.array(head["indices"], dtype=np.int64).reshape(-1, 3)
    ao = np.array(head["ao"], dtype=np.float64) if "ao" in head else None
    views = [("frente", 0, 0), ("tres-cuartos", 38, 6), ("perfil", 90, 0), ("nuca", 180, 0), ("arriba", 0, 70)]
    tiles = []
    for name, yaw, pitch in views:
        img = render(pos, tris, yaw, pitch, label=name, ao=ao)
        img.save(os.path.join(out_dir, f"head-{name}.png"))
        tiles.append(np.array(img))
    sheet = np.concatenate(tiles, axis=1)
    Image.fromarray(sheet).save(os.path.join(out_dir, "head-sheet.png"))
    print(f"vertices {len(pos)} tris {len(tris)} -> {out_dir}/head-sheet.png")


if __name__ == "__main__":
    main()
