import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { PRESETS, HAIR_COLORS, BEARD_STYLES, fadeLabel } from "./presets.js";
import { buildHairGeometry, createHairMaterial, SKIN_FRAG, SKIN_VERT, toLinearColor } from "./hair.js";

const canvas = document.querySelector("#view");
const loader = document.querySelector("#loader");
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  preserveDrawingBuffer: true,
  alpha: false,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
scene.background = new THREE.Color("#14110f");

const camera = new THREE.PerspectiveCamera(32, window.innerWidth / window.innerHeight, 1, 20000);
const controls = new OrbitControls(camera, canvas);
controls.enablePan = false;
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.autoRotateSpeed = 0.8;

const bust = new THREE.Group();
scene.add(bust);

const key = new THREE.DirectionalLight("#fff1df", 2.4);
key.position.set(-0.6, 1.1, 1.2);
scene.add(key);
const fill = new THREE.DirectionalLight("#c9d7ff", 0.55);
fill.position.set(1.1, 0.3, 0.6);
scene.add(fill);
const rim = new THREE.DirectionalLight("#ffe2c2", 1.7);
rim.position.set(0.2, 0.8, -1.3);
scene.add(rim);
scene.add(new THREE.AmbientLight("#fff5ea", 0.28));

const hairMat = createHairMaterial();
const beardMat = createHairMaterial();
let hairMesh;
let beardMesh;
let skinMat;
let model;
let params;
let activePreset = PRESETS[0];
let naturalLinear = [0.04, 0.03, 0.03];
let colorId = "natural";
let frameTarget = null;

const VIEWS = [
  { id: "front", name: "Frente", place: (c) => new THREE.Vector3(c.x, c.y, c.z + model.frame.faceHeight * 1.25) },
  { id: "three", name: "3/4", place: (c) => new THREE.Vector3(c.x + model.frame.faceHeight * 0.85, c.y + model.frame.faceHeight * 0.05, c.z + model.frame.faceHeight * 0.85) },
  { id: "side", name: "Perfil", place: (c) => new THREE.Vector3(c.x + model.frame.faceHeight * 1.3, c.y, c.z + model.frame.faceHeight * 0.05) },
  { id: "back", name: "Nuca", place: (c) => new THREE.Vector3(c.x, c.y, c.z - model.frame.faceHeight * 1.35) },
  { id: "top", name: "Arriba", place: (c) => new THREE.Vector3(c.x + model.frame.faceHeight * 0.05, c.y + model.frame.faceHeight * 1.25, c.z + model.frame.faceHeight * 0.42) },
];

init().catch((error) => {
  console.error(error);
  loader.textContent = "No se pudo modelar la cara. Recarga la página.";
});

async function init() {
  const [data, texture] = await Promise.all([
    fetch(`${import.meta.env.BASE_URL}face.json`).then((response) => {
      if (!response.ok) throw new Error("face.json");
      return response.json();
    }),
    new THREE.TextureLoader().loadAsync(`${import.meta.env.BASE_URL}texture.jpg`),
  ]);
  model = data;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.flipY = false;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  naturalLinear = toLinearColor(data.colors.hair);

  buildFace(texture);
  buildSkin();
  buildCape();
  buildShadow();
  frameCamera();
  buildUi();
  const query = new URLSearchParams(location.search);
  const preset = PRESETS.find((item) => item.id === query.get("preset")) || PRESETS[0];
  applyPreset(preset, true);
  if (query.get("hair") === "0" && hairMesh) {
    hairMesh.visible = false;
    beardMesh.visible = false;
  }
  const view = VIEWS.find((item) => item.id === query.get("view"));
  if (view) camera.position.copy(view.place(controls.target));
  controls.update();
  loader.classList.add("hidden");
  window.__studioReady = true;
  animate();
}

function meshFrom(desc, material, withColor = false) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(desc.positions, 3));
  if (desc.uvs) geo.setAttribute("uv", new THREE.Float32BufferAttribute(desc.uvs, 2));
  if (withColor) {
    const linear = new Float32Array(desc.colors.length);
    for (let i = 0; i < desc.colors.length; i += 3) {
      const c = new THREE.Color().setRGB(desc.colors[i], desc.colors[i + 1], desc.colors[i + 2], THREE.SRGBColorSpace);
      linear[i] = c.r;
      linear[i + 1] = c.g;
      linear[i + 2] = c.b;
    }
    geo.setAttribute("color", new THREE.Float32BufferAttribute(linear, 3));
    geo.setAttribute("edge", new THREE.Float32BufferAttribute(desc.edge, 1));
  }
  geo.setIndex(desc.indices);
  orientOutward(geo);
  const mesh = new THREE.Mesh(geo, material);
  bust.add(mesh);
  return mesh;
}

