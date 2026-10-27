import { describe,it,expect } from 'vitest';
import { Game,LEVELS,findMatches } from './engine';
import { album,betterResult,challengeCode,challengeLevel,dailyChallenge,dayKey,parseChallenge } from './activities';
function finishWaves(g:Game, forced?:Set<number>) {
  let wave=g.resolve(forced),count=0;
  while(wave) { if(++count>80) throw Error('unstable fixture');g.collapse();wave=g.resolve(); }
}
const identities=(g:Game)=>g.board.map(t=>t?{kind:t.kind,special:t.special}:null);

describe('伙伴救援和主题目标',()=>{
  it('同一波多个邻格命中只松一层，第二波才救出，远处消除无影响',()=>{
    const g=new Game(LEVELS[4],undefined,17);
    expect(g.cages[18]).toBe(2);
    g.resolve(new Set([0]));expect(g.cages[18]).toBe(2);
    g.resolve(new Set([17,19,10]));expect(g.cages[18]).toBe(1);expect(g.rescued).toBe(0);
    const wave=g.resolve(new Set([18]))!;
    expect(g.cages[18]).toBe(0);expect(g.rescued).toBe(1);expect(wave.rescued).toEqual([1]);
    expect(g.progress({kind:'rescue',target:2})).toBe(1);
  });
  it('主题点心和星星固定在格子上，消除收集一次，保存不重置',()=>{
    const g=new Game(LEVELS[14],undefined,22);
    g.resolve(new Set([17]));expect(g.souvenirsCollected).toBe(1);expect(g.souvenirCells).not.toContain(17);
    g.collapse();finishWaves(g);const saved=g.serialize();
    expect(Game.restore(saved)?.souvenirsCollected).toBe(g.souvenirsCollected);
    expect(Game.restore(saved)?.souvenirCells).toEqual(g.souvenirCells);
    expect(LEVELS[12].theme).toBe('rain');expect(LEVELS[14].theme).toBe('night');
  });
  it('列车只能集满后发车，交替送熊弹和清行，不消耗步数',()=>{
    const g=new Game(LEVELS[7],undefined,80),moves=g.moves;
    expect(g.departTrain()).toBeNull();g.trainEnergy=36;
    const gift=g.departTrain()!;expect(gift.type).toBe('gift');expect(g.board[gift.cells[0]]?.special).toBe('bomb');
    expect(g.trainEnergy).toBe(0);expect(g.departTrain()).toBeNull();
    g.trainEnergy=36;const row=g.departTrain()!;expect(row.type).toBe('row');expect(row.cells).toHaveLength(7);
    const wave=g.resolve(new Set(row.cells))!;expect(wave.removed.length).toBeGreaterThanOrEqual(7);expect(g.moves).toBe(moves);
  });
  it('熊弹计数区别于直线，最高连消不会因新一步重置',()=>{
    const g=new Game(LEVELS[8],undefined,91);g.board[0]!.special='row';g.board[1]!.special='bomb';
    g.resolve(new Set([0]));expect(g.bombsUsed).toBe(1);expect(g.maxCombo).toBe(1);
    g.collapse();g.resolve(new Set([30]));expect(g.maxCombo).toBe(2);
    g.combo=0;g.collapse();g.resolve(new Set([50]));expect(g.maxCombo).toBe(2);
  });
});

