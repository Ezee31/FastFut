import * as THREE from "three";

const VERT = /* glsl */ `
attribute vec3 cardTangent;
attribute float cardShade;
attribute float cardTint;
attribute float cardAlpha;
attribute vec2 scalpUv;
varying vec2 vUv;
varying vec2 vScalp;
varying vec3 vNormal;
varying vec3 vTangent;
varying vec3 vView;
varying float vShade;
varying float vTint;
varying float vAlong;
varying float vAlpha;

void main() {
  vUv = uv;
  vScalp = scalpUv;
  vAlpha = cardAlpha;
  vNormal = normalize(normalMatrix * normal);
  vTangent = normalize(normalMatrix * cardTangent);
  vec4 viewPos = modelViewMatrix * vec4(position, 1.0);
  vView = -viewPos.xyz;
  vShade = cardShade;
  vTint = cardTint;
  vAlong = uv.y;
  gl_Position = projectionMatrix * viewPos;
}
`;

const FRAG = /* glsl */ `
precision highp float;
uniform sampler2D uStrips;
uniform vec3 uRoot;
uniform vec3 uTip;
uniform vec3 uKeyDir;
uniform vec3 uKeyColor;
uniform vec3 uFillDir;
uniform vec3 uFillColor;
uniform vec3 uRimDir;
uniform vec3 uRimColor;
uniform vec3 uAmbient;
uniform float uSheen;
uniform float uGloss;
uniform float uAlphaTest;
uniform float uAlphaMax;
uniform float uOpacity;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vTangent;
varying vec3 vView;
varying float vShade;
varying float vTint;
varying float vAlong;
varying float vAlpha;
varying vec2 vScalp;

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float strandSpec(vec3 t, vec3 n, vec3 l, vec3 v, float shift, float power) {
  vec3 tt = normalize(t + n * shift);
  vec3 h = normalize(l + v);
  float dotTH = dot(tt, h);
  float sinTH = sqrt(max(0.0, 1.0 - dotTH * dotTH));
  float atten = smoothstep(-1.0, 0.0, dotTH);
  return atten * pow(sinTH, power);
}

float strandDiffuse(vec3 t, vec3 l) {
  float dotTL = dot(t, l);
  return sqrt(max(0.0, 1.0 - dotTL * dotTL));
}

void main() {
  vec4 strip = texture2D(uStrips, vUv);
  float alpha = strip.a * vAlpha * uOpacity;

  // Fibers across the shell, and a broken edge so the hairline is not a cut mesh.
  float fibers = 0.0;
  if (vScalp.x + vScalp.y > 0.001) {
    float col = vScalp.x * 160.0;
    float id = floor(col);
    float across = fract(col);
    float strandMask = smoothstep(0.42, 0.08, abs(across - 0.5));
    fibers = strandMask * step(0.28, hash12(vec2(id, floor(vScalp.y * 18.0))));
    // Fine dither on the contour. Coarse fiber holes read as polygon teeth.
    float fuzz = hash12(vScalp * vec2(220.0, 80.0));
    fuzz = fuzz * 0.6 + hash12(vScalp * vec2(48.0, 20.0) + 3.1) * 0.4;
    float rim = smoothstep(0.9, 0.2, alpha);
    alpha *= mix(1.0, smoothstep(0.08, 0.62, fuzz), rim);
  }
  if (alpha < uAlphaTest || alpha >= uAlphaMax) discard;

  vec3 n = normalize(vNormal);
  vec3 v = normalize(vView);
  if (dot(n, v) < 0.0) n = -n;
  vec3 t = normalize(vTangent);

  // Strand value from the card texture keeps the drawn variation.
  float strand = 0.45 + 0.55 * strip.r;
  strand = max(strand, fibers);
  vec3 albedo = mix(uRoot, uTip, clamp(vAlong * 1.15, 0.0, 1.0));
  albedo *= 0.72 + 0.46 * strand;
  albedo *= vTint;
  // Roots sit in shadow, tips catch light.
  float occlusion = mix(0.72, 1.0, clamp(vAlong * 1.1 + 0.15, 0.0, 1.0)) * vShade;

  vec3 lighting = uAmbient * 0.9;
  lighting += uKeyColor * strandDiffuse(t, uKeyDir) * 1.15;
  lighting += uFillColor * strandDiffuse(t, uFillDir) * 0.42;
  lighting += uRimColor * max(0.0, dot(n, uRimDir)) * 0.62;
  vec3 color = albedo * lighting * occlusion;

  // Two shifted lobes: a tight white one and a broad one tinted by the hair.
  float primary = strandSpec(t, n, uKeyDir, v, 0.10, mix(60.0, 180.0, uGloss));
  float secondary = strandSpec(t, n, uKeyDir, v, -0.06, mix(10.0, 30.0, uGloss));
  color += uKeyColor * primary * uSheen * 0.42 * occlusion * strand;
  color += (albedo + uKeyColor * 0.06) * secondary * uSheen * 3.2 * occlusion;
  float rimSpec = strandSpec(t, n, uRimDir, v, 0.08, 70.0);
  color += uRimColor * rimSpec * uSheen * 0.55 * occlusion;

  gl_FragColor = vec4(color, alpha);
}
`;

export function createHairMaterials(strips) {
  const uniforms = {
    uStrips: { value: strips },
    uRoot: { value: new THREE.Color(0.018, 0.014, 0.013) },
    uTip: { value: new THREE.Color(0.036, 0.026, 0.022) },
    uKeyDir: { value: new THREE.Vector3(-0.35, 0.72, 0.6).normalize() },
    uKeyColor: { value: new THREE.Color("#fff0dd") },
    uFillDir: { value: new THREE.Vector3(0.7, 0.1, 0.5).normalize() },
    uFillColor: { value: new THREE.Color("#b9cbff") },
    uRimDir: { value: new THREE.Vector3(0.1, 0.55, -0.85).normalize() },
    uRimColor: { value: new THREE.Color("#ffd9ab") },
    uAmbient: { value: new THREE.Color("#5d5348") },
    uSheen: { value: 0.5 },
    uGloss: { value: 0.5 },
    uAlphaTest: { value: 0.5 },
    uAlphaMax: { value: 10 },
    uOpacity: { value: 1 },
  };
  const solid = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: VERT,
    fragmentShader: FRAG,
    side: THREE.DoubleSide,
    transparent: false,
    depthWrite: true,
  });
  const blended = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.clone(uniforms),
    vertexShader: VERT,
    fragmentShader: FRAG,
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
  });
  blended.uniforms.uStrips = uniforms.uStrips;
  // The blended pass only paints the soft edges the solid pass discarded.
  blended.uniforms.uAlphaTest.value = 0.03;
  blended.uniforms.uAlphaMax.value = 0.5;
  const shared = [
    "uRoot", "uTip", "uKeyDir", "uKeyColor", "uFillDir", "uFillColor",
    "uRimDir", "uRimColor", "uAmbient", "uSheen", "uGloss",
  ];
  for (const key of shared) blended.uniforms[key] = uniforms[key];
  return { solid, blended, uniforms };
}
