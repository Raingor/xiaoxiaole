import * as THREE from 'three';
import { ObjectPool } from '../utils/ObjectPool';
import { box, mat, UNIT_SPHERE } from '../world/Materials';
import { createJumpBoot } from './JumpBoots';
import { createTurtle } from './Turtle';

export type PowerUpKind = 'magnet' | 'shield' | 'jetpack' | 'double' | 'boots' | 'turtle';

export const POWERUP_COLORS: Record<PowerUpKind, number> = {
  magnet: 0xff5d8f,
  shield: 0x7fd8ff,
  jetpack: 0xff8c42,
  double: 0xffd166,
  boots: 0x25cbb8,
  turtle: 0xaac568,
};

export const POWERUP_NAMES: Record<PowerUpKind, string> = {
  magnet: '金币磁铁',
  shield: '护盾',
  jetpack: '喷气背包',
  double: '双倍分数',
  boots: '高跳鞋',
  turtle: '乌龟变身',
};

const GLOW_MATS: Record<PowerUpKind, THREE.MeshBasicMaterial> = {
  magnet: new THREE.MeshBasicMaterial({ color: POWERUP_COLORS.magnet, transparent: true, opacity: 0.28, fog: false, depthWrite: false }),
  shield: new THREE.MeshBasicMaterial({ color: POWERUP_COLORS.shield, transparent: true, opacity: 0.28, fog: false, depthWrite: false }),
  jetpack: new THREE.MeshBasicMaterial({ color: POWERUP_COLORS.jetpack, transparent: true, opacity: 0.28, fog: false, depthWrite: false }),
  double: new THREE.MeshBasicMaterial({ color: POWERUP_COLORS.double, transparent: true, opacity: 0.28, fog: false, depthWrite: false }),
  boots: new THREE.MeshBasicMaterial({ color: POWERUP_COLORS.boots, transparent: true, opacity: 0.28, fog: false, depthWrite: false }),
  turtle: new THREE.MeshBasicMaterial({ color: POWERUP_COLORS.turtle, transparent: true, opacity: 0.28, fog: false, depthWrite: false }),
};

const RING_MATS: Record<PowerUpKind, THREE.MeshStandardMaterial> = {
  magnet: mat(POWERUP_COLORS.magnet, 0.27, 0.62),
  shield: mat(POWERUP_COLORS.shield, 0.27, 0.62),
  jetpack: mat(POWERUP_COLORS.jetpack, 0.27, 0.62),
  double: mat(POWERUP_COLORS.double, 0.27, 0.62),
  boots: mat(POWERUP_COLORS.boots, 0.27, 0.62),
  turtle: mat(POWERUP_COLORS.turtle, 0.27, 0.62),
};

function magnetIcon(): THREE.Group {
  const g = new THREE.Group();
  const arc = new THREE.Mesh(new THREE.TorusGeometry(0.29, 0.085, 10, 24, Math.PI), mat(0xc9d2d2, 0.36, 0.78));
  arc.rotation.z = Math.PI;
  arc.position.y = 0.08;
  g.add(arc);
  for (const side of [-1, 1]) {
    const stem = box(0.17, 0.28, 0.17, side < 0 ? mat(0xc74550, 0.42, 0.38) : mat(0x547d9f, 0.42, 0.38));
    stem.position.set(side * 0.29, 0.22, 0);
    g.add(stem);
    const pole = box(0.17, 0.075, 0.18, mat(0xe8ebe4, 0.28, 0.55));
    pole.position.set(side * 0.29, 0.39, 0);
    g.add(pole);
  }
  return g;
}

function shieldIcon(): THREE.Group {
  const g = new THREE.Group();
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.44);
  shape.lineTo(0.36, 0.29);
  shape.lineTo(0.32, -0.17);
  shape.quadraticCurveTo(0.23, -0.37, 0, -0.47);
  shape.quadraticCurveTo(-0.23, -0.37, -0.32, -0.17);
  shape.lineTo(-0.36, 0.29);
  shape.closePath();
  const backing = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.09, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2 }), mat(0x5b9fc0, 0.27, 0.4));
  backing.position.z = -0.06;
  g.add(backing);
  const shine = box(0.10, 0.54, 0.02, mat(0xccecf2, 0.23, 0.35));
  shine.rotation.z = 0.35;
  shine.position.set(-0.12, 0.06, 0.08);
  g.add(shine);
  return g;
}

