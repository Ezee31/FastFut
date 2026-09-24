import * as THREE from "three";

const SIZE = 2048;
/** Grow triangles a hair so neighbours overlap instead of showing seams. */
const EXPAND = 1.35;

/** Face oval. Sampling exactly on it would pull background into the texture. */
const OVAL = new Set([
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378,
  400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21,
  54, 103, 67, 109,
]);

const SKIN_SAMPLES = [
  [10, 0.0, 0.0], [151, 0, 0], [108, 0, 0], [337, 0, 0],
  [234, 0, 0], [454, 0, 0], [50, 0, 0], [280, 0, 0], [152, 0, 0],
];
const CHEEK_SAMPLES = [50, 280, 425, 205, 118, 347];

function affine(src, dst) {
  const [x0, y0, x1, y1, x2, y2] = src;
  const [u0, v0, u1, v1, u2, v2] = dst;
  const d = x0 * (y1 - y2) + x1 * (y2 - y0) + x2 * (y0 - y1);
  if (Math.abs(d) < 1e-9) return null;
  return [
    (u0 * (y1 - y2) + u1 * (y2 - y0) + u2 * (y0 - y1)) / d,
    (v0 * (y1 - y2) + v1 * (y2 - y0) + v2 * (y0 - y1)) / d,
    (u0 * (x2 - x1) + u1 * (x0 - x2) + u2 * (x1 - x0)) / d,
    (v0 * (x2 - x1) + v1 * (x0 - x2) + v2 * (x1 - x0)) / d,
    (u0 * (x1 * y2 - x2 * y1) + u1 * (x2 * y0 - x0 * y2) + u2 * (x0 * y1 - x1 * y0)) / d,
    (v0 * (x1 * y2 - x2 * y1) + v1 * (x2 * y0 - x0 * y2) + v2 * (x0 * y1 - x1 * y0)) / d,
  ];
}

function expand(points, amount) {
  const cx = (points[0] + points[2] + points[4]) / 3;
  const cy = (points[1] + points[3] + points[5]) / 3;
  const out = points.slice();
  for (let i = 0; i < 3; i += 1) {
    const dx = out[i * 2] - cx;
    const dy = out[i * 2 + 1] - cy;
    const len = Math.hypot(dx, dy) || 1;
    out[i * 2] += (dx / len) * amount;
    out[i * 2 + 1] += (dy / len) * amount;
  }
  return out;
}

function triangleNormalZ(points, indices, tri) {
  const ax = points[indices[tri] * 3];
  const ay = points[indices[tri] * 3 + 1];
  const az = points[indices[tri] * 3 + 2];
  const bx = points[indices[tri + 1] * 3];
  const by = points[indices[tri + 1] * 3 + 1];
  const bz = points[indices[tri + 1] * 3 + 2];
  const cx = points[indices[tri + 2] * 3];
  const cy = points[indices[tri + 2] * 3 + 1];
  const cz = points[indices[tri + 2] * 3 + 2];
  const ux = bx - ax;
  const uy = by - ay;
  const uz = bz - az;
  const vx = cx - ax;
  const vy = cy - ay;
  const vz = cz - az;
  const nx = uy * vz - uz * vy;
  const ny = uz * vx - ux * vz;
  const nz = ux * vy - uy * vx;
  const len = Math.hypot(nx, ny, nz) || 1;
  return nz / len;
}

function sampler(image) {
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(image, 0, 0);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  return (x, y) => {
    const px = Math.max(0, Math.min(canvas.width - 1, Math.round(x)));
    const py = Math.max(0, Math.min(canvas.height - 1, Math.round(y)));
    const o = (py * canvas.width + px) * 4;
    return [data[o], data[o + 1], data[o + 2]];
  };
}

function medianColor(list) {
  const out = [0, 0, 0];
  for (let channel = 0; channel < 3; channel += 1) {
    const values = list.map((c) => c[channel]).sort((a, b) => a - b);
    out[channel] = values[Math.floor(values.length / 2)] || 0;
  }
  return out;
}

function rgb(color, scale = 1) {
  return `rgb(${Math.round(color[0] * scale)},${Math.round(color[1] * scale)},${Math.round(color[2] * scale)})`;
}

function grain(ctx, rect, strength, seed = 1) {
  const [x, y, w, h] = rect;
  const width = Math.round(w * SIZE);
  const height = Math.round(h * SIZE);
  const patch = ctx.createImageData(width, height);
  let state = seed * 9301 + 49297;
  for (let i = 0; i < width * height; i += 1) {
    state = (state * 9301 + 49297) % 233280;
    const noise = (state / 233280 - 0.5) * strength;
    patch.data[i * 4] = 128 + noise;
    patch.data[i * 4 + 1] = 128 + noise;
    patch.data[i * 4 + 2] = 128 + noise;
    patch.data[i * 4 + 3] = 70;
  }
  const temp = document.createElement("canvas");
  temp.width = width;
  temp.height = height;
  temp.getContext("2d").putImageData(patch, 0, 0);
  ctx.save();
  ctx.globalCompositeOperation = "overlay";
  ctx.drawImage(temp, Math.round(x * SIZE), Math.round((1 - y - h) * SIZE));
  ctx.restore();
}

