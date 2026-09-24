"""Build the head asset: face topology plus cranium, ears, neck and bust.

The face comes from the MediaPipe canonical model, so the tracked landmarks can
drive it vertex for vertex. Everything else is generated here in the same
canonical centimetre space and stitched to the face oval, which is what keeps
the silhouette smooth when the head turns.

    python3 scripts/build_head.py

Writes public/head.json.
"""

import json
import math
import os
import urllib.request

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC = os.path.join(ROOT, "public")
CACHE = os.path.join(ROOT, ".cache")
CANONICAL_URL = (
    "https://raw.githubusercontent.com/google-ai-edge/mediapipe/master/"
    "mediapipe/modules/face_geometry/data/canonical_face_model.obj"
)

# Face oval, counter clockwise from the forehead.
UPPER_ARC = [234, 127, 162, 21, 54, 103, 67, 109, 10, 338, 297, 332, 284, 251, 389, 356, 454]
LOWER_ARC = [234, 93, 132, 58, 172, 136, 150, 149, 176, 148, 152, 377, 400, 378, 379, 365, 397, 288, 361, 323, 454]

# Skull fitted to the canonical face: a bit wider than the cheekbones, deep at the back.
SKULL_CENTER = np.array([0.0, 1.1, -0.9])
SKULL_RADII = np.array([8.05, 11.0, 9.5])
# Where the hair swirls, on the back of the crown.
SWIRL_DIR = np.array([0.0, 0.72, -0.62])

ATLAS = {
    "face": [0.005, 0.505, 0.49, 0.49],
    "shell": [0.505, 0.505, 0.49, 0.49],
    "bust": [0.005, 0.145, 0.49, 0.35],
    "earLeft": [0.505, 0.255, 0.24, 0.24],
    "earRight": [0.755, 0.255, 0.24, 0.24],
}


def canonical_model():
    os.makedirs(CACHE, exist_ok=True)
    path = os.path.join(CACHE, "canonical_face_model.obj")
    if not os.path.exists(path):
        urllib.request.urlretrieve(CANONICAL_URL, path)
    verts, uvs, faces, face_uvs = [], [], [], []
    for line in open(path, encoding="utf-8"):
        parts = line.split()
        if not parts:
            continue
        if parts[0] == "v":
            verts.append([float(v) for v in parts[1:4]])
        elif parts[0] == "vt":
            uvs.append([float(v) for v in parts[1:3]])
        elif parts[0] == "f":
            faces.append([int(t.split("/")[0]) - 1 for t in parts[1:4]])
            face_uvs.append([int(t.split("/")[1]) - 1 for t in parts[1:4]])
    verts = np.array(verts)
    uvs = np.array(uvs)
    lookup = {}
    for tri, tri_uv in zip(faces, face_uvs):
        for vi, ti in zip(tri, tri_uv):
            lookup[vi] = ti
    per_vertex_uv = uvs[[lookup[i] for i in range(len(verts))]]
    return verts, per_vertex_uv, np.array(faces)


def to_sphere(points):
    return (points - SKULL_CENTER) / SKULL_RADII


def to_skull(dirs):
    dirs = dirs / np.linalg.norm(dirs, axis=-1, keepdims=True)
    return dirs * SKULL_RADII + SKULL_CENTER


def slerp(a, b, t):
    a = a / np.linalg.norm(a)
    b = b / np.linalg.norm(b)
    dot = float(np.clip(np.dot(a, b), -1.0, 1.0))
    angle = math.acos(dot)
    if angle < 1e-5:
        return a
    sin = math.sin(angle)
    return (math.sin((1 - t) * angle) / sin) * a + (math.sin(t * angle) / sin) * b


def resample_arc(points, count):
    """Even arc-length resampling of a polyline."""
    points = np.asarray(points, dtype=np.float64)
    seg = np.linalg.norm(np.diff(points, axis=0), axis=1)
    acc = np.concatenate([[0.0], np.cumsum(seg)])
    want = np.linspace(0.0, acc[-1], count)
    out = np.zeros((count, points.shape[1]))
    for axis in range(points.shape[1]):
        out[:, axis] = np.interp(want, acc, points[:, axis])
    return out


def smooth_closed(values, passes=2):
    out = values.copy()
    for _ in range(passes):
        out = (np.roll(out, 1, axis=0) + 2 * out + np.roll(out, -1, axis=0)) / 4
    return out


