import * as THREE from "three";

const SEGMENTS = 9;

function makeRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/**
 * Where hair can grow: the upper half of the shell grid, from the hairline at
 * the face oval back over the crown to the nape.
 */
function rootCandidates(head, sampler, style, random) {
  const upper = head.shell.upperSpan;
  const list = [];
  const rings = style.rings ?? 26;
  for (let ring = 0; ring < rings; ring += 1) {
    const v = (ring / (rings - 1)) * style.napeV;
    // More cards near the hairline and the crown, where the shape reads.
    const around = Math.round((style.perRing ?? 30) * (0.72 + 0.5 * Math.sin(Math.PI * (0.15 + 0.85 * (1 - v / style.napeV)))));
    for (let i = 0; i < around; i += 1) {
      const jitterU = (random() - 0.5) / around;
      const jitterV = (random() - 0.5) * (style.napeV / rings) * 0.9;
      const s = (i + 0.5) / around + jitterU;
      const u = Math.max(0.001, Math.min(upper - 0.001, s * upper));
      list.push([u, Math.max(0.004, v + jitterV)]);
    }
  }
  return list;
}

function skullPush(point, skull, margin) {
  const nx = (point.x - skull.center[0]) / (skull.radii[0] + margin);
  const ny = (point.y - skull.center[1]) / (skull.radii[1] + margin);
  const nz = (point.z - skull.center[2]) / (skull.radii[2] + margin);
  const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
  if (len >= 1) return;
  const scale = 1 / Math.max(len, 1e-4);
  point.set(
    skull.center[0] + nx * scale * (skull.radii[0] + margin),
    skull.center[1] + ny * scale * (skull.radii[1] + margin),
    skull.center[2] + nz * scale * (skull.radii[2] + margin)
  );
}

/**
 * Builds the hair cards for one style. Each card is a ribbon that starts flat on
 * the scalp, follows the flow field, then falls with gravity.
 */
