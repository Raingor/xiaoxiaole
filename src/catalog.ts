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
];

// Append new identities here; never reorder existing entries (save-file kind IDs).
export const CHARACTER_COUNT = CHARACTERS.length;
