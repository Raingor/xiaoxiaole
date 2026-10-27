import '@fontsource-variable/nunito';
import './style.css';
import { Game, LEVELS, adjacent, type Goal, type Wave } from './engine';
import { FRIENDS, loadPortraits } from './friends';
import { icon, directionIcon } from './icons';
import { preloadCelebration, victoryCelebration } from './celebration';
import './features.css';
import { album, betterResult, challengeCode, challengeLevel, dailyChallenge, dayKey, parseChallenge, randomSeed, validChallenge, validResult, type AlbumStats, type Challenge, type Result } from './activities';

const $ = <T extends HTMLElement = HTMLElement>(s: string) => document.querySelector<T>(s)!;
const wait = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
const KEY = 'rail-pop-v1';
interface Save { unlocked: number; records: Record<number, { score: number; stars: number }>; inventory: Record<string, number>; sound: boolean; stats:AlbumStats; daily:Record<string,Result>; mode?:Challenge; campaign?:ReturnType<Game['serialize']>; current?: ReturnType<Game['serialize']> }
const defaults = (): Save => ({ unlocked: 1, records: {}, inventory: { hammer: 3, shuffle: 3, wand: 2, moves: 2 }, sound: true, stats:{maxCombo:0,rescues:0,rides:0,dailyClears:0}, daily:{} });
let save: Save = defaults();
try {
  const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null');
  if (raw && typeof raw === 'object') {
    save.unlocked = Math.max(1, Math.min(LEVELS.length, Math.floor(Number(raw.unlocked) || 1)));
    save.sound = typeof raw.sound === 'boolean' ? raw.sound : true;
    save.current = raw.current;
    save.campaign = raw.campaign;
    if (validChallenge(raw.mode)) save.mode = raw.mode;
    for (const key of Object.keys(save.stats) as (keyof AlbumStats)[]) { if (Number.isInteger(raw.stats?.[key]) && raw.stats[key]>=0 && raw.stats[key]<=1000000) save.stats[key]=raw.stats[key]; }
    if (raw.daily && typeof raw.daily === 'object') for (const date of Object.keys(raw.daily).sort().slice(-120)) { if (/^\d{4}-\d{2}-\d{2}$/.test(date) && validResult(raw.daily[date])) save.daily[date]=raw.daily[date]; }
    for (const name of Object.keys(save.inventory)) {
      const count = raw.inventory?.[name];
      if (Number.isInteger(count) && count >= 0 && count <= 999) save.inventory[name] = count;
    }
    for (const level of LEVELS) {
      const record = raw.records?.[level.id];
      if (record && Number.isFinite(record.score) && record.score >= 0 && Number.isInteger(record.stars) && record.stars >= 1 && record.stars <= 3) save.records[level.id] = { score: record.score, stars: record.stars };
    }
  }
} catch { /* Start fresh when local storage is unavailable or malformed. */ }

let mode: Challenge | null = save.mode ?? null;
let game = (save.current && Game.restore(save.current, mode ? challengeLevel(mode) : undefined)) || (!mode && save.campaign && Game.restore(save.campaign)) || new Game(mode ? challengeLevel(mode) : LEVELS.find(l => l.id === save.current?.level) ?? LEVELS[save.unlocked - 1], undefined, mode?.seed ?? randomSeed());
let portraits: Record<string, string> = {};
let selected = -1, busy = true, tool = '', modal = '', hint: number[] = [], hintTimer = 0, idleTimer = 0, toastTimer = 0;
let gesture: { index: number; x: number; y: number; pointer: number } | null = null;
let audio: AudioContext | undefined;
let terminal = false;
const app = $('#app');