def smooth_open(values, passes=2):
    out = values.copy()
    for _ in range(passes):
        mid = (out[:-2] + 2 * out[1:-1] + out[2:]) / 4
        out = np.concatenate([out[:1], mid, out[-1:]])
    return out


def back_arc(front_dirs, ear_left, ear_right):
    """The nape side of the skull loop, mirroring the front arc sample count."""
    count = len(front_dirs)
    nape = np.array([0.0, -0.18, -1.0])
    low_left = np.array([-0.80, -0.30, -0.62])
    low_right = np.array([0.80, -0.30, -0.62])
    keys = [ear_left, low_left, nape, low_right, ear_right]
    dirs = []
    for i in range(count):
        t = i / (count - 1) * (len(keys) - 1)
        k = min(int(t), len(keys) - 2)
        dirs.append(slerp(keys[k], keys[k + 1], t - k))
    return np.array(dirs)


NECK_CENTER = np.array([0.0, -15.5, -1.9])
NECK_RADII = np.array([5.9, 5.4])


def oval_loop():
    """The face oval as one closed ring: left ear, over the brow, right ear, jaw."""
    loop = list(UPPER_ARC) + list(reversed(LOWER_ARC))[1:-1]
    return [int(i) for i in loop]


def project_bust(points):
    """Snap toward the skull above and the neck below, with a smooth transition."""
    out = points.copy()
    for i, p in enumerate(points):
        sphere = (p - SKULL_CENTER) / SKULL_RADII
        length = np.linalg.norm(sphere)
        skull = SKULL_CENTER + (sphere / max(length, 1e-6)) * SKULL_RADII
        radial = np.array([p[0] - NECK_CENTER[0], p[2] - NECK_CENTER[2]])
        rlen = np.linalg.norm(radial / NECK_RADII)
        neck = p.copy()
        if rlen > 1e-6:
            scaled = radial / rlen
            neck[0] = NECK_CENTER[0] + scaled[0]
            neck[2] = NECK_CENTER[2] + scaled[1]
        # Below the jaw the neck wins, above the ears the skull wins.
        w = np.clip((p[1] + 9.5) / 8.0, 0.0, 1.0)
        w = w * w * (3 - 2 * w)
        out[i] = skull * w + neck * (1 - w)
    return out


def build_shell(verts):
    """One closed surface from the face oval over the skull and down to the neck."""
    rows = 34
    loop = oval_loop()
    # One column per oval vertex: no repeats, and the seam matches exactly.
    ring_idx = [int(i) for i in loop]
    cols = len(ring_idx)
    ring_pos = np.array([verts[i] for i in ring_idx])

    # Angle around the neck: left ear -> back -> right ear -> throat -> left ear.
    upper_span = len(UPPER_ARC) - 1
    total = len(loop)
    alpha = np.zeros(total)
    for i in range(total):
        if i <= upper_span:
            alpha[i] = math.pi + math.pi * (i / upper_span)
        else:
            alpha[i] = 2 * math.pi + math.pi * ((i - upper_span) / (total - upper_span))
    ring_alpha = alpha

    neck_ring = np.zeros((cols, 3))
    for c in range(cols):
        a = ring_alpha[c]
        neck_ring[c] = NECK_CENTER + np.array(
            [math.cos(a) * NECK_RADII[0], 0.0, math.sin(a) * NECK_RADII[1]]
        )
        # The nape sits higher than the throat.
        neck_ring[c, 1] += 1.9 * math.cos(a - math.pi * 1.5) * 0.5

    nose_dir = np.array([0.0, 0.0, 1.0])
    away = np.zeros((cols, 3))
    for c in range(cols):
        p = ring_pos[c]
        tangent = ring_pos[(c + 1) % cols] - ring_pos[(c - 1) % cols]
        tangent /= max(np.linalg.norm(tangent), 1e-6)
        normal = (p - SKULL_CENTER) / (SKULL_RADII**2)
        normal /= max(np.linalg.norm(normal), 1e-6)
        direction = np.cross(normal, tangent)
        direction /= max(np.linalg.norm(direction), 1e-6)
        if np.dot(direction, nose_dir) > 0:
            direction = -direction
        away[c] = direction
    away = smooth_closed(away, 2)
    away /= np.linalg.norm(away, axis=1, keepdims=True)

    grid = np.zeros((rows, cols, 3))
    for c in range(cols):
        start = ring_pos[c]
        end = neck_ring[c]
        span = np.linalg.norm(end - start)
        # A long arc over the crown, a short drop under the chin.
        lead = away[c] * span * 0.55
        rise = np.array([0.0, 1.0, 0.0]) * 0.0
        tail_dir = np.array([0.0, 1.0, 0.0]) * span * 0.35
        p0 = start
        p1 = start + lead + rise
        p2 = end + tail_dir
        p3 = end
        for r in range(rows):
            t = r / (rows - 1)
            te = t * t * (3 - 2 * t)
            mt = 1 - te
            point = (
                mt**3 * p0 + 3 * mt**2 * te * p1 + 3 * mt * te**2 * p2 + te**3 * p3
            )
            grid[r, c] = point

    flat = grid.reshape(-1, 3)
    snapped = project_bust(flat).reshape(rows, cols, 3)
    for r in range(rows):
        t = r / (rows - 1)
        # Free at the seams, fully on the skull in between.
        w = math.sin(math.pi * min(1.0, t / 0.92)) ** 0.7
        w = min(w, 0.94) if t < 0.9 else 0.0
        grid[r] = grid[r] * (1 - w) + snapped[r] * w
    grid[0] = ring_pos
    grid[-1] = neck_ring

    for _ in range(6):
        inner = grid[1:-1].copy()
        up = grid[:-2]
        down = grid[2:]
        left = np.roll(inner, 1, axis=1)
        right = np.roll(inner, -1, axis=1)
        grid[1:-1] = inner * 0.36 + (up + down + left + right) * 0.16

    shoulders = build_shoulders(neck_ring, ring_alpha)
    return grid, ring_idx, neck_ring, shoulders


