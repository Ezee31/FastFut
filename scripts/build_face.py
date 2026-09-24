#!/usr/bin/env python3
"""Build a textured head from the frontal photo and MediaPipe face landmarks.

Writes public/face.json, public/texture.jpg and reference thumbnails.
"""

from __future__ import annotations

import json
import math
import os
import re
import urllib.request

import numpy as np
from PIL import Image, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.environ.get(
    "FACE_ASSETS",
    "/home/ubuntu/.cursor/projects/workspace/assets",
)
FRONT_NAME = "01a0d4a3-c51a-78fe-b4d1-fc57fbf0773f.jpg"
MODEL_PATH = os.environ.get("FACE_LANDMARKER", "/tmp/mp/face_landmarker.task")
MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/"
    "face_landmarker/face_landmarker/float16/1/face_landmarker.task"
)
FACES_JS = os.environ.get("FACE_TRIS", "/tmp/mp/geometry.js")
FACES_URL = (
    "https://raw.githubusercontent.com/spite/FaceMeshFaceGeometry/"
    "master/js/geometry.js"
)

# Closed face-oval loop, viewer's left ear over the forehead to viewer's right ear,
# then the jaw path back (see build()).
UPPER = [
    234, 127, 162, 21, 54, 103, 67, 109, 10, 338, 297, 332, 284, 251, 389, 356, 454
]
LOWER = [
    234, 93, 132, 58, 172, 136, 150, 149, 176, 148, 152, 377, 400, 378, 379, 365,
    397, 288, 361, 323, 454,
]


def ensure_files() -> None:
    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    if not os.path.exists(MODEL_PATH):
        urllib.request.urlretrieve(MODEL_URL, MODEL_PATH)
    if not os.path.exists(FACES_JS):
        urllib.request.urlretrieve(FACES_URL, FACES_JS)


def load_triangles() -> np.ndarray:
    text = open(FACES_JS, encoding="utf-8").read()
    nums = [int(n) for n in re.findall(r"\d+", text.split("FACES")[1].split("]")[0])]
    tris = np.array(nums, dtype=np.int32).reshape(-1, 3)
    if tris.max() > 467:
        raise SystemExit("unexpected triangle index")
    return tris


def detect(image: Image.Image):
    import mediapipe as mp
    from mediapipe.tasks.python.core.base_options import BaseOptions
    from mediapipe.tasks.python.vision import FaceLandmarker, FaceLandmarkerOptions
    from mediapipe.tasks.python.vision.core.vision_task_running_mode import (
        VisionTaskRunningMode,
    )

    opts = FaceLandmarkerOptions(
        base_options=BaseOptions(model_asset_path=MODEL_PATH),
        running_mode=VisionTaskRunningMode.IMAGE,
        num_faces=1,
        min_face_detection_confidence=0.5,
        min_face_presence_confidence=0.5,
        min_tracking_confidence=0.5,
    )
    landmarker = FaceLandmarker.create_from_options(opts)
    arr = np.array(image)
    res = landmarker.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=arr))
    if not res.face_landmarks:
        raise SystemExit("no face detected on the frontal photo")
    return res.face_landmarks[0]


def norm(v: np.ndarray) -> np.ndarray:
    n = np.linalg.norm(v)
    if n < 1e-8:
        return v * 0
    return v / n


def load_front() -> tuple[Image.Image, list]:
    path = os.path.join(ASSETS, FRONT_NAME)
    im = ImageOps.exif_transpose(Image.open(path).convert("RGB"))
    # Keep enough resolution for the face texture without a huge download.
    w, h = im.size
    scale = min(1.0, 1600 / max(w, h))
    if scale < 1:
        im = im.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)
    lm = detect(im)
    return im, lm


def landmarks_to_points(lm, width: int, height: int) -> np.ndarray:
    pts = np.zeros((468, 3), dtype=np.float64)
    for i in range(468):
        p = lm[i]
        pts[i, 0] = p.x * width
        pts[i, 1] = -p.y * height
        # MediaPipe z is smaller when closer to the camera, scaled like x.
        pts[i, 2] = -p.z * width
    return pts


