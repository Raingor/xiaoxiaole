import * as THREE from 'three';

export type DailyKind = 'commuter' | 'duck' | 'barista';
export interface DailyRig {
  hat?: THREE.Group;
  tie?: THREE.Group;
  badge?: THREE.Group;
  bag?: THREE.Group;
  duck?: THREE.Group;
  pearls?: THREE.Mesh[];
}
interface Bones { head: THREE.Group; chest: THREE.Group; arms: THREE.Object3D[]; }
interface Tools {
  geom: <T extends THREE.BufferGeometry>(geometry: T) => T;
  material: (color: number, roughness?: number) => THREE.MeshStandardMaterial;
  texture: (texture: THREE.Texture) => void;
  fabric: THREE.Material;
}

export function buildDailyOutfit(kind: DailyKind, bones: Bones, tools: Tools): DailyRig {
  const { geom, material, fabric } = tools;
  const sphere = geom(new THREE.SphereGeometry(0.5, 12, 8));
  const cream = material(0xfff5df), brown = material(0x754b35), navy = material(0x304d77);
  const gold = material(0xe5b75f), orange = material(0xf2a432), yellow = material(0xffd34f);
  const dark = material(0x26313a);
  const soft = (parent: THREE.Object3D, mat: THREE.Material, size: number[], at: number[]) => {
    const mesh = new THREE.Mesh(sphere, mat);
    mesh.scale.set(size[0], size[1], size[2]); mesh.position.set(at[0], at[1], at[2]); parent.add(mesh);
    return mesh;
  };
  const group = (parent: THREE.Object3D, name: string, at: number[]) => {
    const node = new THREE.Group(); node.name = name; node.position.set(at[0], at[1], at[2]); parent.add(node); return node;
  };
  const seam = (parent: THREE.Object3D, mat: THREE.Material, points: number[][], radius = 0.012) => {
    const path = new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
    const mesh = new THREE.Mesh(geom(new THREE.TubeGeometry(path, 12, radius, 5, false)), mat);
    parent.add(mesh); return mesh;
  };
  const patch = (parent: THREE.Object3D, mat: THREE.Material, shape: THREE.Shape, at = [0, 0, 0], depth = 0.008) => {
    const mesh = new THREE.Mesh(geom(new THREE.ExtrudeGeometry(shape, {
      depth, bevelEnabled: true, bevelSize: 0.003, bevelThickness: 0.003, bevelSegments: 1, curveSegments: 4,
    })), mat);
    mesh.position.set(at[0], at[1], at[2]); parent.add(mesh); return mesh;
  };
  const rectangle = (width: number, height: number, radius = 0.025) => {
    const x = width / 2, y = height / 2, r = Math.min(radius, x, y);
    const shape = new THREE.Shape();
    shape.moveTo(-x + r, -y); shape.lineTo(x - r, -y); shape.quadraticCurveTo(x, -y, x, -y + r);
    shape.lineTo(x, y - r); shape.quadraticCurveTo(x, y, x - r, y);
    shape.lineTo(-x + r, y); shape.quadraticCurveTo(-x, y, -x, y - r);
    shape.lineTo(-x, -y + r); shape.quadraticCurveTo(-x, -y, -x + r, -y); return shape;
  };
  const print = (parent: THREE.Object3D, text: string, width: number, height: number, at: number[], ink: string, paper?: string) => {
    let texture: THREE.Texture;
    if (typeof document === 'undefined') {
      texture = new THREE.DataTexture(new Uint8Array([255, 245, 223, 255]), 1, 1);
    } else {
      const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 144;
      const ctx = canvas.getContext('2d')!;
      if (paper) { ctx.fillStyle = paper; ctx.fillRect(0, 0, 512, 144); }
      ctx.fillStyle = ink; ctx.font = 'bold 112px "PingFang SC", "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 256, 76, 460);
      texture = new THREE.CanvasTexture(canvas);
    }
    texture.colorSpace = THREE.SRGBColorSpace; texture.needsUpdate = true; tools.texture(texture);
    const mat = material(0xffffff); mat.map = texture; mat.transparent = true;
    const mesh = new THREE.Mesh(geom(new THREE.PlaneGeometry(width, height)), mat);
    mesh.position.set(at[0], at[1], at[2]); parent.add(mesh); return mesh;
  };
  for (const arm of bones.arms) soft(arm, fabric, [0.22, 0.29, 0.21], [0, -0.085, 0]);

  if (kind === 'commuter') {
    for (const side of [-1, 1]) {
      const collar = new THREE.Shape(); collar.moveTo(side * 0.025, 0.18); collar.lineTo(side * 0.18, 0.18);
      collar.lineTo(side * 0.105, 0.065); collar.closePath(); patch(bones.chest, cream, collar, [0, 0, 0.27]);
    }
    seam(bones.chest, cream, [[0, 0.13, 0.30], [0, 0.01, 0.31], [0, -0.21, 0.25]], 0.009);
    const tie = group(bones.chest, 'CommuterTie', [-0.035, 0.13, 0.32]);
    soft(tie, navy, [0.085, 0.065, 0.04], [0, 0, 0]);
    const shape = new THREE.Shape(); shape.moveTo(-0.021, -0.022); shape.lineTo(0.021, -0.022);
    shape.lineTo(0.048, -0.20); shape.lineTo(0, -0.25); shape.lineTo(-0.048, -0.20); shape.closePath();
    patch(tie, navy, shape);
    seam(tie, gold, [[-0.025, -0.13, 0.013], [0.027, -0.15, 0.013]], 0.006);
    seam(bones.chest, navy, [[0.08, 0.18, 0.27], [0.12, 0.04, 0.31], [0.17, -0.01, 0.31], [0.25, 0.08, 0.25]], 0.006);
    const badge = group(bones.chest, 'CommuterBadge', [0.17, -0.055, 0.30]);
    patch(badge, navy, rectangle(0.195, 0.12, 0.012));
    print(badge, '准点下班', 0.18, 0.085, [0, -0.01, 0.014], '#304d77', '#fff5df');
    soft(badge, gold, [0.028, 0.025, 0.02], [0, 0.065, 0.005]);
    seam(bones.chest, brown, [[0.26, 0.16, -0.09], [0.28, 0.10, 0.20], [0.05, -0.03, 0.33], [-0.26, -0.16, 0.25], [-0.36, -0.17, 0.01]], 0.022);
    const bag = group(bones.chest, 'CommuterBriefcase', [-0.37, -0.17, -0.04]);
    patch(bag, brown, rectangle(0.28, 0.21), [0, 0, -0.07], 0.10);
    patch(bag, material(0x966c4b), rectangle(0.28, 0.105), [0, 0.052, 0.034]);
    seam(bag, brown, [[-0.065, 0.11, -0.02], [-0.05, 0.16, -0.02], [0.05, 0.16, -0.02], [0.065, 0.11, -0.02]], 0.014);
    soft(bag, gold, [0.044, 0.045, 0.022], [0, 0.018, 0.055]);
    return { tie, badge, bag };
  }

  if (kind === 'duck') {
    const hat = group(bones.head, 'DuckHood', [0, 0, 0]);
    const hoodMaterial = material(0xffd34f); hoodMaterial.side = THREE.DoubleSide;
    const hood = new THREE.Mesh(geom(new THREE.SphereGeometry(0.5, 24, 12, Math.PI, Math.PI)), hoodMaterial);
    hood.scale.set(1.28, 0.91, 0.88); hood.position.set(0, 0.44, -0.04); hat.add(hood);
    // A low duck cap above the face, with an open hood around the white cheeks.
    soft(hat, yellow, [0.97, 0.28, 0.65], [0, 0.78, -0.05]);
    soft(hat, orange, [0.38, 0.075, 0.27], [0, 0.825, 0.34]).name = 'DuckBill';
    for (const side of [-1, 1]) {
      soft(hat, dark, [0.036, 0.044, 0.016], [side * 0.105, 0.89, 0.228]);
      soft(hat, orange, [0.12, 0.21, 0.16], [side * 0.55, 0.27, -0.025]);
      soft(bones.chest, orange, [0.17, 0.08, 0.13], [side * 0.18, 0.17, 0.22]);
    }
    seam(bones.chest, cream, [[0.07, 0.16, 0.27], [0.07, 0.02, 0.309], [0.07, -0.20, 0.25]], 0.01);
    for (const y of [0.11, -0.015, -0.14]) soft(bones.chest, orange, [0.035, 0.035, 0.02], [0.10, y, 0.31 - Math.abs(y) * 0.18]);
    const pocket = group(bones.chest, 'RaincoatPocket', [-0.15, -0.09, 0.286]);
    const duck = group(pocket, 'PocketDuck', [0, 0, 0]);
    soft(duck, yellow, [0.12, 0.095, 0.055], [0, -0.025, 0]);
    soft(duck, yellow, [0.07, 0.07, 0.06], [-0.025, 0.028, 0.005]);
    soft(duck, orange, [0.048, 0.019, 0.043], [-0.05, 0.02, 0.025]);
    soft(duck, dark, [0.012, 0.012, 0.009], [-0.032, 0.04, 0.035]);
    const clear = material(0xe0f6ff, 0.3); clear.transparent = true; clear.opacity = 0.25; clear.depthWrite = false;
    patch(pocket, clear, rectangle(0.20, 0.16, 0.014), [0, 0, 0.045]);
    seam(pocket, cream, [[-0.10, 0.07, 0.05], [-0.09, -0.075, 0.05], [0.09, -0.075, 0.05], [0.10, 0.07, 0.05]], 0.006);
    return { hat, duck };
  }

  const caramel = material(0x9c603d);
  const apronGeometry = geom(new THREE.PlaneGeometry(0.59, 0.48, 16, 16));
  const ap = apronGeometry.attributes.position;
  for (let i = 0; i < ap.count; i++) {
    const y = ap.getY(i) - 0.035;
    const x = ap.getX(i) * (0.85 - (y + 0.275) * 0.4);
    const z = 0.005 + 0.29 * Math.sqrt(Math.max(0.04, 1 - (x / 0.4) ** 2 - ((y + 0.045) / 0.31) ** 2)) + 0.014;
    ap.setXYZ(i, x, y, z);
  }
  apronGeometry.computeVertexNormals();
  const apron = new THREE.Mesh(apronGeometry, caramel); apron.name = 'MilkTeaApron'; bones.chest.add(apron);
  seam(bones.chest, caramel, [[-0.13, 0.17, 0.25], [-0.17, 0.21, 0.13], [-0.16, 0.17, -0.18]], 0.025);
  seam(bones.chest, caramel, [[0.13, 0.17, 0.25], [0.17, 0.21, 0.13], [0.16, 0.17, -0.18]], 0.025);
  print(bones.chest, '少跑多糖', 0.28, 0.09, [0, -0.065, 0.326], '#fff5df');
  soft(bones.chest, brown, [0.26, 0.10, 0.028], [0, -0.19, 0.258]);
  for (const side of [-1, 1]) seam(bones.chest, caramel, [[side * 0.26, -0.10, 0.23], [side * 0.36, -0.10, 0], [side * 0.15, -0.10, -0.27]], 0.017);
  const bow = group(bones.chest, 'ApronBackBow', [0, -0.10, -0.30]);
  for (const side of [-1, 1]) soft(bow, caramel, [0.12, 0.065, 0.04], [side * 0.05, 0, 0]).rotation.z = side * 0.25;
  const hat = group(bones.head, 'BaristaHat', [0, 0.78, -0.04]);
  soft(hat, cream, [0.62, 0.21, 0.50], [0, 0.07, 0]);
  const hatBand = new THREE.Mesh(geom(new THREE.CylinderGeometry(0.29, 0.30, 0.05, 32)), caramel);
  hatBand.scale.z = 0.8; hat.add(hatBand);
  soft(hat, gold, [0.065, 0.065, 0.015], [0, 0.06, 0.24]);
  // The cup is a back/side bag so the running view also shows the outfit's joke.
  seam(bones.chest, brown, [[-0.22, 0.17, -0.17], [-0.12, 0.11, -0.29], [0.18, -0.04, -0.35]], 0.016);
  const bag = group(bones.chest, 'MilkTeaCupBag', [0.22, -0.06, -0.36]);
  const cupMaterial = material(0xe5be91, 0.4); cupMaterial.transparent = true; cupMaterial.opacity = 0.65; cupMaterial.depthWrite = false;
  const cup = new THREE.Mesh(geom(new THREE.CylinderGeometry(0.115, 0.09, 0.27, 24)), cupMaterial); bag.add(cup);
  const lid = new THREE.Mesh(geom(new THREE.CylinderGeometry(0.124, 0.124, 0.028, 24)), cream); lid.position.y = 0.145; bag.add(lid);
  const straw = new THREE.Mesh(geom(new THREE.CylinderGeometry(0.015, 0.015, 0.17, 8)), material(0xdf8b86));
  straw.position.set(0.025, 0.23, 0); straw.rotation.z = -0.18; bag.add(straw);
  const pearls: THREE.Mesh[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = i * Math.PI / 3;
    const pearl = soft(bag, brown, [0.045, 0.045, 0.045], [Math.cos(angle) * 0.058, -0.092 + (i % 2) * 0.025, Math.sin(angle) * 0.058]);
    pearl.name = 'CupPearl'; pearl.userData.restY = pearl.position.y; pearls.push(pearl);
  }
  for (const side of [-1, 1]) soft(bag, cream, [0.028, 0.035, 0.009], [side * 0.025, 0.016, -0.112]);
  soft(bag, cream, [0.06, 0.044, 0.009], [0, -0.022, -0.114]);
  return { hat, bag, pearls };
}

