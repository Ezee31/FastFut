import * as THREE from "three";
import { skullField } from "../head.js";

const SEGMENTS = 9;

function makeRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/** How much hair a spot on the scalp carries: 0 shaved, 1 full length. */
function hairAmount(point, skull, style) {
  const relY = (point.y - skull.center[1]) / skull.radii[1];
  const relZ = (point.z - skull.center[2]) / skull.radii[2];
  const lateral = Math.abs(point.x) / skull.radii[0];
  const line = style.fadeLine - lateral * style.fadeSlope;
  let amount = Math.max(0, Math.min(1, (relY - line) / Math.max(style.fadeSoft, 1e-3)));
  if (style.mohawk > 0) {
    const crest = Math.max(0, Math.min(1, (style.mohawkWidth + 0.06 - lateral) / 0.08));
    amount = Math.min(amount, Math.max(crest, 1 - style.mohawk));
  }
  // Nothing grows on the forehead or the temples.
  if (relZ > 0.25 && relY < -0.05) amount = 0;
  // Short hair continues down the nape and thins out, instead of stopping
  // on the occiput and leaving a hard edge above the neck.
  if (relZ < -0.12 && relY < 0.05 && relY > -0.92) {
    const down = Math.max(0, Math.min(1, (-0.05 - relY) / 0.85));
    const nape = (1 - down) * 0.5 * Math.min(1, (-relZ - 0.12) / 0.45);
    amount = Math.max(amount, nape);
  }
  return amount;
}



class Mesh {
  constructor() {
    this.position = [];
    this.uv = [];
    this.tangent = [];
    this.shade = [];
    this.tint = [];
    this.alpha = [];
    this.index = [];
  }

  push(point, u, v, tangent, shade, tint, alpha) {
    this.position.push(point.x, point.y, point.z);
    this.uv.push(u, v);
    this.tangent.push(tangent.x, tangent.y, tangent.z);
    this.shade.push(shade);
    this.tint.push(tint);
    this.alpha.push(alpha);
    return this.position.length / 3 - 1;
  }

  quad(a, b, c, d) {
    this.index.push(a, b, c, b, d, c);
  }

  geometry() {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(this.position, 3));
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(this.uv, 2));
    geometry.setAttribute("cardTangent", new THREE.Float32BufferAttribute(this.tangent, 3));
    geometry.setAttribute("cardShade", new THREE.Float32BufferAttribute(this.shade, 1));
    geometry.setAttribute("cardTint", new THREE.Float32BufferAttribute(this.tint, 1));
    geometry.setAttribute("cardAlpha", new THREE.Float32BufferAttribute(this.alpha, 1));
    geometry.setIndex(this.index);
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    return geometry;
  }
}

function flowAt(point, normal, skull, style, target) {
  const swirl = new THREE.Vector3(...skull.swirl)
    .multiply(new THREE.Vector3(...skull.radii))
    .add(new THREE.Vector3(...skull.center));
  const away = target.copy(point).sub(swirl);
  away.addScaledVector(normal, -away.dot(normal));
  if (away.lengthSq() < 1e-6) away.set(0, -1, 0);
  away.normalize();
  const relZ = (point.z - skull.center[2]) / skull.radii[2];
  const frontness = Math.max(0, relZ);
  const bias = new THREE.Vector3()
    .addScaledVector(new THREE.Vector3(0, 0, 1), style.flow - frontness * (1 - style.flow) * 0.9)
    .addScaledVector(new THREE.Vector3(0, 1, 0), style.lift + frontness * 0.55)
    .addScaledVector(new THREE.Vector3(Math.sign(point.x) || 1, 0, 0), style.part);
  bias.addScaledVector(normal, -bias.dot(normal));
  away.multiplyScalar(1 - style.styling).addScaledVector(bias, style.styling);
  if (away.lengthSq() < 1e-6) away.set(0, -1, 0);
  return away.normalize();
}

/** How far the hair mass stands off the scalp, in centimetres. */
function capLift(style) {
  return 0.3 + style.volume * 1.5 + Math.min(style.lengthCm, 9) * 0.16;
}

/**
 * The cap: an opaque layer just above the scalp so the hair reads as a mass
 * instead of separate ribbons. Game hair is built the same way.
 */
