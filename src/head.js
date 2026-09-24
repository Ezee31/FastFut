import * as THREE from "three";

const EAR_LEFT = 234;
const EAR_RIGHT = 454;
const FOREHEAD = 10;
const CHIN = 152;
const NOSE = 1;
/** Depth from the landmark z is scaled like x; this brings it to head proportions. */
const DEPTH_SCALE = 0.86;

const BLINK_PAIRS = [
  [159, 145], [158, 153], [157, 154], [160, 144], [161, 163], [246, 7],
  [386, 374], [385, 380], [384, 381], [387, 373], [388, 390], [466, 249],
];

export async function loadHead() {
  const response = await fetch(`${import.meta.env.BASE_URL}head.json`);
  if (!response.ok) throw new Error("head.json");
  const data = await response.json();
  const count = data.positions.length;
  const canonical = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    canonical[i * 3] = data.positions[i][0];
    canonical[i * 3 + 1] = data.positions[i][1];
    canonical[i * 3 + 2] = data.positions[i][2];
  }
  const uv = new Float32Array(count * 2);
  for (let i = 0; i < count; i += 1) {
    uv[i * 2] = data.uvs[i][0];
    uv[i * 2 + 1] = data.uvs[i][1];
  }
  // Seam weights as flat arrays: vertex -> up to four (faceIndex, weight).
  const seamVertex = new Int32Array(data.seam.length);
  const seamStart = new Int32Array(data.seam.length + 1);
  const pairs = [];
  data.seam.forEach((entry, i) => {
    seamVertex[i] = entry[0];
    seamStart[i] = pairs.length / 2;
    for (const [faceIndex, weight] of entry[1]) {
      pairs.push(faceIndex, weight);
    }
  });
  seamStart[data.seam.length] = pairs.length / 2;
  return {
    canonical,
    uv,
    indices: new Uint32Array(data.indices),
    faceCount: data.faceCount,
    vertexCount: count,
    shell: data.shell,
    ears: data.ears,
    skull: data.skull,
    faceUv: data.faceUv,
    atlas: data.atlas,
    seam: { vertex: seamVertex, start: seamStart, pairs: new Float32Array(pairs) },
  };
}

/** Landmarks in image space, with depth put on the same scale as width. */
export function landmarksToPoints(landmarks, width, height) {
  const count = landmarks.length / 3;
  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    out[i * 3] = landmarks[i * 3] * width;
    out[i * 3 + 1] = -landmarks[i * 3 + 1] * height;
    out[i * 3 + 2] = -landmarks[i * 3 + 2] * width * DEPTH_SCALE;
  }
  return out;
}

const vecA = new THREE.Vector3();
const vecB = new THREE.Vector3();
const right = new THREE.Vector3();
const up = new THREE.Vector3();
const forward = new THREE.Vector3();
const basis = new THREE.Matrix4();
const inverse = new THREE.Matrix4();

function read(points, index, target) {
  return target.set(points[index * 3], points[index * 3 + 1], points[index * 3 + 2]);
}

/**
 * Anatomical frame from the tracked points: ears give the horizontal, the
 * forehead-chin axis the vertical. Returns head-space landmark positions in the
 * same centimetre scale as the canonical model.
 */
export function fitToCanonical(head, points, out = null, pose = null) {
  const count = points.length / 3;
  const result = out || new Float32Array(count * 3);
  read(points, EAR_RIGHT, vecA);
  read(points, EAR_LEFT, vecB);
  right.copy(vecA).sub(vecB);
  const earSpan = right.length();
  right.normalize();
  read(points, FOREHEAD, vecA);
  read(points, CHIN, vecB);
  up.copy(vecA).sub(vecB).normalize();
  forward.copy(right).cross(up).normalize();
  up.copy(forward).cross(right).normalize();

  const canonicalSpan = Math.abs(
    head.canonical[EAR_RIGHT * 3] - head.canonical[EAR_LEFT * 3]
  );
  const scale = canonicalSpan / Math.max(earSpan, 1e-6);

  // Pivot: midpoint of the ears, which is stable while the face moves.
  read(points, EAR_LEFT, vecA);
  read(points, EAR_RIGHT, vecB);
  const pivot = vecA.add(vecB).multiplyScalar(0.5).clone();
  const canonicalPivot = new THREE.Vector3(
    (head.canonical[EAR_LEFT * 3] + head.canonical[EAR_RIGHT * 3]) / 2,
    (head.canonical[EAR_LEFT * 3 + 1] + head.canonical[EAR_RIGHT * 3 + 1]) / 2,
    (head.canonical[EAR_LEFT * 3 + 2] + head.canonical[EAR_RIGHT * 3 + 2]) / 2
  );

  basis.makeBasis(right, up, forward);
  inverse.copy(basis).transpose();
  const point = new THREE.Vector3();
  for (let i = 0; i < count; i += 1) {
    read(points, i, point).sub(pivot).applyMatrix4(inverse).multiplyScalar(scale).add(canonicalPivot);
    result[i * 3] = point.x;
    result[i * 3 + 1] = point.y;
    result[i * 3 + 2] = point.z;
  }
  if (pose) {
    pose.right = right.clone();
    pose.up = up.clone();
    pose.forward = forward.clone();
    pose.scale = scale;
    pose.yaw = THREE.MathUtils.radToDeg(Math.atan2(forward.x, Math.abs(forward.z) + 1e-6));
    pose.pitch = THREE.MathUtils.radToDeg(Math.asin(THREE.MathUtils.clamp(-forward.y, -1, 1)));
    pose.quaternion = new THREE.Quaternion().setFromRotationMatrix(basis);
  }
  return result;
}

