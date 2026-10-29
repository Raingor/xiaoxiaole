import { CHARACTERS } from './catalog';
import type { Level, Theme } from './engine';

// Meet one new identity, then practise it at the following station.
const names = ['栗香小街','点心长椅','飞鼠树屋','轻风滑翔','海獭码头','前辈的小路','南风狮岛','橙花广场','古本书巷','书页微光','草莓花田','果酱野餐','青蛙池塘','荷叶小路','星际站台','月球散步','暖暖厨房','饼干工坊','海盗湾口','宝藏终点站'];
const stories = ['栗子馒头把点心收好，慢悠悠地踏上旅程。','公园的长椅上，总有留给朋友的位置。','飞鼠摇摇蓝色大耳朵，准备来一点小惊喜。','轻风托住小小的勇气，下一站一起飞。','海獭前辈说：别担心，我陪着你。','可靠的前辈，也喜欢甜甜的小奖励。','狮萨带着橙色卷卷眉，欢迎你来到南风小岛。','橙花开的时候，快乐会跟着香气走。','古本屋打开一本小书，里面装满了今天的故事。','翻过一页，认识更多温柔的朋友。','草莓熊戴上绿叶帽，把快乐种进花田。','今天的野餐，果酱也格外甜。','青蛙熊的绿色帽子，藏着池塘的小秘密。','沿着荷叶跳一跳，好心情就到了。','太空熊系好头盔，准备去星星旁边散步。','月亮上也有属于朋友们的小站台。','厨师熊戴上大帽子，今天的菜单是快乐。','香香的饼干，刚好分给所有小伙伴。','海盗熊展开小地图，寻找快乐的宝藏。','宝藏不是金子，而是一路认识的十九种伙伴。'];

export const EXPANSION_LEVELS: Level[] = names.map((name, step) => {
  const id = 19 + step, kind = 9 + Math.floor(step / 2);
  const roster = [0, ...Array.from({ length:5 }, (_,i) => kind - 4 + i)];
  const total = 60 + (step + 1) * 3;
  const friend = CHARACTERS[kind];
  const theme: Theme = step < 8 ? 'picnic' : step < 12 ? 'sunny' : step < 14 ? 'rain' : step < 16 ? 'night' : step < 18 ? 'picnic' : 'sunny';
  return {
    id, name, size:8, kinds:6, roster, moves:42 + Math.floor(step / 4) * 2,
    subtitle: step % 2 === 0 ? `${friend.short}加入，试试新伙伴的匹配！` : `和${friend.short}再走一站快乐旅程`,
    train:true, theme, goals:[{kind,target:Math.ceil(total / 2)},{kind:roster[1],target:Math.floor(total / 2)}],
    holes:[], ice:step % 4 === 3 ? [18,19,20,26,27,28] : [], bombs:[18,36],
    stickerKind:kind, story:stories[step],
  };
});
