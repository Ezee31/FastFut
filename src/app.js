import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { createOrbit } from "./orbit.js";
import { STYLES, HAIR_COLORS, fadeLabel } from "./styles.js";
import { loadHead, landmarksToPoints, fitToCanonical, applyShape, applyBlink } from "./head.js";
import { scalpSampler, skullField } from "./head.js";
import { bakeAtlas } from "./atlas.js";
import { hairStripTexture } from "./hair/texture.js";
import { createHairMaterials } from "./hair/material.js";
import { buildHair, hairMaskTexture } from "./hair/build.js";
import { readFace } from "./tracker.js";
import { startScan } from "./capture.js";

const canvas = document.querySelector("#view");
const loader = document.querySelector("#loader");
const loaderText = document.querySelector("#loader span");

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color("#0d0c0b");
const camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 1, 600);
const orbit = createOrbit(camera, canvas);

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.05).texture;
scene.environmentIntensity = 0.42;

const keyLight = new THREE.DirectionalLight("#fff1dd", 2.5);
keyLight.position.set(-18, 24, 28);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.camera.near = 8;
keyLight.shadow.camera.far = 90;
keyLight.shadow.camera.left = -26;
keyLight.shadow.camera.right = 26;
keyLight.shadow.camera.top = 26;
keyLight.shadow.camera.bottom = -26;
keyLight.shadow.bias = -0.0006;
keyLight.shadow.normalBias = 0.06;
keyLight.shadow.radius = 3;
const fillLight = new THREE.DirectionalLight("#bfd0ff", 0.5);
fillLight.position.set(22, 4, 14);
const rimLight = new THREE.DirectionalLight("#ffd3a1", 1.7);
rimLight.position.set(5, 17, -28);
scene.add(keyLight, fillLight, rimLight, new THREE.AmbientLight("#4b433a", 0.45));

// Studio backdrop: a lit wall behind, falling off to the sides.
const backdrop = new THREE.Mesh(
  new THREE.SphereGeometry(180, 32, 24),
  new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {},
    vertexShader: /* glsl */ `
      varying vec3 vLocal;
      void main() {
        vLocal = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vLocal;
      void main() {
        vec3 dir = normalize(vLocal);
        float height = clamp(dir.y * 0.5 + 0.5, 0.0, 1.0);
        float centre = smoothstep(0.35, 1.0, dir.z * 0.5 + 0.5);
        vec3 far = vec3(0.035, 0.032, 0.030);
        vec3 near = vec3(0.115, 0.098, 0.086);
        vec3 colour = mix(far, near, centre * (0.35 + 0.65 * height));
        gl_FragColor = vec4(colour, 1.0);
      }
    `,
  })
);
backdrop.frustumCulled = false;
scene.add(backdrop);

const rig = new THREE.Group();
scene.add(rig);

const state = {
  head: null,
  captures: [],
  shape: null,
  animated: null,
  positions: null,
  geometry: null,
  mesh: null,
  skin: null,
  skinUniforms: null,
  hairSolid: null,
  hairBlend: null,
  hairMaterials: null,
  strips: null,
  style: STYLES[0],
  colorId: "natural",
  naturalHair: [34, 26, 22],
  sampler: null,
  live: null,
  liveMirror: true,
  blinkAt: 2.5,
  blink: 0,
  sway: new THREE.Quaternion(),
};

function status(text) {
  if (loaderText) loaderText.textContent = text;
}

init().catch((error) => {
  console.error(error);
  status("No se pudo abrir el estudio. Recargá la página.");
});

async function init() {
  status("Cargando cabeza…");
  state.head = await loadHead();
  buildMesh();
  state.strips = hairStripTexture();
  state.hairMaterials = createHairMaterials(state.strips.texture);
  buildUi();
  status("Leyendo tus fotos…");
  const captures = await defaultCaptures();
  if (!captures.length) throw new Error("no default capture");
  await useCaptures(captures);
  applyStyle(STYLES[0]);
  loader.classList.add("hidden");
  document.querySelector("#onboard").classList.toggle("hidden", true);
  window.__studioReady = true;
  animate();
}