app.innerHTML = `
  <div class="landscape" aria-hidden="true">
    <div class="sun"></div><div class="cloud cloud-one"></div><div class="cloud cloud-two"></div><div class="cloud cloud-three"></div>
    <svg class="city" viewBox="0 0 1440 360" preserveAspectRatio="xMidYMax slice"><g fill="#d9e6d8"><path d="M0 170h65v-65h40v100h35V55h62v170h40v-90h56v65h60v-35h55v100h65V110h50v125h55V70h60v170h66v-80h70v75h45V115h52v110h70V45h63v190h50v-80h62v80h45V95h60v140h55V155h60v80h55V75h65v160h90V130h70v130h100v100H0z"/></g><g fill="#eaf1df"><path d="M0 260Q170 120 340 265Q550 135 780 275Q1100 130 1440 245V360H0z"/></g><path d="M0 315Q450 265 1440 300" fill="none" stroke="#b9c9a9" stroke-width="3"/><path d="M0 328Q450 278 1440 313" fill="none" stroke="#b9c9a9" stroke-width="3"/><g fill="#bdcfae"><circle cx="62" cy="250" r="28"/><circle cx="95" cy="264" r="24"/><circle cx="1330" cy="255" r="35"/><circle cx="1370" cy="268" r="26"/></g><g transform="translate(1075 249)"><rect width="175" height="46" rx="13" fill="#f9f8e9" stroke="#a7bdb0" stroke-width="2"/><path d="M0 279"/><path d="M0 32h175" stroke="#81aa92" stroke-width="6"/><g fill="#a8cbbd"><rect x="12" y="9" width="24" height="15" rx="4"/><rect x="45" y="9" width="24" height="15" rx="4"/><rect x="78" y="9" width="24" height="15" rx="4"/><rect x="111" y="9" width="24" height="15" rx="4"/><rect x="145" y="9" width="20" height="15" rx="4"/></g><circle cx="33" cy="46" r="5" fill="#799481"/><circle cx="143" cy="46" r="5" fill="#799481"/></g></svg>
  </div>
  <header class="site-header">
    <a href="#" class="brand" aria-label="地铁消消乐首页"><span class="brand-mark">${icon('train')}</span><span>地铁<span class="brand-accent">消消乐</span><small>RAIL POP · 快乐同行</small></span></a>
    <nav class="navigation" aria-label="主导航"><button class="nav-button active" data-action="play">${icon('play')}<span>开始消除</span></button><button class="nav-button" data-action="map">${icon('map')}<span>旅程地图</span></button><button class="nav-button" data-action="friends">${icon('friends')}<span>伙伴图鉴</span></button></nav>
    <div class="header-actions"><span class="free-play">${icon('heart')}<b>∞</b><span>快乐不限量</span></span><button class="circle-button" data-action="sound" aria-label="关闭音效">${icon(save.sound ? 'sound' : 'mute')}</button><button class="circle-button" data-action="help" aria-label="玩法说明">${icon('help')}</button></div>
  </header>
  <main class="main-content">
    <div class="page-intro"><div><div class="eyebrow"><span></span> 地铁快跑 · 伙伴的新冒险</div><h1>下一站，<span>开心！<svg viewBox="0 0 156 12"><path d="M3 8Q75 0 152 7"/></svg></span></h1><p>交换小伙伴，收集好心情。一起消除今天的小烦恼。</p></div><button class="chapter-ticket" data-action="map"><span class="ticket-icon">${icon('map')}</span><span><small>第一章 · 晴日出发</small><b>你的快乐旅程</b></span>${icon('chevron')}<span class="ticket-dots"></span></button></div>
    <div class="fun-toolbar"><span id="trip-theme"></span><div><button data-action="album">${icon('heart')} 贴纸册 <b id="album-count">0</b></button><button data-action="challenges">${icon('trophy')} 每日 / 好友挑战</button><button data-action="return-campaign" id="return-campaign" hidden>返回主线 ${icon('arrow')}</button></div></div>
    <div id="activity-banner" class="activity-banner" hidden></div>
    <div class="game-layout">
      <aside class="left-column">
        <section class="level-ticket"><div class="ticket-top"><span class="mini-label">本次停靠</span><span class="line-tag">01 号线</span></div><div class="level-name"><span id="level-number">01</span><div><h2 id="level-name">初见站台</h2><span>HAVE A HAPPY TRIP</span></div></div><div class="ticket-divider"></div><div class="moves-row"><div><span>剩余步数</span><strong id="moves">26</strong></div><div class="footsteps"><i></i><i></i><i></i><i></i></div>${icon('flag')}</div><div class="ticket-bottom"><span>每一步，都有小惊喜</span><span>✦</span></div></section>
        <section class="goals-card"><div class="section-heading"><h3>本站小目标</h3><span>GOALS</span></div><p>完成全部目标，即可前往下一站</p><div id="goals"></div><div class="goal-note">${icon('check')}<span>连消越多，快乐越多</span></div></section>
        <button class="map-link" data-action="map"><span class="mini-route"><i></i><i></i><i></i></span><span>已到达 <b id="station-count">1</b> / ${LEVELS.length} 站</span>${icon('arrow')}</button>
      </aside>
      <section class="play-column" aria-label="游戏区">
        <div class="board-top"><div class="score-block"><span>本站得分</span><strong id="score">0</strong></div><div class="star-progress"><div class="stars" id="stars">${icon('star')}${icon('star')}${icon('star')}</div><div class="score-track"><span id="score-fill"></span></div><small>消除一点，星光多一点</small></div><button class="reset-button" data-action="restart" aria-label="重新开始本关">${icon('reset')}</button></div>
        <div class="board-shell"><div class="board-header"><span><i></i> <span id="board-status">伙伴们准备好啦</span></span><span id="board-label">LEVEL 01</span></div><div id="board" class="board" role="group" aria-label="8 行 8 列三消棋盘"></div><div id="effects" class="effects" aria-live="polite"></div><div id="loading" class="loading"><span class="loading-train">${icon('train')}</span><b>伙伴们正在进站…</b><span>快乐列车马上出发</span></div></div>
        <div id="train-meter" class="train-meter" hidden><span>${icon('train')} 惊喜列车</span><div><i id="train-fill"></i></div><small id="train-count">0 / 36</small></div>
        <div class="board-caption"><span>${icon('shuffle')} 交换相邻伙伴，三个相同即可消除</span><button data-action="hint">${icon('bulb')} 给我提示</button></div>
        <div class="boosters"><div class="booster-label"><b>快乐<br>小帮手</b><span>BOOSTERS</span></div><button class="booster" data-action="hammer"><span class="booster-art hammer">${icon('hammer')}</span><span>小木锤</span><em id="count-hammer">3</em></button><button class="booster" data-action="shuffle"><span class="booster-art shuffle">${icon('shuffle')}</span><span>大洗牌</span><em id="count-shuffle">3</em></button><button class="booster" data-action="wand"><span class="booster-art wand">${icon('wand')}</span><span>魔法棒</span><em id="count-wand">2</em></button><button class="booster" data-action="moves"><span class="booster-art plus">${icon('plus')}<b>5</b></span><span>加五步</span><em id="count-moves">2</em></button></div>
      </section>
      <aside class="right-column"><section class="friends-postcard"><div class="postcard-kicker"><span>老朋友 · 新玩法</span><span>✦</span></div><h2>熟悉的伙伴，<br>不一样的快乐。</h2><div class="hero-friends"><span class="speech-bubble">呀哈！一起出发！</span><span class="hero-spark spark-one">✧</span><span class="hero-spark spark-two">✦</span><div class="platform"></div><img id="hero-bear" alt="地铁快跑的自嘲熊"/><img id="hero-usagi" alt="地铁快跑的乌萨奇"/></div><p>地铁快跑的小伙伴们<br>这次陪你慢慢玩。</p><button data-action="friends">认识全部伙伴 ${icon('arrow')}</button></section><section class="tips-card"><div class="section-heading"><h3>消除小灵感</h3>${icon('bulb')}</div><div class="tip-row"><span class="special-demo line-demo">${directionIcon('row')}</span><div><b>四个连一线</b><p>变成直线特效，扫走一整排</p></div></div><div class="tip-row"><span class="special-demo bomb-demo">${bearBomb()}</span><div><b>拼出 L 型或 T 型</b><p>变成熊熊炸弹，清除周围3×3</p></div></div><div class="tip-row"><span class="special-demo rainbow-demo">✦</span><div><b>五个连一线</b><p>彩虹特效，消除全盘同色</p></div></div><button class="text-link" data-action="help">还有更多小技巧 ${icon('chevron')}</button></section><div class="small-message"><span>✿</span> 不赶时间，开心就好。</div></aside>
    </div>
  </main>
  <footer><span>RAIL POP</span><i></i> 让每一次消除，都成为小小的治愈。<span class="footer-right">和伙伴一起 · 快乐到站 ${icon('train')}</span></footer>
  <div id="toast" class="toast" role="status"></div><div id="modal-root"></div>`;

