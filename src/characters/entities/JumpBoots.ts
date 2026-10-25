import * as THREE from 'three';
import { mat } from '../world/Materials';

interface Resources {
  geom: <T extends THREE.BufferGeometry>(geometry: T) => T;
  material: (color: number, roughness?: number) => THREE.MeshStandardMaterial;
}

/** The same toy sneaker is used for the track pickup and the character's feet. */
export function createJumpBoot(resources: Resources = { geom: (g) => g, material: mat }): THREE.Group {
  const { geom, material } = resources;
  const boot = new THREE.Group();
  const cube = geom(new THREE.BoxGeometry(1, 1, 1));
  const rounded = geom(new THREE.SphereGeometry(0.5, 10, 6));
  const teal = material(0x25cbb8, 0.65), cream = material(0xfff6dd), gold = material(0xffcc55);
  const piece = (geometry: THREE.BufferGeometry, color: THREE.Material, size: number[], at: number[]) => {
    const mesh = new THREE.Mesh(geometry, color);
    mesh.scale.set(size[0], size[1], size[2]); mesh.position.set(at[0], at[1], at[2]); boot.add(mesh); return mesh;
  };
  piece(cube, gold, [0.235, 0.035, 0.32], [0, 0, 0.04]);
  piece(rounded, teal, [0.25, 0.17, 0.34], [0, 0.07, 0.045]);
  piece(cube, teal, [0.18, 0.13, 0.16], [0, 0.105, -0.025]);
  piece(cube, cream, [0.185, 0.035, 0.16], [0, 0.17, -0.025]);
  const tongue = piece(cube, cream, [0.11, 0.085, 0.025], [0, 0.13, 0.066]); tongue.rotation.x = -0.2;
  for (const y of [0.095, 0.125, 0.155]) piece(cube, gold, [0.095, 0.009, 0.015], [0, y, 0.084]);
  const lightning = new THREE.Shape();
  lightning.moveTo(0.012, 0.06); lightning.lineTo(-0.035, 0.005); lightning.lineTo(-0.005, 0.005);
  lightning.lineTo(-0.016, -0.045); lightning.lineTo(0.04, 0.025); lightning.lineTo(0.008, 0.025); lightning.closePath();
  const badge = geom(new THREE.ShapeGeometry(lightning));
  for (const side of [-1, 1]) {
    const mark = new THREE.Mesh(badge, gold); mark.position.set(side * 0.116, 0.08, 0.02); mark.rotation.y = side * Math.PI / 2; boot.add(mark);
  }
  return boot;
}
