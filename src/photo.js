/** Composite haircuts on the frontal photo. The face pixels stay unless the beard is shaved. */

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function hash01(x, y) {
  let v = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) >>> 0;
  v = Math.imul(v ^ (v >>> 13), 1274126177) >>> 0;
  return ((v ^ (v >>> 16)) & 65535) / 65535;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(src));
    image.src = src;
  });
}

function pixelsOf(image) {
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(image, 0, 0);
  return ctx.getImageData(0, 0, canvas.width, canvas.height).data;
}

export async function loadStudio() {
  const base = import.meta.env.BASE_URL;
  const response = await fetch(`${base}studio.json`);
  if (!response.ok) throw new Error("studio.json");
  const meta = await response.json();
  const [photoImage, baldImage, shavedImage, hairImage, beardImage] = await Promise.all([
    loadImage(`${base}texture.jpg`),
    loadImage(`${base}bald.jpg`),
    loadImage(`${base}shaved.jpg`),
    loadImage(`${base}hair-mask.png`),
    loadImage(`${base}beard-mask.png`),
  ]);
  const photo = pixelsOf(photoImage);
  const bald = pixelsOf(baldImage);
  const shaved = pixelsOf(shavedImage);
  const hairPx = pixelsOf(hairImage);
  const beardPx = pixelsOf(beardImage);
  const count = meta.width * meta.height;
  const hair = new Uint8Array(count);
  const beard = new Uint8Array(count);
  for (let i = 0; i < count; i += 1) {
    hair[i] = hairPx[i * 4] > 127 ? 1 : 0;
    beard[i] = beardPx[i * 4] > 127 ? 1 : 0;
  }
  return { meta, photo, bald, shaved, hair, beard };
}

function beardRegion(x, y, p, meta) {
  if (p.beardStyle === "mustache") {
    const lat = Math.abs(x - meta.cx) / meta.rx;
    return y > meta.noseY + 20 && y < meta.lipY + 16 && lat < 0.36;
  }
  if (p.beardStyle === "goatee") {
    const lat = Math.abs(x - meta.cx) / meta.rx;
    return lat < 0.32 || (y > meta.lipY - 8 && lat < 0.5);
  }
  return true;
}

function copyPixel(out, from, index) {
  const o = index * 4;
  out[o] = from[o];
  out[o + 1] = from[o + 1];
  out[o + 2] = from[o + 2];
  out[o + 3] = 255;
}

function tintPixel(out, index, tint) {
  const o = index * 4;
  const lum = 0.25 * out[o] + 0.45 * out[o + 1] + 0.3 * out[o + 2];
  const scale = clamp(lum / 22, 0.35, 2.6);
  out[o] = clamp(out[o] * 0.15 + tint[0] * scale * 0.85, 0, 255);
  out[o + 1] = clamp(out[o + 1] * 0.15 + tint[1] * scale * 0.85, 0, 255);
  out[o + 2] = clamp(out[o + 2] * 0.15 + tint[2] * scale * 0.85, 0, 255);
}

function applyBeard(out, studio, p) {
  const { meta, photo, shaved, beard } = studio;
  const width = meta.width;
  const y0 = 1040;
  const y1 = Math.min(meta.height - 1, 1490);
  for (let y = y0; y <= y1; y += 1) {
    for (let x = 400; x <= 940 && x < width; x += 1) {
      const index = y * width + x;
      if (!beard[index]) continue;
      const keep = p.beard < 0.02 ? 0 : beardRegion(x, y, p, meta) ? p.beard : 0;
      if (keep > 0.97 || (keep > 0 && hash01(x, y) < keep)) copyPixel(out, photo, index);
      else copyPixel(out, shaved, index);
    }
  }
}

function applyTint(out, studio, p, keep) {
  if (!p.tint) return;
  const { meta, hair } = studio;
  const width = meta.width;
  for (let y = 320; y <= 900 && y < meta.height; y += 1) {
    for (let x = 180; x <= 1080 && x < width; x += 1) {
      const index = y * width + x;
      if (keep ? keep[index] : hair[index]) tintPixel(out, index, p.tint);
    }
  }
}

/**
 * @param {object} p lengthCm, fade, curl, volume, part, mess, mohawk, fringeCm,
 *   stubble, beard, beardStyle, tint, photoLock
 */