function persist() {
  if (!busy) { save.current = terminal ? undefined : game.serialize(); save.mode = !terminal && mode ? mode : undefined; }
  try { localStorage.setItem(KEY, JSON.stringify(save)); } catch { toast('浏览器暂时无法保存进度，本次游戏可继续'); }
}
function photo(kind: number, cls = '') { return `<img class="${cls}" data-character="${FRIENDS[kind].id}" src="${portraits[FRIENDS[kind].id] ?? ''}" alt="${FRIENDS[kind].name}" draggable="false"/>`; }
function bearBomb() {
  return `<span class="bear-bomb-art" aria-label="熊熊炸弹"><img src="${import.meta.env.BASE_URL}characters-2d/classic.png" alt="熊熊炸弹" draggable="false"/><svg class="bomb-fuse" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 21c0-9 9-3 9-11" stroke="#5d4c3b" stroke-width="3" stroke-linecap="round"/><path d="m14 2 1.5 4 4-2-2 4 4 1.5-4 1.5 1 4-4-2-2 4-.5-5-4-1.5 4-1.5z" fill="#f3ae48" stroke="#b87632" stroke-width="1"/></svg></span>`;
}
function goalName(goal: Goal) {
  if (typeof goal.kind === 'number') return FRIENDS[goal.kind].short;
  return ({ice:game.level.theme === 'rain' ? '清除水洼' : '融化冰块',score:'收集分数',rescue:'救出伙伴',souvenir:game.level.theme === 'night' ? '收集星星' : '野餐点心',combo:'最高连消',bombs:'触发熊弹'})[goal.kind];
}
function goalArt(goal: Goal) {
  if (goal.kind === 'rescue') return `<span class="feature-goal">${icon('friends')}</span>`;
  if (goal.kind === 'souvenir') return `<span class="feature-goal">${game.level.theme === 'night' ? '★' : '🍪'}</span>`;
  if (goal.kind === 'combo') return `<span class="feature-goal">${icon('shuffle')}</span>`;
  if (goal.kind === 'bombs') return bearBomb(); return goal.kind === 'ice' ? `<span class="ice-goal">${icon('ice')}</span>` : goal.kind === 'score' ? `<span class="points-goal">${icon('star')}</span>` : photo(goal.kind); }
