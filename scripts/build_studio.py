"""Build the photo-studio layers: shaved scalp, hair mask, beard mask.

The try-on keeps the frontal photo and only replaces hair pixels. Run from the
repo root:

    python3 scripts/build_studio.py
"""

import json
import os

import cv2
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC = os.path.join(ROOT, "public")
TEXTURE = os.path.join(PUBLIC, "texture.jpg")

# Landmarks measured on public/texture.jpg (1200×1599).
CX = 658.0
CY, RX, RY = 605.0, 305.0, 280.0
PX_PER_CM = 600 / 14.2


def hair_mask(img):
    h, w = img.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w]
    r = img[:, :, 0].astype(np.int16)
    g = img[:, :, 1].astype(np.int16)
    b = img[:, :, 2].astype(np.int16)
    lum = 0.25 * r + 0.45 * g + 0.30 * b
    dark = ((lum < 62) & ~((r > g + 16) & (r > b + 10))) | (
        (lum < 85) & (np.abs(r - g) < 16) & (np.abs(g - b) < 16) & (r < 100)
    )
    region = (yy < 880) & (yy > 300) & (xx > 200) & (xx < 1080)
    raw = (dark & region).astype(np.uint8)
    flood = raw.copy()
    cv2.floodFill(flood, np.zeros((h + 2, w + 2), np.uint8), (640, 430), 2)
    mask = (flood == 2).astype(np.uint8)
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
    count, labels, stats, _ = cv2.connectedComponentsWithStats(mask, 8)
    if count > 1:
        keep = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
        mask = (labels == keep).astype(np.uint8)
    return mask, lum


def hairline_from(mask):
    h, w = mask.shape
    line = np.full(w, 640.0, np.float32)
    for x in range(w):
        col = np.where(mask[:, x] > 0)[0]
        if len(col):
            line[x] = min(float(col.max()), 760.0)
    return cv2.GaussianBlur(line.reshape(1, -1), (0, 0), 12).ravel()


def build_bald(img, mask, lum):
    h, w = img.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    nx = (xx - CX) / RX
    ny = (yy - CY) / RY
    rad = np.sqrt(nx * nx + ny * ny)

    y_ref = 692
    row = img[y_ref].astype(np.float32)
    rr, gg, bb = row[:, 0], row[:, 1], row[:, 2]
    row_l = 0.25 * rr + 0.45 * gg + 0.30 * bb
    good = (rr - gg > 28) & (row_l > 130) & (np.arange(w) > 440) & (np.arange(w) < 860)
    good_x = np.arange(w)[good]
    albedo_row = np.stack(
        [
            np.interp(np.arange(w), good_x, rr[good]),
            np.interp(np.arange(w), good_x, gg[good]),
            np.interp(np.arange(w), good_x, bb[good]),
        ],
        axis=1,
    ).astype(np.float32)
    albedo_row = cv2.GaussianBlur(albedo_row.reshape(1, -1, 3), (0, 0), 16).reshape(w, 3)

    nz = np.sqrt(np.clip(1 - np.minimum(rad, 1.0) ** 2, 0, 1))
    lx, ly, lz = 0.04, -0.22, 1.0
    length = (lx * lx + ly * ly + lz * lz) ** 0.5
    lx, ly, lz = lx / length, ly / length, lz / length
    shade = 0.72 + 0.38 * np.clip(nx * lx + ny * ly + nz * lz, 0, 1)
    shade_ref = np.clip(shade[y_ref], 0.75, 1.2)
    albedo = albedo_row / shade_ref[:, None]

    rng = np.random.default_rng(4)
    scalp = np.clip(
        albedo[np.clip(xx.astype(int), 0, w - 1)] * shade[:, :, None] + rng.normal(0, 1.5, (h, w, 1)),
        0,
        255,
    )

    blend_hi, blend_lo = 676.0, 724.0
    zone = (rad <= 1.02) & (yy < blend_lo) & (yy > CY - RY - 6)
    bald = img.astype(np.float32).copy()
    alpha_y = np.clip((blend_lo - yy) / (blend_lo - blend_hi), 0, 1)
    alpha_edge = np.clip((1.05 - rad) / 0.075, 0, 1)
    alpha = cv2.GaussianBlur((alpha_y * alpha_edge * zone).astype(np.float32), (0, 0), 0.9)
    bald = bald * (1 - alpha[:, :, None]) + scalp * alpha[:, :, None]

    wall_sel = (lum > 155) & (rad > 1.25) & (mask == 0) & (yy < 800) & (yy > 40)
    ys, xs = np.where(wall_sel)
    step = max(1, len(xs) // 5000)
    design = np.stack([np.ones(len(xs[::step])), xs[::step] / w, ys[::step] / h], 1)
    coef = np.stack(
        [
            np.linalg.lstsq(design, img[ys[::step], xs[::step], channel].astype(np.float64), rcond=None)[0]
            for channel in range(3)
        ]
    )
    wall = np.stack([coef[c, 0] + coef[c, 1] * xx / w + coef[c, 2] * yy / h for c in range(3)], -1)
    wall = np.clip(wall + rng.normal(0, 1.4, wall.shape), 0, 255)
    puff = (mask > 0) & (rad > 1.01) & (yy < 760) & (yy > 310)
    puff_alpha = cv2.GaussianBlur(
        np.clip(cv2.distanceTransform(puff.astype(np.uint8), cv2.DIST_L2, 3) / 6.0, 0, 1),
        (0, 0),
        0.8,
    )
    bald = bald * (1 - puff_alpha[:, :, None]) + wall * puff_alpha[:, :, None]

    side = (mask > 0) & (yy >= 710) & (yy < 860) & ((xx < CX - 170) | (xx > CX + 185))
    shifted_x = np.clip((xx + np.where(xx < CX, 62, -62)).astype(int), 0, w - 1)
    pulled = bald[np.clip(yy.astype(int), 0, h - 1), shifted_x]
    side_alpha = cv2.GaussianBlur(
        np.clip(cv2.distanceTransform(side.astype(np.uint8), cv2.DIST_L2, 3) / 8.0, 0, 1),
        (0, 0),
        1.0,
    )
    bald = bald * (1 - side_alpha[:, :, None]) + np.clip(pulled * 0.96, 0, 255) * side_alpha[:, :, None]
    return np.clip(bald, 0, 255).astype(np.uint8)


def beard_layers(img, lum):
    """Mask of the beard in the photo, and a shaved version of those pixels.

    Inpainting fails here because the beard is a wide dark region, so the fill
    is painted from cheek skin and the local shading of the face.
    """
    h, w = img.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w]
    r = img[:, :, 0].astype(np.int16)
    g = img[:, :, 1].astype(np.int16)
    b = img[:, :, 2].astype(np.int16)
    jaw = ((xx - CX) / 255.0) ** 2 + ((yy - 1260.0) / 240.0) ** 2 <= 1.0
    region = jaw & (yy > 1055) & (yy < 1485) & (xx > 400) & (xx < 930)
    lip = (r > g + 50) & (r > b + 35) & (yy > 1125) & (yy < 1225)
    beard = region & (lum < 118) & (r - g < 50) & ~lip
    mask = beard.astype(np.uint8)
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
    # Drop blobs that closed over bright skin.
    mask = (mask > 0) & (lum < 135)
    mask = mask.astype(np.uint8)

    light = cv2.GaussianBlur(lum.astype(np.float32), (0, 0), 14)
    # Cheek samples sit above the beard, one on each side.
    left = img[1005:1035, 470:530].astype(np.float32).mean(axis=(0, 1))
    right = img[1005:1035, 800:860].astype(np.float32).mean(axis=(0, 1))
    tx = np.clip((xx - 470) / (830 - 470), 0, 1)[:, :, None]
    skin = left * (1 - tx) + right * tx
    light_ref = float(np.median(light[1005:1035, 470:860]))
    shade = np.clip(light / max(light_ref, 1), 0.7, 1.12)[:, :, None]
    rng = np.random.default_rng(11)
    painted = np.clip(skin * shade + rng.normal(0, 2.2, img.shape), 0, 255)
    feather = cv2.GaussianBlur(mask.astype(np.float32), (0, 0), 1.3)
    shaved = np.clip(
        img.astype(np.float32) * (1 - feather[:, :, None]) + painted * feather[:, :, None],
        0,
        255,
    ).astype(np.uint8)
    return (feather > 0.2).astype(np.uint8), shaved