describe('可复现每日与好友挑战',()=>{
  it('同一初始种子和交换序列产生相同棋盘、掉落、列车和得分',()=>{
    const a=new Game(LEVELS[7],undefined,123456),b=new Game(LEVELS[7],undefined,123456);
    for(let turn=0;turn<12;turn++){
      expect(identities(a)).toEqual(identities(b));
      const move=a.validMoves()[0];expect(move).toBeDefined();
      const x=a.swap(...move),y=b.swap(...move);finishWaves(a,x.forced);finishWaves(b,y.forced);
      const ta=a.departTrain(),tb=b.departTrain();expect(ta).toEqual(tb);
      if(ta?.type==='row'){finishWaves(a,new Set(ta.cells));finishWaves(b,new Set(tb!.cells));}
      expect(a.score).toBe(b.score);expect(findMatches(a.board)).toEqual([]);
    }
  });
  it('刷新后恢复随机数状态，下一次掉落与不中断游戏相同',()=>{
    const spec=dailyChallenge('2026-10-27'),level=challengeLevel(spec),a=new Game(level,undefined,spec.seed);
    const move=a.validMoves()[0];finishWaves(a,a.swap(...move).forced);
    const b=Game.restore(a.serialize(),level)!;
    expect(b.level.goals).toEqual(level.goals);
    const next=a.validMoves()[0];finishWaves(a,a.swap(...next).forced);finishWaves(b,b.swap(...next).forced);
    expect(identities(b)).toEqual(identities(a));expect(b.score).toBe(a.score);expect(b.rngState).toBe(a.rngState);
  });
  it('以北京时间换日，同一天固定棋盘并轮换三种任务',()=>{
    expect(dayKey(new Date('2026-10-26T16:00:00Z'))).toBe('2026-10-27');
    expect(dayKey(new Date('2026-10-26T15:59:59Z'))).toBe('2026-10-26');
    expect(dailyChallenge('2026-10-27')).toEqual(dailyChallenge('2026-10-27'));
    expect(dailyChallenge('2026-10-28').seed).not.toBe(dailyChallenge('2026-10-27').seed);
    for(let d=1;d<=12;d++){const c=dailyChallenge(`2026-10-${String(d).padStart(2,'0')}`);expect(challengeLevel(c).train).toBe(false);}
  });
  it('挑战码和链接往返保留同一任务与成绩，损坏与恶意输入拒绝',()=>{
    const spec=dailyChallenge('2026-10-27'),result={score:5000,used:12},code=challengeCode(spec,result),parsed=parseChallenge(code)!;
    expect(parsed.seed).toBe(spec.seed);expect(parsed.variant).toBe(spec.variant);expect(parsed.benchmark).toEqual(result);
    expect(challengeLevel(parsed).goals).toEqual(challengeLevel(spec).goals);
    expect(parseChallenge(`https://raingor.github.io/xiaoxiaole/?challenge=${code}`)).toEqual(parsed);
    expect(parseChallenge(code+'x')).toBeNull();expect(parseChallenge('<script>alert(1)</script>')).toBeNull();expect(parseChallenge('RP2-1-1-1-0-0-bad')).toBeNull();
  });
  it('先比较通关步数，再比较分数；贴纸由持久化里程碑派生',()=>{
    expect(betterResult({used:10,score:4000},{used:11,score:12000})).toBe(true);
    expect(betterResult({used:10,score:6000},{used:10,score:5000})).toBe(true);
    expect(betterResult({used:12,score:12000},{used:10,score:5000})).toBe(false);
    const cards=album({1:{}},{maxCombo:5,rescues:2,rides:1,dailyClears:1});
    expect(cards).toHaveLength(24);expect(cards.find(s=>s.id==='combo-8')?.earned).toBe(false);expect(cards.filter(s=>s.earned)).toHaveLength(6);
  });
  it('拒绝损坏的新存档字段，并兼容没有趣味字段的旧规则2存档',()=>{
    const g=new Game(LEVELS[4],undefined,5),s=g.serialize();
    expect(Game.restore({...s,cages:[1]})).toBeNull();expect(Game.restore({...s,trainEnergy:-1})).toBeNull();
    const old={...s};for(const k of ['cages','rescued','souvenirCells','souvenirsCollected','trainEnergy','trainRides','maxCombo','bombsUsed','rngState','initialSeed'])delete (old as Record<string,unknown>)[k];
    const restored=Game.restore(old)!;expect(restored.board).toEqual(g.board);expect(restored.cages[18]).toBe(2);
  });
});