function buildMesh() {
  const head = state.head;
  state.positions = new Float32Array(head.canonical.length);
  state.positions.set(head.canonical);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(state.positions, 3));
  geometry.setAttribute("uv", new THREE.BufferAttribute(head.uv, 2));
  if (head.ao) geometry.setAttribute("headAo", new THREE.BufferAttribute(head.ao, 1));
  geometry.setIndex(new THREE.BufferAttribute(head.indices, 1));
  geometry.computeVertexNormals();
  state.geometry = geometry;

  const skin = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: 0.78,
    metalness: 0,
    sheen: 0.18,
    sheenRoughness: 0.95,
    sheenColor: new THREE.Color("#ffd6c4"),
    clearcoat: 0,
    side: THREE.FrontSide,
  });
  const white = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
  white.needsUpdate = true;
  white.colorSpace = THREE.NoColorSpace;
  const maskUniform = { value: white };
  skin.onBeforeCompile = (shader) => {
    shader.uniforms.uHairMask = maskUniform;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nattribute float headAo;\nvarying float vHeadAo;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvHeadAo = headAo;");
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying float vHeadAo;\nuniform sampler2D uHairMask;"
      )
      .replace(
        "#include <map_fragment>",
        `#include <map_fragment>
        diffuseColor.rgb *= mix(vec3(0.8), vec3(1.0), clamp(vHeadAo, 0.0, 1.0));
        #ifdef USE_MAP
        diffuseColor.rgb *= texture2D(uHairMask, vMapUv).rgb;
        #endif`
      );
  };
  skin.customProgramCacheKey = () => "head-ao-mask";
  state.skin = skin;
  state.skinUniforms = maskUniform;
  state.mesh = new THREE.Mesh(geometry, skin);
  state.mesh.frustumCulled = false;
  state.mesh.castShadow = true;
  state.mesh.receiveShadow = true;
  rig.add(state.mesh);
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(src));
    image.src = src;
  });
}

async function trackImage(image, weight = 1) {
  const face = await readFace(image);
  if (!face) return null;
  const points = landmarksToPoints(face.landmarks, face.width, face.height);
  const pose = {};
  const space = fitToCanonical(state.head, points, null, pose);
  return {
    image,
    landmarks: face.landmarks,
    width: face.width,
    height: face.height,
    faceSpace: space,
    pose,
    weight,
  };
}

async function defaultCaptures() {
  const base = import.meta.env.BASE_URL;
  // One sharp frontal beats mixing photos shot with different light and lenses.
  const wanted = [[`${base}texture.jpg`, 1]];
  const out = [];
  for (const [src, weight] of wanted) {
    try {
      const image = await loadImage(src);
      const capture = await trackImage(image, weight);
      if (capture) out.push(capture);
    } catch (error) {
      console.warn("skip", src, error);
    }
  }
  return out;
}

export async function useCaptures(captures) {
  state.captures = captures;
  // Shape: the frontal capture leads, the others nudge it.
  const primary = captures[0];
  const shape = primary.faceSpace.slice();
  let total = 1;
  for (let i = 1; i < captures.length; i += 1) {
    const weight = captures[i].weight ?? 0.4;
    for (let k = 0; k < shape.length; k += 1) {
      shape[k] = (shape[k] * total + captures[i].faceSpace[k] * weight) / (total + weight);
    }
    total += weight;
  }
  state.shape = shape;
  state.animated = shape.slice();
  applyShape(state.head, shape, state.positions);
  state.geometry.attributes.position.needsUpdate = true;
  state.geometry.computeVertexNormals();
  state.sampler = scalpSampler(state.head, state.positions);

  status("Horneando tu textura…");
  const atlas = bakeAtlas(state.head, captures);
  state.skin.map = atlas.texture;
  state.skin.needsUpdate = true;
  state.naturalHair = atlas.hairColor;
  applyHairColor();
  rebuildHair();
  frameCamera();
}

function toLinear(color) {
  return color.map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
}

function applyHairColor() {
  const chosen = HAIR_COLORS.find((item) => item.id === state.colorId) || HAIR_COLORS[0];
  const uniforms = state.hairMaterials.uniforms;
  if (chosen.root) {
    uniforms.uRoot.value.setRGB(...chosen.root);
    uniforms.uTip.value.setRGB(...chosen.tip);
  } else {
    // Real hair reads through its sheen, so lift the tips well above the photo value.
    const linear = toLinear(state.naturalHair);
    uniforms.uRoot.value.setRGB(linear[0] * 0.9, linear[1] * 0.9, linear[2] * 0.9);
    uniforms.uTip.value.setRGB(
      Math.min(1, linear[0] * 3.4 + 0.02),
      Math.min(1, linear[1] * 3.4 + 0.016),
      Math.min(1, linear[2] * 3.4 + 0.014)
    );
  }
}