export function animateDailyOutfit(rig: DailyRig, phase: number, moving: boolean, airborne: boolean, flying: boolean, slide: number): void {
  const strength = moving ? 1 : airborne ? 0.75 : 0;
  if (rig.hat) { rig.hat.scale.y = 1 - slide * 0.78; rig.hat.rotation.z = Math.sin(phase * 0.5) * 0.025 * strength; }
  if (rig.tie) { rig.tie.rotation.z = 0.16 + Math.sin(phase - 0.4) * 0.10 * strength; rig.tie.rotation.x = -0.06 - Math.abs(Math.sin(phase)) * 0.13 * strength; }
  if (rig.badge) rig.badge.rotation.z = Math.sin(phase - 0.7) * 0.12 * strength;
  if (rig.bag) { rig.bag.visible = !flying; rig.bag.rotation.z = Math.sin(phase * 0.5) * 0.07 * strength; }
  if (rig.duck) { rig.duck.rotation.z = Math.sin(phase) * 0.12 * strength; rig.duck.position.y = Math.abs(Math.sin(phase)) * 0.012 * strength; }
  for (const [i, pearl] of (rig.pearls ?? []).entries()) pearl.position.y = pearl.userData.restY + Math.abs(Math.sin(phase * 1.7 + i)) * 0.025 * strength;
}
