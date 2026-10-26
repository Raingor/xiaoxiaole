export const SIZE = 8;
export type Special = 'row' | 'column' | 'bomb' | 'rainbow';
export interface Tile { id: number; kind: number; special?: Special }
export interface Goal { kind: number | 'ice' | 'score'; target: number }
export interface Level { id: number; name: string; subtitle: string; moves: number; kinds: number; size?: number; goals: Goal[]; holes: number[]; ice: number[]; doubleIce?: boolean }
export interface Match { cells: number[]; special?: Special; anchor: number }
export interface Wave { removed: number[]; created: number[]; activated: number[]; iceBroken: number; points: number }
let nextId = 1;
const tile = (kind: number): Tile => ({ id: nextId++, kind });
export const adjacent = (a: number, b: number) => Math.abs(a % SIZE - b % SIZE) + Math.abs(Math.floor(a / SIZE) - Math.floor(b / SIZE)) === 1;
export const rowOf = (i: number) => Math.floor(i / SIZE);
const area = (center: number, radius: number) => Array.from({ length: 64 }, (_, i) => i).filter(i => Math.abs(rowOf(i) - rowOf(center)) <= radius && Math.abs(i % SIZE - center % SIZE) <= radius);

// Introduce one source of difficulty at a time: board size, then a new friend,
// then obstacles. Collection totals rise by three at each stop.
const squareIce = (count: number) => Array.from({ length: count }, (_, i) => (2 + Math.floor(i / 3)) * 8 + 2 + i % 3);
const LEVEL_DEFINITIONS: Level[] = [
  { id: 1, name: '初见站台', subtitle: '三位伙伴，先收集6个自嘲熊', moves: 26, size: 5, kinds: 3, goals: [{ kind: 0, target: 6 }], holes: [], ice: [] },
  { id: 2, name: '晴空小径', subtitle: '再熟悉一点，收集9个吉伊', moves: 25, size: 5, kinds: 3, goals: [{ kind: 1, target: 9 }], holes: [], ice: [] },
  { id: 3, name: '伙伴小站', subtitle: '棋盘变大一点，试试两个小目标', moves: 26, size: 6, kinds: 3, goals: [{ kind: 0, target: 6 }, { kind: 2, target: 6 }], holes: [], ice: [] },
  { id: 4, name: '樱花转角', subtitle: '乌萨奇加入快乐旅程', moves: 28, size: 6, kinds: 4, goals: [{ kind: 3, target: 9 }, { kind: 1, target: 6 }], holes: [], ice: [] },
  { id: 5, name: '甜甜广场', subtitle: '和四位伙伴一起制造连消', moves: 26, size: 6, kinds: 4, goals: [{ kind: 2, target: 9 }, { kind: 3, target: 9 }], holes: [], ice: [] },
  { id: 6, name: '薄荷冰站', subtitle: '第一次遇见冰块，消除上面的伙伴试试', moves: 28, size: 7, kinds: 4, goals: [{ kind: 'ice', target: 6 }, { kind: 0, target: 15 }], holes: [], ice: squareIce(6) },
  { id: 7, name: '落日海岸', subtitle: '欢迎圆滚滚的鼹鼠饼', moves: 28, size: 7, kinds: 5, goals: [{ kind: 4, target: 12 }, { kind: 0, target: 12 }], holes: [], ice: [] },
  { id: 8, name: '云朵天桥', subtitle: '慢慢融化更多冰块', moves: 30, size: 7, kinds: 5, goals: [{ kind: 'ice', target: 9 }, { kind: 3, target: 18 }], holes: [], ice: squareIce(9) },
  { id: 9, name: '彩虹街区', subtitle: '完整大棋盘，试试五连彩虹', moves: 28, size: 8, kinds: 5, goals: [{ kind: 2, target: 15 }, { kind: 1, target: 15 }], holes: [], ice: [] },
  { id: 10, name: '月亮花园', subtitle: '老头狗加入，六位伙伴终于到齐', moves: 30, size: 8, kinds: 6, goals: [{ kind: 5, target: 18 }, { kind: 0, target: 15 }], holes: [], ice: [] },
  { id: 11, name: '银河换乘', subtitle: '双层冰块登场，用特效慢慢突破', moves: 32, size: 8, kinds: 6, goals: [{ kind: 'ice', target: 12 }, { kind: 4, target: 24 }], holes: [], ice: squareIce(12), doubleIce: true },
  { id: 12, name: '快乐终点站', subtitle: '带着六位伙伴一起到达终点', moves: 34, size: 8, kinds: 6, goals: [{ kind: 'ice', target: 15 }, { kind: 5, target: 24 }], holes: [], ice: squareIce(15), doubleIce: true },
];
export const LEVELS: Level[] = LEVEL_DEFINITIONS.map(level => ({
  ...level,
  holes: Array.from({ length: 64 }, (_, i) => i).filter(i => rowOf(i) >= level.size! || i % SIZE >= level.size!),
}));

