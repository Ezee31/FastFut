/**
 * Haircut styles. Lengths are centimetres, fadeLine is the height on the skull
 * where the clipper stops (0 is ear level, 0.65 is the hairline).
 */
const BASE = {
  lengthCm: 4.0,
  widthCm: 2.35,
  density: 1,
  rings: 28,
  perRing: 36,
  napeV: 0.56,
  fadeLine: -0.12,
  fadeSlope: 0.18,
  fadeSoft: 0.22,
  mohawk: 0,
  mohawkWidth: 0.34,
  flow: 0.1,
  lift: 0.2,
  part: 0,
  styling: 0.45,
  curl: 0.3,
  curlFreq: 1.6,
  volume: 0.3,
  gravity: 0.5,
  cling: 0.3,
  backMul: 1,
  sheen: 0.45,
  gloss: 0.45,
  seed: 11,
};

function style(id, name, detail, overrides) {
  return { id, name, detail, ...BASE, ...overrides };
}

export const STYLES = [
  style("actual", "Tu corte", "Rizado corto, degradado medio", {
    lengthCm: 4.2, curl: 0.55, curlFreq: 2.0, volume: 0.34, fadeLine: -0.02,
    styling: 0.28, lift: 0.22, cling: 0.45, widthCm: 2.5, perRing: 40, sheen: 0.48, seed: 3,
  }),
  style("fade-alto", "Degradado alto", "Arriba texturizado, lados a piel", {
    lengthCm: 4.4, curl: 0.5, curlFreq: 2.0, volume: 0.46, fadeLine: 0.3,
    fadeSoft: 0.12, lift: 0.5, flow: 0.25, styling: 0.5, backMul: 0.7, seed: 5,
  }),
  style("crop", "Crop texturizado", "Corto arriba, flequillo recto", {
    lengthCm: 3.4, curl: 0.34, curlFreq: 2.4, volume: 0.28, fadeLine: 0.16,
    flow: 0.62, lift: 0.12, styling: 0.7, gravity: 0.62, backMul: 0.7, seed: 8,
  }),
  style("french", "French crop", "Flequillo corto hacia adelante", {
    lengthCm: 2.7, curl: 0.16, curlFreq: 1.4, volume: 0.16, fadeLine: 0.22,
    flow: 0.85, lift: 0.05, styling: 0.82, gravity: 0.7, backMul: 0.6, seed: 12,
  }),
  style("caesar", "Caesar", "Flequillo recto, lados cortos", {
    lengthCm: 2.4, curl: 0.1, curlFreq: 1.2, volume: 0.12, fadeLine: 0.05,
    flow: 0.95, lift: 0.0, styling: 0.9, gravity: 0.8, seed: 15,
  }),
  style("slick", "Hacia atrás", "Peinado liso, degradado bajo", {
    lengthCm: 8.5, curl: 0.16, curlFreq: 1.2, volume: 0.22, fadeLine: -0.05,
    flow: -0.9, lift: 0.3, styling: 0.85, gravity: 0.42, cling: 0.5, backMul: 1.2, gloss: 0.7, sheen: 0.6, seed: 19,
  }),
  style("raya", "Raya al lado", "Clásico con raya marcada", {
    lengthCm: 7.5, curl: 0.24, curlFreq: 1.4, volume: 0.3, fadeLine: -0.16,
    part: 0.9, styling: 0.72, flow: -0.2, gravity: 0.55, seed: 23,
  }),
  style("undercut", "Undercut", "Lados rapados, arriba largo", {
    lengthCm: 9.0, curl: 0.34, curlFreq: 1.8, volume: 0.4, fadeLine: 0.34,
    fadeSoft: 0.05, flow: -0.5, lift: 0.4, styling: 0.8, backMul: 0.8, seed: 27,
  }),
  style("afro", "Afro corto", "Volumen redondo, rizo cerrado", {
    lengthCm: 5.0, curl: 0.95, curlFreq: 4.2, volume: 0.95, fadeLine: -0.2,
    styling: 0.1, lift: 0.55, gravity: 0.12, cling: 0.0, widthCm: 1.2,
    perRing: 40, rings: 30, sheen: 0.3, seed: 31,
  }),
  style("rulos", "Rulos medios", "Más largo, con onda", {
    lengthCm: 10.5, curl: 0.85, curlFreq: 3.0, volume: 0.6, fadeLine: -0.3,
    styling: 0.2, gravity: 0.5, widthCm: 1.6, seed: 35,
  }),
  style("mullet", "Mullet", "Corto adelante, largo atrás", {
    lengthCm: 4.2, curl: 0.4, curlFreq: 2.0, volume: 0.3, fadeLine: -0.1,
    backMul: 2.6, napeV: 0.62, flow: 0.3, gravity: 0.68, seed: 39,
  }),
  style("cortinas", "Cortinas", "Flequillo partido", {
    lengthCm: 9.5, curl: 0.5, curlFreq: 2.0, volume: 0.45, fadeLine: -0.22,
    flow: 0.7, part: 0.8, styling: 0.75, gravity: 0.6, seed: 43,
  }),
  style("mohawk", "Mohawk", "Cresta al centro, lados a piel", {
    lengthCm: 8.0, curl: 0.25, curlFreq: 1.6, volume: 0.7, fadeLine: 0.3,
    mohawk: 1, mohawkWidth: 0.3, lift: 0.9, styling: 0.85, gravity: 0.18, seed: 47,
  }),
  style("buzz", "Buzz cut", "Uniforme, casi al ras", {
    lengthCm: 0.75, curl: 0.05, curlFreq: 1, volume: 0.05, fadeLine: -0.24,
    gravity: 0.15, cling: 0.75, widthCm: 0.9, perRing: 46, rings: 32,
    styling: 0.15, sheen: 0.25, seed: 51,
  }),
  style("rapado", "Rapado", "Piel con sombra de cabello", {
    lengthCm: 0.3, curl: 0, curlFreq: 1, volume: 0, fadeLine: -0.2,
    gravity: 0.05, cling: 0.9, widthCm: 0.8, perRing: 44, rings: 30,
    density: 0.75, styling: 0.1, sheen: 0.18, seed: 55,
  }),
  style("largo", "Ondulado largo", "Dejado crecer", {
    lengthCm: 15.0, curl: 0.6, curlFreq: 2.0, volume: 0.45, fadeLine: -0.34,
    napeV: 0.64, gravity: 0.72, styling: 0.25, widthCm: 1.8, seed: 59,
  }),
];

export const HAIR_COLORS = [
  { id: "natural", name: "Tu color", root: null, tip: null },
  { id: "negro", name: "Negro", root: [0.012, 0.011, 0.012], tip: [0.03, 0.028, 0.03] },
  { id: "castano", name: "Castaño", root: [0.030, 0.016, 0.010], tip: [0.075, 0.042, 0.026] },
  { id: "cobrizo", name: "Cobrizo", root: [0.055, 0.020, 0.010], tip: [0.14, 0.055, 0.026] },
  { id: "rubio", name: "Rubio oscuro", root: [0.10, 0.065, 0.030], tip: [0.28, 0.20, 0.10] },
  { id: "platino", name: "Platinado", root: [0.32, 0.30, 0.26], tip: [0.62, 0.60, 0.55] },
  { id: "canas", name: "Canoso", root: [0.16, 0.16, 0.16], tip: [0.42, 0.42, 0.42] },
];

export function fadeLabel(fadeLine) {
  if (fadeLine < -0.26) return "Sin degradado";
  if (fadeLine < -0.08) return "Bajo";
  if (fadeLine < 0.12) return "Medio";
  if (fadeLine < 0.3) return "Alto";
  return "A piel";
}