export function compose(studio, p) {
  const { meta, photo, bald, hair } = studio;
  const width = meta.width;
  const height = meta.height;
  if (p.photoLock && !p.tint && p.beard > 0.97 && (p.beardStyle || "full") === "full") {
    return photo;
  }
  const out = new Uint8ClampedArray(photo.length);
  const keep = new Uint8Array(width * height);

  if (p.photoLock) {
    out.set(photo);
    applyBeard(out, studio, p);
    applyTint(out, studio, p, null);
    return out;
  }

  out.set(photo);
  const cx = meta.cx;
  const cy = meta.cy;
  const rx = meta.rx;
  const ry = meta.ry;
  const px = meta.pxPerCm;
  const hl = meta.hairline;
  const lengthPx = p.lengthCm * px * (1 + 0.22 * (p.volume || 0));
  const usePhotoHair = p.lengthCm >= 1.15;
  const partX = cx + (p.part || 0) * rx * 0.22;
  const partOn = Math.abs(p.part || 0) > 0.2 && usePhotoHair;
  const colKept = new Uint8Array(width);

  if (usePhotoHair) {
    for (let y = 300; y <= 880 && y < height; y += 1) {
      for (let x = 200; x <= 1080 && x < width; x += 1) {
        const index = y * width + x;
        if (!hair[index]) continue;
        const lat = Math.abs(x - cx) / (rx * 0.92);
        const above = hl[x] - y;
        if (above <= -4) continue;
        const side = clamp((lat - 0.1) / 0.55, 0, 1);
        let sideCut = (p.fade || 0) * side;
        if (p.mohawk > 0) {
          const crest = clamp((lat - 0.2) / 0.08, 0, 1);
          sideCut = Math.max(sideCut, crest);
        }
        const cap = Math.sqrt(Math.max(0, 1 - (lat / 1.05) ** 2));
        const n = hash01(x, y);
        let maxAbove = lengthPx * (1 - 0.96 * sideCut) * (0.72 + 0.28 * cap);
        maxAbove *= 1 + (n - 0.5) * ((p.curl || 0) * 0.38 + (p.mess || 0) * 0.22);
        const k = clamp((maxAbove - above) / 16, 0, 1);
        let kept = k > 0.7 || (k > 0.08 && n < k);
        if (kept && partOn && Math.abs(x - partX) < 2.2 && above > 14 && above < lengthPx * 0.72 && lat < 0.4) {
          kept = false;
        }
        if (!kept) continue;
        keep[index] = 1;
        colKept[x] = 1;
      }
    }
  }

  const usedBald = new Uint8Array(width * height);
  for (let y = 300; y <= 780 && y < height; y += 1) {
    const ny = (y - cy) / ry;
    for (let x = 180; x <= 1100 && x < width; x += 1) {
      const index = y * width + x;
      if (keep[index]) continue;
      const above = hl[x] - y;
      const nx = (x - cx) / rx;
      const inHead = nx * nx + ny * ny <= 1.02;
      const clearShadow = !colKept[x] && above < 0 && above > -58 && inHead;
      if (hair[index] || (inHead && above >= 0) || clearShadow) {
        copyPixel(out, bald, index);
        usedBald[index] = 1;
      }
    }
  }

  const stubble = p.stubble || 0;
  if (stubble > 0.02) {
    for (let y = 345; y <= 740 && y < height; y += 1) {
      for (let x = 330; x <= 990 && x < width; x += 1) {
        const index = y * width + x;
        if (!usedBald[index]) continue;
        const lat = Math.abs(x - cx) / (rx * 0.92);
        if (lat > 0.98) continue;
        const above = hl[x] - y;
        if (above < -4 || above > 380) continue;
        const dens = (0.05 + 0.22 * stubble) * clamp((above + 8) / 80, 0.25, 1);
        if (hash01(x + 19, y + 7) >= dens) continue;
        const o = index * 4;
        out[o] = (out[o] * 0.72) | 0;
        out[o + 1] = (out[o + 1] * 0.72) | 0;
        out[o + 2] = (out[o + 2] * 0.72) | 0;
      }
    }
  }

  if ((p.fringeCm || 0) > 0.15 && usePhotoHair) {
    const drop = Math.min(64, Math.round(p.fringeCm * px));
    for (let dy = 1; dy <= drop; dy += 1) {
      for (let x = 0; x < width; x += 1) {
        const lat = Math.abs(x - cx) / (rx * 0.92);
        if (lat > 0.46) continue;
        const feather = clamp(1 - Math.max(0, lat - 0.02) / 0.4, 0, 1);
        const alpha = feather * (1 - (dy - 1) / drop);
        if (alpha < 0.2) continue;
        const srcY = clamp(Math.round(hl[x] - 14 - (dy % 15)), 0, height - 1);
        const dstY = clamp(Math.round(hl[x] + 1 + dy), 0, height - 1);
        const src = (srcY * width + x) * 4;
        const lum = 0.25 * photo[src] + 0.45 * photo[src + 1] + 0.3 * photo[src + 2];
        if (lum >= 70) continue;
        const dstIndex = dstY * width + x;
        const dst = dstIndex * 4;
        const inv = 1 - alpha;
        out[dst] = out[dst] * inv + photo[src] * alpha;
        out[dst + 1] = out[dst + 1] * inv + photo[src + 1] * alpha;
        out[dst + 2] = out[dst + 2] * inv + photo[src + 2] * alpha;
        keep[dstIndex] = 1;
      }
    }
  }

  applyTint(out, studio, p, keep);
  applyBeard(out, studio, p);
  return out;
}
