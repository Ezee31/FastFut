import { PRESETS, HAIR_COLORS, BEARD_STYLES, fadeLabel } from "./presets.js";
import { loadStudio, compose } from "./photo.js";

const view = document.querySelector("#view");
const ctx = view.getContext("2d");
const loader = document.querySelector("#loader");
const offscreen = document.createElement("canvas");
const offctx = offscreen.getContext("2d", { willReadFrequently: true });

let studio;
let activePreset = PRESETS[0];
let colorId = "natural";
let hairTouched = false;
let frame = 0;

const query = new URLSearchParams(location.search);
if (query.get("clean") === "1") document.body.classList.add("clean");

loadStudio()
  .then((loaded) => {
    studio = loaded;
    offscreen.width = loaded.meta.width;
    offscreen.height = loaded.meta.height;
    buildUi();
    if (query.get("color")) colorId = query.get("color");
    const preset = PRESETS.find((item) => item.id === query.get("preset")) || PRESETS[0];
    applyPreset(preset, true);
    loader.classList.add("hidden");
    window.__studioReady = true;
  })
  .catch((error) => {
    console.error(error);
    loader.textContent = "No se pudo abrir la foto. Recarga la página.";
  });

function fringeCm(preset, flow) {
  if (flow > -0.2) return 0;
  const extra = Math.max(0, (preset.fringe || 1) - 0.9);
  return Math.min(1.7, extra * 1.8 * Math.abs(flow));
}

function readParams() {
  const beardStyle = document.querySelector("#beard-styles button.active")?.dataset.id || activePreset.beardStyle;
  const flow = Number(document.querySelector("#flow").value);
  const lengthCm = Number(document.querySelector("#length").value);
  const fade = Number(document.querySelector("#fade").value);
  const color = HAIR_COLORS.find((item) => item.id === colorId);
  return {
    photoLock: Boolean(activePreset.photo) && !hairTouched,
    lengthCm,
    fade,
    curl: Number(document.querySelector("#curl").value),
    volume: Number(document.querySelector("#volume").value),
    part: Number(document.querySelector("#part").value),
    mess: Number(document.querySelector("#mess").value),
    mohawk: activePreset.mohawk || 0,
    fringeCm: fringeCm(activePreset, flow),
    stubble: lengthCm < 1.2 ? 0.7 : 0.2 + fade * 0.45,
    beard: Number(document.querySelector("#beard").value),
    beardStyle,
    tint: color && color.tint ? color.tint.map((channel) => Math.round(channel * 255)) : null,
  };
}

function paint() {
  if (!studio) return;
  const params = readParams();
  const pixels = compose(studio, params);
  offctx.putImageData(new ImageData(pixels, studio.meta.width, studio.meta.height), 0, 0);
  present();
  const beardRead = params.beard < 0.08 ? "Rasurada" : params.beard > 0.92 ? "La de la foto" : "Recortada";
  document.querySelector("#length-read").textContent = `${params.lengthCm.toFixed(1)} cm`;
  document.querySelector("#fade-read").textContent = fadeLabel(params.fade);
  document.querySelector("#curl-read").textContent = params.curl < 0.2 ? "Liso" : params.curl < 0.55 ? "Onda" : "Rizo";
  const flow = Number(document.querySelector("#flow").value);
  document.querySelector("#flow-read").textContent = flow < -0.35 ? "Adelante" : flow > 0.35 ? "Atrás" : "Natural";
  document.querySelector("#beard-read").textContent = beardRead;
}

function schedule() {
  if (frame) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    paint();
  });
}

