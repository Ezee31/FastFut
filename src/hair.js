import * as THREE from "three";

const HAIR_VERT = /* glsl */ `
attribute vec3 tangent;
attribute vec3 color;
attribute float seed;
uniform float uTime;
varying vec3 vCol;
varying vec3 vTan;
varying vec3 vWorld;
varying vec2 vUv;
varying float vSeed;
void main() {
  vec3 transformed = position;
  float sway = sin(uTime * 1.35 + seed * 6.2831 + position.y * 0.01) * uv.y * uv.y;
  transformed.x += sway * 1.6;
  vec4 world = modelMatrix * vec4(transformed, 1.0);
  vWorld = world.xyz;
  vTan = normalize(mat3(modelMatrix) * tangent);
  vCol = color;
  vUv = uv;
  vSeed = seed;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const HAIR_FRAG = /* glsl */ `
uniform vec3 uKey;
uniform vec3 uFill;
uniform vec3 uRim;
uniform vec3 uCam;
varying vec3 vCol;
varying vec3 vTan;
varying vec3 vWorld;
varying vec2 vUv;
varying float vSeed;

#include <common>

void main() {
  float across = abs(vUv.x - 0.5) * 2.0;
  float fiber = 0.72 + 0.28 * sin(vUv.x * 46.0 + vSeed * 30.0);
  float strand = smoothstep(1.0, 0.22, across) * fiber;
  strand *= smoothstep(0.0, 0.05, vUv.y);
  if (strand < 0.42) discard;

  vec3 T = normalize(vTan);
  vec3 V = normalize(uCam - vWorld);
  vec3 L = normalize(uKey);
  float tl = dot(T, L);
  float tv = dot(T, V);
  float spec = pow(max(tl * tv + sqrt(max(1.0 - tl * tl, 0.0)) * sqrt(max(1.0 - tv * tv, 0.0)), 0.0), 26.0);
  vec3 H = normalize(L + V);
  float band = pow(clamp(1.0 - abs(dot(T, H)), 0.0, 1.0), 18.0);
  float diff = 0.42 + 0.7 * sqrt(max(1.0 - tl * tl, 0.0));
  float fill = 0.22 * sqrt(max(1.0 - dot(T, normalize(uFill)) * dot(T, normalize(uFill)), 0.0));
  vec3 albedo = max(vCol, vec3(0.02, 0.014, 0.011));
  vec3 col = albedo * (0.55 + 0.9 * diff + fill);
  col += albedo * band * 1.4;
  col += vec3(0.85, 0.78, 0.7) * spec * 0.035;
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export function createHairMaterial() {
  return new THREE.ShaderMaterial({
    vertexShader: HAIR_VERT,
    fragmentShader: HAIR_FRAG,
    uniforms: {
      uTime: { value: 0 },
      uKey: { value: new THREE.Vector3(0.2, 0.8, 0.6) },
      uFill: { value: new THREE.Vector3(-0.6, 0.2, 0.4) },
      uRim: { value: new THREE.Vector3(-0.2, 0.4, -0.8) },
      uCam: { value: new THREE.Vector3() },
    },
    side: THREE.DoubleSide,
    depthWrite: true,
  });
}

export const SKIN_VERT = /* glsl */ `
attribute vec3 color;
attribute float edge;
uniform float uChin;
uniform float uForehead;
uniform float uHalf;
varying vec3 vColor;
varying vec3 vNormalW;
varying vec3 vWorld;
varying float vHeight;
varying float vLateral;
varying float vEdge;
void main() {
  vColor = color;
  vEdge = edge;
  vHeight = (position.y - uChin) / max(uForehead - uChin, 1.0);
  vLateral = abs(position.x) / max(uHalf, 1.0);
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export const SKIN_FRAG = /* glsl */ `
uniform vec3 uSkin;
uniform vec3 uHair;
uniform vec3 uKey;
uniform vec3 uCam;
uniform float uFade;
uniform float uBald;
varying vec3 vColor;
varying vec3 vNormalW;
varying vec3 vWorld;
varying float vHeight;
varying float vLateral;
varying float vEdge;

#include <common>

void main() {
  vec3 skin = mix(uSkin, vColor, 0.72);
  skin = mix(skin, vColor, clamp(vEdge, 0.0, 1.0));
  float hairRegion = smoothstep(0.58, 0.9, vHeight);
  float fadeLine = mix(0.46, 1.02, uFade);
  float side = smoothstep(0.5, 0.86, vLateral);
  float below = 1.0 - smoothstep(fadeLine - 0.14, fadeLine + 0.04, vHeight);
  float reveal = max(uBald, side * below * smoothstep(0.15, 0.55, uFade));
  vec3 albedo = mix(skin, uHair, hairRegion * (1.0 - uBald));
  albedo = mix(albedo, skin, reveal);
  float neckShade = 1.0 - smoothstep(0.12, 0.5, vHeight);
  albedo *= mix(1.0, 0.55, neckShade);

  vec3 N = normalize(vNormalW);
  vec3 L = normalize(uKey);
  vec3 V = normalize(uCam - vWorld);
  float wrap = clamp(dot(N, L) * 0.55 + 0.45, 0.0, 1.0);
  float rim = pow(1.0 - max(dot(N, V), 0.0), 2.6);
  float stubble = fract(sin(dot(vWorld.xy, vec2(12.9898, 78.233))) * 43758.5453);
  albedo = mix(albedo, albedo * (0.55 + 0.45 * stubble), (1.0 - uBald) * 0.18 * hairRegion);
  vec3 col = albedo * (0.38 + 0.85 * wrap);
  col += vec3(1.0, 0.86, 0.75) * rim * 0.12;
  col += vec3(1.0, 0.9, 0.82) * pow(max(dot(normalize(L + V), N), 0.0), 28.0) * 0.08;
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

function hash(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function smoothstep(edge0, edge1, x) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0 || 1)));
  return t * t * (3 - 2 * t);
}

