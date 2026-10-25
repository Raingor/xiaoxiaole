import * as THREE from 'three';

export type PlayfulKind = 'eel' | 'salmon' | 'delivery' | 'fairy';
export interface PlayfulRig {
  hat: THREE.Group;
  tail?: THREE.Group;
  wings?: THREE.Group[];
}
interface Bones { head: THREE.Group; chest: THREE.Group; arms: THREE.Object3D[]; }
interface Tools {
  geom: <T extends THREE.BufferGeometry>(geometry: T) => T;
  material: (color: number, roughness?: number) => THREE.MeshStandardMaterial;
  fabric: THREE.Material;
}

/** Accessories use the existing bones and resource registry, including shop portraits. */
export function buildPlayfulOutfit(kind: PlayfulKind, bones: Bones, tools: Tools): PlayfulRig {
  const { geom, material } = tools;
  const sphere = geom(new THREE.SphereGeometry(0.5, 12, 8));
  const cream = material(0xfff1d8), dark = material(0x2d2928), gold = material(0xffd36c);
  const group = (parent: THREE.Object3D, name: string, at: number[]) => {
    const node = new THREE.Group(); node.name = name; node.position.set(at[0], at[1], at[2]); parent.add(node); return node;
  };
  const soft = (parent: THREE.Object3D, mat: THREE.Material, size: number[], at: number[]) => {
    const mesh = new THREE.Mesh(sphere, mat);
    mesh.scale.set(size[0], size[1], size[2]); mesh.position.set(at[0], at[1], at[2]); parent.add(mesh); return mesh;
  };
  const line = (parent: THREE.Object3D, mat: THREE.Material, points: number[][], radius = 0.012) => {
    const path = new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
    const mesh = new THREE.Mesh(geom(new THREE.TubeGeometry(path, 18, radius, 6, false)), mat); parent.add(mesh); return mesh;
  };
  const patch = (parent: THREE.Object3D, mat: THREE.Material, points: number[][], at: number[]) => {
    const shape = new THREE.Shape(); shape.moveTo(points[0][0], points[0][1]);
    for (const [x, y] of points.slice(1)) shape.lineTo(x, y);
    shape.closePath();
    const mesh = new THREE.Mesh(geom(new THREE.ExtrudeGeometry(shape, {
      depth: 0.014, bevelEnabled: true, bevelSize: 0.006, bevelThickness: 0.004, bevelSegments: 1,
    })), mat); mesh.position.set(at[0], at[1], at[2]); parent.add(mesh); return mesh;
  };
  const star = (parent: THREE.Object3D, radius: number, at: number[]) => patch(parent, gold,
    Array.from({ length: 10 }, (_, i) => {
      const angle = Math.PI / 2 + i * Math.PI / 5, r = radius * (i % 2 ? 0.46 : 1);
      return [Math.cos(angle) * r, Math.sin(angle) * r];
    }), at);
  const hat = group(bones.head, `${kind}Hat`, [0, 0, 0]);

  if (kind === 'eel') {
    hat.position.y = -0.025;
    const skin = material(0x315965, 0.68), fin = material(0xe8ca83, 0.76);
    const bodyMat = material(0xffffff, 0.68); bodyMat.vertexColors = true;
    const back = new THREE.Color(0x315965), flank = new THREE.Color(0x64978d), belly = new THREE.Color(0xffedc4);
    // One open, gently bending ribbon from head to tail. Each ring tapers
    // along +X; no coils, stacked tubes, or blunt tail-end balls.
    const ribbon = (parent: THREE.Object3D, name: string, points: number[][], radiusAt: (t: number) => number) => {
      const path = new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
      const segments = 28, sides = 12, vertices: number[] = [], colors: number[] = [], indices: number[] = [];
      const finVertices: number[] = [], finIndices: number[] = [];
      for (let i = 0; i <= segments; i++) {
        const t = i / segments, p = path.getPoint(t), radius = radiusAt(t);
        for (let j = 0; j <= sides; j++) {
          const angle = j / sides * Math.PI * 2, up = Math.cos(angle);
          vertices.push(p.x, p.y + up * radius, p.z + Math.sin(angle) * radius * 0.86);
          const color = up < -0.15 ? flank.clone().lerp(belly, Math.min(1, (-up - 0.15) / 0.45))
            : flank.clone().lerp(back, Math.max(0, up));
          colors.push(color.r, color.g, color.b);
          if (i < segments && j < sides) {
            const a = i * (sides + 1) + j, b = a + sides + 1;
            indices.push(a, a + 1, b, a + 1, b + 1, b);
          }
        }
        const height = Math.sin(t * Math.PI) * 0.045;
        finVertices.push(p.x, p.y + radius * 0.75, p.z, p.x, p.y + radius + height, p.z);
        if (i < segments) { const a = i * 2; finIndices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      }
      const geometry = geom(new THREE.BufferGeometry());
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      geometry.setIndex(indices); geometry.computeVertexNormals();
      const mesh = new THREE.Mesh(geometry, bodyMat); mesh.name = name; parent.add(mesh);
      const finGeometry = geom(new THREE.BufferGeometry());
      finGeometry.setAttribute('position', new THREE.Float32BufferAttribute(finVertices, 3));
      finGeometry.setIndex(finIndices); finGeometry.computeVertexNormals();
      const dorsal = new THREE.Mesh(finGeometry, fin); dorsal.name = `${name}DorsalFin`; parent.add(dorsal);
    };
    fin.side = THREE.DoubleSide;
    ribbon(hat, 'EelBody', [[-0.43, 0.91, 0.035], [-0.25, 0.895, -0.025], [-0.04, 0.88, 0.025], [0.15, 0.88, 0.08], [0.28, 0.885, 0.065]],
      (t) => THREE.MathUtils.lerp(0.085, 0.047, t));
    const head = soft(hat, skin, [0.29, 0.19, 0.205], [-0.44, 0.925, 0.035]); head.name = 'EelHead';
    const jaw = soft(hat, cream, [0.235, 0.065, 0.18], [-0.46, 0.872, 0.04]); jaw.name = 'EelCreamJaw';
    for (const side of [-1, 1]) {
      const z = 0.035 + side * 0.089;
      const eye = soft(hat, cream, [0.072, 0.077, 0.025], [-0.485, 0.953, z]); eye.name = side > 0 ? 'EelFrontEye' : 'EelBackEye';
      soft(hat, dark, [0.042, 0.047, 0.014], [-0.493, 0.954, z + side * 0.013]);
      soft(hat, cream, [0.012, 0.014, 0.008], [-0.501, 0.964, z + side * 0.02]);
      line(hat, dark, [[-0.565, 0.901, z * 0.92], [-0.535, 0.888, z + side * 0.006], [-0.492, 0.895, z + side * 0.012]], 0.005);
      line(hat, dark, [[-0.339, 0.941, 0.035 + side * 0.060], [-0.325, 0.91, 0.035 + side * 0.071], [-0.34, 0.883, 0.035 + side * 0.058]], 0.005);
      const flipper = soft(hat, fin, [0.17, 0.035, 0.12], [-0.245, 0.863, side * 0.10]);
      flipper.name = side > 0 ? 'EelFrontFin' : 'EelBackFin'; flipper.rotation.set(side * 0.2, side * -0.45, -0.22);
    }
    const tail = group(hat, 'EelTail', [0.28, 0.885, 0.065]);
    ribbon(tail, 'EelTaperedTail', [[0, 0, 0], [0.12, 0.012, -0.022], [0.25, 0.036, -0.09], [0.37, 0.057, -0.17]],
      (t) => 0.047 * (1 - t) + 0.001 * t);
    return { hat, tail };
  }

  if (kind === 'salmon') {
    const orange = material(0xf58c67), fin = material(0xde7057), blush = material(0xffb49a);
    soft(hat, orange, [0.83, 0.30, 0.35], [-0.04, 0.91, 0.01]);
    soft(hat, cream, [0.69, 0.085, 0.30], [-0.05, 0.82, 0.015]);
    soft(hat, blush, [0.24, 0.26, 0.30], [-0.38, 0.91, 0.02]);
    // Cream fat stripes wrap over both sides so the joke remains legible while running.
    for (const x of [-0.20, -0.045, 0.11, 0.25]) line(hat, cream,
      [[x - 0.04, 0.845, 0.149], [x, 0.92, 0.18], [x + 0.045, 1.035, 0.06], [x + 0.035, 1.04, -0.045], [x, 0.93, -0.17], [x - 0.04, 0.85, -0.14]], 0.012);
    for (const side of [-1, 1]) {
      soft(hat, dark, [0.036, 0.042, 0.021], [-0.43, 0.95, side * 0.145 + 0.02]);
      soft(hat, cream, [0.012, 0.012, 0.008], [-0.435, 0.959, side * 0.157 + 0.02]);
      line(hat, fin, [[-0.31, 0.98, side * 0.14], [-0.28, 0.91, side * 0.17], [-0.31, 0.86, side * 0.14]], 0.008);
      const flipper = soft(hat, fin, [0.15, 0.045, 0.10], [-0.12, 0.84, side * 0.17]); flipper.rotation.z = side * 0.3;
    }
    patch(hat, fin, [[-0.13, 0], [-0.03, 0.105], [0.12, 0]], [-0.025, 1.035, -0.01]);
    const tail = group(hat, 'SalmonTail', [0.34, 0.91, 0.01]);
    patch(tail, fin, [[0, 0.035], [0.20, 0.15], [0.16, 0], [0.20, -0.15], [0, -0.035]], [0, 0, 0]);
    for (const side of [-1, 1]) line(tail, blush, [[0.04, 0, 0.023], [0.15, side * 0.09, 0.023]], 0.006);
    return { hat, tail };
  }

  if (kind === 'delivery') {
    const yellow = material(0xffcc3e, 0.38), teal = material(0x308d90), silver = material(0xe5f6ee);
    const shell = new THREE.Mesh(geom(new THREE.SphereGeometry(0.5, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2)), yellow);
    shell.scale.set(1.27, 0.72, 0.92); shell.position.set(0, 0.67, -0.045); hat.add(shell);
    const rim = new THREE.Mesh(geom(new THREE.TorusGeometry(0.5, 0.025, 6, 32)), teal);
    rim.rotation.x = Math.PI / 2; rim.scale.set(1.25, 0.90, 1); rim.position.set(0, 0.67, -0.045); hat.add(rim);
    soft(hat, yellow, [0.90, 0.055, 0.43], [0, 0.685, 0.31]);
    line(hat, silver, [[0, 0.70, 0.415], [0, 0.96, 0.23], [0, 1.035, -0.045], [0, 0.96, -0.32], [0, 0.70, -0.49]], 0.025);
    for (const side of [-1, 1]) {
      line(hat, teal, [[side * 0.58, 0.67, -0.05], [side * 0.57, 0.42, -0.04], [side * 0.40, 0.26, 0.05]], 0.016);
      soft(hat, teal, [0.15, 0.025, 0.03], [side * 0.34, 0.88, 0.27]).rotation.z = side * -0.4;
      soft(bones.arms[side < 0 ? 0 : 1], tools.fabric, [0.22, 0.27, 0.21], [0, -0.08, 0]);
      line(bones.chest, silver, [[side * 0.22, 0.12, 0.23], [side * 0.25, -0.02, 0.26], [side * 0.24, -0.18, 0.20]], 0.013);
    }
    const badge = group(hat, 'DeliveryMealBadge', [0, 0.84, 0.35]);
    soft(badge, teal, [0.20, 0.15, 0.04], [0, 0, 0]);
    patch(badge, cream, [[-0.06, -0.027], [0.06, -0.027], [0.047, 0.025], [-0.047, 0.025]], [0, 0, 0.027]);
    line(badge, cream, [[-0.065, 0.028, 0.034], [0.065, 0.028, 0.034]], 0.009);
    line(badge, cream, [[0, 0.04, 0.034], [0.015, 0.063, 0.034]], 0.006);
    line(bones.chest, teal, [[0, 0.16, 0.28], [0, -0.03, 0.31], [0, -0.25, 0.20]], 0.009);
    // Reflective back chevrons remain visible from the running camera.
    for (const y of [-0.03, -0.14]) line(bones.chest, silver,
      [[-0.20, y, -0.25], [0, y - 0.04, -0.30], [0.20, y, -0.25]], 0.015);
    return { hat };
  }

  const pink = material(0xf0adcf), lilac = material(0xcbb7ee), pale = material(0xffe7f2);
  const wingMat = material(0xe1d7ff, 0.36); wingMat.transparent = true; wingMat.opacity = 0.68; wingMat.depthWrite = false;
  for (const side of [-1, 1]) {
    soft(bones.arms[side < 0 ? 0 : 1], pale, [0.24, 0.18, 0.23], [0, -0.04, 0]);
    line(hat, gold, [[side * 0.25, 0.79, 0.08], [side * 0.18, 0.84, 0.22], [0, 0.83, 0.27]], 0.012);
    star(hat, 0.055, [side * 0.17, 0.88, 0.22]);
  }
  star(hat, 0.085, [0, 0.94, 0.25]);
  soft(hat, lilac, [0.057, 0.075, 0.026], [0, 0.84, 0.275]);
  const skirt = new THREE.Mesh(geom(new THREE.LatheGeometry([
    new THREE.Vector2(0.49, -0.385), new THREE.Vector2(0.51, -0.36),
    new THREE.Vector2(0.45, -0.29), new THREE.Vector2(0.37, -0.19),
    new THREE.Vector2(0.30, -0.10),
  ], 32)), lilac); skirt.name = 'FairySkirt'; bones.chest.add(skirt);
  // A continuous scalloped overskirt reads as fabric rather than separate round beads.
  const overskirt = geom(new THREE.LatheGeometry([
    new THREE.Vector2(0.495, -0.32), new THREE.Vector2(0.46, -0.27),
    new THREE.Vector2(0.38, -0.18), new THREE.Vector2(0.31, -0.10),
  ], 48));
  const positions = overskirt.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const y = positions.getY(i), angle = Math.atan2(positions.getX(i), positions.getZ(i));
    const weight = Math.max(0, (-y - 0.10) / 0.22);
    positions.setY(i, y - Math.cos(angle * 8) * 0.026 * weight);
  }
  overskirt.computeVertexNormals(); bones.chest.add(new THREE.Mesh(overskirt, pink));
  for (let i = 0; i < 8; i++) {
    const angle = i * Math.PI / 4;
    const seam = line(bones.chest, pale, [[0, -0.15, 0.35], [0, -0.23, 0.43], [0, -0.32, 0.50]], 0.005);
    seam.rotation.y = angle;
  }
  const belt = new THREE.Mesh(geom(new THREE.TorusGeometry(0.35, 0.016, 6, 32)), gold);
  belt.rotation.x = Math.PI / 2; belt.scale.y = 0.95; belt.position.y = -0.10; bones.chest.add(belt);
  star(bones.chest, 0.063, [0, -0.10, 0.355]);
  const wings: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    const wing = group(bones.chest, side < 0 ? 'FairyWingLeft' : 'FairyWingRight', [side * 0.26, 0.03, -0.24]);
    wing.userData.side = side;
    const leaf = new THREE.Shape(); leaf.moveTo(0, 0);
    leaf.bezierCurveTo(side * 0.16, 0.36, side * 0.75, 0.42, side * 0.66, 0.15);
    leaf.bezierCurveTo(side * 0.62, 0.03, side * 0.30, -0.04, 0, 0);
    const geometry = geom(new THREE.ExtrudeGeometry(leaf, { depth: 0.018, bevelEnabled: false, curveSegments: 7 }));
    wing.add(new THREE.Mesh(geometry, wingMat));
    const lower = new THREE.Mesh(geometry, wingMat); lower.scale.set(0.75, -0.7, 1); lower.position.y = -0.015; wing.add(lower);
    for (const direction of [-1, 1]) line(wing, pale,
      [[0, 0, 0.025], [side * 0.30, direction * 0.11, 0.025], [side * (direction > 0 ? 0.59 : 0.43), direction * 0.17, 0.025]], 0.007);
    star(wing, 0.035, [side * 0.48, 0.20, 0.03]); wings.push(wing);
  }
  soft(bones.chest, pink, [0.16, 0.19, 0.09], [0, 0.06, -0.31]);
  return { hat, wings };
}

export function animatePlayfulOutfit(rig: PlayfulRig, phase: number, moving: boolean, airborne: boolean, flying: boolean, slide: number): void {
  const strength = moving ? 1 : airborne ? 0.75 : 0;
  rig.hat.scale.y = 1 - slide * 0.78;
  rig.hat.rotation.z = Math.sin(phase * 0.5) * 0.025 * strength;
  if (rig.tail) rig.tail.rotation.y = Math.sin(phase * 1.4) * 0.22 * strength;
  for (const wing of rig.wings ?? []) {
    wing.visible = !flying;
    wing.scale.x = 1 - slide * 0.5;
    wing.rotation.y = wing.userData.side * (0.22 + Math.sin(phase * 1.2) * 0.13 * strength);
  }
}
