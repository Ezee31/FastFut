/** Guided camera scan: a few angles, captured when your head is in position. */

const STEPS = [
  { id: "frente", label: "Mirá al frente", yaw: [-9, 9], pitch: [-12, 12], weight: 1 },
  { id: "izquierda", label: "Girá despacio a tu izquierda", yaw: [18, 46], pitch: [-14, 14], weight: 0.55 },
  { id: "derecha", label: "Ahora a tu derecha", yaw: [-46, -18], pitch: [-14, 14], weight: 0.55 },
  { id: "arriba", label: "Subí un poco el mentón", yaw: [-12, 12], pitch: [-30, -12], weight: 0.4 },
  { id: "abajo", label: "Bajá el mentón, mostrá la frente", yaw: [-12, 12], pitch: [12, 32], weight: 0.5 },
];

function inRange(value, range) {
  return value >= range[0] && value <= range[1];
}

function frameToImage(video) {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext("2d").drawImage(video, 0, 0);
  return canvas;
}

export async function startScan({ state, trackImage, useCaptures, status }) {
  const panel = document.querySelector("#scan");
  const video = document.querySelector("#scan-video");
  const hint = document.querySelector("#scan-hint");
  const dots = document.querySelector("#scan-dots");
  const onboard = document.querySelector("#onboard");
  panel.classList.remove("hidden");
  dots.innerHTML = STEPS.map((step) => `<i data-id="${step.id}"></i>`).join("");
  hint.textContent = "Pedí permiso a la cámara…";

  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 960 } },
      audio: false,
    });
  } catch (error) {
    hint.textContent = "No pude abrir la cámara. Podés subir fotos.";
    return;
  }
  video.srcObject = stream;
  await video.play();

  const captures = [];
  let index = 0;
  let held = 0;
  let cancelled = false;
  const cancel = document.querySelector("#scan-cancel");
  const onCancel = () => {
    cancelled = true;
  };
  cancel.addEventListener("click", onCancel, { once: true });

  const stop = () => {
    for (const track of stream.getTracks()) track.stop();
    video.srcObject = null;
    panel.classList.add("hidden");
    cancel.removeEventListener("click", onCancel);
  };

  while (index < STEPS.length && !cancelled) {
    const step = STEPS[index];
    hint.textContent = step.label;
    const shot = frameToImage(video);
    let capture = null;
    try {
      capture = await trackImage(shot, step.weight);
    } catch (error) {
      console.warn(error);
    }
    if (!capture) {
      hint.textContent = "No te veo bien. Acercate a la luz.";
      await new Promise((resolve) => setTimeout(resolve, 120));
      continue;
    }
    const { yaw, pitch } = capture.pose;
    if (inRange(yaw, step.yaw) && inRange(pitch, step.pitch)) {
      held += 1;
      if (held >= 3) {
        captures.push(capture);
        dots.querySelector(`[data-id="${step.id}"]`)?.classList.add("done");
        index += 1;
        held = 0;
        await new Promise((resolve) => setTimeout(resolve, 260));
      }
    } else {
      held = 0;
      const which = yaw < step.yaw[0] ? "más a tu izquierda" : yaw > step.yaw[1] ? "más a tu derecha" : null;
      hint.textContent = which ? `${step.label} · ${which}` : step.label;
    }
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }

  if (cancelled || !captures.length) {
    stop();
    return;
  }

  hint.textContent = "Armando tu cabeza…";
  const loaderEl = document.querySelector("#loader");
  loaderEl.classList.remove("hidden");
  status("Armando tu cabeza…");
  captures.sort((a, b) => Math.abs(a.pose.yaw) - Math.abs(b.pose.yaw));
  await useCaptures(captures);
  loaderEl.classList.add("hidden");
  onboard.classList.add("hidden");

  // Keep the camera on so the model copies your face in real time.
  const keepLive = document.querySelector("#scan-live")?.checked ?? true;
  if (keepLive) {
    state.live = { video: document.querySelector("#live-video"), stream };
    const live = state.live.video;
    live.srcObject = stream;
    await live.play();
    document.querySelector("#live-badge").classList.remove("hidden");
    panel.classList.add("hidden");
    cancel.removeEventListener("click", onCancel);
  } else {
    stop();
  }
}

export function stopLive(state) {
  if (!state.live) return;
  for (const track of state.live.stream.getTracks()) track.stop();
  state.live.video.srcObject = null;
  state.live = null;
  document.querySelector("#live-badge").classList.add("hidden");
}
