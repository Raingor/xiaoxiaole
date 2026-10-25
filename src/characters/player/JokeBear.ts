import * as THREE from 'three';
import type { SkinDef } from '../core/Config';
import { isChiikawaCharacter } from '../core/Config';
import { UNIT_SPHERE, UNIT_CYL, UNIT_BOX } from '../world/Materials';
import { clamp, damp } from '../utils/MathUtils';
import { headGeometry, faceDepth, moleGeometry, moleClothingGeometry, moleFaceDepth, dogHeadGeometry, dogFaceDepth, chiikawaHeadGeometry, chiikawaFaceDepth, hachiwareCapGeometry, plushBump, limbGeometry } from './BearGeometry';
import { BearLabel } from './BearLabel';
import { buildSeasonalOutfit } from './SeasonalOutfits';
import type { SeasonalRig } from './SeasonalOutfits';
import { buildDailyOutfit, animateDailyOutfit } from './DailyOutfits';
import type { DailyRig } from './DailyOutfits';
import { buildPlayfulOutfit, animatePlayfulOutfit } from './PlayfulOutfits';
import type { PlayfulRig } from './PlayfulOutfits';
import { createJumpBoot } from '../entities/JumpBoots';
import { buildRoyalOutfit, animateRoyalOutfit } from './RoyalOutfits';
import type { RoyalRig } from './RoyalOutfits';
import { createTurtle, animateTurtle } from '../entities/Turtle';
import type { TurtleRig } from '../entities/Turtle';
import { idleMotionPose, IDLE_DURATION, SOUVENIR_MOTION } from '../systems/IdleRoutineSystem';
import type { IdleMotion } from '../systems/IdleRoutineSystem';

export type BearAnim = 'idle' | 'run' | 'fly' | 'jump' | 'fall' | 'slide' | 'dodge' | 'hit' | 'victory' | 'dead';
export type BearExpression = 'default' | 'smirk' | 'surprise' | 'laugh' | 'angry' | 'hit' | 'dead';
export type BearReaction = 'land' | 'close' | 'combo' | 'magnet' | 'takeoff' | 'double' | 'wave' | 'lookout' | 'hero' | 'relief' | 'dance' | 'clap';

type MouthId = 'omega' | 'smirk' | 'open' | 'o' | 'frown' | 'gape' | 'flat';

interface FacePose {
  browShow: number;
  browL: number;
  browR: number;
  eyeOpen: number;
  mouth: Record<MouthId, number>;
}

const M0: Record<MouthId, number> = { omega: 0, smirk: 0, open: 0, o: 0, frown: 0, gape: 0, flat: 0 };
const face = (browShow: number, browL: number, browR: number, eyeOpen: number, mouth: Partial<Record<MouthId, number>>): FacePose => ({
  browShow,
  browL,
  browR,
  eyeOpen,
  mouth: { ...M0, ...mouth },
});

/** Blended per-expression face targets: brows (single-side raise supported), eye openness, mouth shape. */
const EXPRESSIONS: Record<BearExpression, FacePose> = {
  default: face(0, 0, 0, 1, { omega: 1 }),
  smirk: face(1, 0.55, -0.18, 0.9, { smirk: 1 }),
  surprise: face(1, 0.4, 0.4, 1.55, { o: 1 }),
  laugh: face(0.5, 0.25, 0.25, 0.35, { open: 1 }),
  angry: face(1, -0.55, -0.55, 0.75, { frown: 1 }),
  hit: face(1, 0.65, -0.35, 1.5, { gape: 1 }),
  dead: face(0, 0, 0, 0, { flat: 1 }),
};

interface Pose {
  phase: number;
  legAmp: number;
  armAmp: number;
  elbow: number;
  knee: number;
  pitch: number;
  leanZ: number;
  tuck: number;
  armRaise: number;
  armSplay: number;
  bounce: number;
  hipDip: number;
  headPitch: number;
  headRoll: number;
  slide: number;
  twist: number;
  flightPitch: number;
}

const ZERO_POSE: Pose = {
  phase: 0, legAmp: 0, armAmp: 0, elbow: 0.08, knee: 0, pitch: 0, leanZ: 0, tuck: 0,
  armRaise: 0, armSplay: -0.4, bounce: 0, hipDip: 0, headPitch: 0, headRoll: 0, slide: 0, twist: 0, flightPitch: 0,
};

const HIPS_Y = 0.46;

/** Photo-led Joke Bear: broad pillow head, close-set embroidered face,
 * seamless plush limbs and a low rear pompom. Animation rig is shared by
 * the preview, standing menu display and running character. */
export class JokeBear {
  root = new THREE.Group();

  private hips = new THREE.Group();
  private spine = new THREE.Group();
  private chest = new THREE.Group();
  private neck = new THREE.Group();
  private head = new THREE.Group();
  private tail = new THREE.Group();
  private shoulderL = new THREE.Group();
  private shoulderR = new THREE.Group();
  private upperArmL = new THREE.Bone();
  private upperArmR = new THREE.Bone();
  private lowerArmL = new THREE.Bone();
  private lowerArmR = new THREE.Bone();
  private handL = new THREE.Bone();
  private handR = new THREE.Bone();
  private upperLegL = new THREE.Bone();
  private upperLegR = new THREE.Bone();
  private lowerLegL = new THREE.Bone();
  private lowerLegR = new THREE.Bone();
  private footL = new THREE.Bone();
  private footR = new THREE.Bone();
  private earL = new THREE.Group();
  private earR = new THREE.Group();
  private browL = new THREE.Group();
  private browR = new THREE.Group();
  private eyeL = new THREE.Group();
  private eyeR = new THREE.Group();
  private eyeMeshL!: THREE.Mesh;
  private eyeMeshR!: THREE.Mesh;
  private squeezedEyes: THREE.Group[] = [];
  private mouths = new Map<MouthId, THREE.Group>();

  jetpack = new THREE.Group();
  shieldBubble!: THREE.Mesh;

  private skin: SkinDef;
  private mats: THREE.Material[] = [];
  private geoms: THREE.BufferGeometry[] = [];
  private disposables: THREE.Material[] = [];
  private textures: THREE.Texture[] = [];
  private skeletons: THREE.Skeleton[] = [];

  private anim: BearAnim = 'idle';
  private expression: BearExpression = 'default';
  private weights: Record<BearExpression, number> = { default: 1, smirk: 0, surprise: 0, laugh: 0, angry: 0, hit: 0, dead: 0 };
  private faceNow: FacePose = face(0, 0, 0, 1, { omega: 1 });
  private pose: Pose = { ...ZERO_POSE };
  private time = 0;
  private deathTime = 0;
  private deathCause: 'low' | 'overhead' | 'other' = 'other';
  private reaction: BearReaction | null = null;
  private reactionTime = 0;
  private reactionDuration = 0.8;
  private chaseReaction: 'panic' | 'relief' | 'pant' | null = null;
  private chaseTime = 0;
  private landingCooldown = 0;
  private idleMotion: IdleMotion | null = null;
  private idleMotionTime = 0;
  private blinkT = 2;
  private blink = 0;
  private elasticEars: boolean;
  private clothLabel: boolean;
  private label?: BearLabel;
  private seasonalRig?: SeasonalRig;
  private dailyRig?: DailyRig;
  private playfulRig?: PlayfulRig;
  private jumpBoots: THREE.Group[] = [];
  private royalRig?: RoyalRig;
  private turtleRig?: TurtleRig;
  private turtleOn = false;
  private riding = false;
  private earSprings = [{ bend: 0, velocity: 0 }, { bend: 0, velocity: 0 }];
  private faceSurface: (x: number, y: number) => number = faceDepth;
  private eyeSize = 1;

  private get hipHeight(): number { return (this.skin.character ?? 'bear') === 'bear' ? 0.5 : HIPS_Y; }

  constructor(skin: SkinDef, options: { elasticEars?: boolean; clothLabel?: boolean } = {}) {
    this.skin = skin;
    this.elasticEars = options.elasticEars ?? false;
    this.clothLabel = options.clothLabel ?? false;
    this.root.name = 'Root';
    this.createModel();
  }

  // ---------- assembly ----------

  createModel(): void {
    this.build(this.skin);
  }