def main():
    img = np.array(Image.open(TEXTURE).convert("RGB"))
    mask, lum = hair_mask(img)
    line = hairline_from(mask)
    bald = build_bald(img, mask, lum)
    beard, shaved = beard_layers(img, lum)

    Image.fromarray(bald).save(os.path.join(PUBLIC, "bald.jpg"), quality=92, subsampling=1)
    Image.fromarray(shaved).save(os.path.join(PUBLIC, "shaved.jpg"), quality=92, subsampling=1)
    cv2.imwrite(os.path.join(PUBLIC, "hair-mask.png"), mask * 255)
    cv2.imwrite(os.path.join(PUBLIC, "beard-mask.png"), beard * 255)

    crown = bald[390:640, 520:800]
    crown_l = 0.25 * crown[:, :, 0] + 0.45 * crown[:, :, 1] + 0.30 * crown[:, :, 2]
    face_delta = int(np.abs(bald[900:1100, 560:760].astype(int) - img[900:1100, 560:760].astype(int)).sum())
    print(
        f"mask {int(mask.sum())} beard {int(beard.sum())} "
        f"crownL {crown_l.mean():.1f} dark {(crown_l < 80).mean():.4f} faceΔ {face_delta}"
    )
    meta = {
        "width": int(img.shape[1]),
        "height": int(img.shape[0]),
        "cx": CX,
        "cy": CY,
        "rx": RX,
        "ry": RY,
        "pxPerCm": PX_PER_CM,
        "noseY": 1015,
        "lipY": 1168,
        "chinY": 1408,
        "hairline": [round(float(v), 1) for v in line],
        "refs": [
            {"src": "refs/frente.jpg", "label": "Frente"},
            {"src": "refs/frente-2.jpg", "label": "Frente 2"},
            {"src": "refs/tres-cuartos.jpg", "label": "Tres cuartos"},
            {"src": "refs/perfil.jpg", "label": "Perfil"},
            {"src": "refs/perfil-2.jpg", "label": "Perfil 2"},
            {"src": "refs/nacimiento.jpg", "label": "Nacimiento"},
            {"src": "refs/coronilla.jpg", "label": "Coronilla"},
        ],
    }
    with open(os.path.join(PUBLIC, "studio.json"), "w", encoding="utf-8") as handle:
        json.dump(meta, handle, separators=(",", ":"))
    print("wrote bald.jpg, shaved.jpg, masks, studio.json")


if __name__ == "__main__":
    main()