def build_shoulders(neck_ring, ring_alpha):
    rows = 10
    cols = neck_ring.shape[0]
    out = np.zeros((rows, cols, 3))
    for r in range(rows):
        t = (r + 1) / rows
        for c in range(cols):
            a = ring_alpha[c]
            base = neck_ring[c]
            ease = t * t
            wide = 1.0 + ease * 1.85
            deep = 1.0 + ease * 0.95
            point = base.copy()
            point[0] = (base[0] - NECK_CENTER[0]) * wide + NECK_CENTER[0]
            point[2] = (base[2] - NECK_CENTER[2]) * deep + NECK_CENTER[2]
            point[1] = base[1] - t * 5.2 - ease * (abs(math.cos(a)) ** 2) * 3.4
            out[r, c] = point
    return out


def resample_indices(arc, count):
    """Pick canonical vertex indices spread evenly along the arc, repeats allowed."""
    picks = np.linspace(0, len(arc) - 1, count)
    return [int(arc[int(round(p))]) for p in picks]


def build_neck(verts, cranium_grid):
    """Under the jaw down to the shoulders."""
    cols = 57
    rows = 22
    jaw_idx = resample_indices(LOWER_ARC, cols)
    jaw_pos = np.array([verts[i] for i in jaw_idx])
    # Neck cylinder: leaning slightly back, centred under the ears.
    neck_center = np.array([0.0, -13.5, -1.6])
    neck_rx, neck_rz = 5.6, 5.2
    ring = []
    for c in range(cols):
        t = c / (cols - 1)
        # jaw arc runs left ear -> chin -> right ear, so wrap the ring the same way
        angle = math.pi * (1.0 - t)
        ring.append(
            neck_center
            + np.array([-math.cos(angle) * neck_rx, 0.0, math.sin(angle) * neck_rz - 1.2])
        )
    ring = np.array(ring)
    # The back of the neck is higher than the throat.
    ring[:, 1] += (1 - np.abs(np.linspace(-1, 1, cols))) * -1.6

    grid = np.zeros((rows, cols, 3))
    for c in range(cols):
        start = jaw_pos[c]
        end = ring[c]
        for r in range(rows):
            t = r / (rows - 1)
            te = t * t * (3 - 2 * t)
            point = start * (1 - te) + end * te
            # Push the throat forward so the jaw does not look cut off.
            bulge = math.sin(math.pi * te) * 0.9
            point = point + np.array([0.0, 0.0, bulge * (1.0 - abs(c / (cols - 1) * 2 - 1))])
            grid[r, c] = point
    grid[0] = jaw_pos

    shoulder_rows = 8
    shoulders = np.zeros((shoulder_rows, cols, 3))
    for r in range(shoulder_rows):
        t = (r + 1) / shoulder_rows
        spread = 1.0 + t * 2.6
        drop = t * 7.0
        for c in range(cols):
            base = ring[c]
            point = base.copy()
            point[0] = base[0] * spread
            point[2] = (base[2] - neck_center[2]) * (1.0 + t * 1.4) + neck_center[2]
            point[1] = base[1] - drop
            shoulders[r, c] = point
    return grid, shoulders, jaw_idx


