import { describe, it, expect } from 'vitest';
import { Game, LEVELS, findMatches, adjacent, type Tile, type Special } from './engine';

const rng = (seed: number) => () => { seed = (Math.imul(seed, 1664525) + 1013904223) | 0; return (seed >>> 0) / 4294967296; };
const empty = () => Array<Tile | null>(64).fill(null);
const place = (board: (Tile | null)[], cells: number[], kind = 0, special?: Special) => cells.forEach(i => board[i] = { id: i + 1, kind, special });
function settle(game: Game, forced?: Set<number>, preferred: number[] = []) {
  let wave = game.resolve(forced, preferred), n = 0;
  while (wave) { expect(++n).toBeLessThan(80); game.collapse(); wave = game.resolve(); }
}

describe('三消与特效生成', () => {
  it('只匹配直线中的三个或更多相同伙伴，不跨行或缺口', () => {
    const board = empty(); place(board, [6, 7, 8]); expect(findMatches(board)).toEqual([]);
    place(board, [16, 17, 18]); expect(findMatches(board)).toHaveLength(1);
    board[17] = null; expect(findMatches(board)).toEqual([]);
  });
  it.each([{ cells: [9, 10, 11, 12], special: 'row' }, { cells: [2, 10, 18, 26], special: 'column' }, { cells: [9, 10, 11, 12, 13], special: 'rainbow' }, { cells: [9, 10, 11, 18, 26], special: 'bomb' }, { cells: [9, 17, 25, 26, 27], special: 'bomb' }])('生成 $special 并优先保留交换位置', ({ cells, special }) => {
    const board = empty(); place(board, cells);
    const matches = findMatches(board, [cells[0]]);
    expect(matches).toHaveLength(1); expect(matches[0].special).toBe(special); expect(matches[0].anchor).toBe(cells[0]);
  });
  it('连消时保留新生成的特效', () => {
    const game = new Game(LEVELS[0], rng(1)); game.board = empty(); place(game.board, [9, 10, 11, 12]);
    const wave = game.resolve(undefined, [12])!;
    expect(wave.removed).toHaveLength(3); expect(game.board[12]?.special).toBe('row');
    expect(game.collected[0]).toBe(3); expect(wave.points).toBe(280);
  });
});

describe('交换与组合', () => {
  it('无效交换复原且不消耗步数，行尾不能与下一行交换', () => {
    const game = new Game(LEVELS[0], rng(10)), before = JSON.stringify(game.board);
    const valid = game.validMoves();
    let bad: [number, number] | undefined;
    for (let i = 0; i < 63; i++) if (adjacent(i, i + 1) && !valid.some(([a, b]) => a === i && b === i + 1)) { bad = [i, i + 1]; break; }
    expect(bad).toBeDefined(); expect(game.swap(...bad!).valid).toBe(false);
    expect(JSON.stringify(game.board)).toBe(before); expect(game.moves).toBe(26);
    expect(game.swap(7, 8).valid).toBe(false);
  });
  it('有效交换只消耗一步，连锁掉落不额外耗步', () => {
    const game = new Game(LEVELS[0], rng(5)), [a, b] = game.validMoves()[0];
    const result = game.swap(a, b); expect(result.valid).toBe(true); settle(game, result.forced, [b, a]);
    expect(game.moves).toBe(25); expect(game.score).toBeGreaterThan(0); expect(findMatches(game.board)).toEqual([]);
  });
  it('彩虹与普通伙伴交换只消除对方颜色，不额外清自身颜色', () => {
    const game = new Game(LEVELS[0], rng(2)); game.board = empty();
    place(game.board, [0], 0, 'rainbow'); place(game.board, [1, 10, 20], 1); place(game.board, [2, 12], 0);
    const result = game.swap(0, 1); const wave = game.resolve(result.forced)!;
    expect(wave.removed.sort((a, b) => a - b)).toEqual([0, 1, 10, 20]); expect(game.board[2]?.kind).toBe(0); expect(game.board[12]?.kind).toBe(0);
  });
  it('两个彩虹交换清空整张棋盘', () => {
    const game = new Game(LEVELS[11], rng(3)); game.board[0]!.special = game.board[1]!.special = 'rainbow';
    const result = game.swap(0, 1); expect(game.resolve(result.forced)!.removed).toHaveLength(64);
  });
  it('彩虹与直线交换，将所有同色转换成特效后触发', () => {
    const game = new Game(LEVELS[0], rng(3)); game.board = empty();
    place(game.board, [0], 0, 'rainbow'); place(game.board, [1], 1, 'row'); place(game.board, [10, 20], 1); place(game.board, [8, 16, 25], 2);
    const result = game.swap(0, 1); const wave = game.resolve(result.forced)!;
    expect(wave.activated).toEqual(expect.arrayContaining([0, 10, 20])); expect(game.board[8]).toBeNull(); expect(game.board[16]).toBeNull(); expect(game.board[25]).not.toBeNull();
  });
  it.each([{ a: 'row', b: 'column', min: 15 }, { a: 'bomb', b: 'bomb', min: 25 }, { a: 'row', b: 'bomb', min: 39 }])('$a + $b 可以直接交换触发', ({ a, b, min }) => {
    const game = new Game(LEVELS[11], rng(8)); game.board[27]!.special = a as Special; game.board[28]!.special = b as Special;
    const result = game.swap(27, 28); expect(result.valid).toBe(true); const wave = game.resolve(result.forced)!;
    expect(wave.removed.length).toBeGreaterThanOrEqual(min);
  });
  it('被特效击中的另一特效会递归触发', () => {
    const game = new Game(LEVELS[0], rng(9)); game.board[8]!.special = 'row'; game.board[12]!.special = 'column';
    const wave = game.resolve(new Set([8]))!;
    expect(wave.activated).toContain(12); expect(game.board[60]).toBeNull();
  });
});