function strandLength(zone, lateral, height, rx, phase, params, kind) {
  const upc = params._upc;
  if (kind === "beard") {
    if (params.beard <= 0.04) return 0;
    if (params.beardStyle === "mustache" && zone !== 8) return 0;
    if (params.beardStyle === "goatee" && zone === 7 && lateral > 0.38) return 0;
    if (zone === 8 && params.beardStyle !== "mustache") return 0;
    const cm = params.beard * (zone === 8 ? 0.6 : 1.3);
    return cm * upc * (0.65 + 0.55 * hash(phase * 90 + zone));
  }

  let cm = params.lengthCm;
  const fadeLine = 0.4 + params.fade * 0.62;
  const onSide = lateral > 0.56 || zone === 2 || zone === 3 || zone === 6;
  if (onSide && height < fadeLine) {
    const k = smoothstep(fadeLine, fadeLine - 0.18, height);
    cm = params.lengthCm * (1 - k) * 0.22 + params.stubbleCm * k;
  }
  if (params.mohawk > 0.05 && lateral > 0.7 - params.mohawk * 0.52) {
    cm = params.stubbleCm;
  }
  if (Math.abs(params.part) > 0.2) {
    const partX = params.part * params._half * 0.48;
    const dist = Math.abs(rx - partX) / params._half;
    if (dist < 0.045 && height > 0.82 && lateral < 0.45) cm *= 0.22;
  }
  if (zone === 4) cm *= params.backMul;
  if (zone === 1) cm *= params.fringe;
  if (zone === 5) cm *= 0.9 + params.volume * 0.2;
  cm *= 0.82 + 0.28 * hash(phase * 40 + zone * 3);
  if (hash(phase * 17) > params.density) return 0;
  return Math.max(0, cm) * upc;
}