function orientOutward(geo) {
  geo.computeVertexNormals();
  const pos = geo.attributes.position;
  const nor = geo.attributes.normal;
  let dot = 0;
  const step = Math.max(1, Math.floor(pos.count / 40));
  for (let i = 0; i < pos.count; i += step) {
    dot += pos.getX(i) * nor.getX(i) + pos.getY(i) * nor.getY(i) + pos.getZ(i) * nor.getZ(i);
  }
  if (dot < 0) {
    const index = geo.getIndex();
    for (let i = 0; i < index.count; i += 3) {
      const b = index.getX(i + 1);
      index.setX(i + 1, index.getX(i + 2));
      index.setX(i + 2, b);
    }
    index.needsUpdate = true;
    geo.computeVertexNormals();
  }
}

function buildFace(texture) {
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.62,
    metalness: 0,
    emissive: new THREE.Color("#ffffff"),
    emissiveMap: texture,
    emissiveIntensity: 0.38,
  });
  meshFrom(model.face, material);
}

function buildSkin() {
  const skin = toLinearColor(model.colors.skin);
  skinMat = new THREE.ShaderMaterial({
    vertexShader: SKIN_VERT,
    fragmentShader: SKIN_FRAG,
    uniforms: {
      uSkin: { value: new THREE.Color(skin[0], skin[1], skin[2]) },
      uHair: { value: new THREE.Color(naturalLinear[0], naturalLinear[1], naturalLinear[2]) },
      uKey: { value: new THREE.Vector3(-0.35, 0.75, 0.55).normalize() },
      uCam: { value: new THREE.Vector3() },
      uChin: { value: model.frame.chinY },
      uForehead: { value: model.frame.foreheadY },
      uHalf: { value: model.frame.halfWidth },
      uFade: { value: 0.6 },
      uBald: { value: 0 },
    },
  });
  meshFrom(model.skin, skinMat, true);
}

function buildCape() {
  const material = new THREE.MeshStandardMaterial({
    color: "#1a1d24",
    roughness: 0.92,
    metalness: 0.02,
  });
  meshFrom(model.cape, material);
}

function buildShadow() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  const grd = g.createRadialGradient(64, 64, 10, 64, 64, 62);
  grd.addColorStop(0, "rgba(0,0,0,0.5)");
  grd.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(model.frame.faceHeight * 0.85, 48), mat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = model.frame.chinY - model.frame.faceHeight * 0.55;
  bust.add(shadow);
}

function frameCamera() {
  const box = new THREE.Box3().setFromObject(bust.children[0]);
  const center = box.getCenter(new THREE.Vector3());
  center.y = (model.frame.chinY + model.frame.foreheadY) * 0.5 + model.frame.faceHeight * 0.04;
  center.z -= model.frame.faceHeight * 0.02;
  controls.target.copy(center);
  const dist = model.frame.faceHeight * 1.25;
  camera.position.set(center.x + dist * 0.34, center.y + dist * 0.04, center.z + dist);
  camera.near = model.frame.faceHeight * 0.02;
  camera.far = model.frame.faceHeight * 30;
  camera.updateProjectionMatrix();
  controls.minDistance = model.frame.faceHeight * 0.45;
  controls.maxDistance = model.frame.faceHeight * 3.4;
  controls.minPolarAngle = 0.22;
  controls.maxPolarAngle = 1.55;
  controls.update();
  scene.fog = new THREE.Fog("#14110f", model.frame.faceHeight * 2.2, model.frame.faceHeight * 7);
}

function currentColor() {
  const chosen = HAIR_COLORS.find((c) => c.id === colorId);
  if (!chosen || !chosen.tint) return naturalLinear;
  return toLinearColor(chosen.tint);
}

function readParams() {
  const beardStyle = document.querySelector("#beard-styles button.active")?.dataset.id || activePreset.beardStyle;
  params = {
    ...activePreset,
    lengthCm: Number(document.querySelector("#length").value),
    fade: Number(document.querySelector("#fade").value),
    curl: Number(document.querySelector("#curl").value),
    volume: Number(document.querySelector("#volume").value),
    flow: Number(document.querySelector("#flow").value),
    part: Number(document.querySelector("#part").value),
    mess: Number(document.querySelector("#mess").value),
    beard: Number(document.querySelector("#beard").value),
    beardStyle,
    _upc: model.frame.unitsPerCm,
    _half: model.frame.halfWidth,
  };
  return params;
}

function rebuildHair() {
  const p = readParams();
  const color = currentColor();
  if (hairMesh) {
    bust.remove(hairMesh);
    hairMesh.geometry.dispose();
  }
  if (beardMesh) {
    bust.remove(beardMesh);
    beardMesh.geometry.dispose();
  }
  hairMesh = new THREE.Mesh(buildHairGeometry(model.hairRoots, p, color, "hair"), hairMat);
  beardMesh = new THREE.Mesh(buildHairGeometry(model.beardRoots, p, color, "beard"), beardMat);
  hairMesh.frustumCulled = false;
  beardMesh.frustumCulled = false;
  bust.add(hairMesh, beardMesh);
  skinMat.uniforms.uFade.value = p.fade;
  skinMat.uniforms.uBald.value = p.lengthCm < 0.45 ? 1 : p.lengthCm < 1.1 ? 0.55 : 0;
  skinMat.uniforms.uHair.value.setRGB(color[0], color[1], color[2]);
  document.querySelector("#length-read").textContent = `${p.lengthCm.toFixed(1)} cm`;
  document.querySelector("#fade-read").textContent = fadeLabel(p.fade);
  document.querySelector("#curl-read").textContent = p.curl < 0.2 ? "Liso" : p.curl < 0.55 ? "Onda" : "Rizo";
  document.querySelector("#flow-read").textContent = p.flow < -0.35 ? "Adelante" : p.flow > 0.35 ? "Atrás" : "Natural";
  const beardCm = p.beard * 3.4;
  document.querySelector("#beard-read").textContent = p.beard < 0.05 ? "Rasurado" : `${beardCm.toFixed(1)} cm`;
}