/** Find horizontal/vertical runs and merge intersections before creating specials. */
export function findMatches(board: (Tile | null)[], preferred: number[] = []): Match[] {
  const lines: { cells: number[]; horizontal: boolean }[] = [];
  for (const horizontal of [true, false]) for (let line = 0; line < SIZE; line++) {
    let run: number[] = [];
    const flush = () => { if (run.length >= 3) lines.push({ cells: run, horizontal }); run = []; };
    for (let n = 0; n < SIZE; n++) {
      const i = horizontal ? line * SIZE + n : n * SIZE + line;
      const t = board[i];
      if (!t || t.special === 'rainbow') { flush(); continue; }
      if (run.length && board[run[0]]!.kind !== t.kind) flush();
      run.push(i);
    }
    flush();
  }
  const groups: typeof lines[] = [];
  for (const line of lines) {
    const overlaps = groups.filter(g => g.some(l => l.cells.some(i => line.cells.includes(i))));
    if (!overlaps.length) groups.push([line]);
    else {
      const combined = [line, ...overlaps.flat()];
      for (const g of overlaps) groups.splice(groups.indexOf(g), 1);
      groups.push(combined);
    }
  }
  return groups.map(group => {
    const cells = [...new Set(group.flatMap(l => l.cells))];
    const longest = Math.max(...group.map(l => l.cells.length));
    const intersection = cells.find(i => group.filter(l => l.cells.includes(i)).length > 1);
    const special: Special | undefined = longest >= 5 ? 'rainbow' : intersection !== undefined ? 'bomb' : longest === 4 ? (group[0].horizontal ? 'row' : 'column') : undefined;
    const anchor = preferred.find(i => cells.includes(i) && !board[i]?.special) ?? intersection ?? cells[Math.floor(cells.length / 2)];
    return { cells, special, anchor };
  });
}

