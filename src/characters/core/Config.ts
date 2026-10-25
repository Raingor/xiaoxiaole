import type { PowerUpKind } from '../entities/PowerUp';

export interface SkinDef {
  id: string;
  name: string;
  price: number;
  desc: string;
  fur: number;
  outfit: number;
  accent: number;
  shoe: number;
  accessory: 'none' | 'cap' | 'headphones' | 'scarf' | 'nightcap' | 'witch' | 'santa' | 'commuter' | 'duck' | 'barista' | 'eel' | 'salmon' | 'delivery' | 'fairy' | 'prince' | 'king' | 'queen';
  character?: 'bear' | 'mole' | 'dog' | 'chiikawa' | 'hachiware' | 'usagi';
  /** A wearable product on a character, rather than a character product. */
  outfitId?: string;
  outfitName?: string;
  characterAccent?: number;
}

export function isCharacterSkin(skin: SkinDef): boolean {
  return !skin.outfitId && (skin.id === 'classic' || (skin.character !== undefined && skin.character !== 'bear'));
}

export function isChiikawaCharacter(character: SkinDef['character']): boolean {
  return character === 'chiikawa' || character === 'hachiware' || character === 'usagi';
}

export function dressCharacter(character: SkinDef, outfit: SkinDef): SkinDef {
  return {
    ...outfit,
    character: character.character ?? 'bear',
    outfitId: outfit.id,
    outfitName: character.id === 'classic' ? outfit.name : outfit.name.replace(/熊$/, ''),
    fur: character.fur,
    characterAccent: character.accent,
    name: character.id === 'classic' ? outfit.name : `${character.name} · ${outfit.name.replace(/熊$/, '')}`,
  };
}

export interface MissionDef {
  id: string;
  name: string;
  desc: string;
  stat: 'runCoins' | 'totalDistance' | 'jumps' | 'rolls' | 'runScore' | 'powerupUses';
  scope: 'run' | 'cumulative';
  target: number;
  reward: number;
  powerupKind?: PowerUpKind;
}

export const CONFIG = {
  lanes: {
    count: 3,
    width: 2.6,
  },
  player: {
    standHeight: 1.55,
    rollHeight: 0.85,
    halfWidth: 0.42,
    halfDepth: 0.4,
    jumpVelocity: 9.6,
    bootsJumpVelocity: 12,
    bootsAirJumpVelocity: 10.8,
    turtleJumpVelocity: 5.6,
    turtleHeight: 0.68,
    turtleRollHeight: 0.44,
    gravity: -26,
    lateralSpeed: 17,
    rollDuration: 0.62,
    inputBuffer: 0.18,
    jetpackHeight: 12.0,
  },
  speed: {
    base: 13,
    max: 32,
    rampDistance: 900,
  },
  opening: { seconds: 5 },
  dayCycle: { seconds: 360 },
  chunk: {
    length: 60,
    ahead: 240,
    behind: 20,
  },
  obstacles: {
    low: { top: 0.78, depth: 0.8, width: 2.2 },
    overhead: { bottom: 0.95, top: 2.15, depth: 0.6, width: 2.3 },
    train: { top: 3.0, width: 2.25 },
    block: { top: 2.4, depth: 1.4, width: 2.2 },
    gate: { top: 4.9, depth: 0.85, panelWidth: 2.38 },
  },
  coin: {
    radius: 0.34,
    groundY: 1.0,
    spacing: 2.4,
    magnetRadius: 7,
    magnetForce: 26,
  },
  powerups: {
    magnet: 8,
    jetpack: 10,
    double: 10,
    boots: 10,
    turtle: 5,
  },
  score: {
    perMeter: 1,
    coin: 20,
  },
  camera: {
    offset: { x: 0, y: 4.5, z: 7.9 },
    lookAhead: 11,
    fovBase: 62,
    fovMax: 67,
  },
} as const;