function jetpackIcon(): THREE.Group {
  const g = new THREE.Group();
  const tankGeo = new THREE.CylinderGeometry(0.16, 0.17, 0.61, 12);
  for (const side of [-1, 1]) {
    const tank = new THREE.Mesh(tankGeo, mat(0xd2d7d8, 0.42, 0.68));
    tank.position.set(side * 0.20, 0.03, 0);
    g.add(tank);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.10, 12), mat(0xc4663d, 0.46, 0.32));
    cap.position.set(side * 0.20, 0.37, 0);
    g.add(cap);
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.17, 0.13, 12), mat(0x4c5558, 0.48, 0.63));
    nozzle.position.set(side * 0.20, -0.34, 0);
    g.add(nozzle);
  }
  const harness = box(0.33, 0.38, 0.14, mat(0x545d60, 0.72, 0.25));
  harness.position.z = -0.17;
  g.add(harness);
  return g;
}

function doubleIcon(): THREE.Group {
  const g = new THREE.Group();
  const discGeo = new THREE.CylinderGeometry(0.43, 0.43, 0.12, 28);
  discGeo.rotateX(Math.PI / 2);
  g.add(new THREE.Mesh(discGeo, mat(0xc99c3d, 0.28, 0.78)));
  const inset = new THREE.Mesh(new THREE.CircleGeometry(0.34, 28), mat(0x554626, 0.64, 0.2));
  inset.position.z = 0.067;
  g.add(inset);
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  ctx.clearRect(0, 0, 128, 128);
  ctx.fillStyle = '#f9e7a7';
  ctx.font = 'bold 86px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('×2', 64, 71);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const label = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.72), new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }));
  label.position.z = 0.074;
  g.add(label);
  return g;
}

function bootsIcon(): THREE.Group {
  const pair = new THREE.Group();
  for (const side of [-1, 1]) {
    const boot = createJumpBoot(); boot.scale.setScalar(1.85);
    boot.position.set(side * 0.24, -0.15 + (side > 0 ? 0.10 : 0), 0);
    boot.rotation.set(0, side * 0.15 - 0.3, side * -0.12); pair.add(boot);
  }
  return pair;
}

export interface PowerUp {
  kind: PowerUpKind;
  lane: number;
  trackZ: number;
  chunkIndex: number;
  mesh: THREE.Group;
  ring: THREE.Mesh;
}

function makePowerUp(): { group: THREE.Group; ring: THREE.Mesh } {
  const group = new THREE.Group();
  const turtle = createTurtle().root; turtle.scale.setScalar(0.85); turtle.position.y = -0.26;
  const icons: Record<PowerUpKind, THREE.Group> = {
    magnet: magnetIcon(), shield: shieldIcon(), jetpack: jetpackIcon(), double: doubleIcon(), boots: bootsIcon(), turtle,
  };
  for (const [name, icon] of Object.entries(icons)) {
    icon.name = name;
    icon.visible = false;
    group.add(icon);
  }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.64, 0.045, 8, 32), RING_MATS.magnet);
  ring.name = 'ring';
  group.add(ring);
  const glow = new THREE.Mesh(UNIT_SPHERE, GLOW_MATS.magnet);
  glow.scale.set(0.68, 0.68, 0.19);
  glow.position.z = -0.19;
  glow.name = 'glow';
  group.add(glow);
  return { group, ring };
}

export class PowerUpFactory {
  private pool: ObjectPool<PowerUp>;

  constructor(scene: THREE.Scene) {
    this.pool = new ObjectPool<PowerUp>(
      () => {
        const { group, ring } = makePowerUp();
        group.visible = false;
        scene.add(group);
        return { kind: 'magnet', lane: 1, trackZ: 0, chunkIndex: 0, mesh: group, ring };
      },
      (p) => {
        p.mesh.visible = false;
        p.mesh.parent?.remove(p.mesh);
        scene.add(p.mesh);
      },
      4,
    );
  }

  acquire(kind: PowerUpKind): PowerUp {
    const p = this.pool.acquire();
    p.kind = kind;
    for (const name of ['magnet', 'shield', 'jetpack', 'double', 'boots', 'turtle'] as const) {
      (p.mesh.getObjectByName(name) as THREE.Group).visible = name === kind;
    }
    p.ring.material = RING_MATS[kind];
    (p.mesh.getObjectByName('glow') as THREE.Mesh).material = GLOW_MATS[kind];
    p.mesh.visible = true;
    return p;
  }

  release(p: PowerUp): void {
    this.pool.release(p);
  }
}
