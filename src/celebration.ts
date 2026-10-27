import './celebration.css';
import { icon } from './icons';

const cheerPortrait = `${import.meta.env.BASE_URL}characters-2d/joke-bear-victory.gif`;

export function preloadCelebration() {
  // Warm the cache without making this decorative image block the game.
  for (const src of [cheerPortrait, `${import.meta.env.BASE_URL}characters-2d/joke-bear-clap.gif`, `${import.meta.env.BASE_URL}characters-2d/joke-bear-rare.gif`]) {
    const image = new Image(); image.src = src;
  }
}

export function victoryCelebration() {
  const colors = ['#e6b951', '#91b7a0', '#e4a199', '#a9bad3'];
  const confetti = Array.from({ length: 20 }, (_, i) => {
    const x = (i % 2 ? 1 : -1) * (42 + (i * 23) % 105);
    const y = -28 - (i * 17) % 89;
    return `<i class="victory-confetti" style="--confetti-x:${x}px;--confetti-y:${y}px;--confetti-turn:${i * 67}deg;--confetti-color:${colors[i % colors.length]};--confetti-delay:${(i % 5) * 0.09}s"></i>`;
  }).join('');
  return `<div class="victory-celebration" aria-label="熊熊过关庆祝">
    <div class="victory-scene" role="img" aria-label="两只自嘲熊开心跳舞，为你庆祝过关：太棒啦！">
      <span class="victory-halo"></span>
      <span class="victory-shadow"></span>
      <div class="victory-confetti-cloud">${confetti}</div>
      <span class="victory-spark victory-spark-left">${icon('star')}</span>
      <span class="victory-spark victory-spark-right">${icon('star')}</span>
      <img class="victory-bear" src="${cheerPortrait}" width="200" height="172" alt="" draggable="false" /><img class="victory-bear-static" src="${import.meta.env.BASE_URL}characters-2d/classic-full.png" width="160" height="160" alt="" draggable="false" />
      <span class="victory-cheer">太棒啦！</span>
    </div>
  </div><a class="victory-source" href="https://tenor.com/view/joke-bear-dance-dancing-happy-happy-dance-gif-16210144" target="_blank" rel="noopener noreferrer">Joke Bear · Tenor ↗</a>`;
}