/**
 * Bakes every capture into one atlas. Each triangle takes the view that saw it
 * most straight on, which is what makes a multi angle scan look right.
 *
 * @param {object} head
 * @param {Array<{image: any, faceSpace: Float32Array, landmarks: Float32Array, width: number, height: number}>} captures
 */
export function bakeAtlas(head, captures) {
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  const faceRect = head.atlas.face;
  const shellRect = head.atlas.shell;
  const bustRect = head.atlas.bust;

  const readers = captures.map((capture) => sampler(capture.image));
  const skinList = [];
  SKIN_SAMPLES.forEach(([index]) => {
    const capture = captures[0];
    const x = capture.landmarks[index * 3] * capture.width;
    const y = capture.landmarks[index * 3 + 1] * capture.height;
    skinList.push(readers[0](x, y));
  });
  const cheeks = CHEEK_SAMPLES.map((index) => {
    const capture = captures[0];
    return readers[0](
      capture.landmarks[index * 3] * capture.width,
      capture.landmarks[index * 3 + 1] * capture.height
    );
  });
  const skin = medianColor(cheeks.concat(skinList));

  ctx.fillStyle = rgb(skin);
  ctx.fillRect(0, 0, SIZE, SIZE);

  const toAtlas = (u, v, rect) => [
    (rect[0] + u * rect[2]) * SIZE,
    (1 - (rect[1] + v * rect[3])) * SIZE,
  ];

  // Face: project each capture, weighted by how square on it was.
  const triangleCount = head.indices.length / 3;
  const faceTriangles = [];
  for (let t = 0; t < triangleCount; t += 1) {
    const i0 = head.indices[t * 3];
    const i1 = head.indices[t * 3 + 1];
    const i2 = head.indices[t * 3 + 2];
    if (i0 < head.faceCount && i1 < head.faceCount && i2 < head.faceCount) {
      faceTriangles.push([i0, i1, i2]);
    }
  }
  const accumulated = new Float32Array(faceTriangles.length);
  captures.forEach((capture, index) => {
    const reader = readers[index];
    const centre = [
      capture.landmarks[1 * 3] * capture.width,
      capture.landmarks[1 * 3 + 1] * capture.height,
    ];
    faceTriangles.forEach((tri, t) => {
      const facing = Math.max(0, triangleNormalZ(capture.faceSpace, tri, 0));
      const weight = facing ** 4 * (capture.weight ?? 1);
      // Every triangle has to be painted by someone, or the base fill shows
      // through as a flat patch. Later captures only win where they saw more.
      const first = accumulated[t] === 0;
      if (!first && weight < 0.02) return;
      const alpha = first ? 1 : weight / (accumulated[t] + weight);
      accumulated[t] += Math.max(weight, first ? 0.02 : 0);
      const src = [];
      const dst = [];
      for (const vertex of tri) {
        let sx = capture.landmarks[vertex * 3] * capture.width;
        let sy = capture.landmarks[vertex * 3 + 1] * capture.height;
        if (OVAL.has(vertex)) {
          sx += (centre[0] - sx) * 0.08;
          sy += (centre[1] - sy) * 0.08;
        }
        src.push(sx, sy);
        const [u, v] = head.faceUv[vertex];
        const point = toAtlas(u, v, faceRect);
        dst.push(point[0], point[1]);
      }
      const grown = expand(dst, EXPAND);
      const matrix = affine(src, grown);
      if (!matrix) return;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.moveTo(grown[0], grown[1]);
      ctx.lineTo(grown[2], grown[3]);
      ctx.lineTo(grown[4], grown[5]);
      ctx.closePath();
      ctx.clip();
      ctx.setTransform(matrix[0], matrix[1], matrix[2], matrix[3], matrix[4], matrix[5]);
      ctx.drawImage(capture.image, 0, 0);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.restore();
    });
  });
  ctx.globalAlpha = 1;

  // Shell: the seam row copies the skin next to it, then fades to the nape and neck.
  const { seamFace } = head.shell;
  const cols = head.shell.wrapCols ?? head.shell.cols;
  const base = captures[0];
  const seamColors = seamFace.map((faceIndex) => {
    let best = null;
    let bestWeight = -1;
    captures.forEach((capture, index) => {
      const nx = capture.faceSpace[faceIndex * 3];
      const nz = capture.faceSpace[faceIndex * 3 + 2];
      const weight = nz - Math.abs(nx) * 0.1;
      if (weight > bestWeight) {
        bestWeight = weight;
        best = readers[index](
          capture.landmarks[faceIndex * 3] * capture.width,
          capture.landmarks[faceIndex * 3 + 1] * capture.height
        );
      }
    });
    return best || skin;
  });
  // Drop stray samples (collar, beard, shadow) and smooth around the ring, so
  // the scalp and neck do not end up striped.
  const skinLum = 0.25 * skin[0] + 0.45 * skin[1] + 0.3 * skin[2];
  const plausible = seamColors.map((color) => {
    const lum = 0.25 * color[0] + 0.45 * color[1] + 0.3 * color[2];
    // Beard and shadow belong here; a bright collar does not.
    return lum < skinLum * 1.22 ? color : skin;
  });
  const smoothed = plausible.map((_, index) => {
    const out = [0, 0, 0];
    let total = 0;
    for (let k = -4; k <= 4; k += 1) {
      const sample = plausible[(index + k + plausible.length) % plausible.length];
      const weight = 5 - Math.abs(k);
      out[0] += sample[0] * weight;
      out[1] += sample[1] * weight;
      out[2] += sample[2] * weight;
      total += weight;
    }
    return out.map((channel) => channel / total);
  });
  seamColors.length = 0;
  seamColors.push(...smoothed);
  const shellX = shellRect[0] * SIZE;
  const shellY = (1 - shellRect[1] - shellRect[3]) * SIZE;
  const shellW = shellRect[2] * SIZE;
  const shellH = shellRect[3] * SIZE;
  const columnWidth = shellW / cols;
  for (let c = 0; c < cols; c += 1) {
    const color = seamColors[c];
    const gradient = ctx.createLinearGradient(0, shellY, 0, shellY + shellH);
    gradient.addColorStop(0, rgb(color));
    gradient.addColorStop(0.18, rgb(color, 0.95));
    gradient.addColorStop(0.5, rgb(skin, 0.88));
    gradient.addColorStop(0.78, rgb(skin, 0.72));
    gradient.addColorStop(1, rgb(skin, 0.5));
    ctx.fillStyle = gradient;
    ctx.fillRect(shellX + c * columnWidth - 0.5, shellY, columnWidth + 1, shellH);
  }
  grain(ctx, shellRect, 26, 7);

  // Ears: crop them straight out of the sharpest capture.
  const earSpec = [
    [head.atlas.earLeft, 234, 93],
    [head.atlas.earRight, 454, 323],
  ];
  for (const [rect, tragion, lower] of earSpec) {
    const x = base.landmarks[tragion * 3] * base.width;
    const y = base.landmarks[tragion * 3 + 1] * base.height;
    const yLow = base.landmarks[lower * 3 + 1] * base.height;
    const span = Math.max(Math.abs(yLow - y) * 2.6, base.height * 0.1);
    ctx.fillStyle = rgb(skin, 0.95);
    ctx.fillRect(rect[0] * SIZE, (1 - rect[1] - rect[3]) * SIZE, rect[2] * SIZE, rect[3] * SIZE);
    ctx.save();
    ctx.beginPath();
    ctx.rect(rect[0] * SIZE, (1 - rect[1] - rect[3]) * SIZE, rect[2] * SIZE, rect[3] * SIZE);
    ctx.clip();
    const sign = tragion === 234 ? -1 : 1;
    ctx.drawImage(
      base.image,
      x + sign * span * 0.1 - span / 2,
      y - span / 2,
      span,
      span,
      rect[0] * SIZE,
      (1 - rect[1] - rect[3]) * SIZE,
      rect[2] * SIZE,
      rect[3] * SIZE
    );
    ctx.restore();
    grain(ctx, rect, 10, 3);
  }

  const jersey = ctx.createLinearGradient(0, (1 - bustRect[1] - bustRect[3]) * SIZE, 0, (1 - bustRect[1]) * SIZE);
  jersey.addColorStop(0, "#23262c");
  jersey.addColorStop(1, "#111318");
  ctx.fillStyle = jersey;
  ctx.fillRect(bustRect[0] * SIZE, (1 - bustRect[1] - bustRect[3]) * SIZE, bustRect[2] * SIZE, bustRect[3] * SIZE);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.flipY = true;
  texture.anisotropy = 8;

  const hairColor = sampleHair(readers[0], base, skin);
  return { texture, canvas, skin, hairColor };
}