def orient(pts: np.ndarray) -> tuple[np.ndarray, dict]:
    """Move the head to a Y-up, Z-toward-camera frame centered between the ears."""
    left_ear = pts[234]
    right_ear = pts[454]
    forehead = pts[10]
    chin = pts[152]
    nose = pts[1]

    right = norm(right_ear - left_ear)
    up = norm(forehead - chin)
    up = norm(up - right * np.dot(up, right))
    forward = norm(np.cross(right, up))
    up = norm(np.cross(forward, right))

    nose_depth = np.dot(nose - (left_ear + right_ear) * 0.5, forward)
    if nose_depth < 0:
        forward = -forward
        right = -right

    origin = (left_ear + right_ear) * 0.5
    # Slightly soften selfie depth so the nose does not spike out of the skull.
    depth_scale = 0.82
    out = np.zeros_like(pts)
    for i in range(len(pts)):
        d = pts[i] - origin
        out[i, 0] = np.dot(d, right)
        out[i, 1] = np.dot(d, up)
        out[i, 2] = np.dot(d, forward) * depth_scale

    # Center the orbit on the middle of the head, a little behind the face plane.
    face_h = float(out[10, 1] - out[152, 1])
    face_w = float(np.linalg.norm(out[454, :2] - out[234, :2]) or (out[454, 0] - out[234, 0]))
    pivot = np.array([0.0, out[10, 1] - face_h * 0.42, -face_w * 0.12])
    out -= pivot

    frame = {
        "faceHeight": face_h,
        "faceWidth": abs(float(out[454, 0] - out[234, 0])),
        "chinY": float(out[152, 1]),
        "foreheadY": float(out[10, 1]),
        "earY": float((out[234, 1] + out[454, 1]) * 0.5),
        "halfWidth": abs(float(out[454, 0])),
        "unitsPerCm": abs(float(out[454, 0] - out[234, 0])) / 14.2,
    }
    return out, frame


def quad_bezier(a, b, c, t: float) -> np.ndarray:
    u = 1.0 - t
    return u * u * a + 2 * u * t * b + t * t * c


def sample_median(arr: np.ndarray, x: int, y: int, rad: int = 6) -> np.ndarray:
    h, w = arr.shape[:2]
    x0, x1 = max(0, x - rad), min(w, x + rad)
    y0, y1 = max(0, y - rad), min(h, y + rad)
    patch = arr[y0:y1, x0:x1].reshape(-1, 3).astype(np.float64)
    if len(patch) == 0:
        return np.array([180, 140, 120], dtype=np.float64)
    return np.median(patch, axis=0)


def photo_colors(arr: np.ndarray, lm) -> dict:
    h, w = arr.shape[:2]

    def px(i):
        return int(lm[i].x * w), int(lm[i].y * h)

    cheeks = []
    for i in (117, 346, 205, 425, 50):
        cheeks.append(sample_median(arr, *px(i), 8))
    skin = np.median(np.stack(cheeks), axis=0)

    fx, fy = px(10)
    hair_patch = arr[max(0, fy - 140) : max(1, fy - 36), max(0, fx - 50) : min(w, fx + 50)]
    if hair_patch.size:
        flat = hair_patch.reshape(-1, 3).astype(np.float64)
        lum = flat.mean(axis=1)
        dark = flat[lum <= np.percentile(lum, 18)]
        hair = np.median(dark if len(dark) else flat, axis=0)
        hair *= 0.72
    else:
        hair = np.array([22, 16, 13], dtype=np.float64)

    return {
        "skin": (skin / 255.0).tolist(),
        "hair": (hair / 255.0).tolist(),
    }


def cm_to(frame, x, y, z) -> np.ndarray:
    u = frame["unitsPerCm"]
    return np.array([x, y, z], dtype=np.float64) * u


def resample_polyline(points, count: int) -> list[np.ndarray]:
    pts = [np.array(p, dtype=np.float64) for p in points]
    if count <= 1:
        return [pts[0]]
    lengths = [0.0]
    for a, b in zip(pts, pts[1:]):
        lengths.append(lengths[-1] + float(np.linalg.norm(b - a)))
    total = lengths[-1] or 1.0
    out = []
    seg = 0
    for i in range(count):
        target = total * (i / (count - 1))
        while seg < len(pts) - 2 and lengths[seg + 1] < target:
            seg += 1
        span = lengths[seg + 1] - lengths[seg]
        local = 0.0 if span < 1e-8 else (target - lengths[seg]) / span
        out.append(pts[seg] * (1 - local) + pts[seg + 1] * local)
    out[0] = pts[0]
    out[-1] = pts[-1]
    return out


