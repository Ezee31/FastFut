import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

const WASM_LOCAL = `${import.meta.env.BASE_URL}mediapipe/wasm`;
const WASM_CDN = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const MODEL_LOCAL = `${import.meta.env.BASE_URL}models/face_landmarker.task`;
const MODEL_CDN =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

let imageTracker;
let videoTracker;

async function reachable(url) {
  try {
    const response = await fetch(url, { method: "HEAD" });
    return response.ok;
  } catch {
    return false;
  }
}

async function create(runningMode) {
  const wasmBase = (await reachable(`${WASM_LOCAL}/vision_wasm_internal.js`)) ? WASM_LOCAL : WASM_CDN;
  const modelPath = (await reachable(MODEL_LOCAL)) ? MODEL_LOCAL : MODEL_CDN;
  const fileset = await FilesetResolver.forVisionTasks(wasmBase);
  const options = (delegate) => ({
    baseOptions: { modelAssetPath: modelPath, delegate },
    runningMode,
    numFaces: 1,
    outputFaceBlendshapes: true,
    outputFacialTransformationMatrixes: true,
  });
  try {
    return await FaceLandmarker.createFromOptions(fileset, options("GPU"));
  } catch (error) {
    console.warn("face tracking on CPU", error);
    return FaceLandmarker.createFromOptions(fileset, options("CPU"));
  }
}

export async function trackerForImages() {
  if (!imageTracker) imageTracker = await create("IMAGE");
  return imageTracker;
}

export async function trackerForVideo() {
  if (!videoTracker) videoTracker = await create("VIDEO");
  return videoTracker;
}

/** @returns {{landmarks: Float32Array, blendshapes: Map<string, number>, matrix: Float32Array|null, width: number, height: number}|null} */
export async function readFace(source, { video = false, timestamp = 0 } = {}) {
  const tracker = video ? await trackerForVideo() : await trackerForImages();
  const result = video ? tracker.detectForVideo(source, timestamp) : tracker.detect(source);
  if (!result.faceLandmarks?.length) return null;
  const points = result.faceLandmarks[0];
  const flat = new Float32Array(points.length * 3);
  for (let i = 0; i < points.length; i += 1) {
    flat[i * 3] = points[i].x;
    flat[i * 3 + 1] = points[i].y;
    flat[i * 3 + 2] = points[i].z;
  }
  const blendshapes = new Map();
  for (const item of result.faceBlendshapes?.[0]?.categories ?? []) {
    blendshapes.set(item.categoryName, item.score);
  }
  return {
    landmarks: flat,
    blendshapes,
    matrix: result.facialTransformationMatrixes?.[0]?.data ?? null,
    width: source.naturalWidth || source.videoWidth || source.width,
    height: source.naturalHeight || source.videoHeight || source.height,
  };
}