/** Darkest neutral pixels above the hairline give the natural hair colour. */
function sampleHair(reader, capture, skin) {
  const forehead = [
    capture.landmarks[10 * 3] * capture.width,
    capture.landmarks[10 * 3 + 1] * capture.height,
  ];
  const chin = capture.landmarks[152 * 3 + 1] * capture.height;
  const faceHeight = Math.abs(chin - forehead[1]) || capture.height * 0.5;
  const found = [];
  for (let step = 0; step < 220; step += 1) {
    const dx = (Math.random() - 0.5) * faceHeight * 0.9;
    const dy = -Math.random() * faceHeight * 0.45 - faceHeight * 0.05;
    const color = reader(forehead[0] + dx, forehead[1] + dy);
    const lum = 0.25 * color[0] + 0.45 * color[1] + 0.3 * color[2];
    const neutral = Math.abs(color[0] - color[1]) < 45 && color[0] - color[2] < 70;
    if (lum < 110 && neutral) found.push(color);
  }
  if (found.length < 12) return [34, 26, 22];
  found.sort((a, b) => a[0] + a[1] + a[2] - (b[0] + b[1] + b[2]));
  const dark = found.slice(0, Math.max(6, Math.floor(found.length * 0.4)));
  const color = medianColor(dark);
  return color.map((channel, i) => Math.max(12, Math.min(channel, skin[i] * 0.8)));
}