function rebuildHair() {
  if (!state.sampler) return;
  const style = readParams();
  for (const mesh of [state.hairSolid, state.hairBlend]) {
    if (!mesh) continue;
    rig.remove(mesh);
    mesh.geometry.dispose();
  }
  const built = buildHair(state.head, state.positions, state.sampler, style, {
    strips: state.strips.strips,
    hairStrips: state.strips.hairStrips,
  });
  state.hairSolid = new THREE.Mesh(built.geometry, state.hairMaterials.solid);
  state.hairBlend = new THREE.Mesh(built.geometry, state.hairMaterials.blended);
  state.hairSolid.frustumCulled = false;
  state.hairBlend.frustumCulled = false;
  state.hairSolid.castShadow = true;
  state.hairBlend.renderOrder = 3;
  rig.add(state.hairSolid, state.hairBlend);
  const mask = hairMaskTexture(state.head, built.mask, style);
  if (state.skinUniforms.value) state.skinUniforms.value.dispose();
  state.skinUniforms.value = mask;
  state.hairMaterials.uniforms.uSheen.value = style.sheen;
  state.hairMaterials.uniforms.uGloss.value = style.gloss;
  const count = document.querySelector("#card-count");
  if (count) count.textContent = `${built.cards} mechones`;
}

function readParams() {
  const base = state.style;
  const length = Number(document.querySelector("#length").value);
  const fade = Number(document.querySelector("#fade").value);
  const curl = Number(document.querySelector("#curl").value);
  const volume = Number(document.querySelector("#volume").value);
  const style = {
    ...base,
    lengthCm: length,
    fadeLine: fade,
    curl,
    curlFreq: base.curlFreq * (0.7 + curl * 0.8),
    volume,
  };
  document.querySelector("#length-read").textContent = `${length.toFixed(1)} cm`;
  document.querySelector("#fade-read").textContent = fadeLabel(fade);
  document.querySelector("#curl-read").textContent = curl < 0.2 ? "Liso" : curl < 0.55 ? "Onda" : "Rizo";
  return style;
}

function frameCamera() {
  // Frame the head, not the bust: chin to crown plus room for tall hair.
  const positions = state.positions;
  let top = -Infinity;
  for (let i = 0; i < state.head.faceCount; i += 1) {
    top = Math.max(top, positions[i * 3 + 1]);
  }
  const chin = positions[152 * 3 + 1];
  const crown = top + 9;
  const narrow = window.innerWidth <= 900;
  // On a phone the panel covers the bottom, so the head sits in the free space.
  const center = (crown + chin) / 2 - (narrow ? (crown - chin) * 0.28 : 0);
  orbit.frame(center, (crown - chin) * (narrow ? 1.15 : 1.4));
}

const VIEWS = [
  { id: "frente", name: "Frente", yaw: 0, pitch: 4 },
  { id: "tres", name: "3/4", yaw: 38, pitch: 4 },
  { id: "perfil", name: "Perfil", yaw: 88, pitch: 2 },
  { id: "nuca", name: "Nuca", yaw: 178, pitch: 6 },
  { id: "arriba", name: "Arriba", yaw: 8, pitch: 52 },
];

function goToView(view) {
  orbit.goTo(view.yaw, view.pitch);
}

function buildUi() {
  const grid = document.querySelector("#styles");
  for (const style of STYLES) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.id = style.id;
    button.innerHTML = `<strong>${style.name}</strong><span>${style.detail}</span>`;
    button.addEventListener("click", () => applyStyle(style));
    grid.appendChild(button);
  }
  const colors = document.querySelector("#colors");
  for (const color of HAIR_COLORS) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.id = color.id;
    const swatch = color.root
      ? color.tip.map((c) => Math.round(Math.min(1, c ** 0.45) * 255)).join(",")
      : "60,48,42";
    button.innerHTML = `<i class="swatch" style="background:rgb(${swatch})"></i>${color.name}`;
    button.addEventListener("click", () => {
      state.colorId = color.id;
      colors.querySelectorAll("button").forEach((item) => item.classList.toggle("active", item === button));
      applyHairColor();
    });
    colors.appendChild(button);
  }
  colors.querySelector("button").classList.add("active");

  for (const id of ["#length", "#fade", "#curl", "#volume"]) {
    document.querySelector(id).addEventListener("input", () => {
      document.querySelector("#cut-name span").textContent = "Ajuste tuyo";
      rebuildHair();
    });
  }
  const views = document.querySelector("#views");
  for (const view of VIEWS) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = view.name;
    button.addEventListener("click", () => {
      views.querySelectorAll("button").forEach((item) => item.classList.toggle("active", item === button));
      goToView(view);
    });
    views.appendChild(button);
  }
  document.querySelector("#btn-shot").addEventListener("click", () => {
    renderer.render(scene, camera);
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `corte-${state.style.id}.png`;
    link.click();
  });
  document.querySelector("#btn-rescan").addEventListener("click", () => {
    document.querySelector("#onboard").classList.remove("hidden");
  });
  document.querySelector("#btn-close-onboard").addEventListener("click", () => {
    document.querySelector("#onboard").classList.add("hidden");
  });
  document.querySelector("#btn-scan").addEventListener("click", () => {
    startScan({ state, trackImage, useCaptures, status });
  });
  document.querySelector("#file").addEventListener("change", async (event) => {
    const files = [...event.target.files];
    if (!files.length) return;
    document.querySelector("#onboard").classList.add("hidden");
    loader.classList.remove("hidden");
    status("Leyendo tus fotos…");
    const captures = [];
    for (const file of files) {
      try {
        const image = await loadImage(URL.createObjectURL(file));
        const capture = await trackImage(image, captures.length ? 0.45 : 1);
        if (capture) captures.push(capture);
      } catch (error) {
        console.warn(error);
      }
    }
    if (captures.length) {
      captures.sort((a, b) => Math.abs(a.pose.yaw) - Math.abs(b.pose.yaw));
      await useCaptures(captures);
    } else {
      status("No encontré una cara en esas fotos.");
      await new Promise((resolve) => setTimeout(resolve, 1600));
    }
    loader.classList.add("hidden");
  });
  window.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    const index = STYLES.findIndex((item) => item.id === state.style.id);
    const dir = event.key === "ArrowRight" ? 1 : -1;
    applyStyle(STYLES[(index + dir + STYLES.length) % STYLES.length]);
  });
}