def blend_keys(frame, start: np.ndarray, lateral: float, sign: float) -> list[np.ndarray]:
    """Round skull path. lateral 0 is the crown midline, 1 is the ear."""
    lat = float(np.clip(lateral, 0.0, 1.0))
    center = [
        cm_to(frame, 0.0, 11.4, 6.5),
        cm_to(frame, 0.0, 14.4, 4.4),
        cm_to(frame, 0.0, 13.6, 1.0),
        cm_to(frame, 0.0, 10.6, -4.4),
        cm_to(frame, 0.0, 6.8, -9.4),
        cm_to(frame, 0.0, 3.2, -9.6),
        cm_to(frame, 0.0, 0.2, -8.2),
    ]
    side = [
        cm_to(frame, 6.7, 1.3, 0.2),
        cm_to(frame, 6.6, 2.3, -2.2),
        cm_to(frame, 6.3, 2.5, -4.4),
        cm_to(frame, 5.5, 2.0, -7.4),
        cm_to(frame, 4.3, 1.2, -8.8),
        cm_to(frame, 3.2, 0.2, -8.4),
        cm_to(frame, 2.5, -0.6, -7.6),
    ]
    keys = [start]
    for c, s in zip(center, side):
        point = c * (1 - lat) + s * lat
        point[0] = abs(point[0]) * sign
        keys.append(point)
    return keys


def sample_keys(keys: list[np.ndarray], steps: int) -> list[np.ndarray]:
    segs = len(keys) - 1
    out = []
    for i in range(steps):
        f = (i / (steps - 1)) * segs
        seg = min(int(math.floor(f)), segs - 1)
        t = f - seg
        t = t * t * (3 - 2 * t)
        out.append(keys[seg] * (1 - t) + keys[seg + 1] * t)
    out[0] = keys[0]
    out[-1] = keys[-1]
    return out


def build_cranium(pts: np.ndarray, frame: dict):
    """Rounded cranium welded to the forehead arc. Row 0 is the face border."""
    arc = resample_polyline([pts[i] for i in UPPER], 25)
    n = len(arc)
    steps = 28
    grid = np.zeros((steps, n, 3), dtype=np.float64)
    half = max(frame["halfWidth"], 1.0)
    for i, p in enumerate(arc):
        lateral = abs(float(p[0])) / half
        sign = 1.0 if p[0] >= 0 else -1.0
        column = sample_keys(blend_keys(frame, p, lateral, sign), steps)
        for s, point in enumerate(column):
            grid[s, i] = point

    verts = []
    colors = []
    edge = []
    indices = []
    hair_roots = []

    def add_vert(p, col, edge_w):
        verts.append(p)
        colors.append(col)
        edge.append(edge_w)
        return len(verts) - 1

    skin = np.array([0.62, 0.46, 0.38])
    hair = np.array([0.09, 0.07, 0.06])
    ids = np.zeros((steps, n), dtype=np.int32)
    for s in range(steps):
        t = s / (steps - 1)
        for i in range(n):
            lateral = abs(i / (n - 1) - 0.5) * 2.0
            # Crown and back read as hair; the strip next to the face matches skin.
            hair_m = smooth(t, 0.08, 0.45) * (1.0 - 0.35 * lateral)
            col = skin * (1.0 - hair_m) + hair * hair_m
            # Darken under the occiput.
            if t > 0.72:
                col *= 0.75 + 0.25 * (1 - t)
            ids[s, i] = add_vert(grid[s, i], col, 1.0 - smooth(t, 0.0, 0.35))

    for s in range(steps - 1):
        for i in range(n - 1):
            a, b = ids[s, i], ids[s, i + 1]
            c, d = ids[s + 1, i], ids[s + 1, i + 1]
            indices.extend((a, c, b, b, c, d))

    # Hair roots on the upper cranium (skip the last rows at the nape and the
    # exact face border so strands start in the hair, not on the forehead skin).
    rng = np.random.default_rng(7)
    for s in range(1, steps - 2):
        for i in range(n - 1):
            samples = 6 if s < 18 else 3
            for _ in range(samples):
                u = float(rng.random())
                v = float(rng.random())
                p = (
                    (1 - u) * (1 - v) * grid[s, i]
                    + u * (1 - v) * grid[s, i + 1]
                    + (1 - u) * v * grid[s + 1, i]
                    + u * v * grid[s + 1, i + 1]
                )
                nrm = surface_normal(grid, s, i)
                lateral = abs(((i + u) / (n - 1)) - 0.5) * 2.0
                t = (s + v) / (steps - 1)
                height = float(
                    np.clip((p[1] - frame["chinY"]) / max(frame["foreheadY"] - frame["chinY"], 1), 0, 1.35)
                )
                zone = classify_zone(lateral, t, height)
                phase = float(rng.random())
                hair_roots.append((*p, *nrm, lateral, height, zone, phase))

    return pack(verts, indices, colors, edge), hair_roots, grid


