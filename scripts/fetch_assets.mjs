/**
 * Puts the MediaPipe runtime and the face landmark model under public/, so the
 * studio works offline and starts fast. Runs on npm install.
 */
import { createWriteStream } from "node:fs";
import { mkdir, copyFile, stat, readdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { pipeline } from "node:stream/promises";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const wasmOut = join(root, "public", "mediapipe", "wasm");
const modelOut = join(root, "public", "models");
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function copyWasm() {
  const from = join(root, "node_modules", "@mediapipe", "tasks-vision", "wasm");
  if (!(await exists(from))) {
    console.warn("tasks-vision wasm not found; run npm install first");
    return;
  }
  await mkdir(wasmOut, { recursive: true });
  for (const name of await readdir(from)) {
    await copyFile(join(from, name), join(wasmOut, name));
  }
  console.log("mediapipe runtime ready");
}

async function fetchModel() {
  const target = join(modelOut, "face_landmarker.task");
  if (await exists(target)) return;
  await mkdir(modelOut, { recursive: true });
  const local = "/tmp/mp/face_landmarker.task";
  if (await exists(local)) {
    await copyFile(local, target);
    console.log("face model copied from cache");
    return;
  }
  const response = await fetch(MODEL_URL);
  if (!response.ok) throw new Error(`model download failed: ${response.status}`);
  await pipeline(response.body, createWriteStream(target));
  console.log("face model downloaded");
}

await copyWasm();
await fetchModel();