def build_ear(side):
    """A closed ear bump: a squashed ellipsoid that sinks into the skull.

    A full ear needs an authored mesh; a smooth bump reads correctly in
    silhouette and never pokes through the cheek.
    """
    rows, cols = 16, 20
    grid = np.zeros((rows, cols, 3))
    cx, cy, cz = 7.05 * side, -0.35, -3.3
    rx, ry, rz = 1.05, 3.05, 1.70
    for r in range(rows):
        phi = math.pi * (r / (rows - 1))
        for c in range(cols):
            theta = 2 * math.pi * (c / cols)
            y = math.cos(phi)
            radial = math.sin(phi)
            z = radial * math.cos(theta)
            x = radial * math.sin(theta)
            # Taper the lobe, lean the top back, keep the front edge tight.
            taper = 1.0 - 0.32 * max(0.0, -y)
            point = np.array(
                [cx + x * rx * side, cy + y * ry, cz + z * rz * taper - 0.55 * y]
            )
            grid[r, c] = point
    return grid


def grid_indices(offset, rows, cols, flip=False, wrap=False):
    out = []
    span = cols if wrap else cols - 1
    for r in range(rows - 1):
        for c in range(span):
            c1 = (c + 1) % cols
            a = offset + r * cols + c
            b = offset + r * cols + c1
            d = offset + (r + 1) * cols + c
            e = offset + (r + 1) * cols + c1
            if flip:
                out += [a, d, b, b, d, e]
            else:
                out += [a, b, d, b, e, d]
    return out


def rect_uv(name, u, v):
    x, y, w, h = ATLAS[name]
    return [x + u * w, y + v * h]


def seam_weights(points, seam_points, seam_face_idx, falloff):
    """Inverse distance blend to the stitched face vertices, so shape changes carry over."""
    weights = []
    for point in points:
        dist = np.linalg.norm(seam_points - point, axis=1)
        order = np.argsort(dist)[:4]
        near = dist[order]
        amount = math.exp(-float(near[0]) / falloff)
        if amount < 0.02:
            weights.append([])
            continue
        inv = 1.0 / np.maximum(near, 1e-3)
        inv = inv / inv.sum()
        weights.append([[int(seam_face_idx[order[k]]), float(inv[k] * amount)] for k in range(len(order))])
    return weights