describe('冰块、掉落、洗牌与存档', () => {
  it('双层冰块需两次命中，目标按完全融化的格数计数', () => {
    const game = new Game(LEVELS[10], rng(4));
    game.resolve(new Set([18])); expect(game.ice[18]).toBe(1); expect(game.iceCleared).toBe(0);
    game.collapse(); game.resolve(new Set([18])); expect(game.ice[18]).toBe(0); expect(game.iceCleared).toBe(1);
  });
  it('掉落绕过棋盘缺口且冰块固定在格子上', () => {
    const game = new Game(LEVELS[5], rng(6)); const old = game.board[8]!.id;
    game.resolve(new Set([48])); game.collapse();
    expect(game.board[7]).toBeNull(); expect(game.board[63]).toBeNull(); expect(game.board[16]!.id).toBe(old); expect(game.ice[18]).toBe(1);
  });
  it('洗牌保留棋子和特效、步数、分数、冰块，且不带初始匹配', () => {
    const game = new Game(LEVELS[2], rng(8)); game.board[18]!.special = 'bomb'; game.score = 200;
    const ids = game.board.filter(Boolean).map(t => t!.id).sort(), ice = [...game.ice];
    game.shuffle(); expect(game.board.filter(Boolean).map(t => t!.id).sort()).toEqual(ids);
    expect(game.board.filter(t => t?.special === 'bomb')).toHaveLength(1); expect(game.score).toBe(200); expect(game.moves).toBe(26); expect(game.ice).toEqual(ice);
    expect(findMatches(game.board)).toEqual([]); expect(game.validMoves().length).toBeGreaterThan(0);
  });
  it('合法存档可往返恢复，损坏棋盘拒绝恢复', () => {
    const game = new Game(LEVELS[4], rng(5)); game.score = 3000; game.moves = 9;
    const saved = game.serialize(); expect(Game.restore(saved)?.serialize()).toEqual(saved);
    expect(Game.restore({ ...saved, board: [] })).toBeNull();
    expect(Game.restore({ ...saved, score: -1 })).toBeNull();
    const duplicate = structuredClone(saved); duplicate.board[1]!.id = duplicate.board[0]!.id;
    expect(Game.restore(duplicate)).toBeNull();
  });
  it('最后一步完成目标时仍视为胜利', () => {
    const game = new Game(LEVELS[0], rng(4)); game.moves = 0; game.collected[0] = 18; game.collected[2] = 18;
    expect(game.won).toBe(true);
  });
  it('12 关各模拟 100 步，始终能稳定掉落并满足棋盘不变量', () => {
    for (const level of LEVELS) {
      const random = rng(level.id * 1234), game = new Game(level, random); game.moves = 100;
      for (let turn = 0; turn < 100; turn++) {
        let valid = game.validMoves(); if (!valid.length) { game.shuffle(); valid = game.validMoves(); }
        const [a, b] = valid[Math.floor(random() * valid.length)];
        const result = game.swap(a, b); expect(result.valid).toBe(true); settle(game, result.forced, [b, a]);
        expect(game.board.filter(Boolean)).toHaveLength(64 - level.holes.length);
        expect(new Set(game.board.filter(Boolean).map(t => t!.id)).size).toBe(64 - level.holes.length);
        expect(findMatches(game.board)).toEqual([]);
        expect(game.ice.every(x => x >= 0 && x <= 2)).toBe(true);
      }
    }
  });
});

describe('循序渐进的关卡', () => {
  it('目标每关递增、棋盘和角色数量不倒退，所有目标角色已在该关加入', () => {
    expect(LEVELS[0].size).toBe(5); expect(LEVELS[0].kinds).toBe(3);
    let total = 0, size = 0, kinds = 0;
    for (const level of LEVELS) {
      const next = level.goals.reduce((n,g) => n + g.target, 0);
      expect(next).toBeGreaterThan(total); expect(level.size!).toBeGreaterThanOrEqual(size); expect(level.kinds).toBeGreaterThanOrEqual(kinds);
      expect(level.goals.every(g => typeof g.kind !== 'number' || g.kind < level.kinds)).toBe(true);
      expect(level.ice.every(i => !level.holes.includes(i))).toBe(true);
      const game = new Game(level,rng(level.id));
      expect(game.board.filter(Boolean)).toHaveLength(level.size! ** 2);
      expect(game.board.every(t=> !t || t.kind < level.kinds)).toBe(true);
      total = next; size = level.size!; kinds = level.kinds;
    }
    expect(LEVELS.filter(l => l.id === 4 || l.id === 7 || l.id === 10).map(l=>l.kinds)).toEqual([4,5,6]);
  });
  it('拒绝旧规则的中途棋盘，但新规则存档可以恢复', () => {
    const game = new Game(LEVELS[0],rng(99)); const data = game.serialize();
    expect(Game.restore({...data,rules:1})).toBeNull(); expect(Game.restore(data)?.board).toEqual(game.board);
  });
});