function buildCap(head, sampler, style, mesh, capU, field) {
  const rows = 22;
  const cols = 72;
  const upper = head.shell.upperSpan;
  const skull = head.skull;
  const lift = capLift(style);
  const normal = new THREE.Vector3();
  const tangent = new THREE.Vector3();
  const grid = [];
  for (let r = 0; r < rows; r += 1) {
    const v = (r / (rows - 1)) * style.napeV;
    const line = [];
    for (let c = 0; c < cols; c += 1) {
      const u = (c / (cols - 1)) * upper;
      const hit = sampler.sample(u, v);
      const amount = hairAmount(hit.position, skull, style);
      field.normalAt(hit.position, normal);
      const point = hit.position.clone().addScaledVector(normal, lift * (0.35 + 0.65 * amount));
      flowAt(point, normal, skull, style, tangent);
      // Fade the cap at the hairline so the cards carry the edge.
      const relZ = (hit.position.z - skull.center[2]) / skull.radii[2];
      const front = Math.max(0, Math.min(1, (relZ - 0.1) / 0.4));
      // Wobble the edge per column so the hairline is not a drawn line.
      const wobble = 0.035 + 0.05 * (0.5 + 0.5 * Math.sin(c * 2.7) * Math.cos(c * 0.9));
      const hairline = Math.min(1, v / wobble);
      const alpha = amount > 0.04 ? Math.min(1, amount * 1.6) * (1 - front * (1 - hairline)) : 0;
      const id = mesh.push(point, capU, 0.4, tangent, 0.78, 1, alpha);
      line.push(id);
    }
    grid.push(line);
  }
  for (let r = 0; r < rows - 1; r += 1) {
    for (let c = 0; c < cols - 1; c += 1) {
      mesh.quad(grid[r][c], grid[r][c + 1], grid[r + 1][c], grid[r + 1][c + 1]);
    }
  }
}

function rootCandidates(head, style, random) {
  const upper = head.shell.upperSpan;
  const list = [];
  const rings = style.rings ?? 26;
  for (let ring = 0; ring < rings; ring += 1) {
    const v = (ring / (rings - 1)) * style.napeV;
    const around = Math.round(
      (style.perRing ?? 30) * (0.7 + 0.55 * Math.sin(Math.PI * (0.18 + 0.82 * (1 - v / style.napeV))))
    );
    for (let i = 0; i < around; i += 1) {
      const u = ((i + 0.5) / around + (random() - 0.5) / around) * upper;
      const jitter = (random() - 0.5) * (style.napeV / rings) * 0.9;
      list.push([Math.max(0.001, Math.min(upper - 0.001, u)), Math.max(0.004, v + jitter)]);
    }
  }
  return list;
}

const DOWN = new THREE.Vector3(0, -1, 0);

/** Walks one strand from the scalp: flow first, then gravity, then curl. */
function walkStrand(root, style, field, skull, params, field_tmp) {
  const { lengthCm, curlPhase, curlFreq, curlAmp, fringeDrop, front, sweep, lift, amount } = params;
  const normal = field.normalAt(root, new THREE.Vector3());
  const direction = flowAt(root, normal, skull, style, new THREE.Vector3());
  if (front > 0) {
    // A fringe sweeps outward, it does not hang in a straight line.
    direction.addScaledVector(new THREE.Vector3(Math.sign(root.x) || 1, 0, 0), front * sweep);
    direction.normalize();
  }
  const dir = direction.clone();
  const side = new THREE.Vector3().crossVectors(dir, normal).normalize();
  const localNormal = normal.clone();
  const point = root.clone().addScaledVector(normal, lift * (0.3 + 0.7 * amount) + 0.06);
  const segLength = lengthCm / SEGMENTS;
  const rootY = root.y;
  const path = [];
  for (let s = 0; s <= SEGMENTS; s += 1) {
    const t = s / SEGMENTS;
    path.push({ point: point.clone(), dir: dir.clone(), side: side.clone(), normal: localNormal.clone() });
    if (s === SEGMENTS) break;
    point.addScaledVector(dir, segLength);
    const wave = Math.sin(curlPhase + t * Math.PI * 2 * curlFreq) * curlAmp;
    point.addScaledVector(side, wave * 0.5);
    point.addScaledVector(localNormal, style.volume * segLength * 0.14 * (1 - t));
    dir.addScaledVector(DOWN, style.gravity * 0.55 * (0.25 + t));
    dir.addScaledVector(localNormal, -style.cling * 0.32);
    dir.normalize();
    field.push(point, 0.3 + style.volume * 0.9);
    if (point.z > skull.center[2] + skull.radii[2] * 0.25) {
      point.y = Math.max(point.y, rootY - fringeDrop);
    }
    field.normalAt(point, localNormal);
    side.crossVectors(dir, localNormal).normalize();
  }
  return path;
}

function strandParams(style, random, amount, front, options = {}) {
  const wisp = options.wisp ?? false;
  const short = options.short ?? false;
  let lengthCm = style.lengthCm * (0.45 + 0.65 * amount) * (0.82 + 0.36 * random());
  if (wisp) lengthCm *= 1.35;
  if (short) lengthCm *= 0.42;
  const segLength = lengthCm / SEGMENTS;
  return {
    lengthCm,
    amount,
    front,
    wisp,
    curlPhase: random() * Math.PI * 2,
    curlFreq: style.curlFreq * (0.85 + 0.3 * random()),
    curlAmp: style.curl * Math.min(segLength * 2.4, lengthCm * 0.32),
    fringeDrop:
      (style.flow > 0.45 ? 3.2 : 1.0) * (0.5 + style.lengthCm * 0.12) * (0.7 + 0.6 * random()),
    sweep: 0.25 + 0.5 * random(),
    lift: capLift(style),
  };
}

