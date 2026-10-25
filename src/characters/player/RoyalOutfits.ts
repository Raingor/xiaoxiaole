import * as THREE from 'three';

export type RoyalKind = 'prince' | 'king' | 'queen';
export interface RoyalRig { crown: THREE.Group; cape: THREE.Group; }
interface Bones { head: THREE.Group; chest: THREE.Group; arms: THREE.Object3D[]; }
interface Tools {
  geom: <T extends THREE.BufferGeometry>(geometry: T) => T;
  material: (color: number, roughness?: number) => THREE.MeshStandardMaterial;
  fabric: THREE.Material;
}

export function buildRoyalOutfit(kind: RoyalKind, bones: Bones, tools: Tools): RoyalRig {
  const { geom, material, fabric } = tools;
  const ball = geom(new THREE.SphereGeometry(0.5, 12, 8));
  const gold = material(0xf5cc6c, 0.45), cream = material(0xfff4df), ink = material(0x443751);
  const blue = material(0x4777b7), red = material(0xb94d58), purple = material(0x9673bf);
  const jewel = material(kind === 'prince' ? 0x5bdad4 : kind === 'king' ? 0x61c29d : 0xc15f9b, 0.3);
  const soft = (parent: THREE.Object3D, mat: THREE.Material, size: number[], at: number[]) => {
    const mesh = new THREE.Mesh(ball, mat); mesh.scale.set(size[0], size[1], size[2]);
    mesh.position.set(at[0], at[1], at[2]); parent.add(mesh); return mesh;
  };
  const line = (parent: THREE.Object3D, mat: THREE.Material, points: number[][], radius = 0.012) => {
    const curve = new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
    const mesh = new THREE.Mesh(geom(new THREE.TubeGeometry(curve, 12, radius, 5, false)), mat); parent.add(mesh); return mesh;
  };
  const crown = new THREE.Group(); crown.name = `${kind}Crown`; crown.position.set(0, 0.77, -0.025); bones.head.add(crown);
  const radius = kind === 'prince' ? 0.255 : 0.30, height = kind === 'king' ? 0.23 : kind === 'queen' ? 0.20 : 0.14;
  const band = new THREE.Mesh(geom(new THREE.CylinderGeometry(radius, radius, 0.065, 24, 1, true)), gold);
  band.scale.z = 0.82; band.position.y = 0.035; crown.add(band);
  soft(crown, kind === 'king' ? red : kind === 'queen' ? purple : blue, [radius * 1.75, 0.095, radius * 1.45], [0, 0.035, 0]);
  const shape = new THREE.Shape(); shape.moveTo(-0.075, 0.045); shape.lineTo(0.075, 0.045);
  shape.quadraticCurveTo(0.03, 0.09, 0.014, height); shape.quadraticCurveTo(0, height + 0.022, -0.014, height);
  shape.quadraticCurveTo(-0.03, 0.09, -0.075, 0.045); shape.closePath();
  const pointGeometry = geom(new THREE.ExtrudeGeometry(shape, { depth: 0.02, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 1, curveSegments: 4 }));
  const count = kind === 'queen' ? 7 : 6;
  for (let i = 0; i < count; i++) {
    const angle = i * Math.PI * 2 / count;
    const point = new THREE.Group(); point.position.set(Math.sin(angle) * radius, 0, Math.cos(angle) * radius * 0.82);
    point.rotation.y = angle; crown.add(point);
    point.add(new THREE.Mesh(pointGeometry, gold));
    soft(point, gold, [0.042, 0.042, 0.038], [0, height, 0.01]);
    soft(point, jewel, [0.044, 0.060, 0.024], [0, 0.044, 0.023]);
  }
  const cape = new THREE.Group(); cape.name = `${kind}Cape`; cape.position.set(0, 0.12, -0.21); bones.chest.add(cape);
  const capeMat = kind === 'prince' ? blue : kind === 'king' ? red : purple;
  capeMat.side = THREE.DoubleSide;
  const length = kind === 'prince' ? 0.36 : 0.48;
  const capeGeometry = geom(new THREE.PlaneGeometry(0.79, length, 12, 8));
  const cp = capeGeometry.attributes.position;
  for (let i = 0; i < cp.count; i++) {
    const t = (length / 2 - cp.getY(i)) / length, x = cp.getX(i) * (0.63 + t * 0.37);
    cp.setXYZ(i, x, -t * length, -0.05 - Math.sin(t * Math.PI) * 0.11 - Math.cos(x * 16) * 0.012);
  }
  capeGeometry.computeVertexNormals(); cape.add(new THREE.Mesh(capeGeometry, capeMat));
  for (const side of [-1, 1]) {
    line(cape, kind === 'king' ? cream : gold, [[side * 0.25, 0, -0.045], [side * 0.33, -length * 0.5, -0.16], [side * 0.395, -length, -0.05]], kind === 'king' ? 0.035 : 0.012);
    soft(bones.arms[side < 0 ? 0 : 1], fabric, [0.23, 0.22, 0.22], [0, -0.06, 0]);
    soft(bones.chest, kind === 'king' ? cream : gold, [0.20, 0.075, 0.14], [side * 0.20, 0.17, 0.21]);
  }
  line(cape, kind === 'king' ? cream : gold, [[-0.395, -length, -0.05], [0, -length - 0.014, -0.06], [0.395, -length, -0.05]], kind === 'king' ? 0.028 : 0.012);
  // A golden back medallion keeps each outfit recognizable from the running camera.
  soft(cape, gold, [0.16, 0.18, 0.018], [0, -0.21, -0.174]);
  soft(cape, jewel, [0.08, 0.10, 0.018], [0, -0.21, -0.19]);
  if (kind === 'king') {
    for (const x of [-0.18, -0.06, 0.06, 0.18]) {
      soft(cape, cream, [0.12, 0.09, 0.07], [x, -0.005, -0.065]);
      soft(cape, ink, [0.018, 0.03, 0.012], [x, -0.015, -0.106]);
    }
    line(bones.chest, gold, [[-0.20, 0.16, 0.25], [0, 0.015, 0.326], [0.20, 0.16, 0.25]], 0.014);
    soft(bones.chest, gold, [0.19, 0.065, 0.02], [0, -0.18, 0.28]);
    soft(bones.chest, jewel, [0.05, 0.06, 0.025], [0, -0.18, 0.296]);
  } else if (kind === 'prince') {
    line(bones.chest, cream, [[-0.23, 0.15, 0.23], [0, -0.02, 0.326], [0.23, -0.19, 0.22]], 0.037);
    for (const y of [0.07, -0.035, -0.14]) soft(bones.chest, gold, [0.035, 0.035, 0.02], [-0.10, y, 0.312 - Math.abs(y) * 0.15]);
    soft(bones.chest, gold, [0.11, 0.13, 0.025], [0.14, 0.07, 0.28]);
    soft(bones.chest, jewel, [0.055, 0.07, 0.025], [0.14, 0.07, 0.30]);
  } else {
    const skirt = new THREE.Mesh(geom(new THREE.LatheGeometry([
      new THREE.Vector2(0.47, -0.385), new THREE.Vector2(0.49, -0.36), new THREE.Vector2(0.43, -0.27),
      new THREE.Vector2(0.36, -0.17), new THREE.Vector2(0.30, -0.10),
    ], 32)), fabric); skirt.name = 'QueenSkirt'; bones.chest.add(skirt);
    for (const side of [-1, 1]) {
      const overskirt = soft(bones.chest, purple, [0.25, 0.21, 0.07], [side * 0.27, -0.23, 0.32]); overskirt.rotation.z = side * -0.35;
      line(bones.chest, gold, [[side * 0.16, -0.13, 0.31], [side * 0.28, -0.23, 0.36], [side * 0.38, -0.34, 0.31]], 0.009);
    }
    for (let i = 0; i < 9; i++) {
      const x = (i - 4) * 0.034;
      soft(bones.chest, cream, [0.035, 0.035, 0.027], [x, 0.085 + Math.abs(x) * 0.5, 0.302 - Math.abs(x) * 0.15]);
    }
    soft(bones.chest, gold, [0.075, 0.10, 0.025], [0, 0.015, 0.322]);
    soft(bones.chest, jewel, [0.045, 0.065, 0.025], [0, 0.015, 0.34]);
  }
  return { crown, cape };
}

export function animateRoyalOutfit(rig: RoyalRig, phase: number, moving: boolean, flying: boolean, slide: number): void {
  rig.crown.scale.y = 1 - slide * 0.78;
  rig.crown.rotation.z = moving ? Math.sin(phase * 0.5) * 0.018 : 0;
  rig.cape.visible = !flying;
  rig.cape.rotation.x = moving ? -0.035 + Math.sin(phase) * 0.025 : 0;
  rig.cape.rotation.z = moving ? Math.sin(phase * 0.5) * 0.035 : 0;
}
