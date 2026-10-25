export const FRIENDS = [
  { id: 'classic', name: 'Joke Bear', short: '自嘲熊', color: '#b6cfab', desc: '看起来有点淡定，其实超想赢。' },
  { id: 'chiikawa', name: '吉伊', short: '吉伊', color: '#f2b9bf', desc: '小小的勇气，也能带来大大的惊喜。' },
  { id: 'hachiware', name: '小八', short: '小八', color: '#a9d1e7', desc: '总能发现生活里闪闪发光的事。' },
  { id: 'usagi', name: '乌萨奇', short: '乌萨奇', color: '#eac66c', desc: '呀哈！消除的快乐根本停不下来。' },
  { id: 'mole-croquette', name: '鼹鼠饼', short: '鼹鼠饼', color: '#dcb58d', desc: '圆滚滚的身体，装满了好心情。' },
  { id: 'old-dog', name: '老头狗', short: '老头狗', color: '#bdbbcf', desc: '带着一点小脾气，陪你慢慢闯关。' },
];

export async function loadPortraits(): Promise<Record<string, string>> {
  const cache: Record<string, string> = {};
  await Promise.all([...FRIENDS.map(friend => friend.id), 'classic-full', 'usagi-full'].map(async id => {
    const url = `${import.meta.env.BASE_URL}characters-2d/${id}.png`;
    const image = new Image(); image.src = url; await image.decode(); cache[id] = url;
  }));
  return cache;
}
