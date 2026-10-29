import { CHARACTERS } from './catalog';
export const FRIENDS = CHARACTERS;


export async function loadPortraits(requiredKinds = FRIENDS.map((_,i)=>i)): Promise<Record<string, string>> {
  const cache: Record<string, string> = {};
  for (const id of [...FRIENDS.map(friend => friend.id), 'classic-full', 'usagi-full']) {
    cache[id] = `${import.meta.env.BASE_URL}characters-2d/${id}.png`;
  }
  // Future identities load when displayed, so a first-time player only waits for
  // the current roster and the two welcome illustrations.
  await Promise.all([...new Set([...requiredKinds.map(kind=>FRIENDS[kind].id), 'classic-full', 'usagi-full'])].map(async id => {
    const url = `${import.meta.env.BASE_URL}characters-2d/${id}.png`;
    const image = new Image(); image.src = url; await image.decode();
  }));
  return cache;
}
