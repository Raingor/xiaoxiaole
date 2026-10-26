import { CHARACTERS } from './catalog';
export const FRIENDS = CHARACTERS;


export async function loadPortraits(): Promise<Record<string, string>> {
  const cache: Record<string, string> = {};
  await Promise.all([...FRIENDS.map(friend => friend.id), 'classic-full', 'usagi-full'].map(async id => {
    const url = `${import.meta.env.BASE_URL}characters-2d/${id}.png`;
    const image = new Image(); image.src = url; await image.decode(); cache[id] = url;
  }));
  return cache;
}