function applyStyle(style) {
  state.style = style;
  document.querySelector("#length").value = String(style.lengthCm);
  document.querySelector("#fade").value = String(style.fadeLine);
  document.querySelector("#curl").value = String(style.curl);
  document.querySelector("#volume").value = String(style.volume);
  document.querySelectorAll("#styles button").forEach((button) => {
    button.classList.toggle("active", button.dataset.id === style.id);
  });
  const name = document.querySelector("#cut-name strong");
  name.textContent = style.name;
  document.querySelector("#cut-name span").textContent = style.detail;
  name.animate([{ opacity: 0.25 }, { opacity: 1 }], { duration: 220 });
  rebuildHair();
}

const keyDirView = new THREE.Vector3();
const fillDirView = new THREE.Vector3();
const rimDirView = new THREE.Vector3();
const clock = new THREE.Clock();

function updateLights() {
  const uniforms = state.hairMaterials.uniforms;
  keyDirView.copy(keyLight.position).normalize().transformDirection(camera.matrixWorldInverse);
  fillDirView.copy(fillLight.position).normalize().transformDirection(camera.matrixWorldInverse);
  rimDirView.copy(rimLight.position).normalize().transformDirection(camera.matrixWorldInverse);
  uniforms.uKeyDir.value.copy(keyDirView);
  uniforms.uFillDir.value.copy(fillDirView);
  uniforms.uRimDir.value.copy(rimDirView);
}

async function updateLive(time) {
  const live = state.live;
  if (!live || live.video.readyState < 2) return;
  const face = await readFace(live.video, { video: true, timestamp: performance.now() });
  if (!face) return;
  const points = landmarksToPoints(face.landmarks, face.width, face.height);
  const pose = {};
  const space = fitToCanonical(state.head, points, state.animated, pose);
  applyShape(state.head, space, state.positions);
  state.geometry.attributes.position.needsUpdate = true;
  state.geometry.computeVertexNormals();
  if (state.liveMirror && pose.quaternion) {
    rig.quaternion.slerp(pose.quaternion, 0.35);
  }
}

function idleAnimation(time) {
  if (!state.shape) return;
  state.animated.set(state.shape);
  // Close fast, open slower, then wait a few seconds.
  if (state.closing) {
    state.blink += 0.28;
    if (state.blink >= 1) state.closing = false;
  } else if (state.blink > 0) {
    state.blink -= 0.12;
    if (state.blink <= 0) {
      state.blink = 0;
      state.blinkAt = time + 2.4 + Math.random() * 3.6;
    }
  } else if (time > state.blinkAt) {
    state.closing = true;
  }
  applyBlink(state.animated, Math.max(0, Math.min(1, state.blink)));
  applyShape(state.head, state.animated, state.positions);
  state.geometry.attributes.position.needsUpdate = true;
  state.geometry.computeVertexNormals();
  const sway = new THREE.Euler(
    Math.sin(time * 0.31) * 0.022 + Math.sin(time * 0.17) * 0.01,
    Math.sin(time * 0.23) * 0.05,
    Math.sin(time * 0.19) * 0.012
  );
  state.sway.setFromEuler(sway);
  rig.quaternion.slerp(state.sway, 0.06);
}

let liveBusy = false;

function animate() {
  requestAnimationFrame(animate);
  const time = clock.getElapsedTime();
  if (state.live) {
    if (!liveBusy) {
      liveBusy = true;
      updateLive(time).finally(() => {
        liveBusy = false;
      });
    }
  } else {
    idleAnimation(time);
  }
  orbit.update();
  updateLights();
  renderer.render(scene, camera);
}

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (state.positions) frameCamera();
});

window.__debug = state;

export { state };
