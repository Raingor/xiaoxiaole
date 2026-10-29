import { describe,it,expect } from 'vitest';
import { CHARACTERS,CHARACTER_COUNT } from './catalog';
import { Game,LEVELS,levelRoster,findMatches } from './engine';
import { album,challengeCode,parseChallenge,challengeLevel } from './activities';

describe('十个新伙伴与造型的渐进加入',()=>{
  it('稳定保留旧身份，十个新身份分两关加入，阵容不超过六种',()=>{
    expect(CHARACTER_COUNT).toBe(19);expect(LEVELS).toHaveLength(38);
    expect(CHARACTERS.slice(0,9).map(c=>c.id)).toEqual(['classic','chiikawa','hachiware','usagi','mole-croquette','old-dog','bear-raincoat','bear-pajama','bear-ninja']);
    for(let kind=9;kind<19;kind++){
      const unlock=19+(kind-9)*2;
      expect(CHARACTERS[kind].unlockLevel).toBe(unlock);
      expect(LEVELS.slice(0,unlock-1).every(l=>!levelRoster(l).includes(kind))).toBe(true);
      expect(levelRoster(LEVELS[unlock-1])).toContain(kind);
      expect(levelRoster(LEVELS[unlock])).toContain(kind);
    }
    expect(LEVELS.every(l=>levelRoster(l).length<=6)).toBe(true);
  });
  it('新阵容补充、洗牌和恢复维持身份，任务和收藏都有完整定义',()=>{
    for(const level of LEVELS.slice(18)){
      const g=new Game(level,undefined,level.id*99),roster=levelRoster(level);
      const move=g.validMoves()[0],result=g.swap(...move);let wave=g.resolve(result.forced),count=0;
      while(wave){expect(++count).toBeLessThan(80);g.collapse();wave=g.resolve();}
      g.shuffle();expect(g.board.every(t=>!t||roster.includes(t.kind))).toBe(true);
      expect(findMatches(g.board)).toEqual([]);expect(Game.restore(g.serialize())?.serialize()).toEqual(g.serialize());
      expect(level.goals.every(goal=>typeof goal.kind!=='number'||roster.includes(goal.kind))).toBe(true);
      expect(level.story).toBeTruthy();expect(level.stickerKind).toBeGreaterThanOrEqual(9);
    }
  });
  it('九角色旧存档补齐计数、保留原棋盘与分数，旧好友码仍可使用',()=>{
    const g=new Game(LEVELS[17],undefined,19);g.score=4321;g.moves=17;
    const saved=g.serialize();saved.collected=Array(9).fill(2);
    const old=Game.restore(saved)!;expect(old.collected).toEqual([...Array(9).fill(2),...Array(10).fill(0)]);
    expect(old.board).toEqual(g.board);expect(old.moves).toBe(17);expect(old.score).toBe(4321);
    const code=challengeCode({type:'friend',level:18,seed:881,variant:3});const parsed=parseChallenge(code)!;expect(challengeLevel(parsed).id).toBe(18);
    const newCode=challengeCode({type:'friend',level:38,seed:88,variant:3});expect(challengeLevel(parseChallenge(newCode)!).roster).toContain(18);
  });
  it('新增站点的贴纸使用对应角色，收集册总数自动扩大',()=>{
    const cards=album({19:{},38:{}},{maxCombo:0,rescues:0,rides:0,dailyClears:0});
    expect(cards).toHaveLength(44);expect(cards.find(s=>s.id==='station-19')?.kind).toBe(9);
    expect(cards.find(s=>s.id==='station-38')?.kind).toBe(18);
    expect(cards.every(s=>s.kind>=0&&s.kind<19&&!!s.story)).toBe(true);
  });
});
