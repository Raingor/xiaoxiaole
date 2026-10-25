import * as THREE from 'three';

interface OutfitBones {
  head: THREE.Group;
  chest: THREE.Group;
  upperArms: THREE.Object3D[];
  lowerArms: THREE.Object3D[];
}

interface OutfitTools {
  geom: <T extends THREE.BufferGeometry>(geometry: T) => T;
  material: (color: number, roughness?: number) => THREE.MeshStandardMaterial;
  fabric: THREE.Material;
}

export interface SeasonalRig {
  hat: THREE.Group;
  cape?: THREE.Group;
}

/** Sewn-on pieces follow existing bones; the animated hat folds without changing the hitbox. */
export function buildSeasonalOutfit(kind: 'witch' | 'santa', bones: OutfitBones, tools: OutfitTools): SeasonalRig {
  const { geom, material, fabric } = tools;
  const sphere = geom(new THREE.SphereGeometry(0.5, 12, 8));
  const plum = material(0x392944, 0.98);
  const gold = material(0xefc161, 0.55);
  const cream = material(0xfff3df, 1);
  const green = material(0x397463, 0.98);
  const stitch = material(kind === 'witch' ? 0xad512a : 0x963738, 1);
  const soft = (parent: THREE.Object3D, mat: THREE.Material, size: [number, number, number], at: [number, number, number]) => {
    const mesh = new THREE.Mesh(sphere, mat);
    mesh.scale.set(...size);
    mesh.position.set(...at);
    parent.add(mesh);
    return mesh;
  };
  const seam = (parent: THREE.Object3D, mat: THREE.Material, points: number[][], width = 0.009) => {
    const curve = new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
    const mesh = new THREE.Mesh(geom(new THREE.TubeGeometry(curve, 20, width, 6, false)), mat);
    parent.add(mesh);
    return mesh;
  };
  const ring = (parent: THREE.Object3D, mat: THREE.Material, radius: number, width: number, y: number, depth = 0.75) => {
    const mesh = new THREE.Mesh(geom(new THREE.TorusGeometry(radius, width, 8, 32)), mat);
    mesh.rotation.x = Math.PI / 2;
    mesh.scale.y = depth;
    mesh.position.y = y;
    parent.add(mesh);
    return mesh;
  };
  const patch = (parent: THREE.Object3D, shape: THREE.Shape, mat: THREE.Material, at: [number, number, number], back = false) => {
    const mesh = new THREE.Mesh(geom(new THREE.ExtrudeGeometry(shape, {
      depth: 0.009, bevelEnabled: true, bevelSize: 0.002, bevelThickness: 0.002, bevelSegments: 1, curveSegments: 12,
    })), mat);
    mesh.position.set(...at);
    if (back) mesh.rotation.y = Math.PI;
    parent.add(mesh);
    return mesh;
  };
  const buckle = (parent: THREE.Object3D, at: [number, number, number], size = 1) => {
    const frame = new THREE.Shape();
    frame.moveTo(-0.05, -0.035); frame.lineTo(0.05, -0.035); frame.lineTo(0.05, 0.035); frame.lineTo(-0.05, 0.035); frame.closePath();
    const hole = new THREE.Path();
    hole.moveTo(-0.032, -0.018); hole.lineTo(-0.032, 0.018); hole.lineTo(0.032, 0.018); hole.lineTo(0.032, -0.018); hole.closePath();
    frame.holes.push(hole);
    const mesh = patch(parent, frame, gold, at);
    mesh.scale.setScalar(size);
    return mesh;
  };

  const hat = new THREE.Group();
  hat.name = kind === 'witch' ? 'HalloweenHat' : 'ChristmasHat';
  hat.position.set(kind === 'witch' ? -0.06 : 0.06, 0.748, -0.025);
  bones.head.add(hat);
  const hatProfile: THREE.Vector2[] = [];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    hatProfile.push(new THREE.Vector2((kind === 'witch' ? 0.245 : 0.32) * Math.pow(1 - t, 0.75), t));
  }
  const hatGeometry = geom(new THREE.LatheGeometry(hatProfile, 32));
  const positions = hatGeometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const t = positions.getY(i);
    positions.setXYZ(i, positions.getX(i) + (kind === 'witch' ? -0.38 : 0.42) * t * t,
      (kind === 'witch' ? 0.62 : 0.48) * t - 0.25 * t ** 3,
      positions.getZ(i) - t * t * 0.06);
  }
  hatGeometry.computeVertexNormals();
  const crown = new THREE.Mesh(hatGeometry, kind === 'witch' ? plum : fabric);
  crown.name = 'FestiveHatCrown';
  hat.add(crown);

  for (const arm of bones.upperArms) soft(arm, fabric, [0.235, 0.30, 0.225], [0, -0.09, 0]);
  for (const arm of bones.lowerArms) soft(arm, kind === 'witch' ? plum : cream, [0.22, 0.09, 0.22], [0, -0.12, 0]);

  if (kind === 'witch') {
    const brimGeometry = geom(new THREE.RingGeometry(0.08, 0.44, 48, 3));
    brimGeometry.rotateX(-Math.PI / 2);
    const brimPositions = brimGeometry.attributes.position;
    for (let i = 0; i < brimPositions.count; i++) {
      const x = brimPositions.getX(i), z = brimPositions.getZ(i);
      brimPositions.setXYZ(i, x, 0.025 * Math.sin(Math.atan2(z, x) * 3) * Math.hypot(x, z) / 0.44, z * 0.82);
    }
    brimGeometry.computeVertexNormals();
    const brimFabric = material(0x392944, 0.98);
    brimFabric.side = THREE.DoubleSide;
    hat.add(new THREE.Mesh(brimGeometry, brimFabric));
    const band = new THREE.Mesh(geom(new THREE.CylinderGeometry(0.215, 0.247, 0.075, 32, 1, true)), fabric);
    band.position.set(-0.006, 0.06, 0);
    hat.add(band);
    buckle(hat, [-0.006, 0.062, 0.239], 0.95);
    ring(bones.chest, plum, 0.28, 0.045, 0.175, 0.78);
    ring(bones.chest, stitch, 0.30, 0.022, -0.235, 0.76);
    // Follow the pumpkin's rounded torso instead of drawing straight, floating ribs.
    for (const side of [-1, 1]) {
      seam(bones.chest, stitch, [[side * 0.10, 0.18, 0.19], [side * 0.21, 0.06, 0.251], [side * 0.22, -0.13, 0.245], [side * 0.13, -0.27, 0.16]]);
      const leaf = soft(bones.chest, green, [0.19, 0.07, 0.08], [side * 0.11, 0.17, 0.22]);
      leaf.rotation.z = side * 0.45;
    }
    // A tiny jack-o'-lantern applique on the belly, stitched close to the fabric.
    const pumpkin = new THREE.Group();
    pumpkin.name = 'PumpkinBadge';
    pumpkin.position.set(0, -0.05, 0.302);
    bones.chest.add(pumpkin);
    soft(pumpkin, gold, [0.18, 0.145, 0.025], [0, 0, 0]);
    for (const side of [-1, 1]) {
      const eye = new THREE.Shape(); eye.moveTo(side * 0.045, 0.03); eye.lineTo(side * 0.012, 0.015); eye.lineTo(side * 0.044, -0.003); eye.closePath();
      patch(pumpkin, eye, plum, [0, 0, 0.014]);
    }
    seam(pumpkin, plum, [[-0.035, -0.025, 0.019], [0, -0.038, 0.022], [0.035, -0.025, 0.019]], 0.006);
    soft(pumpkin, green, [0.027, 0.04, 0.025], [0, 0.083, 0]);

    const cape = new THREE.Group();
    cape.name = 'HalloweenCape';
    cape.position.set(0, 0.15, -0.25);
    bones.chest.add(cape);
    const capeShape = new THREE.Shape();
    capeShape.moveTo(-0.25, 0);
    capeShape.quadraticCurveTo(0, 0.07, 0.25, 0);
    capeShape.quadraticCurveTo(0.32, -0.16, 0.43, -0.39);
    capeShape.quadraticCurveTo(0.28, -0.32, 0.22, -0.46);
    capeShape.quadraticCurveTo(0.10, -0.38, 0, -0.47);
    capeShape.quadraticCurveTo(-0.10, -0.38, -0.22, -0.46);
    capeShape.quadraticCurveTo(-0.28, -0.32, -0.43, -0.39);
    capeShape.quadraticCurveTo(-0.32, -0.16, -0.25, 0);
    const capeGeometry = geom(new THREE.ExtrudeGeometry(capeShape, { depth: 0.018, bevelEnabled: true, bevelSize: 0.009, bevelThickness: 0.008, bevelSegments: 2 }));
    const capeVertices = capeGeometry.attributes.position;
    for (let i = 0; i < capeVertices.count; i++) {
      const y = capeVertices.getY(i);
      capeVertices.setZ(i, capeVertices.getZ(i) - Math.sin(Math.min(1, -y / 0.47) * Math.PI / 2) * 0.17);
    }
    capeGeometry.computeVertexNormals();
    cape.add(new THREE.Mesh(capeGeometry, plum));
    const bat = new THREE.Shape();
    bat.moveTo(-0.14, 0.04); bat.lineTo(-0.06, 0.015); bat.lineTo(-0.03, 0.05); bat.lineTo(0, 0.025);
    bat.lineTo(0.03, 0.05); bat.lineTo(0.06, 0.015); bat.lineTo(0.14, 0.04); bat.lineTo(0.105, -0.03);
    bat.quadraticCurveTo(0.065, 0, 0.035, -0.045); bat.lineTo(0, -0.065); bat.lineTo(-0.035, -0.045);
    bat.quadraticCurveTo(-0.065, 0, -0.105, -0.03); bat.closePath();
    const badge = patch(cape, bat, gold, [0, -0.265, -0.165], true);
    badge.name = 'CapeBatBadge';
    return { hat, cape };
  }

  // Santa's plush hem, cuffs and piping wrap the red coat on both sides.
  ring(hat, cream, 0.32, 0.055, 0.015, 0.94);
  for (let i = 0; i < 12; i++) {
    const angle = i / 12 * Math.PI * 2;
    soft(hat, cream, [0.09, 0.085, 0.09], [Math.sin(angle) * 0.32, 0.015, Math.cos(angle) * 0.30]);
  }
  soft(hat, cream, [0.21, 0.21, 0.21], [0.42, 0.23, -0.06]).name = 'SantaPompom';
  ring(bones.chest, cream, 0.30, 0.035, -0.235, 0.76);
  ring(bones.chest, green, 0.28, 0.06, 0.17, 0.82);
  seam(bones.chest, cream, [[0, 0.15, 0.235], [0, 0.02, 0.302], [0, -0.16, 0.282], [0, -0.26, 0.20]], 0.024);
  const beltMaterial = material(0x263b35, 0.95);
  const belt = new THREE.Mesh(geom(new THREE.CylinderGeometry(0.397, 0.385, 0.065, 48, 1, true)), beltMaterial);
  belt.name = 'SantaBelt';
  belt.scale.z = 0.75;
  belt.position.set(0, -0.11, 0.005);
  bones.chest.add(belt);
  buckle(bones.chest, [0, -0.11, 0.306], 1.15);
  for (const y of [0.08, -0.02]) soft(bones.chest, gold, [0.042, 0.042, 0.03], [0, y, 0.325]);
  const scarfTail = soft(bones.chest, green, [0.12, 0.26, 0.055], [0.18, 0.065, 0.29]);
  scarfTail.rotation.z = -0.22;
  seam(bones.chest, cream, [[0.17, -0.018, 0.325], [0.22, -0.025, 0.32]], 0.012);
  for (const side of [-1, 1]) {
    seam(bones.chest, green, [[side * 0.23, 0.16, -0.19], [side * 0.15, 0.03, -0.282], [side * 0.07, -0.08, -0.304]], 0.026);
  }
  const star = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const angle = Math.PI / 2 + i * Math.PI / 5;
    const radius = i % 2 ? 0.033 : 0.073;
    const x = Math.cos(angle) * radius, y = Math.sin(angle) * radius;
    if (i === 0) star.moveTo(x, y); else star.lineTo(x, y);
  }
  star.closePath();
  patch(bones.chest, star, gold, [0, -0.04, -0.315], true).name = 'ChristmasBackStar';
  return { hat };
}