export const SKINS: SkinDef[] = [
  {
    id: 'classic',
    name: '经典 Joke Bear',
    price: 0,
    desc: '原汁原味的雪白自嘲熊，街头跑酷的起点。',
    fur: 0xffffff,
    outfit: 0xffffff,
    accent: 0xe6e3db,
    shoe: 0xf7f7f3,
    accessory: 'none',
  },
  {
    id: 'chiikawa',
    name: 'Chiikawa 吉伊',
    price: 1200,
    desc: '雪白圆脸、粉粉腮红和小圆耳朵，迈着小短腿努力向前跑。',
    fur: 0xffffff,
    outfit: 0xffffff,
    accent: 0xf4a5b5,
    shoe: 0xffffff,
    accessory: 'none',
    character: 'chiikawa',
  },
  {
    id: 'hachiware',
    name: '小八 Hachiware',
    price: 1500,
    desc: '蓝白八字花纹、三角猫耳和粉色腮红，和吉伊一起出发。',
    fur: 0xffffff,
    outfit: 0xffffff,
    accent: 0xf4a5b5,
    shoe: 0xffffff,
    accessory: 'none',
    character: 'hachiware',
  },
  {
    id: 'usagi',
    name: '乌萨奇 Usagi',
    price: 1800,
    desc: '奶黄色绒毛、粉色长兔耳和弯弯眉毛，蹦蹦跳跳向前冲。',
    fur: 0xffefcb,
    outfit: 0xffefcb,
    accent: 0xf3a5ab,
    shoe: 0xffefcb,
    accessory: 'none',
    character: 'usagi',
  },
  {
    id: 'mole-croquette',
    name: '鼹鼠饼',
    price: 1500,
    desc: '金黄色的圆滚滚鼹鼠饼，小豆眼和短短的四肢。',
    fur: 0xe5b85e,
    outfit: 0xe5b85e,
    accent: 0xb98542,
    shoe: 0xb98542,
    accessory: 'none',
    character: 'mole',
  },
  {
    id: 'old-dog',
    name: '老头狗',
    price: 1800,
    desc: '雪白的圆脑袋、黑耳朵、灰色口鼻和两道浓眉。',
    fur: 0xf1eee5,
    outfit: 0xf1eee5,
    accent: 0x777472,
    shoe: 0xf1eee5,
    accessory: 'none',
    character: 'dog',
  },
  {
    id: 'street',
    name: '街头帽衫',
    price: 300,
    desc: '红色绒布帽衫有抽绳和口袋，搭配黄色棒球帽。',
    fur: 0xffffff,
    outfit: 0xd94f3d,
    accent: 0xf2b134,
    shoe: 0x3b3b46,
    accessory: 'cap',
  },
  {
    id: 'neon',
    name: '霓虹电音',
    price: 600,
    desc: '青色反光夹克配粉色细节和包耳耳机。',
    fur: 0xffffff,
    outfit: 0x2ec4b6,
    accent: 0xff5d8f,
    shoe: 0x22223a,
    accessory: 'headphones',
  },
  {
    id: 'ninja',
    name: '夜行忍者',
    price: 900,
    desc: '暗色上衣、斜挎束带与柔软围巾。',
    fur: 0xffffff,
    outfit: 0x4a4e69,
    accent: 0x9a8c98,
    shoe: 0x22223a,
    accessory: 'scarf',
  },
  {
    id: 'pajama',
    name: '睡衣派对',
    price: 1200,
    desc: '绿色睡衣配奶白滚边和垂下的睡帽。',
    fur: 0xffffff,
    outfit: 0x7fb069,
    accent: 0xffd166,
    shoe: 0xe8f2d9,
    accessory: 'nightcap',
  },
  {
    id: 'halloween',
    name: '万圣南瓜巫师',
    price: 1500,
    desc: '歪尖巫师帽、南瓜绒衣与蝙蝠短披风，捣蛋也要跑得快。',
    fur: 0xffffff,
    outfit: 0xe98a32,
    accent: 0xf3c55b,
    shoe: 0x392944,
    accessory: 'witch',
  },
  {
    id: 'christmas',
    name: '圣诞暖绒',
    price: 1800,
    desc: '垂绒圣诞帽、红色毛边外套和冬青绿围领，背着星星送惊喜。',
    fur: 0xffffff,
    outfit: 0xc84643,
    accent: 0x397463,
    shoe: 0xfff3df,
    accessory: 'santa',
  },
  {
    id: 'commuter', name: '摸鱼上班熊', price: 900,
    desc: '浅蓝衬衫、歪领带和斜挎公文包，工牌写着准点下班。',
    fur: 0xffffff, outfit: 0x9fcce5, accent: 0x304d77, shoe: 0x54423a, accessory: 'commuter',
  },
  {
    id: 'duck-raincoat', name: '小黄鸭雨衣熊', price: 1200,
    desc: '黄色雨衣搭鸭嘴帽檐，透明口袋里装着一只迷你小鸭。',
    fur: 0xffffff, outfit: 0xffd34f, accent: 0xf2a432, shoe: 0xffe6a2, accessory: 'duck',
  },
  {
    id: 'milk-tea', name: '奶茶店长熊', price: 1500,
    desc: '奶油小帽和焦糖围裙，背着珍珠会弹动的奶茶杯包。',
    fur: 0xffffff, outfit: 0xf5e7cc, accent: 0x9c603d, shoe: 0x5c3b2b, accessory: 'barista',
  },
  {
    id: 'eel', name: '鳗鱼顶顶熊', price: 1200,
    desc: '墨青小鳗鱼横趴头顶，奶油肚皮、浅金鱼鳍和细长尾巴，跑起来轻轻摆尾。',
    fur: 0xffffff, outfit: 0xffffff, accent: 0x64978d, shoe: 0xf7f7f3, accessory: 'eel',
  },
  {
    id: 'salmon', name: '三文鱼顶顶熊', price: 1200,
    desc: '橙白纹三文鱼趴在头顶，鱼鳍与尾巴一起出发。',
    fur: 0xffffff, outfit: 0xffffff, accent: 0xf58c67, shoe: 0xf7f7f3, accessory: 'salmon',
  },
  {
    id: 'delivery', name: '外卖头盔熊', price: 900,
    desc: '亮黄外卖头盔配餐盒徽章、反光条和小夹克。',
    fur: 0xffffff, outfit: 0xffcc3e, accent: 0x308d90, shoe: 0x308d90, accessory: 'delivery',
  },
  {
    id: 'fairy', name: '星光小仙女', price: 1800,
    desc: '星星皇冠、粉紫花瓣裙与半透明蝴蝶翅膀。',
    fur: 0xffffff, outfit: 0xf0adcf, accent: 0xcbb7ee, shoe: 0xffe7f2, accessory: 'fairy',
  },
  {
    id: 'prince', name: '蓝绒小王子', price: 1800,
    desc: '蓝白短披风、金边礼服与小皇冠，赶车也要有仪式感。',
    fur: 0xffffff, outfit: 0x7caddf, accent: 0xffd166, shoe: 0xf4e9cf, accessory: 'prince',
  },
  {
    id: 'king', name: '红绒国王', price: 2400,
    desc: '红绒白毛披风、宝石高皇冠和金链，今天的王国是三条轨道。',
    fur: 0xffffff, outfit: 0xb94d58, accent: 0xffd166, shoe: 0x725137, accessory: 'king',
  },
  {
    id: 'queen', name: '珠光王后', price: 2400,
    desc: '珠宝王冠、珍珠领与紫粉礼裙，优雅出发。',
    fur: 0xffffff, outfit: 0xd797bb, accent: 0xb49add, shoe: 0xffefdc, accessory: 'queen',
  },
];