export function buildHair(head, positions, sampler, style, options = {}) {
  const random = makeRandom(style.seed ?? 7);
  const skull = head.skull;
  const strips = options.strips ?? 8;
  const candidates = rootCandidates(head, sampler, style, random);
  const density = style.density ?? 1;

  const positionsOut = [];
  const uvsOut = [];
  const tangentsOut = [];
  const shadeOut = [];
  const tintOut = [];
  const indicesOut = [];

  const forward = new THREE.Vector3(0, 0, 1);
  const down = new THREE.Vector3(0, -1, 0);
  const up = new THREE.Vector3(0, 1, 0);
  const tmp = new THREE.Vector3();
  const mask = [];

  for (const [u, v] of candidates) {
    if (random() > density) continue;
    const hit = sampler.sample(u, v);
    const root = hit.position;
    let normal = hit.normal.clone();
    if (normal.dot(tmp.copy(root).sub(new THREE.Vector3(...skull.center))) < 0) normal.negate();

    const relY = (root.y - skull.center[1]) / skull.radii[1];
    const relZ = (root.z - skull.center[2]) / skull.radii[2];
    const lateral = Math.abs(root.x) / skull.radii[0];

    // Fade: the lower the scalp, the more the style shaves it off.
    const heightCut = style.fadeLine - lateral * style.fadeSlope;
    if (relY < heightCut) continue;
    const fadeBand = Math.min(1, (relY - heightCut) / Math.max(style.fadeSoft, 1e-3));
    if (style.mohawk > 0 && lateral > style.mohawkWidth && relY < style.fadeLine + 0.35) {
      if (random() > 0.08 * (1 - style.mohawk)) continue;
    }
    if (relZ > 0.2 && relY < -0.1) continue; // keep hair off the temples in front

    let lengthCm = style.lengthCm * (0.72 + 0.5 * fadeBand);
    lengthCm *= style.backMul > 0 && relZ < 0 ? 1 + (style.backMul - 1) * Math.min(1, -relZ) : 1;
    lengthCm *= 0.78 + 0.42 * random();
    if (lengthCm < 0.18) continue;

    mask.push([u, v, fadeBand]);

    // Flow: away from the swirl, biased by the style.
    const swirl = new THREE.Vector3(...skull.swirl).multiply(
      new THREE.Vector3(skull.radii[0], skull.radii[1], skull.radii[2])
    ).add(new THREE.Vector3(...skull.center));
    const awaySwirl = tmp.copy(root).sub(swirl);
    awaySwirl.addScaledVector(normal, -awaySwirl.dot(normal));
    if (awaySwirl.lengthSq() < 1e-6) awaySwirl.copy(hit.alongV);
    awaySwirl.normalize();
    const flowBias = new THREE.Vector3()
      .addScaledVector(forward, style.flow)
      .addScaledVector(up, style.lift)
      .addScaledVector(new THREE.Vector3(Math.sign(root.x) || 1, 0, 0), style.part);
    flowBias.addScaledVector(normal, -flowBias.dot(normal));
    const direction = awaySwirl.clone().multiplyScalar(1 - style.styling).addScaledVector(flowBias, style.styling);
    if (direction.lengthSq() < 1e-6) direction.copy(awaySwirl);
    direction.normalize();

    const binormal = new THREE.Vector3().crossVectors(direction, normal).normalize();
    const segLength = lengthCm / SEGMENTS;
    const curlPhase = random() * Math.PI * 2;
    const curlAmp = style.curl * Math.min(segLength * 2.2, lengthCm * 0.3);
    const curlFreq = style.curlFreq * (0.8 + 0.4 * random());
    const widthCm = style.widthCm * (0.78 + 0.5 * random());
    const strip = Math.min(strips - 1, Math.floor(random() * strips));
    const stripU0 = strip / strips;
    const stripU1 = (strip + 1) / strips;
    const tint = 0.82 + 0.36 * random();
    const shade = 0.72 + 0.34 * fadeBand;
    const twist = (random() - 0.5) * 0.6;

    const base = positionsOut.length / 3;
    const point = root.clone().addScaledVector(normal, 0.06);
    const dir = direction.clone();
    const side = binormal.clone();
    const localNormal = normal.clone();
    for (let s = 0; s <= SEGMENTS; s += 1) {
      const t = s / SEGMENTS;
      const width = widthCm * (1 - 0.62 * Math.pow(t, 1.4));
      const offset = side
        .clone()
        .multiplyScalar(width * 0.5)
        .addScaledVector(localNormal, twist * width * t * 0.5);
      positionsOut.push(
        point.x - offset.x, point.y - offset.y, point.z - offset.z,
        point.x + offset.x, point.y + offset.y, point.z + offset.z
      );
      const uMid = stripU0 + (stripU1 - stripU0);
      uvsOut.push(stripU0, t, uMid, t);
      tangentsOut.push(dir.x, dir.y, dir.z, dir.x, dir.y, dir.z);
      shadeOut.push(shade, shade);
      tintOut.push(tint, tint);

      if (s < SEGMENTS) {
        // Advance, then bend: gravity pulls down, stiffness keeps the shape.
        point.addScaledVector(dir, segLength);
        const wave = Math.sin(curlPhase + t * Math.PI * 2 * curlFreq) * curlAmp;
        point.addScaledVector(side, wave * 0.5);
        point.addScaledVector(localNormal, style.volume * segLength * 0.35 * (1 - t));
        dir.addScaledVector(down, style.gravity * 0.42 * (0.35 + t));
        dir.addScaledVector(localNormal, -style.cling * 0.2);
        dir.normalize();
        skullPush(point, skull, 0.35 + style.volume * 0.6);
        localNormal.copy(point).sub(new THREE.Vector3(...skull.center));
        localNormal.set(
          localNormal.x / (skull.radii[0] * skull.radii[0]),
          localNormal.y / (skull.radii[1] * skull.radii[1]),
          localNormal.z / (skull.radii[2] * skull.radii[2])
        );
        localNormal.normalize();
        side.crossVectors(dir, localNormal).normalize();
      }
    }
    for (let s = 0; s < SEGMENTS; s += 1) {
      const a = base + s * 2;
      indicesOut.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positionsOut, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvsOut, 2));
  geometry.setAttribute("cardTangent", new THREE.Float32BufferAttribute(tangentsOut, 3));
  geometry.setAttribute("cardShade", new THREE.Float32BufferAttribute(shadeOut, 1));
  geometry.setAttribute("cardTint", new THREE.Float32BufferAttribute(tintOut, 1));
  geometry.setIndex(indicesOut);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return { geometry, cards: mask.length, mask };
}

/** Darkens the scalp where hair grows, so roots and stubble read on the skin. */
export function hairMaskTexture(head, mask, style) {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);
  const rect = head.atlas.shell;
  const x0 = rect[0] * size;
  const y0 = (1 - rect[1] - rect[3]) * size;
  const w = rect[2] * size;
  const h = rect[3] * size;
  const strength = Math.min(0.82, 0.3 + style.lengthCm * 0.22);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, y0, w, h);
  ctx.clip();
  for (const [u, v, fade] of mask) {
    const px = x0 + u * w;
    const py = y0 + (1 - (1 - v)) * h;
    const radius = 7 + 9 * fade;
    const gradient = ctx.createRadialGradient(px, py, 0, px, py, radius);
    const alpha = 0.16 * strength * (0.45 + fade);
    gradient.addColorStop(0, `rgba(30,22,18,${alpha.toFixed(3)})`);
    gradient.addColorStop(1, "rgba(30,22,18,0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(px, py, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
