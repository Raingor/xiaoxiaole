import type { ShowcasePose } from './AdventureCatalog';

export type IdleMotion = 'hop' | 'doubleHop' | 'sway' | 'wiggle' | 'spinHop' | 'spinBack';
export const IDLE_DURATION: Record<IdleMotion, number> = { hop: 1.05, doubleHop: 1.25, sway: 1.2, wiggle: 1.3, spinHop: 1.2, spinBack: 1.2 };
export const SOUVENIR_MOTION: Record<ShowcasePose, IdleMotion> = {
  wave: 'hop', clap: 'doubleHop', lookout: 'spinHop', hero: 'spinBack', relief: 'sway', dance: 'wiggle',
};

export function idleMotionPose(motion: IdleMotion, elapsed: number): { lift: number; yaw: number; roll: number; squash: number; headYaw: number } {
  const t = Math.max(0, Math.min(1, elapsed / IDLE_DURATION[motion]));
  let lift = 0, yaw = 0, roll = 0, squash = 0, headYaw = 0;
  const wave = Math.sin(Math.PI * t);
  if (motion === 'sway' || motion === 'wiggle') {
    headYaw = Math.sin(t * Math.PI * (motion === 'wiggle' ? 4 : 2)) * wave * (motion === 'wiggle' ? 0.4 : 0.32);
  } else {
    const jumps = motion === 'doubleHop' ? 2 : 1;
    const phase = t === 1 ? 1 : (t * jumps) % 1;
    const anticipation = phase < 0.16 ? Math.sin(Math.PI * phase / 0.16) : 0;
    const flight = Math.max(0, Math.min(1, (phase - 0.16) / 0.67));
    lift = 4 * flight * (1 - flight) * (jumps === 2 ? 0.13 : 0.23);
    const landing = phase > 0.83 ? Math.sin(Math.PI * (phase - 0.83) / 0.17) : 0;
    squash = anticipation * 0.045 + landing * 0.03;
    if (motion === 'spinHop' || motion === 'spinBack') {
      const turn = flight * flight * (3 - 2 * flight);
      yaw = turn * Math.PI * 2 * (motion === 'spinBack' ? -1 : 1);
    }
  }
  return { lift, yaw, roll, squash, headYaw };
}

/** Starts a small action every 2–3 seconds; dragging and other screens reset the wait. */
export class IdleRoutineSystem {
  private elapsed = 0;
  private index = 0;
  private delay = 2.4;

  reset(index = 0): void { this.elapsed = 0; this.index = index % 3; this.delay = 2.4; }

  afterPreview(motion: IdleMotion): void {
    this.reset(motion === 'hop' || motion === 'doubleHop' ? 1 : motion === 'sway' || motion === 'wiggle' ? 2 : 0);
  }

  update(dt: number, equipped: ShowcasePose): IdleMotion | null {
    this.elapsed += Math.max(0, dt);
    if (this.elapsed + 1e-8 < this.delay) return null;
    this.elapsed = 0;
    const kind = this.index;
    this.index = (this.index + 1) % 3;
    this.delay = [2.7, 2.3, 2.6][kind];
    return kind === 0 ? (equipped === 'clap' ? 'doubleHop' : 'hop')
      : kind === 1 ? (equipped === 'dance' ? 'wiggle' : 'sway') : equipped === 'hero' ? 'spinBack' : 'spinHop';
  }
}
