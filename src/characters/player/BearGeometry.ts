import * as THREE from 'three';

// Wide pillow crown and full cheeks taper into a softly rounded chin, kept
// proportionally flatter than a sphere to match the reference plush photos.
const profile = [
  new THREE.CubicBezierCurve(new THREE.Vector2(0, 0.805), new THREE.Vector2(0.3, 0.805), new THREE.Vector2(0.55, 0.65), new THREE.Vector2(0.615, 0.40)),
  new THREE.CubicBezierCurve(new THREE.Vector2(0.615, 0.40), new THREE.Vector2(0.65, 0.14), new THREE.Vector2(0.57, -0.025), new THREE.Vector2(0.34, -0.03)),
  new THREE.CubicBezierCurve(new THREE.Vector2(0.34, -0.03), new THREE.Vector2(0.22, -0.032), new THREE.Vector2(0.10, -0.035), new THREE.Vector2(0, -0.035)),
].flatMap((curve, i) => curve.getPoints(i === 0 ? 18 : 12).slice(i ? 1 : 0));

const DEPTH = 0.68;
const ROUNDNESS = 0.9;
const signedPower = (v: number, p: number) => Math.sign(v) * Math.pow(Math.abs(v), p);

export function headGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.LatheGeometry([...profile].reverse(), 64);
  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const z = positions.getZ(i);
    const r = Math.hypot(x, z);
    if (r > 1e-6) positions.setXYZ(i, r * signedPower(x / r, ROUNDNESS), positions.getY(i), r * DEPTH * signedPower(z / r, ROUNDNESS));
  }
  geometry.computeVertexNormals();
  return geometry;
}

/** Front surface in head coordinates, also used by the embroidered face. */
export function faceDepth(x: number, y: number): number {
  let radius = 0;
  for (let i = 1; i < profile.length; i++) {
    const a = profile[i - 1];
    const b = profile[i];
    if (y <= a.y && y >= b.y) {
      radius = THREE.MathUtils.lerp(a.x, b.x, (a.y - y) / (a.y - b.y));
      break;
    }
  }
  if (!radius) return 0;
  return radius * DEPTH * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(x) / radius, 2 / ROUNDNESS)), ROUNDNESS / 2);
}

const moleProfile = [
  new THREE.CubicBezierCurve(new THREE.Vector2(0, 0.82), new THREE.Vector2(0.33, 0.83), new THREE.Vector2(0.58, 0.70), new THREE.Vector2(0.66, 0.42)),
  new THREE.CubicBezierCurve(new THREE.Vector2(0.66, 0.42), new THREE.Vector2(0.75, 0.03), new THREE.Vector2(0.67, -0.30), new THREE.Vector2(0.43, -0.43)),
  new THREE.CubicBezierCurve(new THREE.Vector2(0.43, -0.43), new THREE.Vector2(0.29, -0.54), new THREE.Vector2(0.10, -0.55), new THREE.Vector2(0, -0.55)),
].flatMap((curve, i) => curve.getPoints(18).slice(i ? 1 : 0));

/** The mole is one soft croquette-shaped body rather than a bear head on a torso. */
export function moleGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.LatheGeometry([...moleProfile].reverse(), 48);
  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) positions.setZ(i, positions.getZ(i) * 0.82);
  geometry.computeVertexNormals();
  return geometry;
}

/** A fitted lower-body fabric shell leaves the croquette's face and fur intact. */
export function moleClothingGeometry(): THREE.BufferGeometry {
  const collar = 0.06;
  const edge = moleProfile.findIndex((point) => point.y <= collar);
  const a = moleProfile[edge - 1], b = moleProfile[edge];
  const radius = THREE.MathUtils.lerp(a.x, b.x, (a.y - collar) / (a.y - b.y));
  const points = [new THREE.Vector2(radius, collar), ...moleProfile.slice(edge)];
  const geometry = new THREE.LatheGeometry(points.reverse(), 48);
  geometry.scale(1.012, 1, 0.82 * 1.012);
  geometry.computeVertexNormals();
  return geometry;
}