/** Average several fits so a multi-angle scan gives a steadier shape. */
export function averageFits(fits) {
  if (fits.length === 1) return fits[0].slice();
  const out = new Float32Array(fits[0].length);
  const weights = fits.length;
  for (const fit of fits) {
    for (let i = 0; i < out.length; i += 1) out[i] += fit[i] / weights;
  }
  return out;
}

/** Face vertices come from the scan; the rest of the head follows through the seam. */
export function applyShape(head, faceSpace, positions) {
  const faceCount = head.faceCount;
  positions.set(head.canonical);
  for (let i = 0; i < faceCount; i += 1) {
    positions[i * 3] = faceSpace[i * 3];
    positions[i * 3 + 1] = faceSpace[i * 3 + 1];
    positions[i * 3 + 2] = faceSpace[i * 3 + 2];
  }
  const { vertex, start, pairs } = head.seam;
  for (let i = 0; i < vertex.length; i += 1) {
    const target = vertex[i];
    let dx = 0;
    let dy = 0;
    let dz = 0;
    for (let k = start[i]; k < start[i + 1]; k += 1) {
      const faceIndex = pairs[k * 2];
      const weight = pairs[k * 2 + 1];
      dx += (faceSpace[faceIndex * 3] - head.canonical[faceIndex * 3]) * weight;
      dy += (faceSpace[faceIndex * 3 + 1] - head.canonical[faceIndex * 3 + 1]) * weight;
      dz += (faceSpace[faceIndex * 3 + 2] - head.canonical[faceIndex * 3 + 2]) * weight;
    }
    positions[target * 3] += dx;
    positions[target * 3 + 1] += dy;
    positions[target * 3 + 2] += dz;
  }
  return positions;
}

/** Eyelids closing, for the idle loop when there is no camera. */
export function applyBlink(faceSpace, amount) {
  if (amount <= 0.001) return;
  for (const [upper, lower] of BLINK_PAIRS) {
    for (let axis = 0; axis < 3; axis += 1) {
      const a = faceSpace[upper * 3 + axis];
      const b = faceSpace[lower * 3 + axis];
      faceSpace[upper * 3 + axis] = a + (b - a) * 0.86 * amount;
    }
  }
}

export function smoothNormals(geometry) {
  geometry.computeVertexNormals();
}

export function scalpSampler(head, positions) {
  const { rows, ids } = head.shell;
  // The grid carries a duplicated seam column; sample across the real ring.
  const cols = head.shell.wrapCols ?? head.shell.cols;
  const point = new THREE.Vector3();
  const du = new THREE.Vector3();
  const dv = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const at = (r, c, target) => {
    const id = ids[Math.max(0, Math.min(rows - 1, r))][((c % cols) + cols) % cols];
    return target.set(positions[id * 3], positions[id * 3 + 1], positions[id * 3 + 2]);
  };
  return {
    rows,
    cols,
    /** u wraps around the head, v goes from the face oval to the neck. */
    sample(u, v) {
      const c = u * cols;
      const r = v * (rows - 1);
      const c0 = Math.floor(c);
      const r0 = Math.max(0, Math.min(rows - 2, Math.floor(r)));
      const fc = c - c0;
      const fr = r - r0;
      const p00 = at(r0, c0, new THREE.Vector3());
      const p01 = at(r0, c0 + 1, new THREE.Vector3());
      const p10 = at(r0 + 1, c0, new THREE.Vector3());
      const p11 = at(r0 + 1, c0 + 1, new THREE.Vector3());
      point
        .copy(p00)
        .multiplyScalar((1 - fc) * (1 - fr))
        .addScaledVector(p01, fc * (1 - fr))
        .addScaledVector(p10, (1 - fc) * fr)
        .addScaledVector(p11, fc * fr);
      du.copy(p01).sub(p00).add(p11).sub(p10).multiplyScalar(0.5);
      dv.copy(p10).sub(p00).add(p11).sub(p01).multiplyScalar(0.5);
      normal.copy(du).cross(dv).normalize();
      return {
        position: point.clone(),
        normal: normal.clone(),
        alongU: du.clone().normalize(),
        alongV: dv.clone().normalize(),
      };
    },
  };
}
