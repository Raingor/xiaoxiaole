import { CHARACTER_COUNT } from './catalog';
export const SIZE = 8;
export type Special = 'row' | 'column' | 'bomb' | 'rainbow';
export interface Tile { id: number; kind: number; special?: Special }
export interface Goal { kind: number | 'ice' | 'score' | 'rescue' | 'souvenir' | 'combo' | 'bombs'; target: number }
export type Theme = 'sunny' | 'picnic' | 'rain' | 'night';
export interface Level { theme?: Theme; rescue?: { cell: number; kind: number }[]; souvenirs?: number[]; train?: boolean; id: number; name: string; subtitle: string; moves: number; kinds: number; size?: number; roster?: number[]; bombs?: number[]; goals: Goal[]; holes: number[]; ice: number[]; doubleIce?: boolean }
export interface Match { cells: number[]; special?: Special; anchor: number }
export interface Wave { removed: number[]; created: number[]; activated: number[]; iceBroken: number; points: number; rescued: number[]; souvenirs: number[] }
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
  { id: 3, name: '伙伴小站', subtitle: '棋盘变大一点，试试两个小目标', moves: 26, size: 6, kinds: 3, goals: [{ kind: 0, target: 6 }, { kind: 2, target: 6 }], holes: [], ice: [], bombs: [18] },
  { id: 4, name: '樱花转角', subtitle: '乌萨奇加入快乐旅程', moves: 28, size: 6, kinds: 4, goals: [{ kind: 3, target: 9 }, { kind: 1, target: 6 }], holes: [], ice: [] },
  { id: 5, name: '甜甜广场', subtitle: '和四位伙伴一起制造连消', moves: 26, size: 6, kinds: 4, goals: [{ kind: 2, target: 9 }, { kind: 3, target: 9 }], holes: [], ice: [] },
  { id: 6, name: '薄荷冰站', subtitle: '第一次遇见冰块，消除上面的伙伴试试', moves: 28, size: 7, kinds: 4, goals: [{ kind: 'ice', target: 6 }, { kind: 0, target: 15 }], holes: [], ice: squareIce(6), bombs: [18] },
  { id: 7, name: '落日海岸', subtitle: '欢迎圆滚滚的鼹鼠饼', moves: 28, size: 7, kinds: 5, goals: [{ kind: 4, target: 12 }, { kind: 0, target: 12 }], holes: [], ice: [] },
  { id: 8, name: '云朵天桥', subtitle: '慢慢融化更多冰块', moves: 30, size: 7, kinds: 5, goals: [{ kind: 'ice', target: 9 }, { kind: 3, target: 18 }], holes: [], ice: squareIce(9), bombs: [18, 36] },
  { id: 9, name: '彩虹街区', subtitle: '完整大棋盘，试试五连彩虹', moves: 28, size: 8, kinds: 5, goals: [{ kind: 2, target: 15 }, { kind: 1, target: 15 }], holes: [], ice: [] },
  { id: 10, name: '月亮花园', subtitle: '老头狗加入，六位伙伴终于到齐', moves: 30, size: 8, kinds: 6, goals: [{ kind: 5, target: 18 }, { kind: 0, target: 15 }], holes: [], ice: [] },
  { id: 11, name: '银河换乘', subtitle: '双层冰块登场，用特效慢慢突破', moves: 32, size: 8, kinds: 6, goals: [{ kind: 'ice', target: 12 }, { kind: 4, target: 24 }], holes: [], ice: squareIce(12), bombs: [18, 36], doubleIce: true },
  { id: 12, name: '快乐终点站', subtitle: '带着六位伙伴一起到达终点', moves: 34, size: 8, kinds: 6, goals: [{ kind: 'ice', target: 15 }, { kind: 5, target: 24 }], holes: [], ice: squareIce(15), bombs: [18, 36], doubleIce: true },

  { id: 13, name: '雨滴小站', subtitle: '雨衣熊加入：相同造型才能一起消除', moves: 34, size: 8, kinds: 6, roster: [0,2,3,4,5,6], bombs: [18], goals: [{ kind: 6, target: 21 }, { kind: 0, target: 21 }], holes: [], ice: [] },
  { id: 14, name: '雨后彩虹', subtitle: '用熊熊炸弹帮伙伴们清路', moves: 35, size: 8, kinds: 6, roster: [0,2,3,4,5,6], bombs: [18,36], goals: [{ kind: 'ice', target: 15 }, { kind: 6, target: 30 }], holes: [], ice: squareIce(15) },
  { id: 15, name: '晚安月台', subtitle: '睡衣熊加入，慢慢收集新造型', moves: 36, size: 8, kinds: 6, roster: [0,2,3,5,6,7], bombs: [18], goals: [{ kind: 7, target: 24 }, { kind: 6, target: 24 }], holes: [], ice: [] },
  { id: 16, name: '星星枕头', subtitle: '睡帽和雨衣，记得看清造型再交换', moves: 36, size: 8, kinds: 6, roster: [0,2,3,5,6,7], bombs: [18,36], goals: [{ kind: 'ice', target: 15 }, { kind: 7, target: 36 }], holes: [], ice: squareIce(15), doubleIce: true },
  { id: 17, name: '夜行街角', subtitle: '忍者熊加入，三款造型一起出发', moves: 38, size: 8, kinds: 6, roster: [0,3,5,6,7,8], bombs: [18], goals: [{ kind: 8, target: 27 }, { kind: 7, target: 27 }], holes: [], ice: [] },
  { id: 18, name: '造型大派对', subtitle: '用特效组合庆祝新的旅程', moves: 40, size: 8, kinds: 6, roster: [0,3,5,6,7,8], bombs: [18,36], goals: [{ kind: 6, target: 18 }, { kind: 7, target: 18 }, { kind: 8, target: 21 }], holes: [], ice: [] },
];
export const levelRoster = (level: Level): number[] => level.roster ?? Array.from({ length: level.kinds }, (_, i) => i);
export const LEVELS: Level[] = LEVEL_DEFINITIONS.map(level => ({
  ...level,
  theme: level.id >= 15 ? 'night' : level.id >= 13 ? 'rain' : level.id >= 7 ? 'picnic' : 'sunny',
  train: level.id >= 8,
  rescue: ({ 5: [{ cell: 18, kind: 1 }, { cell: 27, kind: 2 }], 8: [{ cell: 19, kind: 0 }, { cell: 36, kind: 3 }], 11: [{ cell: 20, kind: 4 }, { cell: 44, kind: 5 }], 18: [{ cell: 18, kind: 6 }, { cell: 36, kind: 7 }, { cell: 45, kind: 8 }] } as Record<number, {cell: number; kind: number}[]>)[level.id] ?? [],
  souvenirs: [7, 9, 12, 15, 16, 17, 18].includes(level.id) ? [17, 27, 36] : [],
  goals: [5, 8, 11, 18].includes(level.id) ? [...level.goals, { kind: 'rescue', target: level.id === 18 ? 3 : 2 }] : [7, 9, 12, 15, 16, 17].includes(level.id) ? [...level.goals.map((g,i) => i === level.goals.length - 1 ? {...g, target:g.target-3} : g), {kind:'souvenir',target:3}] : level.goals,
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
  collected: number[] = Array(CHARACTER_COUNT).fill(0);
  iceCleared = 0;
  score = 0;
  moves: number;
  combo = 0;
  maxCombo = 0;
  bombsUsed = 0;
  cages: number[] = Array(64).fill(0);
  rescued = 0;
  souvenirCells: number[] = [];
  souvenirsCollected = 0;
  trainEnergy = 0;
  trainRides = 0;
  rngState = 0;
  constructor(public level: Level, private random = Math.random, public initialSeed?: number) {
    if (initialSeed !== undefined) {
      this.rngState = initialSeed >>> 0;
      this.random = () => { this.rngState = (Math.imul(this.rngState, 1664525) + 1013904223) >>> 0; return this.rngState / 4294967296; };
    }
    for (const box of level.rescue ?? []) this.cages[box.cell] = 2;
    this.souvenirCells = [...(level.souvenirs ?? [])];
    this.moves = level.moves;
    for (const i of level.ice) this.ice[i] = level.doubleIce ? 2 : 1;
    this.generate();
  }
  private randomKind() { const roster = levelRoster(this.level); return roster[Math.floor(this.random() * roster.length)]; }
  generate() {
    for (let attempt = 0; attempt < 200; attempt++) {
      this.board = Array(64).fill(null);
      for (let i = 0; i < 64; i++) {
        if (this.level.holes.includes(i)) continue;
        let kind: number;
        do { kind = this.randomKind(); }
        while ((i % 8 >= 2 && this.board[i - 1]?.kind === kind && this.board[i - 2]?.kind === kind) || (i >= 16 && this.board[i - 8]?.kind === kind && this.board[i - 16]?.kind === kind));
        this.board[i] = tile(kind);
      }
      for (const i of this.level.bombs ?? []) { if (this.board[i]) this.board[i] = { ...this.board[i]!, kind: 0, special: 'bomb' }; }
      if (!findMatches(this.board).length && this.validMoves().length) return;
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
    this.bombsUsed += activated.filter(i => this.board[i]?.special === 'bomb').length;
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
    const rescued: number[] = [];
    for (const box of this.level.rescue ?? []) {
      if (this.cages[box.cell] && removed.some(i => i === box.cell || adjacent(i, box.cell))) {
        this.cages[box.cell]--;
        if (!this.cages[box.cell]) { this.rescued++; rescued.push(box.kind); }
      }
    }
    const souvenirs = this.souvenirCells.filter(i => removed.includes(i));
    this.souvenirCells = this.souvenirCells.filter(i => !removed.includes(i));
    this.souvenirsCollected += souvenirs.length;
    this.combo++;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    if (this.level.train) this.trainEnergy = Math.min(72, this.trainEnergy + removed.length);
    const points = removed.length * 60 * this.combo + activated.length * 120 + creates.length * 100 + iceBroken * 80;
    this.score += points;
    return { removed, created: creates.map(m => m.anchor), activated, iceBroken, points, rescued, souvenirs };
  }
  collapse(): Map<number, number> {
    const drops = new Map<number, number>();
    for (let c = 0; c < 8; c++) {
      const cells = Array.from({ length: 8 }, (_, r) => r * 8 + c).filter(i => !this.level.holes.includes(i));
      const existing = cells.filter(i => this.board[i]).map(i => ({ t: this.board[i]!, from: i }));
      for (let n = cells.length - 1; n >= 0; n--) {
        const dest = cells[n], old = existing.pop();
        this.board[dest] = old?.t ?? tile(this.randomKind());
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
  departTrain(): { type: 'gift' | 'row'; cells: number[] } | null {
    if (!this.level.train || this.trainEnergy < 36) return null;
    this.trainEnergy -= 36; this.trainRides++;
    const candidates = this.board.flatMap((t,i) => t && !t.special ? [i] : []);
    if (this.trainRides % 2 === 1 && candidates.length) {
      const cell = candidates[Math.floor(this.random() * candidates.length)];
      this.board[cell]!.special = 'bomb';
      return { type:'gift', cells:[cell] };
    }
    const row = Math.floor(this.random() * (this.level.size ?? 8));
    return {type:'row',cells:this.board.flatMap((t,i) => t && rowOf(i) === row ? [i] : [])};
  }
  progress(goal: Goal): number {
    return typeof goal.kind === 'number' ? this.collected[goal.kind] : ({ice:this.iceCleared,score:this.score,rescue:this.rescued,souvenir:this.souvenirsCollected,combo:this.maxCombo,bombs:this.bombsUsed})[goal.kind];
  }
  get won() { return this.level.goals.every(g => this.progress(g) >= g.target); }
  get stars() { return this.score >= 12000 ? 3 : this.score >= 6500 ? 2 : 1; }
  serialize() { return { rules: 2, level: this.level.id, board: this.board, ice: this.ice, collected: this.collected, iceCleared: this.iceCleared, score: this.score, moves: this.moves, initialSeed:this.initialSeed, rngState:this.rngState, cages:this.cages, rescued:this.rescued, souvenirCells:this.souvenirCells, souvenirsCollected:this.souvenirsCollected, trainEnergy:this.trainEnergy, trainRides:this.trainRides, maxCombo:this.maxCombo, bombsUsed:this.bombsUsed }; }
  static restore(data: ReturnType<Game['serialize']>, override?: Level): Game | null {
    const level = override?.id === data?.level ? override : LEVELS.find(l => l.id === data?.level);
    if (!level || data.rules !== 2 || !Array.isArray(data.board) || data.board.length !== 64 || !Array.isArray(data.ice) || data.ice.length !== 64 || !Array.isArray(data.collected) || (data.collected.length < 6 || data.collected.length > CHARACTER_COUNT) || ![data.moves, data.score, data.iceCleared, ...data.collected].every(n => Number.isFinite(n) && n >= 0)) return null;
    const ids = new Set<number>();
    for (let i = 0; i < 64; i++) {
      const t = data.board[i];
      if (level.holes.includes(i) ? t !== null : !t || !Number.isInteger(t.kind) || t.kind < 0 || !levelRoster(level).includes(t.kind) || !Number.isInteger(t.id) || t.id < 1 || ids.has(t.id) || (t.special !== undefined && !['row', 'column', 'bomb', 'rainbow'].includes(t.special))) return null;
      if (t) ids.add(t.id);
      if (![0, 1, 2].includes(data.ice[i])) return null;
    }
    const extraCounts = ['rescued','souvenirsCollected','trainEnergy','trainRides','maxCombo','bombsUsed','rngState','initialSeed'] as const;
    if (extraCounts.some(k => data[k] !== undefined && (!Number.isInteger(data[k]) || data[k]! < 0 || data[k]! > 4294967295))) return null;
    if (data.cages !== undefined && (!Array.isArray(data.cages) || data.cages.length !== 64 || data.cages.some((n,i) => ![0,1,2].includes(n) || (n > 0 && !(level.rescue ?? []).some(b => b.cell === i))))) return null;
    if (data.souvenirCells !== undefined && (!Array.isArray(data.souvenirCells) || new Set(data.souvenirCells).size !== data.souvenirCells.length || data.souvenirCells.some(i => !(level.souvenirs ?? []).includes(i)))) return null;
    const game = new Game(level, undefined, data.initialSeed);
    game.rngState = data.rngState ?? game.rngState;
    game.cages = data.cages ? [...data.cages] : game.cages; game.rescued = data.rescued ?? 0;
    game.souvenirCells = data.souvenirCells ? [...data.souvenirCells] : game.souvenirCells; game.souvenirsCollected = data.souvenirsCollected ?? 0;
    game.trainEnergy = Math.min(72,data.trainEnergy ?? 0); game.trainRides = data.trainRides ?? 0;
    game.maxCombo = data.maxCombo ?? 0; game.bombsUsed = data.bombsUsed ?? 0;
    game.board = data.board.map(t=>t ? {...t} : null); game.ice = [...data.ice]; game.collected = Array.from({ length: CHARACTER_COUNT }, (_, i) => data.collected[i] ?? 0);
    game.iceCleared = data.iceCleared; game.score = data.score; game.moves = data.moves;
    nextId = Math.max(nextId, ...data.board.map(t => (t?.id ?? 0) + 1));
    if (findMatches(game.board).length) return null;
    return game;
  }
}