export function moleFaceDepth(x: number, y: number): number {
  for (let i = 1; i < moleProfile.length; i++) {
    const a = moleProfile[i - 1];
    const b = moleProfile[i];
    if (y > a.y || y < b.y) continue;
    const radius = THREE.MathUtils.lerp(a.x, b.x, (a.y - y) / (a.y - b.y));
    return 0.82 * Math.sqrt(Math.max(0, radius * radius - x * x));
  }
  return 0;
}

/** Chiikawa's round cheeks and compact crown, distinct from the wide bear. */
export function chiikawaHeadGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.SphereGeometry(1, 40, 28);
  geometry.scale(0.56, 0.48, 0.37);
  geometry.translate(0, 0.36, 0);
  return geometry;
}

export function chiikawaFaceDepth(x: number, y: number): number {
  return 0.37 * Math.sqrt(Math.max(0, 1 - (x / 0.56) ** 2 - ((y - 0.36) / 0.48) ** 2));
}

/** Continuous blue cap with a smooth central white peak, without vertex-color zigzags. */
export function hachiwareCapGeometry(): THREE.BufferGeometry {
  const vertices: number[] = [], indices: number[] = [], sides = 72, rings = 10;
  for (let ring = 0; ring <= rings; ring++) for (let side = 0; side <= sides; side++) {
    const angle = side / sides * Math.PI * 2, front = Math.max(0, Math.cos(angle));
    const boundary = 0.17 + 0.32 * Math.sqrt(front) + 0.25 * front * (1 - Math.abs(Math.sin(angle)));
    const phi = Math.acos((boundary - 0.36) / 0.48) * ring / rings;
    vertices.push(0.568 * Math.sin(phi) * Math.sin(angle), 0.36 + 0.488 * Math.cos(phi), 0.378 * Math.sin(phi) * Math.cos(angle));
    if (ring < rings && side < sides) {
      const a = ring * (sides + 1) + side, b = a + sides + 1;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals(); return geometry;
}

/** Nearly round plush head, taller and less stretched across the cheeks. */
export function dogHeadGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.SphereGeometry(1, 40, 28);
  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    positions.setXYZ(i, positions.getX(i) * 0.61, positions.getY(i) * 0.51 + 0.37, positions.getZ(i) * 0.49);
  }
  geometry.computeVertexNormals();
  return geometry;
}

export function dogFaceDepth(x: number, y: number): number {
  const radial = 1 - (x / 0.61) ** 2 - ((y - 0.37) / 0.51) ** 2;
  return radial > 0 ? 0.49 * Math.sqrt(radial) : 0;
}

/** A small repeatable pile texture, generated locally without browser APIs. */
export function plushBump(): THREE.DataTexture {
  const size = 128;
  const data = new Uint8Array(size * size * 4);
  let seed = 2317;
  for (let i = 0; i < size * size; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
    const value = 222 + ((seed >>> 24) * 0.13);
    const j = i * 4;
    data[j] = data[j + 1] = data[j + 2] = value;
    data[j + 3] = 255;
  }
  const texture = new THREE.DataTexture(data, size, size);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

/** One closed surface, smoothly weighted across elbow/knee and wrist/ankle. */
export function limbGeometry(width: number, length: number, depth: number, joint: number, tip: number): THREE.BufferGeometry {
  const geometry = new THREE.SphereGeometry(1, 24, 20);
  const positions = geometry.attributes.position;
  const indices: number[] = [];
  const weights: number[] = [];
  for (let i = 0; i < positions.count; i++) {
    const u = (1 - positions.getY(i)) / 2;
    const y = 0.035 - u * length;
    // Full middle and softly rounded end, with no separate finger or foot balls.
    const fullness = 0.94 + 0.06 * Math.sin(u * Math.PI);
    positions.setXYZ(i, positions.getX(i) * width * 0.5 * fullness, y, positions.getZ(i) * depth * 0.5);
    const lowerWeight = THREE.MathUtils.smoothstep(-y, joint - 0.065, joint + 0.065);
    const tipWeight = THREE.MathUtils.smoothstep(-y, tip - 0.035, tip + 0.055);
    indices.push(0, 1, 2, 0);
    weights.push(1 - lowerWeight, lowerWeight * (1 - tipWeight), lowerWeight * tipWeight, 0);
  }
  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(indices, 4));
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(weights, 4));
  geometry.computeVertexNormals();
  return geometry;
}