def surface_normal(grid, s, i) -> np.ndarray:
    s2 = min(s + 1, grid.shape[0] - 1)
    i2 = min(i + 1, grid.shape[1] - 1)
    s1 = max(s - 1, 0)
    i1 = max(i - 1, 0)
    du = grid[s, i2] - grid[s, i1]
    dv = grid[s2, i] - grid[s1, i]
    n = np.cross(du, dv)
    n = norm(n)
    if np.linalg.norm(n) < 1e-6:
        return np.array([0.0, 1.0, 0.0])
    center = grid.reshape(-1, 3).mean(axis=0)
    if np.dot(n, grid[s, i] - center) < 0:
        n = -n
    return n


def classify_zone(lateral: float, t: float, height: float) -> int:
    # 0 top, 1 front hairline, 2 left, 3 right, 4 back, 5 crown, 6 sideburn
    if lateral > 0.78 and height < 0.72:
        return 6
    if t < 0.18 and lateral < 0.72:
        return 1
    if t > 0.62:
        return 4
    if height > 1.02 and lateral < 0.55:
        return 5
    if lateral > 0.62:
        return 2  # split left/right later with position sign
    return 0


def smooth(x, a, b) -> float:
    if b <= a:
        return 1.0 if x >= b else 0.0
    t = np.clip((x - a) / (b - a), 0.0, 1.0)
    return float(t * t * (3 - 2 * t))


def build_neck(pts: np.ndarray, frame: dict, skin_col: np.ndarray):
    arc = [pts[i].copy() for i in LOWER]
    n = len(arc)
    steps = 10
    upc = frame["unitsPerCm"]
    grid = np.zeros((steps, n, 3), dtype=np.float64)
    grid[0] = np.stack(arc)
    for s in range(1, steps):
        t = s / (steps - 1)
        k = t * t * (3 - 2 * t)
        y_level = frame["chinY"] - upc * (1.2 + 7.2 * t)
        rx = upc * (6.4 * (1 - t) + 4.4 * t)
        rz = upc * (5.2 * (1 - t) + 4.0 * t)
        z_center = upc * (4.0 - 0.6 * t)
        flare = 1.0 + 1.15 * max(0.0, t - 0.68) / 0.32
        for i, p in enumerate(arc):
            u = i / (n - 1)
            ang = math.pi * (1.0 - u)
            ex = math.cos(ang) * rx * flare
            ez = z_center + math.sin(ang) * rz * (0.85 + 0.15 * flare)
            grid[s, i] = np.array([
                (1 - k) * p[0] + k * ex,
                (1 - k) * p[1] + k * y_level,
                (1 - k) * p[2] + k * ez,
            ])

    skin = skin_col
    verts, colors, edge, indices = [], [], [], []

    def add(p, col, e):
        verts.append(p)
        colors.append(col)
        edge.append(e)
        return len(verts) - 1

    ids = np.zeros((steps, n), dtype=np.int32)
    for s in range(steps):
        t = s / (steps - 1)
        for i in range(n):
            shade = 1.0 - 0.28 * t
            if t > 0.62:
                # Cape is not skin; paint it dark in a separate mesh.
                col = skin * shade
            else:
                col = skin * shade
            ids[s, i] = add(grid[s, i], col, 1.0 - smooth(t, 0.0, 0.4))

    for s in range(steps - 1):
        for i in range(n - 1):
            a, b = int(ids[s, i]), int(ids[s, i + 1])
            c, d = int(ids[s + 1, i]), int(ids[s + 1, i + 1])
            indices.extend((a, b, c, c, b, d))

    # Split cape (lower rings) out of the skin mesh so it can be a cloth material.
    cape_start = 4
    skin_idx, cape_idx = [], []
    for s in range(steps - 1):
        for i in range(n - 1):
            a, b = int(ids[s, i]), int(ids[s, i + 1])
            c, d = int(ids[s + 1, i]), int(ids[s + 1, i + 1])
            tri = (a, b, c, c, b, d)
            if s >= cape_start:
                cape_idx.extend(tri)
            else:
                skin_idx.extend(tri)

    skin_mesh = pack(verts, skin_idx, colors, edge)
    cape_mesh = pack(verts, cape_idx, colors, edge)
    return skin_mesh, cape_mesh, grid


