import { CHARACTERS } from './catalog';
export const FRIENDS = CHARACTERS;


export const portraitUrl = (id: string) => `${import.meta.env.BASE_URL}characters-2d/${id}.webp`;

export async function loadPortraits(requiredKinds = FRIENDS.map((_,i)=>i), onProgress?: (loaded: number, total: number) => void): Promise<Record<string, string>> {
  const cache: Record<string, string> = {};
  for (const id of [...FRIENDS.map(friend => friend.id), 'classic-full', 'usagi-full']) {
    cache[id] = portraitUrl(id);
  }
  // Only playable identities block entry. Hidden side art and future friends
  // are loaded by their own DOM images when actually displayed.
  const ids = [...new Set(requiredKinds.map(kind=>FRIENDS[kind].id))];
  let loaded = 0, failed = false;
  onProgress?.(0, ids.length);
  try {
    await Promise.all(ids.map(async id => {
      const image = new Image();
      image.fetchPriority = 'high';
      image.src = cache[id];
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        await Promise.race([image.decode(), new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error(`Portrait timed out: ${id}`)), 20000); })]);
        if (!failed) onProgress?.(++loaded, ids.length);
      } finally { clearTimeout(timer); }
    }));
  } catch (error) { failed = true; throw error; }
  return cache;
}