def main():
    verts, face_uv, faces = canonical_model()
    positions = [list(map(float, v)) for v in verts]
    uvs = [rect_uv("face", float(u), float(v)) for u, v in face_uv]
    indices = [int(i) for tri in faces for i in tri]
    UPPER_ARC[:] = [int(i) for i in UPPER_ARC]
    LOWER_ARC[:] = [int(i) for i in LOWER_ARC]
    seam_targets = []  # (vertexIndex, weights)

    shell, ring_idx, neck_ring, shoulders = build_shell(verts)
    rows, cols = shell.shape[:2]
    # Row 0 sits on the face oval but carries its own UVs, so the atlas seam is clean.
    # One extra column duplicates the first, so the wrap has its own u = 1 and
    # no triangle stretches the whole atlas rect.
    shell_ids = np.zeros((rows, cols + 1), dtype=int)
    for r in range(rows):
        for c in range(cols + 1):
            shell_ids[r, c] = len(positions)
            positions.append(list(map(float, shell[r, c % cols])))
            uvs.append(rect_uv("shell", c / cols, 1.0 - r / (rows - 1)))
    for c in range(cols + 1):
        seam_targets.append([int(shell_ids[0, c]), [[int(ring_idx[c % cols]), 1.0]]])
    for r in range(rows - 1):
        for c in range(cols):
            a, b = shell_ids[r, c], shell_ids[r, c + 1]
            d, e = shell_ids[r + 1, c], shell_ids[r + 1, c + 1]
            indices += [a, b, d, b, e, d]

    wrapped = np.concatenate([shell[1:], shell[1:, :1]], axis=1).reshape(-1, 3)
    weights = seam_weights(wrapped, shell[0], ring_idx, falloff=4.6)
    for vid, w in zip(shell_ids[1:].reshape(-1), weights):
        if w:
            seam_targets.append([int(vid), w])

    srows = shoulders.shape[0]
    shoulder_ids = np.zeros((srows + 1, cols + 1), dtype=int)
    shoulder_ids[0] = shell_ids[-1]
    for r in range(srows):
        for c in range(cols + 1):
            shoulder_ids[r + 1, c] = len(positions)
            positions.append(list(map(float, shoulders[r, c % cols])))
            uvs.append(rect_uv("bust", c / cols, 1.0 - r / srows))
    for r in range(srows):
        for c in range(cols):
            a, b = shoulder_ids[r, c], shoulder_ids[r, c + 1]
            d, e = shoulder_ids[r + 1, c], shoulder_ids[r + 1, c + 1]
            indices += [a, b, d, b, e, d]

    ear_ranges = []
    for side, name in ((-1, "left"), (1, "right")):
        grid = build_ear(side)
        erows, ecols = grid.shape[:2]
        start = len(positions)
        rect = "earLeft" if side < 0 else "earRight"
        for r in range(erows):
            for c in range(ecols + 1):
                point = grid[r, c % ecols]
                positions.append(list(map(float, point)))
                # Project sideways: the atlas holds a photo crop of that ear.
                u = 0.5 + (point[2] - (-3.3)) / 5.2 * (-side)
                v = 0.5 + (point[1] - (-0.35)) / 7.4
                uvs.append(rect_uv(rect, min(1, max(0, u)), min(1, max(0, v))))
        indices += grid_indices(start, erows, ecols + 1, flip=side < 0, wrap=False)
        ear_ranges.append({"side": name, "start": start, "rows": erows, "cols": ecols + 1})
        anchor = np.array([verts[234] if side < 0 else verts[454]])
        wrapped_ear = np.concatenate([grid, grid[:, :1]], axis=1).reshape(-1, 3)
        weights = seam_weights(
            wrapped_ear, anchor, [234 if side < 0 else 454], falloff=9.0
        )
        for offset, w in enumerate(weights):
            if w:
                seam_targets.append([int(start + offset), w])

    head = {
        "positions": positions,
        "uvs": uvs,
        "indices": [int(i) for i in indices],
        "faceCount": len(verts),
        "shell": {
            "rows": rows,
            "cols": cols + 1,
            "wrapCols": cols,
            "ids": [[int(v) for v in row] for row in shell_ids],
            "atlas": ATLAS["shell"],
            "seamFace": [int(i) for i in ring_idx],
            "upperSpan": (len(UPPER_ARC) - 1) / (len(oval_loop()) - 1),
        },
        "ears": ear_ranges,
        "seam": seam_targets,
        "atlas": ATLAS,
        "skull": {
            "center": list(map(float, SKULL_CENTER)),
            "radii": list(map(float, SKULL_RADII)),
            "swirl": list(map(float, SWIRL_DIR / np.linalg.norm(SWIRL_DIR))),
        },
        "faceUv": [[float(u), float(v)] for u, v in face_uv],
        "landmarks": {
            "nose": 1,
            "chin": 152,
            "forehead": 10,
            "earLeft": 234,
            "earRight": 454,
            "eyeLeft": 33,
            "eyeRight": 263,
            "templeLeft": 54,
            "templeRight": 284,
        },
    }
    os.makedirs(PUBLIC, exist_ok=True)
    with open(os.path.join(PUBLIC, "head.json"), "w", encoding="utf-8") as handle:
        json.dump(head, handle, separators=(",", ":"))

    pos = np.array(positions)
    print(f"vertices {len(positions)} tris {len(indices)//3} seam-weighted {len(seam_targets)}")
    print(f"bounds min {pos.min(0).round(2)} max {pos.max(0).round(2)}")
    print(f"skull top y {shell[:,:,1].max():.2f} back z {shell[:,:,2].min():.2f}")
    widths = [float(shell[r][:, 0].max() - shell[r][:, 0].min()) for r in range(rows)]
    print("row widths", [round(w, 1) for w in widths[::4]])


if __name__ == "__main__":
    main()
