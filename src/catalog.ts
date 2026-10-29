export const CHARACTERS = [
  { id: 'classic', unlockLevel: 1, name: 'Joke Bear', short: '自嘲熊', color: '#b6cfab', desc: '看起来有点淡定，其实超想赢。' },
  { id: 'chiikawa', unlockLevel: 1, name: '吉伊', short: '吉伊', color: '#f2b9bf', desc: '小小的勇气，也能带来大大的惊喜。' },
  { id: 'hachiware', unlockLevel: 1, name: '小八', short: '小八', color: '#a9d1e7', desc: '总能发现生活里闪闪发光的事。' },
  { id: 'usagi', unlockLevel: 4, name: '乌萨奇', short: '乌萨奇', color: '#eac66c', desc: '呀哈！消除的快乐根本停不下来。' },
  { id: 'mole-croquette', unlockLevel: 7, name: '鼹鼠饼', short: '鼹鼠饼', color: '#dcb58d', desc: '圆滚滚的身体，装满了好心情。' },
  { id: 'old-dog', unlockLevel: 10, name: '老头狗', short: '老头狗', color: '#bdbbcf', desc: '带着一点小脾气，陪你慢慢闯关。' },
  { id: 'bear-raincoat', unlockLevel: 13, name: '小黄鸭雨衣熊', short: '雨衣熊', color: '#e5bc52', desc: 'Joke Bear换上雨衣，是独立匹配的新造型。', baseId: 'classic', skinId: 'duck-raincoat' },
  { id: 'bear-pajama', unlockLevel: 15, name: '睡衣派对熊', short: '睡衣熊', color: '#8fb88a', desc: '戴上软软睡帽，与其他睡衣熊一起消除。', baseId: 'classic', skinId: 'pajama' },
  { id: 'bear-ninja', unlockLevel: 17, name: '夜行忍者熊', short: '忍者熊', color: '#9298c6', desc: '藏在靛蓝兜帽里的熟悉面孔，拥有独立匹配身份。', baseId: 'classic', skinId: 'ninja' },
  {"id":"kurimanju","unlockLevel":19,"name":"栗子馒头","short":"栗子馒头","color":"#c49a78","desc":"栗色头顶的小伙伴，最喜欢悠闲的点心时光。"},
  {"id":"momonga","unlockLevel":21,"name":"飞鼠","short":"飞鼠","color":"#c8dce9","desc":"蓝色大耳朵，带着一点爱撒娇的小得意。"},
  {"id":"rakko","unlockLevel":23,"name":"海獭","short":"海獭","color":"#d6bd85","desc":"带着星形疤痕的可靠前辈，陪你探索新站点。"},
  {"id":"shisa","unlockLevel":25,"name":"狮萨","short":"狮萨","color":"#ecb47e","desc":"橙色卷卷眉毛，元气满满地迎接下一站。"},
  {"id":"furuhonya","unlockLevel":27,"name":"古本屋","short":"古本屋","color":"#e5afb9","desc":"戴着蟹钳发饰的温柔伙伴，把快乐写进小书里。"},
  {"id":"bear-strawberry","unlockLevel":29,"name":"草莓熊","short":"草莓熊","color":"#e69caa","desc":"草莓红帽配绿叶，和相同草莓造型一起消除。","baseId":"classic"},
  {"id":"bear-frog","unlockLevel":31,"name":"青蛙熊","short":"青蛙熊","color":"#97c77b","desc":"绿色蛙帽下的白熊，带来一份清新的快乐。","baseId":"classic"},
  {"id":"bear-astronaut","unlockLevel":33,"name":"太空熊","short":"太空熊","color":"#a4c9d9","desc":"戴上蓝色太空头盔，探索星星之间的小惊喜。","baseId":"classic"},
  {"id":"bear-chef","unlockLevel":35,"name":"厨师熊","short":"厨师熊","color":"#d8bb8d","desc":"白色厨师帽和红领巾，端出一盘好心情。","baseId":"classic"},
  {"id":"bear-pirate","unlockLevel":37,"name":"海盗熊","short":"海盗熊","color":"#aa899d","desc":"戴着金边海盗帽，寻找下一站的快乐宝藏。","baseId":"classic"},
];

// Append new identities here; never reorder existing entries (save-file kind IDs).
export const CHARACTER_COUNT = CHARACTERS.length;