export class Game {
  board: (Tile | null)[] = [];
  ice: number[] = Array(64).fill(0);
  collected: number[] = Array(6).fill(0);
  iceCleared = 0;
  score = 0;
  moves: number;
  combo = 0;
  constructor(public level: Level, private random = Math.random) {
    this.moves = level.moves;
    for (const i of level.ice) this.ice[i] = level.doubleIce ? 2 : 1;
    this.generate();
  }
  generate() {
    for (let attempt = 0; attempt < 200; attempt++) {
      this.board = Array(64).fill(null);
      for (let i = 0; i < 64; i++) {
        if (this.level.holes.includes(i)) continue;
        let kind: number;
        do { kind = Math.floor(this.random() * this.level.kinds); }
        while ((i % 8 >= 2 && this.board[i - 1]?.kind === kind && this.board[i - 2]?.kind === kind) || (i >= 16 && this.board[i - 8]?.kind === kind && this.board[i - 16]?.kind === kind));
        this.board[i] = tile(kind);
      }
      if (this.validMoves().length) return;
    }
    throw new Error('无法生成可用棋盘');
  }
  validMoves(): [number, number][] {
    const result: [number, number][] = [];
    for (let a = 0; a < 64; a++) for (const b of [a + 1, a + 8]) {
      if (b >= 64 || !adjacent(a, b) || !this.board[a] || !this.board[b]) continue;
      const x = this.board[a]!, y = this.board[b]!;
      if (x.special === 'rainbow' || y.special === 'rainbow' || (x.special && y.special)) { result.push([a, b]); continue; }
      [this.board[a], this.board[b]] = [y, x];
      const matched = findMatches(this.board).some(m => m.cells.includes(a) || m.cells.includes(b));
      [this.board[a], this.board[b]] = [x, y];
      if (matched) result.push([a, b]);
    }
    return result;
  }
  swap(a: number, b: number): { valid: boolean; forced?: Set<number> } {
    if (!adjacent(a, b) || !this.board[a] || !this.board[b] || this.moves <= 0) return { valid: false };
    [this.board[a], this.board[b]] = [this.board[b], this.board[a]];
    const x = this.board[a]!, y = this.board[b]!;
    let forced: Set<number> | undefined;
    if (x.special === 'rainbow' || y.special === 'rainbow') {
      const rainbow = x.special === 'rainbow' ? x : y, other = rainbow === x ? y : x;
      const hits = this.board.flatMap((t, i) => t && (other.special === 'rainbow' || t.kind === other.kind) ? [i] : []);
      if (other.special && other.special !== 'rainbow') for (const i of hits) if (this.board[i] && this.board[i] !== rainbow) this.board[i]!.special = other.special;
      forced = new Set([a, b, ...hits]);
      // A swapped rainbow targets the partner's color, not its own base color.
      if (x.special === 'rainbow') x.special = undefined;
      if (y.special === 'rainbow') y.special = undefined;
    } else if (x.special && y.special) {
      let hits: number[];
      if (x.special === 'bomb' && y.special === 'bomb') hits = area(a, 2);
      else if (x.special === 'bomb' || y.special === 'bomb') hits = this.board.flatMap((t, i) => t && (Math.abs(rowOf(i) - rowOf(a)) <= 1 || Math.abs(i % 8 - a % 8) <= 1) ? [i] : []);
      else hits = this.board.flatMap((t, i) => t && (rowOf(i) === rowOf(a) || i % 8 === a % 8) ? [i] : []);
      forced = new Set([a, b, ...hits]);
    }
    if (!forced && !findMatches(this.board).length) {
      [this.board[a], this.board[b]] = [this.board[b], this.board[a]];
      return { valid: false };
    }
    this.moves--; this.combo = 0;
    return { valid: true, forced };
  }
  resolve(forced?: Set<number>, preferred: number[] = []): Wave | null {
    const matches = forced ? [] : findMatches(this.board, preferred);
    if (!forced && !matches.length) return null;
    const hits = forced ? new Set(forced) : new Set(matches.flatMap(m => m.cells));
    const creates = matches.filter(m => m.special && !this.board[m.anchor]?.special);
    const protectedCells = new Set(creates.map(m => m.anchor));
    const activated: number[] = [];
    const queue = [...hits];
    for (let n = 0; n < queue.length; n++) {
      const i = queue[n], t = this.board[i];
      if (!t?.special || protectedCells.has(i)) continue;
      activated.push(i);
      const extra = t.special === 'row' ? Array.from({ length: 8 }, (_, c) => rowOf(i) * 8 + c)
        : t.special === 'column' ? Array.from({ length: 8 }, (_, r) => r * 8 + i % 8)
        : t.special === 'bomb' ? area(i, 1)
        : this.board.flatMap((p, k) => p?.kind === t.kind ? [k] : []);
      for (const k of extra) if (!hits.has(k)) { hits.add(k); queue.push(k); }
    }
    let iceBroken = 0;
    const removed: number[] = [];
    for (const i of hits) {
      const t = this.board[i];
      if (!t) continue;
      if (this.ice[i] > 0) { this.ice[i]--; if (!this.ice[i]) { this.iceCleared++; iceBroken++; } }
      if (protectedCells.has(i)) continue;
      this.collected[t.kind]++; this.board[i] = null; removed.push(i);
    }
    for (const m of creates) this.board[m.anchor]!.special = m.special;
    this.combo++;
    const points = removed.length * 60 * this.combo + activated.length * 120 + creates.length * 100 + iceBroken * 80;
    this.score += points;
    return { removed, created: creates.map(m => m.anchor), activated, iceBroken, points };
  }
  collapse(): Map<number, number> {
    const drops = new Map<number, number>();
    for (let c = 0; c < 8; c++) {
      const cells = Array.from({ length: 8 }, (_, r) => r * 8 + c).filter(i => !this.level.holes.includes(i));
      const existing = cells.filter(i => this.board[i]).map(i => ({ t: this.board[i]!, from: i }));
      for (let n = cells.length - 1; n >= 0; n--) {
        const dest = cells[n], old = existing.pop();
        this.board[dest] = old?.t ?? tile(Math.floor(this.random() * this.level.kinds));
        drops.set(dest, old ? (dest - old.from) / 8 : (n + 1));
      }
    }
    return drops;
  }
  shuffle() {
    const cells = this.board.flatMap((t, i) => t ? [i] : []);
    const tiles = cells.map(i => this.board[i]!);
    for (let attempt = 0; attempt < 200; attempt++) {
      for (let i = tiles.length - 1; i > 0; i--) { const j = Math.floor(this.random() * (i + 1)); [tiles[i], tiles[j]] = [tiles[j], tiles[i]]; }
      cells.forEach((c, i) => this.board[c] = tiles[i]);
      if (!findMatches(this.board).length && this.validMoves().length) return;
    }
    this.generate();
  }
  progress(goal: Goal): number { return goal.kind === 'ice' ? this.iceCleared : goal.kind === 'score' ? this.score : this.collected[goal.kind]; }
  get won() { return this.level.goals.every(g => this.progress(g) >= g.target); }
  get stars() { return this.score >= 12000 ? 3 : this.score >= 6500 ? 2 : 1; }
  serialize() { return { rules: 2, level: this.level.id, board: this.board, ice: this.ice, collected: this.collected, iceCleared: this.iceCleared, score: this.score, moves: this.moves }; }
  static restore(data: ReturnType<Game['serialize']>): Game | null {
    const level = LEVELS.find(l => l.id === data?.level);
    if (!level || data.rules !== 2 || !Array.isArray(data.board) || data.board.length !== 64 || !Array.isArray(data.ice) || data.ice.length !== 64 || !Array.isArray(data.collected) || data.collected.length !== 6 || ![data.moves, data.score, data.iceCleared, ...data.collected].every(n => Number.isFinite(n) && n >= 0)) return null;
    const ids = new Set<number>();
    for (let i = 0; i < 64; i++) {
      const t = data.board[i];
      if (level.holes.includes(i) ? t !== null : !t || !Number.isInteger(t.kind) || t.kind < 0 || t.kind >= level.kinds || !Number.isInteger(t.id) || t.id < 1 || ids.has(t.id) || (t.special !== undefined && !['row', 'column', 'bomb', 'rainbow'].includes(t.special))) return null;
      if (t) ids.add(t.id);
      if (![0, 1, 2].includes(data.ice[i])) return null;
    }
    const game = new Game(level);
    game.board = data.board; game.ice = data.ice; game.collected = data.collected;
    game.iceCleared = data.iceCleared; game.score = data.score; game.moves = data.moves;
    nextId = Math.max(nextId, ...data.board.map(t => (t?.id ?? 0) + 1));
    if (findMatches(game.board).length) return null;
    return game;
  }
}