  private M(color: number, roughness = 0.9): THREE.MeshStandardMaterial {
    const m = new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.02 });
    this.mats.push(m);
    return m;
  }

  private geom<T extends THREE.BufferGeometry>(g: T): T {
    this.geoms.push(g);
    return g;
  }

  private build(skin: SkinDef): void {
    const character = skin.character ?? 'bear';
    const chiikawa = isChiikawaCharacter(character);
    this.faceSurface = chiikawa ? chiikawaFaceDepth : character === 'mole' ? moleFaceDepth : character === 'dog' ? dogFaceDepth : faceDepth;
    this.eyeSize = character === 'mole' ? 0.72 : character === 'dog' ? 0.82 : chiikawa ? 1.25 : 1;
    const faceZ = this.faceSurface;
    const bump = plushBump();
    this.textures.push(bump);
    const fur = new THREE.MeshPhysicalMaterial({
      color: skin.fur, roughness: 1, metalness: 0, map: character === 'bear' || chiikawa ? null : bump, bumpMap: bump, bumpScale: chiikawa ? 0.009 : 0.022,
      sheen: 0.7, sheenRoughness: 1, sheenColor: new THREE.Color(character === 'bear' ? 0xffffff : 0xe6e7e5),
    });
    this.mats.push(fur);
    const outfit = skin.outfit === skin.fur ? fur : new THREE.MeshStandardMaterial({
      color: skin.outfit, roughness: 0.96, metalness: 0, map: bump, bumpMap: bump, bumpScale: 0.012,
    });
    if (outfit !== fur) this.mats.push(outfit);
    const accent = this.M(skin.accent, 0.95);
    const dark = this.M(chiikawa ? 0x38282d : 0x101c22, 1);
    dark.metalness = 0;
    const tongue = this.M(0xcd8790, 0.95);
    const smooth = this.geom(new THREE.SphereGeometry(0.5, 20, 12));
    const sphere = (material: THREE.Material, x: number, y: number, z: number, px = 0, py = 0, pz = 0): THREE.Mesh => {
      const mesh = new THREE.Mesh(smooth, material);
      mesh.scale.set(x, y, z);
      mesh.position.set(px, py, pz);
      return mesh;
    };

    this.hips.name = 'Hips';
    this.hips.position.set(0, this.hipHeight, 0);
    this.root.add(this.hips);
    this.spine.name = 'Spine';
    this.spine.position.set(0, 0.02, 0);
    this.hips.add(this.spine);
    this.chest.name = 'Chest';
    this.chest.position.set(0, 0.05, 0);
    this.spine.add(this.chest);
    this.neck.name = 'Neck';
    this.neck.position.set(0, 0.18, 0);
    this.chest.add(this.neck);
    this.head.name = 'Head';
    this.head.position.set(0, 0.04, 0);
    this.neck.add(this.head);

    // One plump torso. Its upper part disappears naturally inside the chin.
    const bodyGeometry = this.geom(new THREE.SphereGeometry(0.5, 32, 24));
    const bodyPositions = bodyGeometry.attributes.position;
    for (let i = 0; i < bodyPositions.count; i++) {
      const y = bodyPositions.getY(i);
      const width = 1 - 0.13 * y;
      bodyPositions.setXYZ(i, bodyPositions.getX(i) * width, y, bodyPositions.getZ(i) * width);
    }
    bodyGeometry.computeVertexNormals();
    const body = new THREE.Mesh(bodyGeometry, outfit);
    body.name = 'PlushBody';
    body.scale.set(chiikawa ? 0.67 : character === 'dog' ? 0.72 : 0.8, chiikawa ? 0.58 : character === 'dog' ? 0.54 : 0.62, chiikawa ? 0.52 : 0.58);
    body.position.set(0, -0.045, 0.005);
    body.visible = character !== 'mole';
    this.chest.add(body);

    const skullGeometry = chiikawa ? chiikawaHeadGeometry() : character === 'mole' ? moleGeometry() : character === 'dog' ? dogHeadGeometry() : headGeometry();
    const skull = new THREE.Mesh(this.geom(skullGeometry), fur);
    skull.name = 'PlushHead';
    this.head.add(skull);
    if (character === 'hachiware') {
      const blue = fur.clone(); blue.color.setHex(0x83bce1); blue.side = THREE.DoubleSide; this.mats.push(blue);
      const patch = new THREE.Mesh(this.geom(hachiwareCapGeometry()), blue); patch.name = 'HachiwareBlueCap'; this.head.add(patch);
    }
    if (character === 'mole' && skin.outfitId) {
      const clothing = new THREE.Mesh(this.geom(moleClothingGeometry()), outfit);
      clothing.name = 'MoleOutfit';
      this.head.add(clothing);
    }
    const blackFur = character === 'dog' ? this.M(0x18181b, 0.98) : fur;
    for (const [side, ear] of [[-1, this.earL], [1, this.earR]] as const) {
      ear.name = side < 0 ? 'LeftEar' : 'RightEar';
      ear.visible = character !== 'mole';
      if (character === 'dog') {
        ear.position.set(side * 0.39, 0.745, 0.055);
        const flap = sphere(blackFur, 0.29, 0.16, 0.16, side * 0.02);
        flap.rotation.z = -side * 0.26;
        ear.add(flap);
      } else if (character === 'usagi') {
        ear.position.set(side * 0.16, 0.79, -0.025);
        const outer = sphere(fur, 0.18, 0.57, 0.15, 0, 0.24, 0); outer.name = 'RabbitEar'; ear.add(outer);
        const inner = sphere(this.M(0xf3b5bf), 0.095, 0.43, 0.025, 0, 0.25, 0.068); inner.name = 'RabbitInnerEar'; ear.add(inner);
      } else if (character === 'hachiware') {
        ear.position.set(side * 0.34, 0.745, -0.07);
        const shape = new THREE.Shape(); shape.moveTo(-0.13, 0);
        shape.quadraticCurveTo(-0.11, 0.11, side * 0.035 - 0.018, 0.215);
        shape.quadraticCurveTo(side * 0.035, 0.25, side * 0.035 + 0.025, 0.215);
        shape.quadraticCurveTo(0.12, 0.08, 0.13, 0); shape.closePath();
        const catEar = new THREE.Mesh(this.geom(new THREE.ExtrudeGeometry(shape, {depth:0.12,bevelEnabled:true,bevelSize:0.025,bevelThickness:0.022,bevelSegments:3,curveSegments:8})),this.M(0x83bce1));
        catEar.name = 'CatEar'; ear.add(catEar);
      } else if (chiikawa) {
        ear.position.set(side * 0.345, 0.775, 0);
        ear.add(sphere(fur, 0.19, 0.205, 0.15));
      } else {
        // Elastic ears pivot at their sewn-in base, keeping the attachment fixed.
        const pivotOffset = this.elasticEars ? 0.055 : 0;
        ear.position.set(side * 0.35, 0.731 - pivotOffset, -0.055);
        ear.rotation.z = this.elasticEars ? 0 : -side * 0.22;
        ear.add(sphere(fur, 0.16, 0.17, 0.105, 0, pivotOffset));
      }
      this.head.add(ear);
    }
    if (character === 'dog') this.buildDogFaceDetails(dark, faceZ);

    // Small, nearly flat stitches: no protruding muzzle or plastic eye glints.
    for (const [side, eye] of [[-1, this.eyeL], [1, this.eyeR]] as const) {
      eye.name = side < 0 ? 'LeftEye' : 'RightEye';
      const x = side * (chiikawa ? 0.158 : character === 'dog' ? 0.15 : character === 'mole' ? 0.12 : 0.105);
      const y = 0.50;
      eye.position.set(x, y, faceZ(x, y) + 0.006);
      eye.rotation.set(-0.32, side * 0.15, side * 0.10);
      const mesh = sphere(dark, 0.068, 0.074, 0.013);
      if (chiikawa) {
        const shine = sphere(this.M(0xffffff), 0.28, 0.32, 0.7, -0.13, 0.19, 0.7);
        shine.name = 'EyeHighlight';
        mesh.add(shine);
      }
      eye.add(mesh);
      this.head.add(eye);
      if (side < 0) this.eyeMeshL = mesh;
      else this.eyeMeshR = mesh;
    }
    if (chiikawa) {
      for (const side of [-1, 1]) {
        const x = side * 0.30, y = 0.365;
        const cheek = sphere(this.M(skin.characterAccent ?? skin.accent), 0.15, 0.075, 0.012, x, y, faceZ(x, y) + 0.007);
        cheek.name = side < 0 ? 'LeftBlush' : 'RightBlush';
        cheek.rotation.y = side * 0.28;
        this.head.add(cheek);
        const stitches = new THREE.Group(); stitches.name = side < 0 ? 'LeftCheekStitches' : 'RightCheekStitches';
        for (let i = 0; i < 4; i++) {
          const sx = x + (i - 1.5) * 0.025;
          const line = new THREE.LineCurve3(new THREE.Vector3(sx - 0.004, y - 0.016, faceZ(sx - 0.004, y - 0.016) + 0.015), new THREE.Vector3(sx + 0.004, y + 0.017, faceZ(sx + 0.004, y + 0.017) + 0.015));
          stitches.add(new THREE.Mesh(this.geom(new THREE.TubeGeometry(line, 2, 0.006, 5, false)), dark));
        }
        this.head.add(stitches);
      }
    }
    for (const side of [-1, 1]) {
      const squeezedEye = new THREE.Group();
      squeezedEye.name = side < 0 ? 'SqueezedLeftEye' : 'SqueezedRightEye';
      const outerX = side * 0.16;
      const innerX = side * 0.09;
      squeezedEye.position.set(side * 0.125, 0.5, faceZ(side * 0.125, 0.5));
      for (const outerY of [0.565, 0.435]) {
        const seam = new THREE.LineCurve3(
          new THREE.Vector3(outerX - squeezedEye.position.x, outerY - 0.5, faceZ(outerX, outerY) + 0.014 - squeezedEye.position.z),
          new THREE.Vector3(innerX - squeezedEye.position.x, 0, faceZ(innerX, 0.5) + 0.014 - squeezedEye.position.z),
        );
        squeezedEye.add(new THREE.Mesh(this.geom(new THREE.TubeGeometry(seam, 8, 0.014, 6, false)), dark));
      }
      squeezedEye.visible = false;
      this.squeezedEyes.push(squeezedEye);
      this.head.add(squeezedEye);
    }

    for (const [side, brow] of [[-1, this.browL], [1, this.browR]] as const) {
      brow.name = side < 0 ? 'LeftBrow' : 'RightBrow';
      brow.position.set(side * 0.12, 0.635, faceZ(side * 0.12, 0.635) + 0.008);
      if (character === 'usagi') {
        const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(-0.09, -0.006, -0.007), new THREE.Vector3(0, 0.065, 0.014), new THREE.Vector3(0.09, -0.006, -0.007));
        brow.add(new THREE.Mesh(this.geom(new THREE.TubeGeometry(curve, 12, 0.009, 6, false)), dark));
      } else brow.add(sphere(dark, 0.09, 0.019, 0.012));
      brow.visible = false;
      this.head.add(brow);
    }

    // Rounded inverted triangle, gently following the actual head surface.
    const noseShape = new THREE.Shape();
    noseShape.moveTo(-0.044, 0.385);
    noseShape.bezierCurveTo(-0.05, 0.41, 0.045, 0.41, 0.045, 0.38);
    noseShape.bezierCurveTo(0.041, 0.353, 0.019, 0.317, 0, 0.305);
    noseShape.bezierCurveTo(-0.018, 0.318, -0.035, 0.35, -0.044, 0.385);
    const noseGeometry = this.geom(new THREE.ExtrudeGeometry(noseShape, {
      depth: 0.003, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.004, bevelSegments: 2, curveSegments: 10,
    }));
    const np = noseGeometry.attributes.position;
    for (let i = 0; i < np.count; i++) {
      const x = character === 'dog' ? np.getX(i) * 0.65 : np.getX(i);
      const y = character === 'dog' ? 0.32 + (np.getY(i) - 0.355) * 0.7 : np.getY(i);
      np.setXYZ(i, x, y, np.getZ(i) + faceZ(x, y) + (character === 'dog' ? 0.012 : 0.004));
    }
    noseGeometry.computeVertexNormals();
    const nose = new THREE.Mesh(noseGeometry, dark);
    nose.name = 'EmbroideredNose';
    nose.visible = character !== 'mole' && !chiikawa;
    this.head.add(nose);

    const mouthAnchor = new THREE.Group();
    mouthAnchor.name = 'Mouth';
    mouthAnchor.position.set(0, 0.25, faceZ(0, 0.25));
    this.head.add(mouthAnchor);
    const stroke = (points: [number, number][], radius = 0.017): THREE.Mesh => {
      const path = new THREE.CatmullRomCurve3(points.map(([x, y]) => new THREE.Vector3(x, y, faceZ(x, y + 0.25) - faceZ(0, 0.25) + 0.007)));
      const geometry = this.geom(new THREE.TubeGeometry(path, 24, radius, 8, false));
      // Flatten the embroidery into the face, keeping soft rounded edges.
      return new THREE.Mesh(geometry, dark);
    };
    const omega = new THREE.Group();
    omega.name = 'OmegaMouth';
    if (chiikawa) {
      omega.add(stroke([[-0.062, 0.028], [-0.045, 0.005], [-0.02, 0.006], [0, 0.029], [0.02, 0.006], [0.045, 0.005], [0.062, 0.028]], 0.011));
      omega.add(stroke([[0.005, -0.006], [0.014, -0.022], [0.032, -0.019]], 0.007));
    } else if (character === 'mole') {
      omega.add(sphere(dark, 0.12, 0.034, 0.018, 0, 0.022, 0.012));
      omega.add(sphere(dark, 0.05, 0.042, 0.018, 0, 0.048, 0.014));
    } else if (character === 'dog') {
      omega.add(stroke([[0, 0.052], [0, 0.018], [0, -0.011]], 0.014));
      omega.add(stroke([[-0.085, 0.014], [-0.067, -0.014], [-0.039, -0.022], [0, 0.008], [0.039, -0.022], [0.067, -0.014], [0.085, 0.014]], 0.014));
    } else {
      omega.add(stroke([[0, 0.065], [0, 0.028], [0, -0.005]], 0.018));
      omega.add(stroke([[-0.108, 0.012], [-0.088, -0.015], [-0.061, -0.023], [-0.03, -0.015], [0, 0.012], [0.03, -0.015], [0.061, -0.023], [0.088, -0.015], [0.108, 0.012]], 0.019));
    }
    const stitchCap = this.geom(new THREE.SphereGeometry(0.5, 8, 6));
    const mouthCorner = character === 'dog' ? 0.085 : 0.108;
    for (const x of [-mouthCorner, mouthCorner]) {
      const cap = new THREE.Mesh(stitchCap, dark);
      cap.scale.set(0.037, 0.037, 0.025);
      cap.position.set(x, 0.012, faceZ(x, 0.262) - faceZ(0, 0.25) + 0.007);
      cap.visible = character !== 'mole' && !chiikawa;
      omega.add(cap);
    }
    const smirk = new THREE.Group();
    smirk.add(stroke([[-0.10, -0.004], [-0.05, -0.024], [0.01, -0.014], [0.07, 0.002], [0.105, 0.042]]));
    const open = new THREE.Group();
    open.add(sphere(dark, 0.18, 0.12, 0.019, 0, -0.025, 0.009));
    open.add(sphere(tongue, 0.09, 0.035, 0.012, 0, -0.06, 0.02));
    const o = new THREE.Group();
    o.add(sphere(dark, 0.073, 0.095, 0.02, 0, -0.025, 0.008));
    const frown = new THREE.Group();
    frown.add(stroke([[-0.09, -0.025], [-0.045, 0.001], [0, 0.013], [0.045, 0.001], [0.09, -0.025]], 0.014));
    const gape = new THREE.Group();
    gape.add(sphere(dark, 0.16, 0.15, 0.022, 0, -0.035, 0.008));
    gape.add(sphere(tongue, 0.085, 0.035, 0.012, 0, -0.08, 0.022));
    const flat = new THREE.Group();
    flat.add(stroke([[-0.065, -0.035], [0, -0.035], [0.065, -0.035]], 0.015));
    for (const [id, group] of [['omega', omega], ['smirk', smirk], ['open', open], ['o', o], ['frown', frown], ['gape', gape], ['flat', flat]] as const) {
      group.visible = id === 'omega';
      this.mouths.set(id, group);
      mouthAnchor.add(group);
    }

    const bindLimb = (upper: THREE.Bone, lower: THREE.Bone, end: THREE.Bone, geometry: THREE.BufferGeometry, material: THREE.Material) => {
      const mesh = new THREE.SkinnedMesh(this.geom(geometry), material);
      mesh.name = `${upper.name}Plush`;
      // Place mesh beside its bones so its local rest coordinates remain fixed.
      upper.add(mesh);
      this.root.updateMatrixWorld(true);
      const skeleton = new THREE.Skeleton([upper, lower, end]);
      mesh.bind(skeleton);
      this.skeletons.push(skeleton);
      mesh.frustumCulled = false;
    };
    const buildArm = (side: number, shoulder: THREE.Group, upper: THREE.Bone, lower: THREE.Bone, hand: THREE.Bone): void => {
      const tag = side < 0 ? 'Left' : 'Right';
      shoulder.name = `${tag}Shoulder`;
      shoulder.position.set(side * (chiikawa ? 0.33 : character === 'mole' ? 0.59 : character === 'dog' ? 0.43 : 0.35), chiikawa ? 0.04 : character === 'mole' ? -0.07 : character === 'dog' ? 0.005 : 0.115, 0);
      if (character === 'dog') {
        // A sewn shoulder bridges the wider pivot to the compact torso, so
        // relaxed arms stay attached without burying their paws in the belly.
        const seam = sphere(fur, 0.14, 0.12, 0.15, -side * 0.055, 0.01);
        seam.name = `${tag}ShoulderSeam`;
        shoulder.add(seam);
      }
      upper.name = `${tag}UpperArm`;
      lower.name = `${tag}LowerArm`;
      lower.position.set(0, -0.14, 0);
      hand.name = `${tag}Hand`;
      hand.position.set(0, -0.115, 0);
      upper.add(lower);
      lower.add(hand);
      shoulder.add(upper);
      this.chest.add(shoulder);
      bindLimb(upper, lower, hand, limbGeometry(
        character === 'mole' ? 0.19 : character === 'dog' ? 0.12 : 0.115,
        chiikawa ? 0.27 : character === 'mole' ? 0.28 : character === 'dog' ? 0.26 : 0.38,
        character === 'mole' ? 0.19 : character === 'dog' ? 0.14 : 0.135,
        0.15,
        character === 'dog' ? 0.22 : 0.295,
      ), fur);
    };
    buildArm(-1, this.shoulderL, this.upperArmL, this.lowerArmL, this.handL);
    buildArm(1, this.shoulderR, this.upperArmR, this.lowerArmR, this.handR);

    const buildLeg = (side: number, upper: THREE.Bone, lower: THREE.Bone, foot: THREE.Bone): void => {
      const tag = side < 0 ? 'Left' : 'Right';
      upper.name = `${tag}UpperLeg`;
      upper.rotation.y = side * 0.06;
      upper.position.set(side * (character === 'mole' ? 0.19 : 0.14), -0.175, 0);
      lower.name = `${tag}LowerLeg`;
      lower.position.set(0, character === 'bear' ? -0.13 : -0.115, 0);
      foot.name = `${tag}Foot`;
      foot.position.set(0, character === 'bear' ? -0.17 : -0.15, 0);
      upper.add(lower);
      lower.add(foot);
      this.hips.add(upper);
      // The leg itself ends in a soft round base, without a projecting sole.
      const legGeometry = character === 'bear' ? limbGeometry(0.205, 0.35, 0.195, 0.135, 0.245)
        : limbGeometry(chiikawa ? 0.17 : character === 'dog' ? 0.20 : 0.235, chiikawa ? 0.30 : character === 'dog' ? 0.25 : 0.31, chiikawa ? 0.18 : 0.22, 0.12, character === 'dog' ? 0.19 : 0.21);
      bindLimb(upper, lower, foot, legGeometry, character === 'mole' ? this.M(skin.characterAccent ?? skin.accent) : fur);
    };
    buildLeg(-1, this.upperLegL, this.lowerLegL, this.footL);
    buildLeg(1, this.upperLegR, this.lowerLegR, this.footR);

    this.tail.name = 'Tail';
    this.tail.position.set(0, -0.19, -0.27);
    this.tail.add(sphere(character === 'hachiware' ? this.M(0x83bce1) : fur, chiikawa ? 0.12 : 0.16, chiikawa ? 0.12 : 0.16, character === 'hachiware' ? 0.30 : chiikawa ? 0.10 : 0.135));
    this.tail.visible = character !== 'mole';
    this.hips.add(this.tail);

    this.buildAccessory(skin, outfit, accent, smooth);
    this.buildAttachments(character);
    if (this.clothLabel && !chiikawa) {
      this.label = new BearLabel();
      this.chest.add(this.label.root);
    }
    this.root.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        o.castShadow = true;
        o.receiveShadow = false;
      }
    });
    this.applyFace();
  }

  private buildDogFaceDetails(dark: THREE.Material, surface: (x: number, y: number) => number): void {
    // Embroidered oval follows the head's curved surface, including at its edges.
    // A separate ellipsoid leaves a visible gap when the character turns sideways.
    const slices = 48;
    const rings = 8;
    const vertices: number[] = [0, 0.265, surface(0, 0.265) + 0.006];
    const indices: number[] = [];
    for (let ring = 1; ring <= rings; ring++) {
      const radius = ring / rings;
      for (let i = 0; i < slices; i++) {
        const angle = i / slices * Math.PI * 2;
        const x = Math.cos(angle) * 0.19 * radius;
        const y = 0.265 + Math.sin(angle) * 0.145 * radius;
        vertices.push(x, y, surface(x, y) + 0.006);
        const next = (i + 1) % slices;
        if (ring === 1) {
          indices.push(0, 1 + i, 1 + next);
        } else {
          const inner = 1 + (ring - 2) * slices;
          const outer = 1 + (ring - 1) * slices;
          indices.push(inner + i, outer + i, inner + next, inner + next, outer + i, outer + next);
        }
      }
    }
    const muzzleGeometry = this.geom(new THREE.BufferGeometry());
    muzzleGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    muzzleGeometry.setIndex(indices);
    muzzleGeometry.computeVertexNormals();
    const muzzle = new THREE.Mesh(muzzleGeometry, this.M(0x989593, 0.98));
    this.head.add(muzzle);
    const embroideredLine = (points: [number, number][], material: THREE.Material, width: number): void => {
      const curve = new THREE.CatmullRomCurve3(points.map(([x, y]) => new THREE.Vector3(x, y, surface(x, y) + 0.014)));
      this.head.add(new THREE.Mesh(this.geom(new THREE.TubeGeometry(curve, 24, width, 7, false)), material));
    };
    embroideredLine([[-0.18, 0.29], [-0.16, 0.35], [-0.09, 0.395], [0, 0.41], [0.09, 0.395], [0.16, 0.35], [0.18, 0.29]], dark, 0.011);
    const cheekThread = this.M(0x785f5a, 0.98);
    for (const side of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const x = side * (0.32 + i * 0.055);
        embroideredLine([[x - side * 0.008, 0.34], [x, 0.315], [x + side * 0.006, 0.29]], cheekThread, 0.009);
      }
      for (const offset of [0, 0.065]) {
        const points = [
          [side * 0.085, 0.645 + offset],
          [side * 0.16, 0.68 + offset],
          [side * 0.25, 0.665 + offset],
        ];
        embroideredLine(points as [number, number][], dark, 0.01);
      }
    }
  }

  private buildAccessory(skin: SkinDef, outfit: THREE.Material, accent: THREE.Material, smooth: THREE.BufferGeometry): void {
    const fitted = !!skin.outfitId && skin.character !== 'bear';
    const mole = skin.character === 'mole', dog = skin.character === 'dog';
    const mount = (name: string, bone: THREE.Object3D, size: [number, number, number], at: [number, number, number] = [0, 0, 0]): THREE.Object3D => {
      if (!fitted) return bone;
      const node = new THREE.Group(); node.name = name; node.scale.set(...size); node.position.set(...at); bone.add(node); return node;
    };
    const head = mount('OutfitHeadMount', this.head, mole ? [1.08, 1, 1.22] : dog ? [1, 1, 1.16] : [.92, 1, .89], [0, dog ? .08 : mole ? .02 : .035, 0]) as THREE.Group;
    const chest = mount('OutfitChestMount', this.chest, mole ? [1.58, .9, 1.8] : dog ? [.9, .9, 1] : [.84, .93, .9], [0, mole ? -.08 : 0, 0]) as THREE.Group;
    const armScale: [number, number, number] = mole ? [1.3, .75, 1.15] : dog ? [.85, .75, .85] : [.85, .72, .9];
    const upperArmL = mount('OutfitLeftArmMount', this.upperArmL, armScale);
    const upperArmR = mount('OutfitRightArmMount', this.upperArmR, armScale);
    const lowerArmL = mount('OutfitLeftCuffMount', this.lowerArmL, armScale);
    const lowerArmR = mount('OutfitRightCuffMount', this.lowerArmR, armScale);
    const legScale: [number, number, number] = mole ? [1.1, .8, 1.1] : [.84, .8, .9];
    const upperLegL = mount('OutfitLeftLegMount', this.upperLegL, legScale);
    const upperLegR = mount('OutfitRightLegMount', this.upperLegR, legScale);
    if (skin.accessory === 'prince' || skin.accessory === 'king' || skin.accessory === 'queen') {
      this.royalRig = buildRoyalOutfit(skin.accessory, { head: head, chest: chest, arms: [upperArmL, upperArmR] }, {
        geom: (g) => this.geom(g), material: (c, r) => this.M(c, r), fabric: outfit,
      });
      return;
    }
    if (skin.accessory === 'eel' || skin.accessory === 'salmon' || skin.accessory === 'delivery' || skin.accessory === 'fairy') {
      this.playfulRig = buildPlayfulOutfit(skin.accessory, { head: head, chest: chest, arms: [upperArmL, upperArmR] }, {
        geom: (g) => this.geom(g), material: (c, r) => this.M(c, r), fabric: outfit,
      });
      return;
    }
    if (skin.accessory === 'none') return;
    if (skin.accessory === 'commuter' || skin.accessory === 'duck' || skin.accessory === 'barista') {
      this.dailyRig = buildDailyOutfit(skin.accessory, { head: head, chest: chest, arms: [upperArmL, upperArmR] }, {
        geom: (geometry) => this.geom(geometry), material: (color, roughness) => this.M(color, roughness),
        texture: (texture) => { this.textures.push(texture); }, fabric: outfit,
      });
      return;
    }
    if (skin.accessory === 'witch' || skin.accessory === 'santa') {
      this.seasonalRig = buildSeasonalOutfit(skin.accessory, {
        head: head,
        chest: chest,
        upperArms: [upperArmL, upperArmR],
        lowerArms: [lowerArmL, lowerArmR],
      }, {
        geom: (geometry) => this.geom(geometry),
        material: (color, roughness) => this.M(color, roughness),
        fabric: outfit,
      });
      return;
    }

    const soft = (parent: THREE.Object3D, material: THREE.Material, size: [number, number, number], at: [number, number, number]): THREE.Mesh => {
      const mesh = new THREE.Mesh(smooth, material);
      mesh.scale.set(...size);
      mesh.position.set(...at);
      parent.add(mesh);
      return mesh;
    };
    const seam = (parent: THREE.Object3D, material: THREE.Material, points: Array<[number, number, number]>, radius = 0.012): THREE.Mesh => {
      const path = new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
      const mesh = new THREE.Mesh(this.geom(new THREE.TubeGeometry(path, Math.max(16, points.length * 5), radius, 6, false)), material);
      parent.add(mesh);
      return mesh;
    };
    const ring = (parent: THREE.Object3D, material: THREE.Material, radius: number, width: number, at: [number, number, number], depthScale = 1): THREE.Mesh => {
      const mesh = new THREE.Mesh(this.geom(new THREE.TorusGeometry(radius, width, 10, 32)), material);
      mesh.rotation.x = Math.PI / 2;
      mesh.scale.z = depthScale;
      mesh.position.set(...at);
      parent.add(mesh);
      return mesh;
    };
    const sleeves = (cuff: THREE.Material): void => {
      for (const arm of [upperArmL, upperArmR]) {
        soft(arm, outfit, [0.22, 0.32, 0.21], [0, -0.095, 0]);
      }
      for (const arm of [lowerArmL, lowerArmR]) {
        soft(arm, cuff, [0.21, 0.09, 0.20], [0, -0.12, 0]);
      }
    };

    if (skin.accessory === 'cap') {
      const shadow = this.M(0x963a34, 0.98);
      const cord = this.M(0xf9dfae, 0.96);
      sleeves(shadow);
      soft(chest, outfit, [0.72, 0.48, 0.34], [0, 0.27, -0.17]); // soft hood behind the head
      ring(chest, shadow, 0.31, 0.027, [0, -0.19, 0], 0.78);
      soft(chest, shadow, [0.50, 0.20, 0.07], [0, -0.14, 0.28]); // pouch pocket
      seam(chest, cord, [[-0.17, -0.11, 0.319], [-0.12, -0.08, 0.322], [0.12, -0.08, 0.322], [0.17, -0.11, 0.319]], 0.009);
      for (const side of [-1, 1]) {
        soft(chest, shadow, [0.22, 0.13, 0.14], [side * 0.17, 0.19, 0.20]);
        seam(chest, cord, [[side * 0.11, 0.17, 0.31], [side * 0.12, 0.06, 0.327], [side * 0.13, -0.035, 0.32]], 0.012);
        soft(chest, accent, [0.035, 0.045, 0.035], [side * 0.13, -0.045, 0.33]);
      }
      const crown = new THREE.Mesh(this.geom(new THREE.SphereGeometry(0.5, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2)), accent);
      crown.scale.set(1.16, 0.61, 0.98);
      crown.position.set(0, 0.67, -0.05);
      head.add(crown);
      soft(head, shadow, [0.78, 0.055, 0.48], [0, 0.658, 0.43]);
      soft(head, accent, [0.76, 0.07, 0.46], [0, 0.681, 0.43]);
      soft(head, shadow, [0.18, 0.12, 0.025], [0, 0.758, 0.438]);
      soft(head, cord, [0.09, 0.09, 0.03], [0, 0.762, 0.458]);
    } else if (skin.accessory === 'headphones') {
      const navy = this.M(skin.shoe, 0.78);
      const panel = this.M(0x2badab, 0.96);
      const reflective = this.M(0x9df7ed, 0.4);
      reflective.emissive.setHex(0x246b70);
      reflective.emissiveIntensity = 0.45;
      sleeves(navy);
      for (const side of [-1, 1]) {
        const pocket = soft(chest, panel, [0.18, 0.09, 0.025], [side * 0.20, -0.13, 0.245]);
        pocket.rotation.z = side * 0.16;
        seam(chest, reflective, [[side * 0.26, 0.12, 0.21], [side * 0.28, 0.03, 0.23]], 0.014);
        seam(chest, reflective, [[side * 0.13, -0.095, 0.265], [side * 0.23, -0.10, 0.26], [side * 0.29, -0.12, 0.225]], 0.011);
        soft(side < 0 ? upperArmL : upperArmR, accent, [0.24, 0.055, 0.23], [0, -0.09, 0]);
      }
      seam(chest, reflective, [[0, 0.17, 0.23], [0, 0.02, 0.30], [0, -0.18, 0.26]], 0.013);
      soft(chest, accent, [0.05, 0.08, 0.035], [0, 0.04, 0.34]);
      seam(head, navy, [[-0.60, 0.28, -0.035], [-0.53, 0.67, -0.055], [-0.31, 0.91, -0.065], [0, 0.97, -0.07], [0.31, 0.91, -0.065], [0.53, 0.67, -0.055], [0.60, 0.28, -0.035]], 0.06);
      seam(head, reflective, [[-0.50, 0.74, -0.04], [-0.28, 0.93, -0.05], [0, 0.99, -0.055], [0.28, 0.93, -0.05], [0.50, 0.74, -0.04]], 0.017);
      for (const side of [-1, 1]) {
        soft(head, navy, [0.21, 0.35, 0.28], [side * 0.61, 0.27, -0.015]);
        soft(head, accent, [0.085, 0.22, 0.20], [side * 0.72, 0.27, -0.015]);
        soft(head, reflective, [0.04, 0.11, 0.105], [side * 0.75, 0.27, -0.015]);
      }
    } else if (skin.accessory === 'scarf') {
      const charcoal = this.M(skin.shoe, 0.96);
      const trim = this.M(0xc0b6c8, 0.94);
      sleeves(charcoal);
      ring(chest, charcoal, 0.30, 0.08, [0, 0.19, 0.015], 0.8);
      const tailShape = new THREE.Shape();
      tailShape.moveTo(0.11, 0.17);
      tailShape.quadraticCurveTo(0.22, 0.15, 0.27, 0.06);
      tailShape.lineTo(0.33, -0.20);
      tailShape.lineTo(0.22, -0.26);
      tailShape.lineTo(0.11, -0.08);
      tailShape.quadraticCurveTo(0.07, 0.07, 0.11, 0.17);
      const scarfTail = new THREE.Mesh(this.geom(new THREE.ExtrudeGeometry(tailShape, {
        depth: 0.025, bevelEnabled: true, bevelThickness: 0.014, bevelSize: 0.014, bevelSegments: 2,
      })), charcoal);
      scarfTail.position.z = 0.305;
      chest.add(scarfTail);
      seam(chest, trim, [[0.17, 0.10, 0.345], [0.21, -0.035, 0.35], [0.27, -0.20, 0.344]], 0.008);
      const sash = soft(chest, charcoal, [0.13, 0.59, 0.07], [0.015, -0.04, 0.305]);
      sash.rotation.z = -0.48;
      soft(chest, accent, [0.11, 0.08, 0.04], [0.11, -0.15, 0.344]);
      ring(chest, charcoal, 0.32, 0.025, [0, -0.18, 0], 0.77);
      seam(head, charcoal, [[-0.48, 0.65, 0.20], [-0.28, 0.68, 0.35], [0, 0.69, 0.405], [0.28, 0.68, 0.35], [0.48, 0.65, 0.20]], 0.055);
      soft(head, accent, [0.11, 0.11, 0.03], [0, 0.69, 0.46]);
      soft(head, trim, [0.045, 0.045, 0.038], [0, 0.69, 0.478]);
    } else if (skin.accessory === 'nightcap') {
      const cream = this.M(skin.shoe, 0.98);
      sleeves(cream);
      for (const leg of [upperLegL, upperLegR]) {
        soft(leg, outfit, [0.25, 0.19, 0.24], [0, -0.07, 0]);
        soft(leg, cream, [0.24, 0.055, 0.23], [0, -0.15, 0]);
      }
      for (const side of [-1, 1]) {
        const collar = soft(chest, cream, [0.28, 0.11, 0.14], [side * 0.14, 0.20, 0.23]);
        collar.rotation.z = side * 0.28;
      }
      soft(chest, cream, [0.07, 0.44, 0.05], [0, -0.035, 0.305]);
      for (const y of [0.10, -0.005, -0.11]) soft(chest, accent, [0.045, 0.045, 0.034], [0, y, 0.34]);
      soft(chest, cream, [0.17, 0.14, 0.038], [-0.20, -0.13, 0.24]);
      const moon = new THREE.Mesh(this.geom(new THREE.TorusGeometry(0.055, 0.013, 8, 20, Math.PI * 1.45)), accent);
      moon.rotation.z = 0.75;
      moon.position.set(-0.20, -0.13, 0.272);
      chest.add(moon);
      const capProfile: THREE.Vector2[] = [];
      for (let i = 0; i <= 16; i++) {
        const t = i / 16;
        capProfile.push(new THREE.Vector2(0.42 * Math.pow(1 - t, 0.72), t * 0.53));
      }
      const capGeometry = this.geom(new THREE.LatheGeometry(capProfile, 32));
      const vertices = capGeometry.attributes.position;
      for (let i = 0; i < vertices.count; i++) {
        const t = vertices.getY(i) / 0.53;
        vertices.setXYZ(i, vertices.getX(i) + t * t * 0.40, vertices.getY(i), vertices.getZ(i) - t * t * 0.10);
      }
      capGeometry.computeVertexNormals();
      const capFabric = this.M(skin.outfit, 0.98);
      capFabric.side = THREE.DoubleSide;
      const cap = new THREE.Mesh(capGeometry, capFabric);
      const hat = new THREE.Group(); hat.name = 'Nightcap'; hat.position.set(0, 0.75, -0.08);
      head.add(hat); hat.add(cap);
      ring(hat, cream, 0.42, 0.065, [0, 0.01, 0.01], 0.90);
      soft(hat, accent, [0.20, 0.20, 0.20], [0.40, 0.53, -0.10]);
      this.seasonalRig = { hat };
    }
  }

  private buildAttachments(character: NonNullable<SkinDef['character']>): void {
    // Their rounded heads extend farther behind the torso than the bear's.
    // Move the whole pack back so its tanks remain visible rather than buried in fur.
    this.jetpack.position.z = character === 'mole' ? -0.32 : character === 'dog' ? -0.21 : 0;
    const tankMat = this.M(0x8892a0, 0.4);
    const strapMat = this.M(0x33383f, 0.8);
    for (const side of [-1, 1]) {
      const tank = new THREE.Mesh(UNIT_CYL, tankMat);
      tank.scale.set(0.18, 0.44, 0.18);
      tank.position.set(side * 0.15, 0.18, -0.36);
      this.jetpack.add(tank);
    }
    const strap = new THREE.Mesh(UNIT_BOX, strapMat);
    strap.scale.set(0.46, 0.1, 0.08);
    strap.position.set(0, 0.28, -0.32);
    this.jetpack.add(strap);
    this.jetpack.visible = false;
    this.chest.add(this.jetpack);

    this.shieldBubble = new THREE.Mesh(
      this.geom(new THREE.SphereGeometry(0.95, 20, 14)),
      new THREE.MeshBasicMaterial({ color: 0x7fd8ff, transparent: true, opacity: 0.25, depthWrite: false, fog: false }),
    );
    this.disposables.push(this.shieldBubble.material as THREE.Material);
    this.shieldBubble.position.y = 0.8;
    this.shieldBubble.visible = false;
    this.root.add(this.shieldBubble);
  }

  // ---------- public API ----------

  setPosition(x: number, y: number, z: number): void {
    this.root.position.set(x, y, z);
  }

  setRotation(x: number, y: number, z: number): void {
    this.root.rotation.set(x, y, z);
  }

  playAnimation(name: BearAnim): void {
    if (name !== 'idle') this.clearIdleMotion();
    if (name === 'dead' && this.anim !== 'dead') this.deathTime = 0;
    if (name !== 'dead') this.deathTime = 0;
    this.anim = name;
  }

  react(kind: BearReaction): void {
    if (kind === 'wave' || kind === 'lookout' || kind === 'hero' || kind === 'dance' || kind === 'clap'
      || (kind === 'relief' && this.anim === 'idle')) {
      this.playIdleMotion(SOUVENIR_MOTION[kind]);
      return;
    }
    if (this.anim === 'dead' || (kind === 'land' && this.landingCooldown > 0)) return;
    if (this.reaction === 'combo' && (kind === 'land' || kind === 'close')) return;
    this.reaction = kind;
    this.reactionTime = 0;
    this.reactionDuration = kind === 'takeoff' ? 2.6 : ['wave', 'lookout', 'hero', 'relief', 'dance', 'clap'].includes(kind) ? 1.6
      : kind === 'combo' ? 0.9 : kind === 'land' ? 0.65 : 0.8;
    if (kind === 'land') this.landingCooldown = 0.85;
  }

  setDeathCause(kind: string | null): void {
    this.deathCause = kind === 'low' || kind === 'overhead' ? kind : 'other';
    this.reaction = null;
  }

  clearReactions(): void {
    this.clearIdleMotion();
    this.reaction = null;
    this.reactionTime = this.landingCooldown = 0;
    this.deathCause = 'other';
    this.clearChaseReaction();
  }

  playChaseReaction(kind: 'panic' | 'relief' | 'pant'): void { this.chaseReaction = kind; this.chaseTime = 0; }
  clearChaseReaction(): void { this.chaseReaction = null; this.chaseTime = 0; }

  playIdleMotion(motion: IdleMotion): void {
    if (this.anim !== 'idle') return;
    this.reaction = null;
    this.idleMotion = motion;
    this.idleMotionTime = 0;
  }

  clearIdleMotion(): void {
    this.idleMotion = null;
    this.idleMotionTime = 0;
  }

  get deathProgress(): number {
    if (this.anim !== 'dead') return 0;
    const t = clamp((this.deathTime - 0.12) / 0.9, 0, 1);
    return t * t * (3 - 2 * t);
  }

  get deathPoseComplete(): boolean {
    return this.anim === 'dead' && this.deathTime >= 1.02;
  }

  get previewHintHeight(): number {
    if (this.skin.character === 'usagi') return 2.45;
    return this.seasonalRig ? 2.12 : this.royalRig ? 2.0 : 1.78;
  }

  setExpression(name: BearExpression): void {
    this.expression = name;
  }

  setJetpack(on: boolean): void {
    this.jetpack.visible = on;
  }

  setJumpBoots(on: boolean): void {
    if (on && !this.jumpBoots.length) {
      for (const [index, foot] of [this.footL, this.footR].entries()) {
        const boot = createJumpBoot({ geom: (g) => this.geom(g), material: (c, r) => this.M(c, r) });
        boot.name = index === 0 ? 'JumpBootLeft' : 'JumpBootRight';
        foot.add(boot); this.jumpBoots.push(boot);
      }
    }
    for (const boot of this.jumpBoots) boot.visible = on;
  }

  setShield(on: boolean, pulse = 0): void {
    this.shieldBubble.visible = on;
    this.shieldBubble.position.y = this.turtleOn ? 0.36 : 0.8;
    if (on) this.shieldBubble.scale.setScalar((this.turtleOn ? 0.6 : 1) * (1 + Math.sin(pulse * 0.008) * 0.05));
  }

  setTurtle(on: boolean): void {
    if (on && !this.turtleRig) {
      this.turtleRig = createTurtle({ geom: (g) => this.geom(g), material: (c, r) => this.M(c, r) });
      this.root.add(this.turtleRig.root);
    }
    this.turtleOn = on;
    this.hips.visible = !on;
    if (this.turtleRig) this.turtleRig.root.visible = on;
  }

  setSkin(skin: SkinDef): void {
    const pos = this.root.position.clone();
    const rot = this.root.rotation.clone();
    this.teardown();
    this.skin = skin;
    this.build(skin);
    this.root.position.copy(pos);
    this.root.rotation.copy(rot);
  }

  setRiding(on: boolean): void {
    if (this.riding === on) return;
    this.riding = on;
    this.applyPose();
    this.applyDogArmClearance();
    if (on) this.applyRidingPose();
  }

  /** Total triangles of the character (all LOD-relevant meshes). */
  triangleCount(): number {
    let tris = 0;
    this.root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh && m.geometry) {
        const g = m.geometry;
        tris += g.index ? g.index.count / 3 : g.attributes.position.count / 3;
      }
    });
    return Math.round(tris);
  }

  update(dt: number, motion: { speedNorm: number; lateralVel: number; rollProgress: number }): void {
    this.time += dt;
    this.landingCooldown = Math.max(0, this.landingCooldown - dt);
    if (this.reaction) {
      this.reactionTime += dt;
      if (this.reactionTime >= this.reactionDuration) this.reaction = null;
    }
    this.updateExpression(dt);
    this.updatePose(dt, motion);
    this.applyPose();
    if (this.elasticEars) this.updateEarSprings(dt, motion.speedNorm);
    if (this.skin.character === 'usagi') {
      // Long ears fold with a crouch instead of clipping the overhead rail.
      for (const [i, ear] of [this.earL, this.earR].entries()) {
        const bend = this.elasticEars ? this.earSprings[i].bend : 0;
        ear.rotation.x = bend + this.pose.slide * 1.25;
        ear.scale.y = (1 + bend * 0.5) * (1 - this.pose.slide * 0.45);
      }
    }
    this.applyReaction();
    if (this.chaseReaction) {
      this.chaseTime += Math.max(0, dt);
      if (this.chaseTime >= 1.2) this.clearChaseReaction();
      else if (!this.turtleOn && !this.riding && ['run', 'jump', 'hit'].includes(this.anim)) {
        const pulse = Math.sin(Math.PI * this.chaseTime / 1.2);
        if (this.chaseReaction === 'panic') {
          this.head.rotation.y += pulse * 0.65;
          this.head.rotation.z += Math.sin(this.chaseTime * 22) * pulse * 0.06;
        } else {
          this.head.rotation.x += pulse * (this.chaseReaction === 'pant' ? 0.2 : 0.13);
          this.chest.rotation.x += Math.sin(this.chaseTime * 12) * pulse * (this.chaseReaction === 'pant' ? 0.04 : 0.015);
        }
      }
    }
    this.applyIdleMotion(dt);
    this.applyDogArmClearance();
    if (this.riding && !this.turtleOn && this.anim !== 'dead') this.applyRidingPose();
    this.label?.update(dt, this.pose.phase, this.anim === 'run');
    this.applyFace();
  }

  dispose(): void {
    this.teardown();
  }

  private teardown(): void {
    this.seasonalRig = undefined;
    this.dailyRig = undefined;
    this.playfulRig = undefined;
    this.jumpBoots = [];
    this.royalRig = undefined;
    this.turtleRig = undefined;
    this.turtleOn = false;
    this.hips.visible = true;
    this.label?.dispose();
    this.label = undefined;
    for (const child of [...this.root.children]) this.root.remove(child);
    for (const node of [this.hips, this.spine, this.chest, this.neck, this.head, this.tail,
      this.shoulderL, this.shoulderR, this.upperArmL, this.upperArmR, this.lowerArmL, this.lowerArmR,
      this.handL, this.handR, this.upperLegL, this.upperLegR, this.lowerLegL, this.lowerLegR,
      this.footL, this.footR, this.earL, this.earR, this.browL, this.browR, this.eyeL, this.eyeR, this.jetpack]) {
      node.clear();
      node.rotation.set(0, 0, 0);
      node.scale.set(1, 1, 1);
    }
    for (const skeleton of this.skeletons) skeleton.dispose();
    for (const texture of this.textures) texture.dispose();
    this.skeletons = [];
    this.textures = [];
    for (const g of this.geoms) g.dispose();
    for (const m of this.mats) m.dispose();
    for (const m of this.disposables) m.dispose();
    this.geoms = [];
    this.mats = [];
    this.disposables = [];
    this.mouths.clear();
    this.squeezedEyes = [];
    this.deathTime = 0;
    this.clearReactions();
    for (const spring of this.earSprings) {
      spring.bend = 0;
      spring.velocity = 0;
    }
    this.root.add(this.hips);
  }

  // ---------- expression blending ----------

  private updateExpression(dt: number): void {
    for (const key of Object.keys(this.weights) as BearExpression[]) {
      this.weights[key] = damp(this.weights[key], key === this.expression ? 1 : 0, 12, dt);
    }
    const blend = face(0, 0, 0, 0, {});
    for (const key of Object.keys(this.weights) as BearExpression[]) {
      const w = this.weights[key];
      if (w < 0.001) continue;
      const f = EXPRESSIONS[key];
      blend.browShow += f.browShow * w;
      blend.browL += f.browL * w;
      blend.browR += f.browR * w;
      blend.eyeOpen += f.eyeOpen * w;
      for (const id of Object.keys(blend.mouth) as MouthId[]) blend.mouth[id] += f.mouth[id] * w;
    }
    this.faceNow = blend;

    this.blinkT -= dt;
    if (this.blinkT <= 0) {
      this.blink = 0.12;
      this.blinkT = 2 + Math.random() * 3.5;
    }
    this.blink = Math.max(0, this.blink - dt);
  }

  private applyFace(): void {
    const f = this.faceNow;
    const squeeze = clamp(this.weights.dead, 0, 1);
    const blinkMul = this.blink > 0 ? 0.12 : 1;
    const open = clamp(f.eyeOpen * blinkMul, 0.08, 1.8);
    this.eyeMeshL.scale.set(0.068 * this.eyeSize * (1 - squeeze), 0.080 * this.eyeSize * open * (1 - squeeze), 0.013);
    this.eyeMeshR.scale.set(0.068 * this.eyeSize * (1 - squeeze), 0.080 * this.eyeSize * open * (1 - squeeze), 0.013);
    for (const eye of this.squeezedEyes) {
      eye.visible = squeeze > 0.03;
      eye.scale.setScalar(Math.max(0.001, squeeze));
    }

    const family = isChiikawaCharacter(this.skin.character);
    const browShow = Math.max(f.browShow, family ? this.skin.character === 'usagi' ? 1 : 0.7 : 0);
    for (const [brow, val] of [[this.browL, f.browL], [this.browR, f.browR]] as const) {
      brow.visible = browShow > 0.03;
      brow.rotation.z = (brow === this.browL ? 1 : -1) * val * 0.6;
      brow.position.y = 0.635 + Math.max(0, val) * 0.05 * f.browShow;
      brow.position.z = this.faceSurface(brow.position.x, brow.position.y) + 0.008;
      brow.scale.setScalar(clamp(browShow, 0.001, 1));
    }

    for (const [id, group] of this.mouths) {
      const w = clamp(f.mouth[id], 0, 1.2);
      group.visible = w > 0.02;
      group.scale.setScalar(Math.max(0.001, w));
    }
  }

  // ---------- pose ----------

  private updatePose(dt: number, motion: { speedNorm: number; lateralVel: number; rollProgress: number }): void {
    const p = this.pose;
    const t: Pose = { ...ZERO_POSE };
    const speed = motion.speedNorm;
    if (this.anim === 'dead') this.deathTime += dt;

    switch (this.anim) {
      case 'idle':
        t.elbow = 0.06;
        break;
      case 'run': {
        const character = this.skin.character ?? 'bear';
        const freq = (9 + speed * 7) * (character === 'mole' ? 1.3 : character === 'dog' ? 0.88 : 1);
        p.phase += dt * freq;
        t.phase = p.phase;
        t.legAmp = 0.8 + speed * 0.5;
        t.armAmp = 0.85 + speed * 0.5;
        t.elbow = 0.7 + speed * 0.3;
        t.knee = 0.55 + speed * 0.35;
        t.pitch = 0.14 + speed * 0.14;
        t.bounce = Math.abs(Math.sin(p.phase)) * 0.05;
        t.twist = 0.08;
        if (character === 'mole') {
          t.legAmp *= 0.7;
          t.armAmp *= 0.65;
          t.leanZ = Math.sin(p.phase * 0.5) * 0.13;
          t.bounce *= 0.7;
          t.twist = 0.14;
        } else if (character === 'dog') {
          t.pitch *= 0.55;
          t.armAmp *= 0.6;
          t.elbow = 0.9;
          t.headRoll = Math.sin(p.phase * 0.5) * 0.055;
        }
        break;
      }
      case 'fly':
        t.flightPitch = 0.92;
        t.pitch = 0.18;
        t.armRaise = 0.82;
        t.armSplay = 0.55;
        t.elbow = 0.15;
        t.knee = 0.18;
        t.legAmp = 0.08;
        break;
      case 'dodge':
        t.phase = p.phase;
        t.legAmp = 0.5;
        t.armAmp = 0.7;
        t.leanZ = Math.sin(this.time * 6) * 0.3;
        t.pitch = 0.12;
        t.bounce = Math.abs(Math.sin(p.phase)) * 0.04;
        break;
      case 'jump':
        t.armRaise = 1;
        t.armSplay = 0.5;
        t.tuck = 0.75;
        t.knee = 1.1;
        t.elbow = 0.4;
        t.pitch = 0.1;
        break;
      case 'fall':
        t.armRaise = 0.8;
        t.armSplay = 0.8;
        t.tuck = 0.35;
        t.knee = 0.5;
        t.pitch = 0.04;
        break;
      case 'slide':
        // Compress around the feet rather than rolling the ground-centred Root underground.
        t.slide = 1;
        t.tuck = 0.3;
        t.knee = 0.9;
        t.elbow = 1;
        t.armSplay = 0.4;
        t.pitch = 0.16;
        break;
      case 'hit':
        t.pitch = -0.5;
        t.armRaise = 1.2;
        t.armSplay = 0.9;
        t.leanZ = Math.sin(this.time * 30) * 0.15;
        t.headRoll = Math.sin(this.time * 26) * 0.2;
        break;
      case 'victory':
        t.phase = this.time * 6;
        t.armRaise = 1.25;
        t.armSplay = 1;
        t.bounce = Math.abs(Math.sin(this.time * 6)) * 0.1;
        t.leanZ = Math.sin(this.time * 3) * 0.1;
        t.headRoll = Math.sin(this.time * 3) * 0.12;
        break;
      case 'dead':
        t.pitch = this.deathTime < 0.18 ? -0.35 : 0;
        t.headPitch = 0.38;
        t.armSplay = 1.25;
        t.elbow = 0.25;
        t.knee = 0.2;
        break;
    }

    // lane-change lean blends on top of the current locomotion pose
    const lean = clamp(-motion.lateralVel * 0.014, -0.35, 0.35);
    t.leanZ += lean;

    const k = 14;
    p.legAmp = damp(p.legAmp, t.legAmp, k, dt);
    p.armAmp = damp(p.armAmp, t.armAmp, k, dt);
    p.elbow = damp(p.elbow, t.elbow, k, dt);
    p.knee = damp(p.knee, t.knee, k, dt);
    p.pitch = damp(p.pitch, t.pitch, k, dt);
    p.leanZ = damp(p.leanZ, t.leanZ, k, dt);
    p.tuck = damp(p.tuck, t.tuck, 16, dt);
    p.armRaise = damp(p.armRaise, t.armRaise, 12, dt);
    p.armSplay = damp(p.armSplay, t.armSplay, 12, dt);
    p.bounce = damp(p.bounce, t.bounce, 18, dt);
    p.hipDip = damp(p.hipDip, t.hipDip, 16, dt);
    p.headPitch = damp(p.headPitch, t.headPitch, 8, dt);
    p.headRoll = damp(p.headRoll, t.headRoll, 8, dt);
    p.twist = damp(p.twist, t.twist, 10, dt);
    p.flightPitch = damp(p.flightPitch, t.flightPitch, 7, dt);
    // Hitbox crouches on the action frame: the rendered silhouette must follow immediately.
    p.slide = this.anim === 'slide' ? 1 : damp(p.slide, 0, 20, dt);
    if (this.anim !== 'run') p.phase = damp(p.phase, t.phase, 10, dt);
  }

  private applyPose(): void {
    const p = this.pose;
    const swing = Math.sin(p.phase);
    const step = Math.max(0, Math.cos(p.phase));
    const stepAlt = Math.max(0, -Math.cos(p.phase));

    this.upperLegL.rotation.x = swing * p.legAmp - p.tuck * 1.05;
    this.upperLegR.rotation.x = -swing * p.legAmp - p.tuck * 1.05;
    this.lowerLegL.rotation.x = stepAlt * p.knee + p.tuck * 0.5;
    this.lowerLegR.rotation.x = step * p.knee + p.tuck * 0.5;
    this.footL.rotation.x = -stepAlt * p.knee * 0.5 - p.tuck * 0.2;
    this.footR.rotation.x = -step * p.knee * 0.5 - p.tuck * 0.2;

    this.upperArmL.rotation.x = -swing * p.armAmp - p.armRaise * 1.9;
    this.upperArmR.rotation.x = swing * p.armAmp - p.armRaise * 1.9;
    this.upperArmL.rotation.z = p.armSplay * 0.5 + p.tuck * 0.6 + 0.08;
    this.upperArmR.rotation.z = -p.armSplay * 0.5 - p.tuck * 0.6 - 0.08;
    this.lowerArmL.rotation.x = -p.elbow - Math.max(0, swing) * p.armAmp * 0.4 - p.armRaise * 0.4;
    this.lowerArmR.rotation.x = -p.elbow - Math.max(0, -swing) * p.armAmp * 0.4 - p.armRaise * 0.4;

    this.spine.rotation.x = p.pitch * 0.6;
    this.chest.rotation.x = p.pitch * 0.4;
    this.chest.rotation.z = p.leanZ * 0.5;
    this.hips.rotation.y = swing * p.twist;
    this.hips.rotation.z = 0;
    this.chest.rotation.y = -swing * p.twist * 1.2;

    this.root.rotation.z = p.leanZ * (this.turtleOn ? 0.1 : 0.6) * (1 - this.deathProgress);
    // Turn the face upward and lay the whole body flat on its back.
    this.root.rotation.x = -p.flightPitch * (this.turtleOn ? 0.25 : 1) - this.deathProgress * Math.PI / 2;
    this.head.rotation.x = -p.pitch * 0.55 + p.headPitch + p.tuck * 0.35;
    this.head.rotation.z = p.leanZ * 0.45 + p.headRoll;
    this.head.rotation.y = -p.leanZ * 0.3;

    const slideScale = 1 - p.slide * 0.52;
    this.hips.scale.set(1, slideScale, 1);
    this.hips.position.y = (this.hipHeight + p.bounce + p.hipDip) * slideScale;
    this.hips.position.z = 0;
    if (this.seasonalRig) {
      // Soft hats tuck down immediately with the crouch; only the visible rig changes.
      this.seasonalRig.hat.scale.y = 1 - p.slide * 0.78;
      this.seasonalRig.hat.rotation.x = -p.slide * 0.18;
      this.seasonalRig.hat.rotation.z = this.anim === 'run' ? Math.sin(p.phase * 0.5) * 0.035 : 0;
      if (this.seasonalRig.cape) {
        this.seasonalRig.cape.visible = this.anim !== 'fly' && !this.jetpack.visible;
        this.seasonalRig.cape.rotation.x = this.anim === 'run' ? -0.05 + Math.sin(p.phase) * 0.035 : 0;
        this.seasonalRig.cape.rotation.z = this.anim === 'run' ? Math.sin(p.phase * 0.5) * 0.035 : 0;
      }
    }
    this.tail.rotation.x = Math.sin(p.phase * 0.5) * 0.25;
    if (this.dailyRig) animateDailyOutfit(this.dailyRig, p.phase, this.anim === 'run', this.anim === 'jump' || this.anim === 'fall', this.anim === 'fly' || this.jetpack.visible, p.slide);
    if (this.playfulRig) animatePlayfulOutfit(this.playfulRig, p.phase, this.anim === 'run', this.anim === 'jump' || this.anim === 'fall', this.anim === 'fly' || this.jetpack.visible, p.slide);
    if (this.royalRig) animateRoyalOutfit(this.royalRig, p.phase, this.anim === 'run', this.anim === 'fly' || this.jetpack.visible, p.slide);
    if (this.turtleRig && this.turtleOn) animateTurtle(this.turtleRig, p.phase, this.anim === 'run', this.anim === 'slide');
    this.tail.rotation.y = Math.sin(p.phase * 0.25) * 0.2;

    if (!this.elasticEars) {
      this.earL.rotation.x = this.earR.rotation.x = 0;
      this.earL.rotation.z = Math.sin(p.phase) * 0.06;
      this.earR.rotation.z = -Math.sin(p.phase) * 0.06;
    }
  }

  /** Keep the dog's compact arms outside its torso through pose blends. */
  private applyDogArmClearance(): void {
    if (this.skin.character !== 'dog') return;
    // Apply after reactions too: short paws must swing outside the belly.
    this.upperArmL.rotation.z = -Math.max(0.12, Math.abs(this.upperArmL.rotation.z));
    this.upperArmR.rotation.z = Math.max(0.12, Math.abs(this.upperArmR.rotation.z));
  }

  /** Stable bent knees and both hands on the grips, including during a bunny hop. */
  private applyRidingPose(): void {
    const duck = this.anim === 'slide';
    this.hips.position.set(0, duck ? 0.34 : 0.76, -0.12);
    this.hips.scale.set(1, duck ? 0.43 : 1, 1);
    this.hips.rotation.set(0, 0, 0);
    this.spine.rotation.set(0.06, 0, 0);
    this.chest.rotation.set(0.02, 0, 0);
    this.upperLegL.rotation.x = this.upperLegR.rotation.x = -1.12;
    this.lowerLegL.rotation.x = this.lowerLegR.rotation.x = 1.2;
    this.footL.rotation.x = this.footR.rotation.x = -0.08;
    this.upperArmL.rotation.set(-1.7, 0, 0);
    this.upperArmR.rotation.set(-1.7, 0, 0);
    this.lowerArmL.rotation.x = this.lowerArmR.rotation.x = 0.5;
    this.head.rotation.x = duck ? 0.1 : -0.04;
    this.root.rotation.x = 0;
    this.root.rotation.z *= 0.45;
  }

  /** Whole-body idle motion leaves the physical root and the user's turntable angle untouched. */
  private applyIdleMotion(dt: number): void {
    if (!this.idleMotion || this.anim !== 'idle') return;
    this.idleMotionTime += Math.max(0, dt);
    const { lift, yaw, roll, squash, headYaw } = idleMotionPose(this.idleMotion, this.idleMotionTime);
    this.hips.position.y += lift - squash * 0.25;
    this.hips.rotation.y += yaw;
    this.hips.rotation.z += roll;
    this.head.rotation.y += headYaw;
    this.hips.scale.set(1 + squash * 0.35, 1 - squash, 1 + squash * 0.35);
    // Keep the plush arms hanging naturally throughout the idle actions.
    this.upperArmL.rotation.set(0.025, 0, -0.12);
    this.upperArmR.rotation.set(0.025, 0, 0.12);
    this.lowerArmL.rotation.set(-0.055, 0, 0);
    this.lowerArmR.rotation.set(-0.055, 0, 0);
    if (this.idleMotionTime >= IDLE_DURATION[this.idleMotion]) this.clearIdleMotion();
  }

  /** Short silhouette reactions on the rig only. Crouches retain their safe visual height. */
  private applyReaction(): void {
    if (this.anim === 'dead') {
      const wiggle = Math.sin(Math.PI * clamp((this.deathTime - 1.02) / 0.65, 0, 1));
      if (this.deathCause === 'low') this.upperLegL.rotation.x -= wiggle * 0.42;
      if (this.deathCause === 'overhead') {
        this.earL.rotation.x += Math.sin(this.deathTime * 25) * wiggle * 0.22;
        this.earR.rotation.x -= Math.sin(this.deathTime * 25) * wiggle * 0.22;
      }
      return;
    }
    if (!this.reaction || this.anim === 'slide' || this.anim === 'hit') return;
    if (this.anim === 'fly' && this.reaction !== 'takeoff') return;
    const t = this.reactionTime / this.reactionDuration;
    const pulse = Math.sin(Math.PI * t);
    const character = this.skin.character ?? 'bear';
    if (this.reaction === 'takeoff') {
      const panic = Math.max(0, 1 - t * 2);
      this.upperArmL.rotation.z += Math.sin(t * 38) * panic * 0.65;
      this.upperArmR.rotation.z -= Math.cos(t * 38) * panic * 0.65;
      this.head.rotation.z += Math.sin(t * 24) * panic * 0.12;
      this.chest.rotation.x -= pulse * (1 - panic) * 0.13;
    } else if (this.reaction === 'magnet') {
      this.chest.rotation.z += Math.sin(t * Math.PI * 2) * pulse * 0.2;
      this.upperArmR.rotation.x -= pulse * 0.7;
      this.head.rotation.y -= pulse * 0.2;
    } else if (this.reaction === 'relief') {
      this.head.rotation.x += pulse * 0.25;
      this.upperArmL.rotation.x -= pulse * 0.55;
      this.upperArmR.rotation.x -= pulse * 0.55;
      this.lowerArmL.rotation.x -= pulse * 0.65;
      this.lowerArmR.rotation.x -= pulse * 0.65;
    } else if (this.reaction === 'double') {
      this.upperArmL.rotation.z += pulse * 0.4;
      this.upperArmR.rotation.z -= pulse * 0.4;
      this.chest.rotation.x -= pulse * 0.2;
      this.head.rotation.x -= pulse * 0.1;
    } else if (this.reaction === 'combo') {
      this.upperArmL.rotation.x -= pulse * 0.65;
      this.upperArmR.rotation.z -= Math.sin(t * Math.PI * 4) * pulse * 0.3;
      this.chest.rotation.x -= pulse * 0.12;
      this.head.rotation.y += pulse * (character === 'mole' ? 0.3 : 0.15);
    } else if (this.reaction === 'close') {
      if (character === 'mole') {
        this.head.rotation.y += pulse * 0.5;
        this.chest.rotation.y -= pulse * 0.18;
        this.upperArmR.rotation.z -= pulse * 0.3;
      } else if (character === 'dog') {
        this.chest.rotation.x -= pulse * 0.18;
        this.upperArmL.rotation.x -= pulse * 0.35;
        this.upperArmR.rotation.x -= pulse * 0.35;
      } else {
        this.hips.position.y -= pulse * 0.065;
        this.head.rotation.x += pulse * 0.16;
        this.upperArmL.rotation.z += pulse * 0.32;
        this.upperArmR.rotation.z -= pulse * 0.32;
      }
    } else if (character === 'mole') {
      const squash = Math.sin(t * Math.PI * 2) * (1 - t) * 0.12;
      this.hips.scale.set(1 + squash * 0.5, this.hips.scale.y * (1 - squash), 1 + squash * 0.5);
      this.hips.position.y -= Math.max(0, squash) * 0.15;
    } else if (character === 'dog') {
      this.chest.rotation.x += pulse * 0.16;
      this.upperArmL.rotation.z -= pulse * 0.38;
      this.upperArmR.rotation.z += pulse * 0.38;
      this.lowerArmL.rotation.x -= pulse * 0.45;
      this.lowerArmR.rotation.x -= pulse * 0.45;
    } else {
      const shake = Math.sin(t * Math.PI * 5) * pulse * 0.2;
      this.earL.rotation.z += shake;
      this.earR.rotation.z -= shake;
    }
  }

  private updateEarSprings(dt: number, speed: number): void {
    const duration = clamp(dt, 0, 0.1);
    const steps = Math.ceil(duration * 120);
    if (!steps) return;
    const step = duration / steps;
    const dog = this.skin.character === 'dog';
    const strength = this.anim === 'run' ? (0.8 + clamp(speed, 0, 1) * 0.3) * (dog ? 1.25 : 1) : 0;

    for (let i = 0; i < this.earSprings.length; i++) {
      const spring = this.earSprings[i];
      const side = i === 0 ? -1 : 1;
      const ear = i === 0 ? this.earL : this.earR;
      // Lift just after each footfall, then let the spring pull the plush ear back.
      // The offset keeps the two ears from moving like a rigid pair.
      const phase = this.pose.phase;
      const footfall = Math.max(0, Math.cos(phase * 2 - 0.65 + i * 0.16));
      const target = strength * (-0.12 + Math.pow(footfall, 3) * 0.5);
      for (let j = 0; j < steps; j++) {
        spring.velocity += ((target - spring.bend) * 720 - spring.velocity * 17) * step;
        spring.bend += spring.velocity * step;
        const bounded = clamp(spring.bend, -0.48, 0.48);
        if (bounded !== spring.bend) spring.velocity = 0;
        spring.bend = bounded;
      }
      // Lag, overshoot and a little squash/stretch read as soft stuffing.
      // With no run drive, the spring continues settling rather than snapping.
      ear.rotation.x = spring.bend;
      ear.rotation.z = -side * (0.08 + spring.bend);
      const stretch = 1 + spring.bend * 0.5;
      const width = 1 / Math.sqrt(stretch);
      ear.scale.set(width, stretch, width);
    }
  }
}
