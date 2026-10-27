import { LEVELS, type Level } from './engine';

export interface Challenge {
  type: 'daily' | 'friend'; level: number; seed: number; variant: number;
  date?: string; benchmark?: { score: number; used: number };
}
export interface Result { score: number; used: number }
export const randomSeed = () => crypto.getRandomValues(new Uint32Array(1))[0];
const hash = (value: string) => { let n = 2166136261; for (const c of value) n = Math.imul(n ^ c.charCodeAt(0),16777619); return n >>> 0; };
export function dayKey(date = new Date()) {
  return new Intl.DateTimeFormat('sv-SE', { timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit' }).format(date);
}
export function dailyChallenge(date = dayKey()): Challenge {
  const seed = hash(`rail-pop-daily-v2:${date}`);
  return { type:'daily',level:9,seed,variant:seed % 3,date };
}
export function validChallenge(value: unknown): value is Challenge {
  if (!value || typeof value !== 'object') return false;
  const c = value as Challenge;
  return ['daily','friend'].includes(c.type) && Number.isInteger(c.level) && c.level >= 1 && c.level <= LEVELS.length && Number.isInteger(c.seed) && c.seed >= 0 && c.seed <= 4294967295 && Number.isInteger(c.variant) && c.variant >= 0 && c.variant <= 3 && (c.type !== 'daily' || (typeof c.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(c.date) && JSON.stringify(dailyChallenge(c.date)) === JSON.stringify({type:c.type,level:c.level,seed:c.seed,variant:c.variant,date:c.date}))) && (!c.benchmark || validResult(c.benchmark));
}
export function validResult(value: unknown): value is Result {
  const r = value as Result;
  return !!r && Number.isInteger(r.score) && r.score > 0 && r.score <= 100000000 && Number.isInteger(r.used) && r.used >= 0 && r.used <= 1000;
}
export function challengeLevel(c: Challenge): Level {
  const base = LEVELS[c.level-1];
  if (c.variant === 3) return {...base};
  const goals = c.variant === 0 ? [{kind:'score' as const,target:6500}] : c.variant === 1 ? [{kind:'score' as const,target:4200},{kind:'bombs' as const,target:1}] : [{kind:'score' as const,target:4200},{kind:'combo' as const,target:5}];
  return {...base,name:['星光积分赛','熊弹小任务','五连消挑战'][c.variant],subtitle:'同一天、同一棋盘；免费提示，凭消除技巧挑战。',moves:22,goals,rescue:[],souvenirs:[],ice:[],doubleIce:false,bombs:c.variant === 1 ? [18] : [],train:false};
}
export function challengeCode(c: Challenge, result?: Result): string {
  const body = [c.level,c.seed,c.variant,result?.score ?? 0,result?.used ?? 0].map(n=>n.toString(36)).join('-');
  return `RP2-${body}-${hash(body).toString(36)}`;
}
export function parseChallenge(input: string): Challenge | null {
  let code = input.trim();
  try { if (/^https?:\/\//.test(code)) code = new URL(code).searchParams.get('challenge') ?? ''; } catch { return null; }
  const match = /^RP2-([0-9a-z]+)-([0-9a-z]+)-([0-9a-z]+)-([0-9a-z]+)-([0-9a-z]+)-([0-9a-z]+)$/i.exec(code);
  if (!match || code.length > 100) return null;
  const body = match.slice(1,6).join('-').toLowerCase();
  if (hash(body).toString(36) !== match[6].toLowerCase()) return null;
  const [level,seed,variant,score,used] = match.slice(1,6).map(n=>parseInt(n,36));
  if (score === 0 && used !== 0) return null;
  const challenge: Challenge = {type:'friend',level,seed,variant,...(score ? {benchmark:{score,used}} : {})};
  return validChallenge(challenge) ? challenge : null;
}
export const betterResult = (a: Result, b?: Result) => !b || a.used < b.used || (a.used === b.used && a.score > b.score);

export interface AlbumStats { maxCombo:number; rescues:number; rides:number; dailyClears:number }
export interface Sticker { id:string; name:string; kind:number; story:string; requirement:string; earned:boolean }
export function album(records: Record<number, unknown>, stats: AlbumStats): Sticker[] {
  const stories = ['第一次出发，熊把小小的快乐装进口袋。','吉伊说：今天也比昨天勇敢了一点。','小八找到了一条能看见云的路线。','乌萨奇一声呀哈，樱花也跟着晃起来。','打开箱子，原来朋友一直在等你。','融掉冰块，薄荷汽水刚刚好。','鼹鼠饼把最后一口点心留给朋友。','列车进站，带来一份意外的小礼物。','彩虹落进野餐篮，变成甜甜的糖。','老头狗慢悠悠地说：玩得不错嘛。','银河很远，好朋友就在身边。','终点也是下一趟旅程的起点。','小黄鸭雨衣，接住每一滴小雨。','雨停以后，快乐亮晶晶。','睡衣熊决定把今天的开心带进梦里。','把星星放在枕边，晚安也会发光。','忍者熊悄悄出现：惊喜到了。','大家穿着最喜欢的衣服，再跳一支舞。'];
  const kinds = [0,1,2,3,1,0,4,0,2,5,4,5,6,6,7,7,8,8];
  return [...LEVELS.map((l,i)=>({id:`station-${l.id}`,name:l.name,kind:kinds[i],story:stories[i],requirement:`通过第 ${l.id} 站`,earned:!!records[l.id]})),
    {id:'combo-3',name:'拍手小能手',kind:0,story:'一次消除接着一次，熊忍不住为你鼓掌。',requirement:'达成 3 连消',earned:stats.maxCombo>=3},
    {id:'combo-5',name:'快乐舞步',kind:0,story:'五连消的节奏，正好跳一支小舞。',requirement:'达成 5 连消',earned:stats.maxCombo>=5},
    {id:'combo-8',name:'稀有狂欢',kind:8,story:'传说中的八连消，连忍者熊也跑来庆祝。',requirement:'达成 8 连消',earned:stats.maxCombo>=8},
    {id:'rescuer',name:'伙伴救援队',kind:1,story:'你打开的不只是箱子，还有伙伴的好心情。',requirement:'累计救出 2 位伙伴',earned:stats.rescues>=2},
    {id:'conductor',name:'惊喜列车长',kind:0,story:'叮叮！你的快乐专列已经发车。',requirement:'召唤 1 次列车',earned:stats.rides>=1},
    {id:'daily',name:'今日闪闪星',kind:2,story:'每天来一点新挑战，收下一颗闪闪的星。',requirement:'完成 1 次每日挑战',earned:stats.dailyClears>=1}];
}
