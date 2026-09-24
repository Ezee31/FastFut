import * as THREE from "three";

/**
 * Small orbit camera. Keeping our own yaw, pitch and distance means the view
 * buttons can animate the camera without fighting a controller's own state.
 */
export function createOrbit(camera, element) {
  const state = {
    target: new THREE.Vector3(0, 0, 0),
    yaw: 0,
    pitch: 0.06,
    distance: 60,
    wantYaw: 0,
    wantPitch: 0.06,
    wantDistance: 60,
    minDistance: 26,
    maxDistance: 140,
  };
  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  const onDown = (event) => {
    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
    element.setPointerCapture?.(event.pointerId);
  };
  const onMove = (event) => {
    if (!dragging) return;
    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;
    lastX = event.clientX;
    lastY = event.clientY;
    state.wantYaw += dx * 0.0072;
    state.wantPitch = THREE.MathUtils.clamp(state.wantPitch + dy * 0.0062, -1.1, 1.2);
  };
  const onUp = (event) => {
    dragging = false;
    element.releasePointerCapture?.(event.pointerId);
  };
  const onWheel = (event) => {
    event.preventDefault();
    const scale = Math.exp(event.deltaY * 0.0012);
    state.wantDistance = THREE.MathUtils.clamp(
      state.wantDistance * scale,
      state.minDistance,
      state.maxDistance
    );
  };
  element.addEventListener("pointerdown", onDown);
  element.addEventListener("pointermove", onMove);
  element.addEventListener("pointerup", onUp);
  element.addEventListener("pointercancel", onUp);
  element.addEventListener("wheel", onWheel, { passive: false });

  return {
    state,
    frame(center, span) {
      state.target.set(0, center, 0);
      const fit = span / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
      state.distance = fit;
      state.wantDistance = fit;
      state.minDistance = fit * 0.45;
      state.maxDistance = fit * 2.6;
    },
    goTo(yawDeg, pitchDeg) {
      state.wantYaw = THREE.MathUtils.degToRad(yawDeg);
      state.wantPitch = THREE.MathUtils.degToRad(pitchDeg);
    },
    update() {
      state.yaw += (state.wantYaw - state.yaw) * 0.14;
      state.pitch += (state.wantPitch - state.pitch) * 0.14;
      state.distance += (state.wantDistance - state.distance) * 0.14;
      const cosPitch = Math.cos(state.pitch);
      camera.position.set(
        state.target.x + Math.sin(state.yaw) * cosPitch * state.distance,
        state.target.y + Math.sin(state.pitch) * state.distance,
        state.target.z + Math.cos(state.yaw) * cosPitch * state.distance
      );
      camera.lookAt(state.target);
    },
  };
}