function setSlider(id, value) {
  const el = document.querySelector(id);
  el.value = String(value);
}

function applyPreset(preset, silent = false) {
  activePreset = preset;
  setSlider("#length", preset.lengthCm);
  setSlider("#fade", preset.fade);
  setSlider("#curl", preset.curl);
  setSlider("#volume", preset.volume);
  setSlider("#flow", preset.flow);
  setSlider("#part", preset.part);
  setSlider("#mess", preset.mess);
  setSlider("#beard", preset.beard);
  document.querySelectorAll("#beard-styles button").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.id === preset.beardStyle);
  });
  document.querySelectorAll("#presets button").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.id === preset.id);
  });
  const name = document.querySelector("#cut-name strong");
  const detail = document.querySelector("#cut-name span");
  name.textContent = preset.name;
  detail.textContent = preset.detail;
  if (!silent) name.animate([{ opacity: 0.2 }, { opacity: 1 }], { duration: 220 });
  rebuildHair();
}

function buildUi() {
  const grid = document.querySelector("#presets");
  for (const preset of PRESETS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.id = preset.id;
    btn.innerHTML = `<strong>${preset.name}</strong><span>${preset.detail}</span>`;
    btn.addEventListener("click", () => applyPreset(preset));
    grid.appendChild(btn);
  }

  const styles = document.querySelector("#beard-styles");
  for (const style of BEARD_STYLES) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.id = style.id;
    btn.textContent = style.name;
    btn.addEventListener("click", () => {
      styles.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b === btn));
      rebuildHair();
    });
    styles.appendChild(btn);
  }

  const colors = document.querySelector("#colors");
  for (const color of HAIR_COLORS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.id = color.id;
    const tint = color.tint || model.colors.hair;
    btn.innerHTML = `<i class="swatch" style="background:rgb(${tint.map((v) => Math.round(v * 255)).join(",")})"></i>${color.name}`;
    btn.addEventListener("click", () => {
      colorId = color.id;
      colors.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b === btn));
      rebuildHair();
    });
    colors.appendChild(btn);
  }
  colors.querySelector("button").classList.add("active");

  for (const id of ["#length", "#fade", "#curl", "#volume", "#flow", "#part", "#mess", "#beard"]) {
    document.querySelector(id).addEventListener("input", () => {
      document.querySelector("#cut-name span").textContent = "Ajuste personal";
      rebuildHair();
    });
  }

  document.querySelector("#btn-reset").addEventListener("click", () => applyPreset(activePreset));
  document.querySelector("#btn-random").addEventListener("click", () => {
    const next = PRESETS[Math.floor(Math.random() * PRESETS.length)];
    applyPreset(next);
  });
  document.querySelector("#btn-shot").addEventListener("click", () => {
    renderer.render(scene, camera);
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `corte-${activePreset.id}.png`;
    a.click();
  });

  const views = document.querySelector("#views");
  for (const view of VIEWS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = view.name;
    btn.addEventListener("click", () => {
      frameTarget = view.place(controls.target);
      views.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b === btn));
    });
    views.appendChild(btn);
  }

  const refs = document.querySelector("#refs");
  for (const ref of model.refs) {
    const fig = document.createElement("figure");
    const src = `${import.meta.env.BASE_URL}${ref.src}`;
    fig.innerHTML = `<img alt="${ref.label}" src="${src}" /><figcaption>${ref.label}</figcaption>`;
    refs.appendChild(fig);
  }

  window.addEventListener("keydown", (event) => {
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      const index = PRESETS.findIndex((p) => p.id === activePreset.id);
      const dir = event.key === "ArrowRight" ? 1 : -1;
      applyPreset(PRESETS[(index + dir + PRESETS.length) % PRESETS.length]);
    }
    if (event.key === "r") controls.autoRotate = !controls.autoRotate;
  });
}

function animate() {
  requestAnimationFrame(animate);
  const t = performance.now() * 0.001;
  hairMat.uniforms.uTime.value = t;
  beardMat.uniforms.uTime.value = t;
  hairMat.uniforms.uCam.value.copy(camera.position);
  beardMat.uniforms.uCam.value.copy(camera.position);
  skinMat.uniforms.uCam.value.copy(camera.position);
  if (frameTarget) {
    camera.position.lerp(frameTarget, 0.12);
    if (camera.position.distanceTo(frameTarget) < model.frame.faceHeight * 0.01) frameTarget = null;
  }
  controls.update();
  renderer.render(scene, camera);
}

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
