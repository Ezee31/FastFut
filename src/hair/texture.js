import * as THREE from "three";

const STRIPS = 8;
const STRIP_W = 256;
const STRIP_H = 1024;

function rand(state) {
  state.value = (state.value * 1664525 + 1013904223) % 4294967296;
  return state.value / 4294967296;
}

/**
 * Hair card strips. Each strip holds a bundle of tapered strands on a
 * transparent background, which is how game hair gets its soft silhouette.
 */
export function hairStripTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = STRIPS * STRIP_W;
  canvas.height = STRIP_H;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const state = { value: 20260924 };

  for (let strip = 0; strip < STRIPS; strip += 1) {
    const x0 = strip * STRIP_W;
    // Denser strips for the inner layers, wispier ones for the silhouette.
    const density = strip < 4 ? 46 : strip < 6 ? 30 : 18;
    const spread = strip < 4 ? 0.9 : 1.0;
    for (let i = 0; i < density; i += 1) {
      const startX = x0 + STRIP_W * (0.06 + 0.88 * rand(state));
      const drift = (rand(state) - 0.5) * STRIP_W * 0.42 * spread;
      const wobble = (rand(state) - 0.5) * STRIP_W * 0.3;
      const tipRatio = 0.55 + 0.45 * rand(state);
      const tone = 150 + Math.floor(rand(state) * 105);
      const thickness = 1.5 + rand(state) * 2.6;
      const segments = 26;
      let prevX = startX;
      let prevY = STRIP_H;
      for (let s = 1; s <= segments; s += 1) {
        const t = s / segments;
        if (t > tipRatio) break;
        const y = STRIP_H * (1 - t);
        const x = startX + drift * t * t + wobble * Math.sin(t * Math.PI * 1.15);
        const fade = Math.min(1, (tipRatio - t) / 0.22);
        const alpha = Math.min(1, 0.34 + 0.66 * fade) * (0.55 + 0.45 * (1 - t * 0.6));
        ctx.strokeStyle = `rgba(${tone},${tone},${tone},${alpha.toFixed(3)})`;
        ctx.lineWidth = thickness * (1 - 0.72 * t);
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(prevX, prevY);
        ctx.lineTo(x, y);
        ctx.stroke();
        prevX = x;
        prevY = y;
      }
    }
    // A soft root mat so cards do not show a hard cut where they meet the scalp.
    const root = ctx.createLinearGradient(0, STRIP_H, 0, STRIP_H * 0.74);
    root.addColorStop(0, "rgba(190,190,190,0.95)");
    root.addColorStop(1, "rgba(190,190,190,0)");
    ctx.fillStyle = root;
    ctx.fillRect(x0 + STRIP_W * 0.08, STRIP_H * 0.74, STRIP_W * 0.84, STRIP_H * 0.26);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = 8;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  return { texture, strips: STRIPS };
}