def build_side_fills(cran_grid: np.ndarray, neck_grid: np.ndarray, skin_col: np.ndarray):
    """Back of the neck, hung from the nape so the occiput is closed."""
    nape = cran_grid[-1]
    n = len(nape)
    rows = 8
    bottom_y = float(neck_grid[-1, :, 1].mean())
    grid = np.zeros((rows, n, 3), dtype=np.float64)
    for s in range(rows):
        t = s / (rows - 1)
        k = t * t * (3 - 2 * t)
        for i, p in enumerate(nape):
            grid[s, i] = np.array([
                p[0] * (1 - 0.38 * k),
                (1 - k) * p[1] + k * bottom_y,
                (1 - k) * p[2] + k * (p[2] * 0.42),
            ])

    verts, colors, edge, indices = [], [], [], []

    def add(p, col, e):
        verts.append(np.array(p, dtype=np.float64))
        colors.append(col)
        edge.append(e)
        return len(verts) - 1

    ids = np.zeros((rows, n), dtype=np.int32)
    for s in range(rows):
        t = s / (rows - 1)
        for i in range(n):
            ids[s, i] = add(grid[s, i], skin_col * (0.78 - 0.22 * t), 0.05)
    for s in range(rows - 1):
        for i in range(n - 1):
            a, b = int(ids[s, i]), int(ids[s, i + 1])
            c, d = int(ids[s + 1, i]), int(ids[s + 1, i + 1])
            indices.extend((a, c, b, b, c, d))
    return pack(verts, indices, colors, edge)


def build_ears(pts: np.ndarray, frame: dict, skin_col: np.ndarray):
    face_h = frame["faceHeight"]
    meshes = []
    for side, idx in ((-1, 234), (1, 454)):
        origin = pts[idx].copy()
        meshes.append(one_ear(origin, side, face_h, skin_col))
    return merge_meshes(meshes)


def one_ear(origin: np.ndarray, side: int, face_h: float, skin_col: np.ndarray):
    H = face_h * 0.30
    W = face_h * 0.18
    D = face_h * 0.10
    na, nr = 22, 5
    verts = []
    colors = []
    edge = []
    indices = []
    ids = np.zeros((nr, na), dtype=np.int32)
    for r in range(nr):
        inset = r / (nr - 1)
        for a in range(na):
            t = a / (na - 1)
            ang = math.pi * (0.18 + t * 1.28)
            y = math.cos(ang) * H * 0.55
            z = -math.sin(ang) * W * 0.95
            if t > 0.78:
                k = (t - 0.78) / 0.22
                y -= k * H * 0.18
                z *= 1.0 - 0.25 * k
            x = D * (0.25 + inset * 0.85)
            bowl = math.sin(inset * math.pi) * D * 0.35
            x -= bowl * 0.35
            local = np.array([side * x, y, z])
            # Attach the inner edge (high inset, front of the ear) near the landmark.
            attach = inset * 0.35
            pos = origin + local
            pos[0] -= side * D * 0.15 * attach
            shade = 0.78 + 0.28 * (1 - inset)
            if inset > 0.45:
                shade *= 0.82
            verts.append(pos)
            colors.append(skin_col * shade)
            edge.append(0.0)
            ids[r, a] = len(verts) - 1
    for r in range(nr - 1):
        for a in range(na - 1):
            a00, a10 = int(ids[r, a]), int(ids[r, a + 1])
            a01, a11 = int(ids[r + 1, a]), int(ids[r + 1, a + 1])
            if side > 0:
                indices.extend((a00, a10, a01, a01, a10, a11))
            else:
                indices.extend((a00, a01, a10, a10, a01, a11))
    return pack(verts, indices, colors, edge)