function present() {
  const clean = document.body.classList.contains("clean");
  const narrow = !clean && window.innerWidth <= 860;
  const left = clean ? 8 : narrow ? 8 : 400;
  const top = narrow ? 78 : 16;
  const bottomGap = narrow ? window.innerHeight * 0.46 : 16;
  const availW = Math.max(120, window.innerWidth - left - 16);
  const availH = Math.max(120, window.innerHeight - top - bottomGap);
  const scale = Math.min(availW / offscreen.width, availH / offscreen.height);
  const width = offscreen.width * scale;
  const height = offscreen.height * scale;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  view.width = Math.round(window.innerWidth * dpr);
  view.height = Math.round(window.innerHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = "#12100e";
  ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(offscreen, left + (availW - width) / 2, top + (availH - height) / 2, width, height);
}

function setSlider(id, value) {
  document.querySelector(id).value = String(value);
}

function applyPreset(preset, silent = false) {
  activePreset = preset;
  hairTouched = false;
  if (frame) cancelAnimationFrame(frame);
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
  document.querySelectorAll("#colors button").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.id === colorId);
  });
  const name = document.querySelector("#cut-name strong");
  const detail = document.querySelector("#cut-name span");
  name.textContent = preset.name;
  detail.textContent = preset.detail;
  if (!silent) name.animate([{ opacity: 0.2 }, { opacity: 1 }], { duration: 220 });
  paint();
}

function buildUi() {
  const grid = document.querySelector("#presets");
  for (const preset of PRESETS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.id = preset.id;
    btn.innerHTML = `<strong>${preset.name}</strong><span>${preset.detail}</span>`;
    btn.addEventListener("click", () => {
      colorId = "natural";
      applyPreset(preset);
    });
    grid.appendChild(btn);
  }

  const styles = document.querySelector("#beard-styles");
  for (const style of BEARD_STYLES) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.id = style.id;
    btn.textContent = style.name;
    btn.addEventListener("click", () => {
      styles.querySelectorAll("button").forEach((item) => item.classList.toggle("active", item === btn));
      schedule();
    });
    styles.appendChild(btn);
  }

  const colors = document.querySelector("#colors");
  for (const color of HAIR_COLORS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.id = color.id;
    const tint = color.tint || [0.07, 0.06, 0.055];
    btn.innerHTML = `<i class="swatch" style="background:rgb(${tint.map((v) => Math.round(v * 255)).join(",")})"></i>${color.name}`;
    btn.addEventListener("click", () => {
      colorId = color.id;
      colors.querySelectorAll("button").forEach((item) => item.classList.toggle("active", item === btn));
      schedule();
    });
    colors.appendChild(btn);
  }

  for (const id of ["#length", "#fade", "#curl", "#volume", "#flow", "#part", "#mess"]) {
    document.querySelector(id).addEventListener("input", () => {
      hairTouched = true;
      document.querySelector("#cut-name span").textContent = "Ajuste personal";
      schedule();
    });
  }
  document.querySelector("#beard").addEventListener("input", () => {
    document.querySelector("#cut-name span").textContent = "Ajuste personal";
    schedule();
  });

  document.querySelector("#btn-reset").addEventListener("click", () => {
    colorId = "natural";
    applyPreset(activePreset);
  });
  document.querySelector("#btn-random").addEventListener("click", () => {
    colorId = "natural";
    applyPreset(PRESETS[Math.floor(Math.random() * PRESETS.length)]);
  });
  document.querySelector("#btn-shot").addEventListener("click", () => {
    const link = document.createElement("a");
    link.href = offscreen.toDataURL("image/jpeg", 0.92);
    link.download = `corte-${activePreset.id}.jpg`;
    link.click();
  });

  const refs = document.querySelector("#refs");
  for (const ref of studio.meta.refs) {
    const fig = document.createElement("figure");
    fig.innerHTML = `<img alt="${ref.label}" src="${import.meta.env.BASE_URL}${ref.src}" /><figcaption>${ref.label}</figcaption>`;
    refs.appendChild(fig);
  }

  window.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    const index = PRESETS.findIndex((item) => item.id === activePreset.id);
    const dir = event.key === "ArrowRight" ? 1 : -1;
    colorId = "natural";
    applyPreset(PRESETS[(index + dir + PRESETS.length) % PRESETS.length]);
  });
}

window.addEventListener("resize", () => present());
