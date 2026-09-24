import * as THREE from "three";

const HAIR_STRIPS = 8;
/** One extra strip, fully opaque, for the cap under the cards. */
const STRIPS = HAIR_STRIPS + 1;
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

  for (let strip = 0; strip < HAIR_STRIPS; strip += 1) {
    const x0 = strip * STRIP_W;
    // A solid lock down the middle, soft at the edges. Thin lines read as spikes.
    const body = ctx.createLinearGradient(x0, 0, x0 + STRIP_W, 0);
    body.addColorStop(0, "rgba(160,160,160,0)");
    body.addColorStop(0.14, "rgba(170,170,170,0.28)");
    body.addColorStop(0.5, "rgba(205,205,205,0.62)");
    body.addColorStop(0.86, "rgba(170,170,170,0.28)");
    body.addColorStop(1, "rgba(160,160,160,0)");
    ctx.fillStyle = body;
    ctx.fillRect(x0, 0, STRIP_W, STRIP_H);
    const tip = ctx.createLinearGradient(0, 0, 0, STRIP_H * 0.22);
    tip.addColorStop(0, "rgba(0,0,0,0.85)");
    tip.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = tip;
    ctx.fillRect(x0, 0, STRIP_W, STRIP_H * 0.22);
    const density = strip < 4 ? 28 : 16;
    for (let i = 0; i < density; i += 1) {
      const startX = x0 + STRIP_W * (0.12 + 0.76 * rand(state));
      const drift = (rand(state) - 0.5) * STRIP_W * 0.22;
      const tone = 90 + Math.floor(rand(state) * 140);
      const thickness = 1.2 + rand(state) * 2.2;
      ctx.strokeStyle = `rgba(${tone},${tone},${tone},0.55)`;
      ctx.lineWidth = thickness;
      ctx.beginPath();
      ctx.moveTo(startX, STRIP_H);
      ctx.quadraticCurveTo(
        startX + drift * 0.4,
        STRIP_H * 0.45,
        startX + drift,
        STRIP_H * (0.05 + rand(state) * 0.2)
      );
      ctx.stroke();
    }
  }

  // The cap strip: opaque, with a little value noise so it is not flat.
  const capX = HAIR_STRIPS * STRIP_W;
  ctx.fillStyle = "rgba(170,170,170,1)";
  ctx.fillRect(capX, 0, STRIP_W, STRIP_H);
  for (let i = 0; i < 2600; i += 1) {
    const x = capX + rand(state) * STRIP_W;
    const y = rand(state) * STRIP_H;
    const tone = 120 + Math.floor(rand(state) * 110);
    ctx.fillStyle = `rgba(${tone},${tone},${tone},0.5)`;
    ctx.fillRect(x, y, 1 + rand(state) * 2, 6 + rand(state) * 26);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = 8;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  return { texture, strips: STRIPS, hairStrips: HAIR_STRIPS };
}