function renderBoard(drops?: Map<number, number>) {
  const focusedCell = document.activeElement instanceof HTMLElement ? document.activeElement.dataset.cell : undefined;
  const size = game.level.size ?? 8;
  $('#board').style.gridTemplateColumns = `repeat(${size},minmax(0,1fr))`;
  $('#board').setAttribute('aria-label', `${size} 行 ${size} 列三消棋盘`);
  $('#board').innerHTML = game.board.flatMap((t, i) => Math.floor(i / 8) >= size || i % 8 >= size ? [] : [ t ? `<button class="tile kind-${t.kind} ${selected === i ? 'selected' : ''} ${hint.includes(i) ? 'hint' : ''} ${game.ice[i] ? 'iced ice-' + game.ice[i] : ''} ${t.special ? 'special special-' + t.special : ''} ${drops?.get(i) ? 'dropping' : ''}" data-cell="${i}" data-id="${t.id}" style="--kind:${FRIENDS[t.kind].color};--drop:${drops?.get(i) ?? 0}" aria-label="第${Math.floor(i / 8) + 1}行第${i % 8 + 1}列 ${FRIENDS[t.kind].name}${t.special ? ' ' + specialName(t.special) : ''}${game.ice[i] ? ' 冰块' : ''}" aria-pressed="${selected === i}" tabindex="0">${t.special === 'bomb' ? `${bearBomb()}<span class="bomb-owner">${photo(t.kind)}</span>` : photo(t.kind)}${t.special === 'row' || t.special === 'column' ? `<span class="direction-badge direction-${t.special}">${directionIcon(t.special)}</span>` : t.special === 'rainbow' ? '<span class="special-symbol">✦</span>' : ''}${game.ice[i] === 2 ? '<span class="ice-layers">Ⅱ</span>' : ''}${game.cages[i] ? `<span class="rescue-box" aria-label="救援箱，还需${game.cages[i]}次消除"><img src="${portraits[FRIENDS[game.level.rescue!.find(b=>b.cell===i)!.kind].id]}" alt="等待救援的伙伴"/><b>${game.cages[i] === 2 ? '救救我' : '就差一下'}</b></span><span class="crate-owner" aria-label="匹配角色">${photo(t.kind)}</span>` : ''}${game.souvenirCells.includes(i) ? `<span class="souvenir-token" aria-label="${game.level.theme === 'night' ? '星星' : '点心'}">${game.level.theme === 'night' ? '★' : '🍪'}</span>` : ''}</button>` : `<span class="empty-cell ${game.level.holes.includes(i) ? 'hole' : ''}" data-cell="${i}"></span>`]).join('');
  if (focusedCell !== undefined) document.querySelector<HTMLElement>(`button[data-cell="${focusedCell}"]`)?.focus({ preventScroll: true });
}
function specialName(s: string) { return ({ row: '横向直线', column: '纵向直线', bomb: '熊熊炸弹', rainbow: '彩虹特效' } as Record<string, string>)[s]; }
function renderStats() {
  document.body.dataset.theme = game.level.theme ?? 'sunny';
  $('#trip-theme').textContent = ({sunny:'☀ 晴日出发',picnic:'✿ 野餐时光',rain:'☂ 雨后小路',night:'☾ 睡衣派对'})[game.level.theme ?? 'sunny'];
  $('#album-count').textContent = `${album(save.records,save.stats).filter(s=>s.earned).length} / 24`;
  $('#return-campaign').hidden = !mode;
  $('#activity-banner').hidden = !mode;
  $('#activity-banner').textContent = mode ? `${mode.type === 'daily' ? `每日挑战 · ${mode.date}` : '好友同棋盘挑战'} · ${game.level.name} · 免费提示，挑战中不使用道具${mode.benchmark ? ` · 好友 ${mode.benchmark.used} 步 / ${mode.benchmark.score.toLocaleString()} 分` : ''}` : '';
  $('#train-meter').hidden = !game.level.train;
  $('#train-fill').style.width = `${Math.min(100,game.trainEnergy/36*100)}%`;
  $('#train-count').textContent = `${Math.min(36,game.trainEnergy)} / 36 · 已发车 ${game.trainRides} 次`;
  $('#level-number').textContent = String(game.level.id).padStart(2, '0');
  $('#level-name').textContent = game.level.name;
  $('#board-label').textContent = `${game.level.size}×${game.level.size} · ${game.level.kinds}位伙伴`;
  $('#moves').textContent = String(game.moves); $('#moves').classList.toggle('low', game.moves <= 5);
  $('#score').textContent = game.score.toLocaleString();
  $('#score-fill').style.width = `${Math.min(100, game.score / 120)}%`;
  $('#station-count').textContent = String(save.unlocked);
  $('#stars').innerHTML = [1500, 6500, 12000].map(n => icon('star', game.score >= n ? 'earned' : '')).join('');
  $('#goals').innerHTML = game.level.goals.map(g => {
    const p = Math.min(game.progress(g), g.target), done = p >= g.target;
    return `<div class="goal-item ${done ? 'done' : ''}"><span class="goal-avatar">${goalArt(g)}</span><div class="goal-info"><b>${goalName(g)}<span>${done ? icon('check') : `<em>${p}</em> / ${g.target}`}</span></b><div class="goal-track"><i style="width:${p / g.target * 100}%"></i></div></div></div>`;
  }).join('');
  for (const name of ['hammer', 'shuffle', 'wand', 'moves']) {
    $(`#count-${name}`).textContent = String(save.inventory[name]);
    $<HTMLButtonElement>(`[data-action="${name}"]`).disabled = !!mode;
    $(`[data-action="${name}"]`).classList.toggle('active', tool === name);
    $(`[data-action="${name}"]`).classList.toggle('depleted', save.inventory[name] <= 0);
  }
}
function setStatus(text: string) { $('#board-status').textContent = text; }
function toast(text: string) {
  $('#toast').textContent = text; $('#toast').classList.add('visible'); clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => $('#toast').classList.remove('visible'), 2600);
}
function sound(type = 'pop', combo = 1) {
  if (!save.sound) return;
  try {
    audio ??= new AudioContext(); void audio.resume();
    const notes = type === 'win' ? [523, 659, 784, 1047] : type === 'bad' ? [190, 150] : [330 * Math.pow(1.14, Math.min(combo, 8)), 440 * Math.pow(1.14, Math.min(combo, 8))];
    notes.forEach((freq, n) => {
      const osc = audio!.createOscillator(), gain = audio!.createGain();
      osc.type = 'sine'; osc.frequency.value = freq; osc.connect(gain); gain.connect(audio!.destination);
      const t = audio!.currentTime + n * 0.075;
      gain.gain.setValueAtTime(0, t); gain.gain.linearRampToValueAtTime(0.065, t + 0.012); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.20);
      osc.start(t); osc.stop(t + 0.22);
    });
  } catch { /* Audio is optional. */ }
}
function clearHint() { hint = []; clearTimeout(hintTimer); clearTimeout(idleTimer); $('#board').querySelectorAll('.hint').forEach(el => el.classList.remove('hint')); }
function scheduleHint() { clearTimeout(idleTimer); idleTimer = window.setTimeout(() => { if (!busy && !modal && !tool && !terminal) showHint(false); }, 10000); }
function showHint(manual = true) {
  if (busy || terminal) return;
  const move = game.validMoves()[0];
  if (!move) return;
  clearHint(); hint = move; renderBoard();
  if (manual) { setStatus('试试交换这两位伙伴'); toast('发光的两个伙伴可以交换哦'); }
  hintTimer = window.setTimeout(() => { hint = []; renderBoard(); }, 4000);
}
function burst(wave: Wave) {
  const effects = $('#effects'), boardRect = $('#board').getBoundingClientRect(), shellRect = $('.board-shell').getBoundingClientRect();
  for (const i of wave.activated) {
    const cell = document.querySelector<HTMLElement>(`[data-cell="${i}"].special-bomb`);
    if (!cell || matchMedia('(prefers-reduced-motion: reduce)').matches) continue;
    const rect = cell.getBoundingClientRect();
    const ring = document.createElement('span'); ring.className = 'blast-ring';
    ring.style.cssText = `left:${rect.left - shellRect.left + rect.width / 2}px;top:${rect.top - shellRect.top + rect.height / 2}px;--blast-size:${rect.width * 3}px`;
    effects.append(ring); setTimeout(() => ring.remove(), 650);
  }
  for (const i of wave.removed) {
    const cell = $(`[data-cell="${i}"]`); cell.classList.add('popping');
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) continue;
    const rect = cell.getBoundingClientRect();
    for (let n = 0; n < 4; n++) {
      const p = document.createElement('i'); p.className = 'particle';
      p.style.cssText = `left:${rect.left - shellRect.left + rect.width / 2}px;top:${rect.top - shellRect.top + rect.height / 2}px;--dx:${(Math.random() - .5) * 110}px;--dy:${-20 - Math.random() * 90}px;--color:${['#f2c967', '#85b9a2', '#f4abb3', '#a8c9df'][n]}`;
      effects.append(p); setTimeout(() => p.remove(), 700);
    }
  }
  const label = document.createElement('div'); label.className = 'combo-label';
  label.style.top = `${boardRect.top - shellRect.top + boardRect.height * .35}px`;
  label.innerHTML = `<b>${game.combo >= 4 ? '快乐大爆发！' : game.combo >= 2 ? `${game.combo} 连消 · 太棒啦！` : wave.activated.length ? '特效出发！' : wave.created.length ? '新的小惊喜！' : '漂亮消除！'}</b><span>+${wave.points.toLocaleString()}</span>`;
  effects.append(label); setTimeout(() => label.remove(), 1000);
  if ([3,5,8].includes(game.combo)) {
    const reaction = document.createElement('div'); reaction.className='combo-bear-reaction';
    const file = game.combo >= 8 ? 'rare' : game.combo >= 5 ? 'victory' : 'clap';
    reaction.innerHTML=`<img src="${import.meta.env.BASE_URL}characters-2d/joke-bear-${file}.gif" alt="熊熊${game.combo>=8?'稀有狂欢':game.combo>=5?'跳舞':'鼓掌'}"/><b>${game.combo>=8?'稀有狂欢！':game.combo>=5?'一起跳舞！':'为你鼓掌！'}</b>`;
    effects.append(reaction);setTimeout(()=>reaction.remove(),1800);
  }
}
async function settle(forced?: Set<number>, preferred: number[] = []) {
  let wave = game.resolve(forced, preferred), loops = 0;
  let trainChecked = false;
  while ((wave || (!trainChecked && game.level.train && game.trainEnergy >= 36 && !game.won)) && loops < 80) {
    if (!wave) {
      trainChecked = true;
      const trip = game.departTrain();
      if (!trip) break;
      save.stats.rides++; renderStats();
      const train = document.createElement('div'); train.className='surprise-train';train.innerHTML=`${icon('train')}<b>${trip.type === 'gift' ? '熊熊炸弹送到啦！' : '快乐列车，清一排！'}</b>`;const track=document.createElement('div');track.className='train-track';track.append(train);$('#effects').append(track);
      await wait(matchMedia('(prefers-reduced-motion: reduce)').matches ? 120 : 950);track.remove();renderBoard();
      if (trip.type === 'gift') break;
      wave = game.resolve(new Set(trip.cells));
      if (!wave) break;
    }
    loops++;
    save.stats.maxCombo = Math.max(save.stats.maxCombo, game.maxCombo);
    save.stats.rescues += wave.rescued.length;
    if (wave.rescued.length) toast(`救出了${wave.rescued.map(k=>FRIENDS[k].short).join('、')}！`);
    sound('pop', game.combo); burst(wave); renderStats();
    setStatus(game.combo > 1 ? `${game.combo} 连消！快乐正在发生` : wave.created.length ? '新特效已就位，试试和伙伴交换' : '好心情 +1');
    await wait(230); renderBoard(); await wait(70);
    const drops = game.collapse(); renderBoard(drops); await wait(280);
    wave = game.resolve();
  }
  if (loops >= 80) { game.shuffle(); renderBoard(); }
  if (game.won) { await finish(true); return; }
  if (game.moves <= 0) { await finish(false); return; }
  if (!game.validMoves().length) { setStatus('没有可交换的伙伴，免费重新排队'); game.shuffle(); renderBoard(); toast('已免费洗牌，继续快乐消除'); }
  busy = false; renderStats(); renderBoard(); persist(); scheduleHint();
}
async function exchange(a: number, b: number) {
  if (busy || terminal || modal) return;
  busy = true; selected = -1; clearHint();
  const first = $(`[data-cell="${a}"]`), second = $(`[data-cell="${b}"]`);
  const x = second.offsetLeft - first.offsetLeft, y = second.offsetTop - first.offsetTop;
  first.style.transform = `translate(${x}px,${y}px)`; second.style.transform = `translate(${-x}px,${-y}px)`;
  first.classList.add('swapping'); second.classList.add('swapping');
  await wait(180);
  const result = game.swap(a, b);
  if (!result.valid) {
    first.style.transform = ''; second.style.transform = ''; sound('bad');
    setStatus('要三个相同伙伴连成一线哦'); await wait(180); busy = false; renderBoard(); scheduleHint(); return;
  }
  renderBoard(); renderStats(); await settle(result.forced, [b, a]);
}
async function chooseCell(i: number) {
  if (busy || terminal || modal || !game.board[i]) return;
  clearHint();
  if (tool) {
    const chosen = tool; tool = ''; busy = true; selected = -1;
    if (chosen === 'hammer') { save.inventory.hammer--; game.combo = 0; await settle(new Set([i])); }
    else { save.inventory.wand--; game.board[i]!.special = 'row'; sound(); busy = false; setStatus('魔法注入成功！消除它来触发整行特效'); renderBoard(); renderStats(); persist(); scheduleHint(); }
    $('#board').classList.remove('using-tool'); return;
  }
  if (selected === i) { selected = -1; renderBoard(); return; }
  if (selected >= 0 && adjacent(selected, i)) { await exchange(selected, i); return; }
  selected = i; renderBoard(); scheduleHint();
}
function openDialog(content: string, kind: string) {
  modal = kind; clearHint(); selected = -1; renderBoard();
  $('#modal-root').innerHTML = `<div class="modal-backdrop"><section class="modal modal-${kind}" role="dialog" aria-modal="true" aria-label="${kind === 'map' ? '旅程地图' : kind === 'friends' ? '伙伴图鉴' : kind === 'help' ? '玩法说明' : '游戏提示'}"><button class="modal-close circle-button" data-action="close" aria-label="关闭">${icon('close')}</button>${content}</section></div>`;
  requestAnimationFrame(() => $('#modal-root button')?.focus());
}
function closeDialog() { if (modal === 'win' || modal === 'lose') return; if (terminal && ['album','share','challenges'].includes(modal)) {void action('result-back');return;} modal = ''; $('#modal-root').innerHTML = ''; scheduleHint(); }
function mapDialog() {
  openDialog(`<div class="modal-eyebrow">THE HAPPY LINE · 01</div><h2>把快乐，一站站收集。</h2><p class="modal-subtitle">晴日出发 · ${Object.keys(save.records).length} 站已完成 / 共 ${LEVELS.length} 站</p><div class="journey-map">${LEVELS.map(l => `<button class="station ${l.id === game.level.id ? 'current' : ''} ${l.id > save.unlocked ? 'locked' : ''}" data-level="${l.id}" ${l.id > save.unlocked ? 'disabled' : ''}><span class="station-circle">${l.id > save.unlocked ? icon('lock') : save.records[l.id] ? icon('check') : l.id}</span><b>${l.name}</b><span class="station-detail">${l.size}×${l.size} · ${l.kinds}位伙伴</span><span class="station-stars">${save.records[l.id] ? '★'.repeat(save.records[l.id].stars) + '☆'.repeat(3 - save.records[l.id].stars) : l.id > save.unlocked ? '待解锁' : l.id === game.level.id ? '正在停靠' : '出发吧'}</span></button>`).join('')}</div><div class="map-bottom">${icon('train')} 完成本站目标，即可解锁下一站</div>`, 'map');
}
function friendsDialog() {
  openDialog(`<div class="modal-eyebrow">MEET YOUR TRAVEL BUDDIES</div><h2>伙伴与造型，一起收集。</h2><p class="modal-subtitle">新伙伴和Joke Bear造型随站点加入；相同造型才会匹配。</p><div class="friend-grid">${FRIENDS.map((f, i) => `<article class="friend-card ${save.unlocked < f.unlockLevel ? 'friend-locked' : ''}" style="--friend-color:${f.color}"><div>${photo(i)}</div><h3>${f.name}</h3><p>${f.desc}</p>${'baseId' in f ? '<small class="outfit-label">Joke Bear · 独立造型</small>' : ''}<span>${save.unlocked < f.unlockLevel ? `第 ${f.unlockLevel} 站加入` : `${game.collected[i]} 次 · 本局相遇`}</span></article>`).join('')}</div>`, 'friends');
}
function helpDialog() {
  openDialog(`<div class="modal-eyebrow">A LITTLE GUIDE TO HAPPINESS</div><h2>快乐，其实很简单。</h2><p class="modal-subtitle">鼠标点击两格，或在手机上轻轻滑动。</p><div class="help-list"><div><span>✦</span><section><h3>救伙伴、乘列车，收集新故事</h3><p>第5站起，箱子所在格或相邻格消除一次就松动一层，两次救出伙伴；箱子左下小头像表示这一格的匹配角色。第8站起每消除36个伙伴列车发车，交替送熊炸弹、清除一行。点心和星星覆盖在棋格上，消除该格即可收集。雨天的水洼与冰块规则相同。3/5/8连消触发不同现成熊表情。每日与好友挑战不使用道具、不影响主线进度。</p></section></div><div><span>01</span><section><h3>交换相邻伙伴，三个相同就消除</h3><p>横向或纵向连成一线即可。无效交换会复原，不消耗步数。消除后会自动掉落，并触发连消。</p></section></div><div><span>02</span><section><h3>多连一点，惊喜多一点</h3><p>四连生成直线特效；L/T 型生成熊熊炸弹；五连生成彩虹特效。直线清整行或整列，熊熊炸弹清周围 3×3，可与其他特效连锁。炸弹左下小头像是它的匹配角色，跟同色同角色消除即可触发；彩虹与任意伙伴交换清同色。</p></section></div><div><span>03</span><section><h3>让两个特效碰个面</h3><p>两个直线组成十字；直线 + 爆炸清三行三列；双爆炸清 5×5；彩虹 + 特效让同色伙伴都带特效；双彩虹全盘消除。</p></section></div><div><span>04</span><section><h3>在步数用完前，完成本站目标</h3><p>目标可能是收集伙伴、获得分数或融化冰块。冰上的伙伴被消除，冰块就会减少一层。木锤和魔法棒不耗步数，提示永久免费。</p></section></div><div><span>⌨</span><section><h3>键盘也能出发</h3><p>Tab 选择棋子，方向键移动焦点，Enter 选中；Shift + 方向键交换相邻伙伴。Esc 取消道具或关闭窗口。进度会自动保存在当前浏览器。Joke Bear的不同造型是独立棋子，普通熊、雨衣熊、睡衣熊、忍者熊不能混消。</p></section></div></div><button class="primary-button" data-action="close">知道啦，出发 ${icon('arrow')}</button>`, 'help');
}
function startLevel(id: number) {
  mode = null; save.campaign = undefined; game = new Game(LEVELS[id - 1], undefined, randomSeed()); terminal = false; busy = false; selected = -1; tool = ''; hint = []; modal = '';
  $('#modal-root').innerHTML = ''; $('#effects').innerHTML = ''; $('#board').classList.remove('using-tool');
  setStatus(game.level.subtitle);
  renderBoard(); renderStats(); persist(); scheduleHint();
}
async function finish(won: boolean) {
  busy = true; terminal = true; clearHint(); await wait(300); busy = false;
  if (won) {
    game.score += game.moves * 60;
    if (mode) { finishChallenge(); return; }
    const oldAlbum = album(save.records,save.stats).filter(s=>s.earned).length;
    const previous = save.records[game.level.id];
    const firstClear = !previous;
    save.records[game.level.id] = { score: Math.max(previous?.score ?? 0, game.score), stars: Math.max(previous?.stars ?? 0, game.stars) };
    save.unlocked = Math.min(LEVELS.length, Math.max(save.unlocked, game.level.id + 1));
    if (firstClear) { save.inventory.hammer++; save.inventory.shuffle++; }
    renderStats(); persist(); sound('win');
    openDialog(`${victoryCelebration()}<div class="modal-eyebrow">HAPPINESS ARRIVED</div><h2>${game.level.id === LEVELS.length ? '快乐全线，顺利通车！' : '好心情，成功到站！'}</h2><p class="modal-subtitle">第 ${game.level.id} 站 · ${game.level.name}</p><div class="result-stars">${[1, 2, 3].map(n => icon('star', n <= game.stars ? 'earned' : '')).join('')}</div><div class="result-score">${game.score.toLocaleString()}<span>本次得分 · 含剩余步数奖励 ${game.moves * 60}</span></div><p class="reward-note">${firstClear ? '首次到站礼物：小木锤 +1 · 大洗牌 +1' : '每次相遇，都有新的小快乐'}${album(save.records,save.stats).filter(s=>s.earned).length>oldAlbum ? '<br>新贴纸已收入收集册！' : ''}</p><button class="result-album" data-action="album">打开贴纸收集册 ${icon('heart')}</button><button class="primary-button" data-action="next">${game.level.id === LEVELS.length ? '再来一趟快乐旅程' : '前往下一站'} ${icon('arrow')}</button><button class="secondary-button" data-action="result-map">看看旅程地图</button>`, 'win');
  } else {
    persist(); sound('bad');
    openDialog(`<div class="result-art solo">${photo(1)}</div><div class="modal-eyebrow">TAKE YOUR TIME</div><h2>差一点点，再试一次？</h2><p class="modal-subtitle">本站目标还没完成，伙伴们会一直陪着你。</p><div class="remaining-goals">${game.level.goals.map(g => `<span>${goalArt(g)}<b>${Math.max(0, g.target - game.progress(g)).toLocaleString()}</b><small>还需收集</small></span>`).join('')}</div>${!mode && save.inventory.moves > 0 ? `<button class="primary-button" data-action="continue">再走 5 步 <small>加五步道具 × ${save.inventory.moves}</small></button>` : ''}<button class="${!mode && save.inventory.moves > 0 ? 'secondary-button' : 'primary-button'}" data-action="retry">重新出发 ${icon('reset')}</button><button class="secondary-button" data-action="result-map">返回旅程地图</button>`, 'lose');
  }
}
let pendingShare: Challenge | null = null;
function albumDialog() {
  const stickers = album(save.records,save.stats), earned = stickers.filter(s=>s.earned).length;
  openDialog(`<div class="modal-eyebrow">LITTLE MOMENTS, BIG SMILES</div><h2>快乐贴纸收集册</h2><p class="modal-subtitle">${earned} / ${stickers.length} 张 · 首次过关、连消与救援都会留下小纪念。</p><div class="album-grid">${stickers.map(sticker=>`<article class="album-sticker ${sticker.earned?'earned':'unearned'}"><div>${sticker.earned ? photo(sticker.kind) : icon('lock')}</div><small>${sticker.earned?'已收藏':sticker.requirement}</small><h3>${sticker.name}</h3><p>${sticker.earned?sticker.story:'继续旅程，解锁这段小故事。'}</p></article>`).join('')}</div><div class="sticker-sources">连消表情来源：<a href="https://tenor.com/view/plinker98-jokebear-clapping-jokeclap-gif-7930087846966567832" target="_blank" rel="noopener noreferrer">鼓掌</a> · <a href="https://tenor.com/view/joke-bear-dance-dancing-happy-happy-dance-gif-16210144" target="_blank" rel="noopener noreferrer">跳舞</a> · <a href="https://tenor.com/view/joke-bear-cute-animated-bear-gif-17774338" target="_blank" rel="noopener noreferrer">稀有狂欢</a></div>${terminal?'<button class="secondary-button" data-action="result-back">返回旅程</button>':''}`, 'album');
}
function challengeDialog(incoming = '') {
  const date=dayKey(), today=dailyChallenge(date), result=save.daily[date], task=challengeLevel(today);
  openDialog(`<div class="modal-eyebrow">A NEW LITTLE ADVENTURE</div><h2>今天，一起挑战吗？</h2><p class="modal-subtitle">挑战途中会保留主线棋盘，返回即可接着玩。免费提示，挑战中不使用道具。</p><section class="daily-card"><span>每日挑战 · ${date} · 上海时间每日更新</span><h3>${task.name}</h3><p>${task.goals.map(g=>`${g.kind==='combo'?'最高连消':g.kind==='bombs'?'触发熊弹':'得分'} ${g.target}`).join(' · ')} · ${task.moves} 步</p><small>${result?`今日最佳：${result.used} 步 / ${result.score.toLocaleString()} 分`:'每天一个固定棋盘，可以重复挑战自己的最佳成绩。'}</small><button class="primary-button" data-action="daily-start">${result?'再挑战一次':'开始今日挑战'} ${icon('arrow')}</button></section><section class="friend-challenge"><h3>好友同棋盘挑战</h3><p>创建第 ${game.level.id} 站的全新同棋盘挑战。通关后可分享成绩，比谁步数更少。</p><button class="secondary-button create-challenge" data-action="create-challenge">创建挑战码 ${icon('shuffle')}</button><label for="challenge-code">粘贴朋友的挑战码或完整链接</label><input id="challenge-code" type="text" maxlength="500" autocomplete="off" spellcheck="false" placeholder="RP2-… 或游戏链接"/><p id="challenge-error" role="alert"></p><button class="primary-button" data-action="join-challenge">加入好友挑战 ${icon('arrow')}</button></section>${terminal?'<button class="secondary-button" data-action="result-back">返回旅程</button>':''}`, 'challenges');
  $<HTMLInputElement>('#challenge-code').value=incoming;
}
function shareDialog(spec: Challenge, result?: Result) {
  pendingShare=spec;
  const code=challengeCode(spec,result);
  const url=`${location.origin}${import.meta.env.BASE_URL}?challenge=${encodeURIComponent(code)}`;
  openDialog(`<div class="modal-eyebrow">SAME BOARD, SHARED HAPPINESS</div><h2>${result?'把成绩留给朋友挑战':'邀请朋友，玩同一个棋盘'}</h2><p class="modal-subtitle">${result?`你用 ${result.used} 步得到 ${result.score.toLocaleString()} 分。`:'每个人从同一盘开始，掉落顺序也相同。'}通关后优先比较步数，再比较分数；成绩由浏览器保存。</p><div class="share-card"><b>第 ${spec.level} 站 · ${challengeLevel(spec).name}</b><code>${code}</code><label for="share-link">挑战链接</label><input id="share-link" readonly aria-label="挑战链接"/><button class="primary-button" data-action="copy-challenge">复制挑战链接</button></div>${!result?'<button class="secondary-button" data-action="play-shared">我先来试试</button>':'<button class="secondary-button" data-action="result-back">返回挑战成绩</button>'}`, 'share');
  $<HTMLInputElement>('#share-link').value=url;
}
function activateGame() {
  terminal=false;busy=false;selected=-1;tool='';hint=[];modal='';
  $('#modal-root').innerHTML='';$('#effects').innerHTML='';$('#board').classList.remove('using-tool');
  setStatus(game.level.subtitle);renderBoard();renderStats();persist();scheduleHint();
}
function beginChallenge(spec: Challenge) {
  if (busy || !validChallenge(spec)) return;
  if (!mode) save.campaign=terminal?undefined:game.serialize();
  const currentUrl = new URL(location.href); currentUrl.searchParams.delete('challenge'); history.replaceState(null,'',currentUrl);
  mode=structuredClone(spec);game=new Game(challengeLevel(mode),undefined,mode.seed);activateGame();
  toast(mode.type==='daily'?'每日挑战开始！主线进度已保留':'同棋盘挑战开始！主线进度已保留');
}
function returnCampaign() {
  if (!mode) {closeDialog();return;}
  mode=null;
  game=(save.campaign&&Game.restore(save.campaign))||new Game(LEVELS[save.unlocked-1],undefined,randomSeed());
  save.campaign=undefined;activateGame();toast('已回到主线旅程');
}
function finishChallenge(record = true) {
  if (!mode) return;
  const result={score:game.score,used:game.level.moves-game.moves};
  if (record && mode.type==='daily' && mode.date) {
    if (!save.daily[mode.date]) save.stats.dailyClears++;
    if (betterResult(result,save.daily[mode.date])) save.daily[mode.date]=result;
    const dates=Object.keys(save.daily).sort();for (const old of dates.slice(0,Math.max(0,dates.length-120))) delete save.daily[old];
  }
  renderStats();persist();
  const benchmark=mode.benchmark;
  const comparison=benchmark ? betterResult(result,benchmark)?`超过好友的 ${benchmark.used} 步成绩！`:result.used===benchmark.used&&result.score===benchmark.score?'和好友打成平手！':`好友用了 ${benchmark.used} 步，再试一次争取更少步数。` : '分享同棋盘挑战，邀请朋友来比一比。';
  openDialog(`${victoryCelebration()}<div class="modal-eyebrow">CHALLENGE COMPLETE</div><h2>${mode.type==='daily'?'今日挑战，完成！':'同棋盘挑战，完成！'}</h2><p class="modal-subtitle">${game.level.name} · 用了 ${result.used} 步</p><div class="result-score">${game.score.toLocaleString()}<span>${comparison}</span></div><p class="reward-note">挑战成绩独立保存，主线进度和道具已保留。</p><button class="primary-button" data-action="share-result">分享成绩与挑战链接 ${icon('arrow')}</button><button class="secondary-button" data-action="challenge-retry">再挑战一次</button><button class="secondary-button" data-action="return-campaign">返回主线旅程</button>`, 'win');
}
async function action(name: string) {
  if (name === 'album') { if (!busy) albumDialog(); return; }
  if (name === 'challenges') { if (!busy) challengeDialog(); return; }
  if (name === 'daily-start') { beginChallenge(dailyChallenge()); return; }
  if (name === 'create-challenge') { shareDialog({type:'friend',level:game.level.id,seed:randomSeed(),variant:3}); return; }
  if (name === 'join-challenge') { const parsed=parseChallenge($<HTMLInputElement>('#challenge-code').value); if (!parsed) {$('#challenge-error').textContent='挑战码无效，请复制完整的 RP2 挑战码或链接。';return;} beginChallenge(parsed);return; }
  if (name === 'play-shared') { if (pendingShare) beginChallenge(pendingShare);return; }
  if (name === 'copy-challenge') { const input=$<HTMLInputElement>('#share-link'); try {await navigator.clipboard.writeText(input.value);toast('挑战链接已复制，发给朋友一起玩');} catch { input.focus();input.select();toast('请复制选中的挑战链接'); } return; }
  if (name === 'return-campaign') { if (!busy) returnCampaign(); return; }
  if (name === 'share-result') { if (mode) shareDialog(mode,{score:game.score,used:game.level.moves-game.moves});return; }
  if (name === 'challenge-retry') { if (mode) beginChallenge(mode);return; }
  if (name === 'result-back') { if (terminal) { if(mode && game.won) finishChallenge(false); else if(game.won) mapDialog(); else void finish(false); } else closeDialog();return; }
  if (name === 'sound') { save.sound = !save.sound; $('[data-action="sound"]').innerHTML = icon(save.sound ? 'sound' : 'mute'); $('[data-action="sound"]').setAttribute('aria-label', save.sound ? '关闭音效' : '开启音效'); persist(); if (save.sound) sound(); return; }
  if (name === 'close') { closeDialog(); return; }
  if (name === 'result-map') { if(mode) returnCampaign(); else { modal = ''; mapDialog(); } return; }
  if (name === 'next') { if(mode) {returnCampaign();return;} startLevel(game.level.id === LEVELS.length ? 1 : game.level.id + 1); return; }
  if (name === 'retry' || name === 'confirm-restart') { if(mode) beginChallenge(mode);else startLevel(game.level.id); return; }
  if (name === 'continue' && !mode && save.inventory.moves > 0) { save.inventory.moves--; game.moves += 5; terminal = false; modal = ''; $('#modal-root').innerHTML = ''; renderStats(); persist(); scheduleHint(); return; }
  if (name === 'map') { if (!busy) {if(mode) returnCampaign();mapDialog();} return; }
  if (name === 'friends') { if (!busy) friendsDialog(); return; }
  if (name === 'help') { if (!busy) helpDialog(); return; }
  if (name === 'play') { closeDialog(); if (terminal) { if(mode) returnCampaign(); else startLevel(game.level.id); }; return; }
  if (busy || terminal || modal) return;
  if (name === 'restart') { openDialog(`<div class="modal-eyebrow">A FRESH START</div><h2>重新开始本站？</h2><p class="modal-subtitle">本局分数与目标进度会重置，已使用的道具不会退回。</p><button class="primary-button" data-action="confirm-restart">重新出发 ${icon('reset')}</button><button class="secondary-button" data-action="close">继续这趟旅程</button>`, 'restart'); return; }
  if (name === 'hint') { showHint(); return; }
  if (mode || !['hammer', 'shuffle', 'wand', 'moves'].includes(name)) return;
  if (save.inventory[name] <= 0) { toast('这件道具用完啦，首次通关可补充木锤和洗牌'); return; }
  clearHint(); selected = -1;
  if (name === 'hammer' || name === 'wand') { tool = tool === name ? '' : name; $('#board').classList.toggle('using-tool', !!tool); renderStats(); renderBoard(); setStatus(tool ? `选择一位伙伴使用${tool === 'hammer' ? '小木锤' : '魔法棒'} · Esc 取消` : '伙伴们准备好啦'); return; }
  tool = ''; $('#board').classList.remove('using-tool');
  if (name === 'moves') { save.inventory.moves--; game.moves += 5; sound(); toast('快乐续程！剩余步数 +5'); renderStats(); persist(); scheduleHint(); return; }
  busy = true; save.inventory.shuffle--; $('#board').classList.add('shuffling'); sound(); await wait(240); game.shuffle(); $('#board').classList.remove('shuffling'); renderBoard(); renderStats(); busy = false; toast('伙伴重新排好队啦'); persist(); scheduleHint();
}
document.addEventListener('click', e => {
  const target = e.target as HTMLElement;
  const button = target.closest<HTMLElement>('[data-action]');
  if (button) { e.preventDefault(); void action(button.dataset.action!); return; }
  const level = target.closest<HTMLElement>('[data-level]');
  if (level && Number(level.dataset.level) <= save.unlocked) {
    const id = Number(level.dataset.level);
    if (!terminal && (game.score > 0 || game.moves !== game.level.moves) && id !== game.level.id) {
      openDialog(`<div class="modal-eyebrow">CHANGE YOUR DESTINATION</div><h2>前往第 ${id} 站？</h2><p class="modal-subtitle">当前关卡的本局进度会重置，已解锁站点与最高分会保留。</p><button class="primary-button" data-start-level="${id}">前往 ${LEVELS[id - 1].name} ${icon('arrow')}</button><button class="secondary-button" data-action="close">继续当前关卡</button>`, 'change-level');
    } else if (id === game.level.id && !terminal) closeDialog(); else startLevel(id);
    return;
  }
  const start = target.closest<HTMLElement>('[data-start-level]'); if (start) { startLevel(Number(start.dataset.startLevel)); return; }
  const cell = target.closest<HTMLElement>('button[data-cell]');
  if (cell && !gesture) void chooseCell(Number(cell.dataset.cell));
  if (target.classList.contains('modal-backdrop')) closeDialog();
});
$('#board').addEventListener('pointerdown', e => {
  const cell = (e.target as HTMLElement).closest<HTMLElement>('button[data-cell]');
  if (!cell || busy || modal || terminal) return;
  gesture = { index: Number(cell.dataset.cell), x: e.clientX, y: e.clientY, pointer: e.pointerId };
});
$('#board').addEventListener('pointerup', e => {
  if (!gesture) return;
  const g = gesture; const dx = e.clientX - g.x, dy = e.clientY - g.y;
  gesture = null;
  if (Math.max(Math.abs(dx), Math.abs(dy)) > 16 && !tool) {
    const dest = g.index + (Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : -1) : (dy > 0 ? 8 : -8));
    if (dest >= 0 && dest < 64 && adjacent(g.index, dest) && game.board[dest]) void exchange(g.index, dest);
    // Suppress the click generated after a swipe.
    const stopClick = (ev: MouseEvent) => { ev.stopImmediatePropagation(); document.removeEventListener('click', stopClick, true); };
    document.addEventListener('click', stopClick, true); setTimeout(() => document.removeEventListener('click', stopClick, true), 100);
  }
});
window.addEventListener('pointerup', () => { gesture = null; });
window.addEventListener('pointercancel', () => { gesture = null; });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { if (modal) closeDialog(); else { tool = ''; selected = -1; $('#board').classList.remove('using-tool'); renderBoard(); renderStats(); setStatus('伙伴们准备好啦'); } return; }
  if (modal && e.key === 'Tab') {
    const focusable = Array.from($('#modal-root').querySelectorAll<HTMLElement>('button:not([disabled]):not([hidden]), input, a[href], textarea'));
    if (!focusable.length) return;
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    return;
  }
  const cell = (e.target as HTMLElement).closest<HTMLElement>('button[data-cell]');
  if (!cell || modal || busy) return;
  const direction: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -8, ArrowDown: 8 };
  if (direction[e.key] !== undefined) {
    e.preventDefault(); const i = Number(cell.dataset.cell), next = i + direction[e.key];
    if (next < 0 || next > 63 || !adjacent(i, next) || !game.board[next]) return;
    if (e.shiftKey) void exchange(i, next); else $<HTMLButtonElement>(`button[data-cell="${next}"]`).focus();
  }
});
window.addEventListener('pagehide', () => { if (!busy) persist(); });

async function init() {
  preloadCelebration();
  try { portraits = await loadPortraits(); }
  catch (err) {
    console.error('角色加载失败', err);
    $('#loading').innerHTML = `<b>角色暂时没有准备好</b><span>请刷新页面，再一起出发</span><button class="primary-button" onclick="location.reload()">重新加载</button>`;
    return;
  }
  $('#hero-bear').setAttribute('src', portraits['classic-full']); $('#hero-usagi').setAttribute('src', portraits['usagi-full']);
  setStatus(game.level.subtitle); renderBoard(); renderStats(); $('#loading').classList.add('loaded'); busy = false;
  if (game.won || game.moves === 0) await finish(game.won);
  else { if (!game.validMoves().length) game.shuffle(); renderBoard(); persist(); scheduleHint(); }
  const incoming = new URL(location.href).searchParams.get('challenge');
  if (incoming && parseChallenge(incoming)) challengeDialog(incoming);
}
void init();
