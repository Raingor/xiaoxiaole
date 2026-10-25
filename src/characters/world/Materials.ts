import * as THREE from 'three';

const cache = new Map<string, THREE.Material>();

export function mat(color: number, roughness = 0.85, metalness = 0.05): THREE.MeshStandardMaterial {
  const key = `${color}:${roughness}:${metalness}`;
  let m = cache.get(key) as THREE.MeshStandardMaterial | undefined;
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness, metalness });
    cache.set(key, m);
  }
  return m;
}

export function basicMat(color: number, opacity = 1): THREE.MeshBasicMaterial {
  const key = `b${color}:${opacity}`;
  let m = cache.get(key) as THREE.MeshBasicMaterial | undefined;
  if (!m) {
    m = new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, fog: false });
    cache.set(key, m);
  }
  return m;
}

export const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
export const UNIT_CYL = new THREE.CylinderGeometry(0.5, 0.5, 1, 10);
export const UNIT_SPHERE = new THREE.SphereGeometry(0.5, 14, 10);
export const UNIT_CONE = new THREE.ConeGeometry(0.5, 1, 8);

export function box(w: number, h: number, d: number, material: THREE.Material): THREE.Mesh {
  const m = new THREE.Mesh(UNIT_BOX, material);
  m.scale.set(w, h, d);
  return m;
}