def build_beard(pts: np.ndarray, frame: dict):
    """Roots for an optional beard. The photo already has natural stubble."""
    rng = np.random.default_rng(3)
    roots = []
    # Jaw chain and chin, plus a mustache band.
    jaw = [172, 136, 150, 149, 176, 148, 152, 377, 400, 378, 379, 365, 397]
    mustache = [2, 164, 393, 391, 322, 410, 287, 273, 335, 406, 313, 18, 83, 182, 106, 43, 57, 186, 92, 165, 167, 37, 39, 40, 185]
    # Filter mustache indices that exist and sit under the nose.
    nose_y = pts[2, 1]
    mouth_y = pts[13, 1]

    def push(i, zone, inward=0.0):
        p = pts[i].copy()
        # Push slightly out of the skin so strands are not buried.
        outward = norm(np.array([p[0], 0.0, p[2]]))
        if np.linalg.norm(outward) < 1e-6:
            outward = np.array([0.0, 0.0, 1.0])
        p = p + outward * (frame["faceHeight"] * 0.012) + np.array([0, -inward, 0])
        nrm = norm(outward + np.array([0.0, -0.35, 0.25]))
        lateral = abs(p[0]) / max(frame["halfWidth"], 1e-3)
        height = (p[1] - frame["chinY"]) / max(frame["foreheadY"] - frame["chinY"], 1)
        for k in range(5):
            jitter = rng.normal(0, frame["faceHeight"] * 0.008, size=3)
            jitter[1] *= 0.6
            pp = p + jitter
            phase = float(rng.random())
            roots.append((*pp, *nrm, float(lateral), float(height), zone, phase))

    for i in jaw:
        push(i, 7)
    for i in mustache:
        if i > 467:
            continue
        if pts[i, 1] > nose_y or pts[i, 1] < mouth_y - frame["faceHeight"] * 0.08:
            continue
        push(i, 8, inward=0.0)
    return roots


