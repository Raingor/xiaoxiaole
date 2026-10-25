import * as THREE from 'three';
import { mat } from '../world/Materials';

interface Resources {
  geom: <T extends THREE.BufferGeometry>(geometry: T) => T;
  material: (color: number, roughness?: number) => THREE.MeshStandardMaterial;
}
export interface TurtleRig { root: THREE.Group; head: THREE.Group; legs: THREE.Group[]; }

export function createTurtle(resources: Resources = { geom: (g) => g, material: mat }): TurtleRig {
  const { geom, material } = resources;
  const root = new THREE.Group(); root.name = 'TurtleForm';
  const ball = geom(new THREE.SphereGeometry(0.5, 16, 10));
  const green = material(0x8eb85f), dark = material(0x3d7049), shell = material(0x62934e), pale = material(0xe5d797), ink = material(0x243b32);
  const soft = (parent: THREE.Object3D, mat: THREE.Material, size: number[], at: number[]) => {
    const mesh = new THREE.Mesh(ball, mat); mesh.scale.set(size[0], size[1], size[2]);
    mesh.position.set(at[0], at[1], at[2]); mesh.castShadow = true; parent.add(mesh); return mesh;
  };
  const line = (parent: THREE.Object3D, mat: THREE.Material, points: THREE.Vector3[], radius: number) => {
    const path = new THREE.CatmullRomCurve3(points);
    parent.add(new THREE.Mesh(geom(new THREE.TubeGeometry(path, 12, radius, 5, false)), mat));
  };
  soft(root, pale, [0.76, 0.17, 0.80], [0, 0.17, -0.04]);
  soft(root, shell, [0.84, 0.58, 0.88], [0, 0.34, -0.05]).name = 'TurtleShell';
  const rim = new THREE.Mesh(geom(new THREE.TorusGeometry(0.405, 0.028, 6, 32)), pale);
  rim.rotation.x = Math.PI / 2; rim.scale.y = 1.05; rim.position.set(0, 0.25, -0.05); root.add(rim);
  const surface = (x: number, z: number) => new THREE.Vector3(x, 0.34 + 0.29 * Math.sqrt(Math.max(0.01, 1 - (x / 0.42) ** 2 - (z / 0.44) ** 2)) + 0.007, z - 0.05);
  const hex: THREE.Vector3[] = [];
  for (let i = 0; i <= 6; i++) {
    const angle = i * Math.PI / 3;
    const x = Math.cos(angle) * 0.20, z = Math.sin(angle) * 0.20;
    hex.push(surface(x, z));
    if (i < 6) line(root, dark, [surface(x, z), surface(x * 1.5, z * 1.5), surface(x * 2, z * 2)], 0.009);
  }
  line(root, dark, hex, 0.010);
  const head = new THREE.Group(); head.name = 'TurtleHead'; head.position.set(0, 0.32, 0.46); root.add(head);
  soft(head, green, [0.31, 0.28, 0.33], [0, 0, 0]);
  soft(head, pale, [0.23, 0.07, 0.22], [0, -0.08, 0.05]);
  for (const side of [-1, 1]) {
    soft(head, ink, [0.034, 0.052, 0.025], [side * 0.105, 0.045, 0.12]);
    soft(head, pale, [0.011, 0.016, 0.009], [side * 0.103, 0.058, 0.132]);
    soft(head, material(0xd69b7b), [0.05, 0.025, 0.015], [side * 0.125, -0.018, 0.10]);
  }
  line(head, dark, [new THREE.Vector3(-0.04, -0.045, 0.155), new THREE.Vector3(0, -0.055, 0.163), new THREE.Vector3(0.04, -0.045, 0.155)], 0.005);
  const legs: THREE.Group[] = [];
  for (const side of [-1, 1]) for (const end of [-1, 1]) {
    const leg = new THREE.Group(); leg.name = `TurtleLeg${side}/${end}`;
    leg.position.set(side * 0.31, 0.075, end * 0.24 - 0.035); leg.userData.step = side * end;
    soft(leg, green, [0.26, 0.14, 0.27], [side * 0.035, 0, end * 0.015]); root.add(leg); legs.push(leg);
  }
  soft(root, green, [0.12, 0.11, 0.23], [0, 0.17, -0.53]);
  return { root, head, legs };
}

export function animateTurtle(rig: TurtleRig, phase: number, moving: boolean, slide: boolean): void {
  rig.root.scale.y = slide ? 0.62 : 1;
  rig.head.position.y = 0.32 + (moving ? Math.sin(phase * 2) * 0.009 : 0);
  for (const leg of rig.legs) leg.rotation.y = moving ? Math.sin(phase + leg.userData.step * Math.PI / 2) * 0.23 : 0;
}