/** Builds the cap plus the hair cards for one style. */
export function buildHair(head, positions, sampler, style, options = {}) {
  const random = makeRandom(style.seed ?? 7);
  const skull = head.skull;
  const field = options.field ?? skullField(skull);
  const strips = options.strips ?? 9;
  const hairStrips = options.hairStrips ?? strips - 1;
  const capU = (hairStrips + 0.5) / strips;
  const mesh = new Mesh();
  const tmp = new THREE.Vector3();
  const mask = [];

  buildCap(head, sampler, style, mesh, capU, field);

  // Clumps: real hair falls in locks, so every card is pulled toward the path of
  // its nearest clump. Without this the cards read as separate ribbons.
  const clumpCount = Math.max(8, Math.round(18 + style.lengthCm * 2.2));
  const clumps = [];
  for (let i = 0; i < clumpCount; i += 1) {
    const u = random() * head.shell.upperSpan;
    const v = random() * style.napeV * 0.85;
    const hit = sampler.sample(u, v);
    const amount = hairAmount(hit.position, skull, style);
    if (amount <= 0.05) continue;
    const relZ = (hit.position.z - skull.center[2]) / skull.radii[2];
    const front = Math.max(0, Math.min(1, (relZ - 0.25) / 0.4));
    const params = strandParams(style, random, amount, front);
    clumps.push({ u, v, path: walkStrand(hit.position, style, field, skull, params) });
  }

  for (const [u, v] of rootCandidates(head, style, random)) {
    if (random() > (style.density ?? 1)) continue;
    const hit = sampler.sample(u, v);
    const root = hit.position;
    const amount = hairAmount(root, skull, style);
    if (amount <= 0.05) continue;
    const relZ = (root.z - skull.center[2]) / skull.radii[2];
    const front = Math.max(0, Math.min(1, (relZ - 0.25) / 0.4));
    // Break the hairline: a few short strands start below it, on the forehead.
    const short = front > 0 && v < 0.05 && random() < 0.45;
    if (short) root.addScaledVector(hit.alongV, -(0.25 + random() * 0.55));
    const wisp = random() < 0.24;
    const params = strandParams(style, random, amount, front, { wisp, short });
    if (params.lengthCm < 0.15) continue;
    mask.push([u, v, amount]);

    const path = walkStrand(root, style, field, skull, params);
    // Converge toward the clump, more as the strand gets further from the root.
    let clump = null;
    let best = Infinity;
    for (const candidate of clumps) {
      const du = candidate.u - u;
      const dv = candidate.v - v;
      const distance = du * du + dv * dv * 4;
      if (distance < best) {
        best = distance;
        clump = candidate;
      }
    }
    const converge = clump && !wisp ? Math.max(0, 0.42 - best * 1.6) : 0;

    const widthCm =
      style.widthCm *
      (0.4 + 0.6 * Math.min(1, amount * 1.4)) *
      (wisp ? 0.55 + 0.25 * random() : 0.85 + 0.4 * random());
    // Roll the card around the growth direction. Flat cards disappear when the
    // camera looks at their edge, which is what made the hair read as spikes.
    const roll = (random() - 0.5) * (wisp ? 0.9 : 0.55);
    const strip = wisp
      ? hairStrips - 2 + Math.floor(random() * 2)
      : Math.min(hairStrips - 3, Math.floor(random() * (hairStrips - 2)));
    const stripU0 = strip / strips;
    const stripU1 = (strip + 1) / strips;
    const tint = 0.85 + 0.3 * random();
    const shade = 0.68 + 0.4 * amount;
    const twist = (random() - 0.5) * 0.7;

    let previous = null;
    for (let s = 0; s <= SEGMENTS; s += 1) {
      const t = s / SEGMENTS;
      const frame = path[s];
      const point = frame.point.clone();
      if (converge > 0) point.lerp(clump.path[s].point, converge * t * t);
      const width = widthCm * (1 - 0.45 * Math.pow(t, 1.2));
      const facing = frame.side.clone().multiplyScalar(Math.cos(roll)).addScaledVector(frame.normal, Math.sin(roll));
      if (facing.lengthSq() < 1e-6) facing.copy(frame.side);
      facing.normalize();
      const offset = facing.multiplyScalar(width * 0.5).addScaledVector(frame.normal, twist * width * t * 0.25);
      const a = mesh.push(tmp.copy(point).sub(offset), stripU0, t, frame.dir, shade, tint, 1);
      const b = mesh.push(tmp.copy(point).add(offset), stripU1, t, frame.dir, shade, tint, 1);
      if (previous) mesh.quad(previous[0], previous[1], a, b);
      previous = [a, b];
    }
  }

  return { geometry: mesh.geometry(), cards: mask.length, mask };
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
  const strength = Math.min(1, 0.5 + style.lengthCm * 0.22);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, y0, w, h);
  ctx.clip();
  for (const [u, v, amount] of mask) {
    const px = x0 + u * w;
    const py = y0 + v * h;
    const radius = 6 + 10 * amount;
    const alpha = 0.26 * strength * (0.4 + amount);
    const gradient = ctx.createRadialGradient(px, py, 0, px, py, radius);
    gradient.addColorStop(0, `rgba(26,19,16,${alpha.toFixed(3)})`);
    gradient.addColorStop(1, "rgba(26,19,16,0)");
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