def fix_winding(positions: np.ndarray, indices: list[int], prefer: np.ndarray) -> list[int]:
    idx = np.array(indices, dtype=np.int32).reshape(-1, 3)
    if len(idx) == 0:
        return indices
    acc = np.zeros(3)
    for t in idx[:: max(1, len(idx) // 40)]:
        a, b, c = positions[t[0]], positions[t[1]], positions[t[2]]
        acc += np.cross(b - a, c - a)
    if np.dot(acc, prefer) < 0:
        idx = idx[:, [0, 2, 1]]
    return idx.reshape(-1).tolist()


def pack(verts, indices, colors, edge):
    pos = np.array(verts, dtype=np.float64)
    return {
        "positions": pos.reshape(-1).tolist(),
        "indices": list(map(int, indices)),
        "colors": np.array(colors, dtype=np.float64).reshape(-1).tolist(),
        "edge": list(map(float, edge)),
        "_pos": pos,
    }


def merge_meshes(meshes: list[dict]) -> dict:
    positions, indices, colors, edge = [], [], [], []
    offset = 0
    for m in meshes:
        pos = m["_pos"]
        count = len(pos)
        positions.append(pos)
        colors.extend(m["colors"])
        edge.extend(m["edge"])
        indices.extend(int(i) + offset for i in m["indices"])
        offset += count
    pos = np.vstack(positions) if positions else np.zeros((0, 3))
    return {
        "positions": pos.reshape(-1).tolist(),
        "indices": indices,
        "colors": colors,
        "edge": edge,
        "_pos": pos,
    }


def strip(mesh: dict) -> dict:
    return {k: v for k, v in mesh.items() if k != "_pos"}


def save_refs(front: Image.Image) -> None:
    out_dir = os.path.join(ROOT, "public", "refs")
    os.makedirs(out_dir, exist_ok=True)
    names = [
        ("frente.jpg", "01a0d4a3-c51a-78fe-b4d1-fc57fbf0773f.jpg", "Frente"),
        ("frente-2.jpg", "01a0d4a3-8d88-7e27-8b65-45b1a2e769b3.jpg", "Frente 2"),
        ("tres-cuartos.jpg", "01a0d4a3-c4a2-7d35-b868-6af72c77744b.jpg", "Tres cuartos"),
        ("perfil.jpg", "01a0d4a3-c482-73d3-b1d7-22da6e114474.jpg", "Perfil"),
        ("perfil-2.jpg", "01a0d4a3-c50a-7e14-bb8a-de97255a41e5.jpg", "Perfil 2"),
        ("nacimiento.jpg", "01a0d4a3-c492-7853-ab73-543347cab0f3.jpg", "Nacimiento"),
        ("coronilla.jpg", "01a0d4a3-c475-7bc4-8b8a-114f0b5d47c0.jpg", "Coronilla"),
    ]
    manifest = []
    for out_name, src_name, label in names:
        im = ImageOps.exif_transpose(Image.open(os.path.join(ASSETS, src_name)).convert("RGB"))
        im.thumbnail((480, 640), Image.Resampling.LANCZOS)
        im.save(os.path.join(out_dir, out_name), quality=78, optimize=True)
        manifest.append({"src": f"refs/{out_name}", "label": label})
    front_tex = front.copy()
    front_tex.thumbnail((1400, 1800), Image.Resampling.LANCZOS)
    front_tex.save(os.path.join(ROOT, "public", "texture.jpg"), quality=86, optimize=True)
    return manifest


def flat_roots(roots) -> list[float]:
    out = []
    for r in roots:
        # Fix side zones: zone 2 is caller's lateral; split by x sign into 2 and 3.
        x, y, z, nx, ny, nz, lateral, height, zone, phase = r
        zone = int(zone)
        if zone == 2 and x > 0:
            zone = 3
        out.extend((x, y, z, nx, ny, nz, lateral, height, zone, phase))
    return out


def main() -> None:
    ensure_files()
    tris = load_triangles()
    image, lm = load_front()
    arr = np.array(image)
    pts = landmarks_to_points(lm, image.width, image.height)
    pts, frame = orient(pts)
    colors = photo_colors(arr, lm)

    uvs = []
    for i in range(468):
        uvs.extend((float(lm[i].x), float(1.0 - lm[i].y)))

    positions = pts[:468]
    prefer = np.array([0.0, 0.0, 1.0])
    indices = fix_winding(positions, tris.reshape(-1).tolist(), prefer)

    # Face vertex colors are unused (the photo is the map) but keep a skin fallback.
    skin = np.array(colors["skin"])
    cran, hair_roots, cran_grid = build_cranium(pts, frame)
    neck, cape, neck_grid = build_neck(pts, frame, skin)
    sides = build_side_fills(cran_grid, neck_grid, skin)
    ears = build_ears(pts, frame, skin)
    skin_mesh = merge_meshes([cran, neck, sides, ears])

    # Extra hairline roots just above the forehead arc so fringes can fall forward.
    rng = np.random.default_rng(11)
    for i in UPPER[2:-2]:
        p = pts[i]
        nrm = norm(np.array([p[0] * 0.25, 1.0, 0.85]))
        for _ in range(8):
            jitter = rng.normal(0, frame["faceHeight"] * 0.01, size=3)
            jitter[1] = abs(jitter[1])
            pp = p + np.array([0.0, -frame["faceHeight"] * 0.012, frame["faceHeight"] * 0.02]) + jitter
            lateral = abs(pp[0]) / max(frame["halfWidth"], 1e-3)
            height = (pp[1] - frame["chinY"]) / max(frame["foreheadY"] - frame["chinY"], 1)
            hair_roots.append((*pp, *nrm, float(lateral), float(height), 1, float(rng.random())))

    beard = build_beard(pts, frame)
    crown_y = float(cran_grid[:, :, 1].max())
    chin_y = float(pts[152, 1])
    # Tragion-to-tragion is a bit under bizygomatic width; ~14.2 cm is a fair adult scale.
    units = frame["faceWidth"]
    cm = 14.2
    manifest = save_refs(image)

    # Drop the private arrays.
    skin_out = strip(skin_mesh)
    cape_out = strip(cape)

    data = {
        "face": {
            "positions": positions.reshape(-1).tolist(),
            "uvs": uvs,
            "indices": indices,
        },
        "skin": skin_out,
        "cape": cape_out,
        "hairRoots": flat_roots(hair_roots),
        "beardRoots": flat_roots(beard),
        "frame": {
            **frame,
            "crownY": crown_y,
            "chinY": chin_y,
            "unitsPerCm": units / cm,
        },
        "colors": colors,
        "texture": "texture.jpg",
        "refs": manifest,
    }
    os.makedirs(os.path.join(ROOT, "public"), exist_ok=True)
    out = os.path.join(ROOT, "public", "face.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(data, f, separators=(",", ":"))
    print(
        f"wrote {out}  faceVerts={len(positions)} skinVerts={len(skin_out['positions'])//3} "
        f"hairRoots={len(hair_roots)} beardRoots={len(beard)} crownY={crown_y:.1f}"
    )


if __name__ == "__main__":
    main()