export const MISSIONS: MissionDef[] = [
  { id: 'm_coin_run', name: '金币小能手', desc: '单局收集 30 枚金币', stat: 'runCoins', scope: 'run', target: 30, reward: 80 },
  { id: 'm_dist', name: '长途旅行家', desc: '累计奔跑 3000 米', stat: 'totalDistance', scope: 'cumulative', target: 3000, reward: 120 },
  { id: 'm_jump', name: '跳跃大师', desc: '成功越过低栏 60 次', stat: 'jumps', scope: 'cumulative', target: 60, reward: 100 },
  { id: 'm_roll', name: '翻滚艺术家', desc: '累计完成 40 次翻滚', stat: 'rolls', scope: 'cumulative', target: 40, reward: 100 },
  { id: 'm_score', name: '分数猎人', desc: '单局达到 2500 分', stat: 'runScore', scope: 'run', target: 2500, reward: 150 },
  { id: 'm_power', name: '磁铁收藏家', desc: '累计拾取金币磁铁 12 次', stat: 'powerupUses', powerupKind: 'magnet', scope: 'cumulative', target: 12, reward: 140 },
];

export type QualityLevel = 'low' | 'medium' | 'high';

export const QUALITY: Record<QualityLevel, {
  pixelRatio: number;
  shadows: boolean;
  shadowSize: number;
  fogFar: number;
  particleScale: number;
  drawDistance: number;
}> = {
  low: { pixelRatio: 1, shadows: false, shadowSize: 1024, fogFar: 105, particleScale: 0.4, drawDistance: 150 },
  medium: { pixelRatio: 1.5, shadows: true, shadowSize: 1024, fogFar: 140, particleScale: 0.7, drawDistance: 200 },
  high: { pixelRatio: 2, shadows: true, shadowSize: 2048, fogFar: 170, particleScale: 1, drawDistance: 240 },
};

export function laneX(lane: number): number {
  return (lane - 1) * CONFIG.lanes.width;
}