function pushStrand(buffers, root, normal, lateral, height, zone, phase, len, params, color, seed) {
  const segs = len > params._upc * 3 ? 7 : 5;
  const pts = new Float32Array((segs + 1) * 3);
  const upc = params._upc;
  const clump = Math.round(root[0] / (upc * 1.4)) * 19
    + Math.round(root[1] / (upc * 1.4)) * 7
    + Math.round(root[2] / (upc * 1.4));
  const clumpPhase = hash(clump);
  phase = phase * 0.35 + clumpPhase * 0.65;
  const partX = params.part * params._half * 0.5;
  const fall = Math.sign(root[0] - partX) || (clumpPhase > 0.5 ? 1 : -1);
  // Stay on the scalp. Volume lifts a little; gravity bends the strand down.
  let dx = normal[0] * (0.22 + params.volume * 0.35) + fall * params.spread * 0.28;
  let dy = 0.15 + (1 - params.gravity) * 0.7;
  let dz = normal[2] * 0.12 - params.flow * 0.55;
  if (zone === 1) {
    dy -= 0.45;
    dz += 0.55 * Math.min(params.fringe, 1.4);
  }
  if (zone === 4) dz -= 0.28 * Math.min(params.backMul, 1.6);
  let mag = Math.hypot(dx, dy, dz) || 1;
  dx /= mag;
  dy /= mag;
  dz /= mag;

  let px = root[0] + normal[0] * upc * 0.06;
  let py = root[1] + normal[1] * upc * 0.06;
  let pz = root[2] + normal[2] * upc * 0.06;
  pts[0] = px;
  pts[1] = py;
  pts[2] = pz;
  const step = len / segs;
  const amp = params.curl * Math.min(len * 0.18, upc * 0.85);
  for (let s = 1; s <= segs; s++) {
    const t = s / segs;
    dy -= params.gravity * 0.28;
    mag = Math.hypot(dx, dy, dz) || 1;
    dx /= mag;
    dy /= mag;
    dz /= mag;
    const bx = px + dx * step;
    const by = py + dy * step;
    const bz = pz + dz * step;
    const ang = t * params.curlFreq * Math.PI * 2 + phase * Math.PI * 2;
    const mess = (hash(phase * 50 + s) - 0.5) * params.mess * upc * 0.12;
    pts[s * 3] = bx + Math.sin(ang) * amp + mess;
    pts[s * 3 + 1] = by + Math.sin(ang * 2) * amp * 0.25 * params.curl;
    pts[s * 3 + 2] = bz + Math.cos(ang) * amp * 0.65;
    px = bx;
    py = by;
    pz = bz;
  }

  const baseW = params._upc * (zone === 8 || zone === 7 ? 0.08 : 0.11) * (0.7 + hash(seed) * 0.55);
  const base = buffers.positions.length / 3;
  for (let s = 0; s <= segs; s++) {
    const t = s / segs;
    const i0 = Math.max(0, s - 1) * 3;
    const i1 = Math.min(segs, s + 1) * 3;
    let tx = pts[i1] - pts[i0];
    let ty = pts[i1 + 1] - pts[i0 + 1];
    let tz = pts[i1 + 2] - pts[i0 + 2];
    const tm = Math.hypot(tx, ty, tz) || 1;
    tx /= tm;
    ty /= tm;
    tz /= tm;
    let sx = ty * normal[2] - tz * normal[1];
    let sy = tz * normal[0] - tx * normal[2];
    let sz = tx * normal[1] - ty * normal[0];
    let sm = Math.hypot(sx, sy, sz);
    if (sm < 1e-5) {
      sx = -ty;
      sy = tx;
      sz = 0;
      sm = Math.hypot(sx, sy, sz) || 1;
    }
    sx /= sm;
    sy /= sm;
    sz /= sm;
    const w = baseW * (1 - t * 0.78);
    const jitter = (hash(seed + 4) - 0.5) * 0.08;
    const cr = Math.min(1, Math.max(0, color[0] * (0.86 + jitter) + (hash(seed + 1) - 0.5) * 0.03));
    const cg = Math.min(1, Math.max(0, color[1] * (0.86 + jitter) + (hash(seed + 2) - 0.5) * 0.02));
    const cb = Math.min(1, Math.max(0, color[2] * (0.9 + jitter)));
    for (const sign of [-1, 1]) {
      buffers.positions.push(pts[s * 3] + sx * w * sign, pts[s * 3 + 1] + sy * w * sign, pts[s * 3 + 2] + sz * w * sign);
      buffers.tangents.push(tx, ty, tz);
      buffers.colors.push(cr, cg, cb);
      buffers.uvs.push(sign < 0 ? 0 : 1, t);
      buffers.seeds.push(phase);
    }
  }
  for (let s = 0; s < segs; s++) {
    const a = base + s * 2;
    buffers.indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
}

export function buildHairGeometry(packedRoots, params, color, kind) {
  const buffers = {
    positions: [],
    tangents: [],
    colors: [],
    uvs: [],
    seeds: [],
    indices: [],
  };
  const n = packedRoots.length / 10;
  for (let i = 0; i < n; i++) {
    const o = i * 10;
    const root = [packedRoots[o], packedRoots[o + 1], packedRoots[o + 2]];
    const normal = [packedRoots[o + 3], packedRoots[o + 4], packedRoots[o + 5]];
    const nm = Math.hypot(normal[0], normal[1], normal[2]);
    if (nm < 1e-6) {
      normal[0] = 0;
      normal[1] = 1;
      normal[2] = 0;
    } else {
      normal[0] /= nm;
      normal[1] /= nm;
      normal[2] /= nm;
    }
    const lateral = packedRoots[o + 6];
    const height = packedRoots[o + 7];
    const zone = Math.round(packedRoots[o + 8]);
    const phase = packedRoots[o + 9];
    const len = strandLength(zone, lateral, height, root[0], phase, params, kind);
    if (len < params._upc * 0.08) continue;
    const copies = 1;
    for (let c = 0; c < copies; c++) {
      const shifted = [
        root[0] + (c ? (hash(i + 2) - 0.5) * params._upc * 0.12 : 0),
        root[1] + (c ? params._upc * 0.04 : 0),
        root[2] + (c ? (hash(i + 5) - 0.5) * params._upc * 0.12 : 0),
      ];
      pushStrand(buffers, shifted, normal, lateral, height, zone, phase, len * (c ? 0.92 : 1), params, color, i + c * 19);
    }
  }

  const geo = new THREE.BufferGeometry();
  if (!buffers.positions.length) {
    geo.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0], 3));
    return geo;
  }
  geo.setAttribute("position", new THREE.Float32BufferAttribute(buffers.positions, 3));
  geo.setAttribute("tangent", new THREE.Float32BufferAttribute(buffers.tangents, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(buffers.colors, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(buffers.uvs, 2));
  geo.setAttribute("seed", new THREE.Float32BufferAttribute(buffers.seeds, 1));
  geo.setIndex(buffers.indices);
  geo.computeBoundingSphere();
  return geo;
}

export function toLinearColor(rgb) {
  const c = new THREE.Color();
  c.setRGB(rgb[0], rgb[1], rgb[2], THREE.SRGBColorSpace);
  return [c.r, c.g, c.b];
}
