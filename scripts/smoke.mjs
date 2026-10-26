import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const base = process.env.GAME_URL || 'http://localhost:5173';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = [];
const errors = [];
const check = (name, pass) => { assert.ok(pass, name); results.push(name); console.log('PASS', name); };
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  page.on('pageerror', e => { errors.push(e.message); console.error('BROWSER ERROR:',e.stack); });
  const ready = async () => { await page.waitForSelector('#loading.loaded'); await page.waitForTimeout(450); };
  const state = () => page.evaluate(() => JSON.parse(localStorage.getItem('rail-pop-v1')));
  const cell = i => page.locator(`button[data-cell="${i}"]`);
  const click = action => page.locator(`[data-action="${action}"]`).first().click();
  const stable = async predicate => {
    await page.waitForFunction(predicate);
    await page.waitForTimeout(100);
  };
  await page.goto(base); await ready();
  check('first station starts with 25 tiles and three character kinds', await page.locator('button[data-cell]').count() === 25 && await page.locator('.tile').evaluateAll(els=>new Set(els.map(el=>el.querySelector('img').dataset.character)).size===3));
  check('first station has one small collection goal', await page.locator('#goals > .goal-item').count() === 1);
  check('all portraits loaded', await page.locator('.tile img').evaluateAll(imgs => imgs.every(i => i.complete && i.naturalWidth > 0)));
  check('desktop has no horizontal overflow', await page.evaluate(() => document.documentElement.scrollWidth === innerWidth));
  // Exercise the shared controls on a later, larger board to avoid clearing
  // the intentionally tiny first-station goal in a single move.
  const controlSave = await page.evaluate(async () => {
    const { Game, LEVELS } = await import('/src/engine.ts');
    const s = JSON.parse(localStorage.getItem('rail-pop-v1'));
    const game = new Game(LEVELS[11]); game.moves = 26; s.current = game.serialize(); return s;
  });
  await context.addInitScript(s=>{if(location.protocol.startsWith('http')&&!sessionStorage.getItem('controls-fixture')){localStorage.setItem('rail-pop-v1',JSON.stringify(s));sessionStorage.setItem('controls-fixture','1');}},controlSave);
  await page.reload(); await ready();
  const moves = await page.evaluate(async () => {
    const { Game, adjacent } = await import('/src/engine.ts');
    const game = Game.restore(JSON.parse(localStorage.getItem('rail-pop-v1')).current);
    const valid = game.validMoves();
    let bad;
    for (let i = 0; i < 63; i++) if (adjacent(i, i + 1) && !valid.some(([a, b]) => a === i && b === i + 1)) { bad = [i, i + 1]; break; }
    return { good: valid[0], bad };
  });
  await cell(moves.bad[0]).click(); await cell(moves.bad[1]).click(); await page.waitForTimeout(650);
  check('invalid exchange does not spend a move or score', (await state()).current.moves === 26 && (await state()).current.score === 0);
  await click('hint'); check('free hint highlights exactly two tiles', await page.locator('.tile.hint').count() === 2);
  check('hint is free', (await state()).current.moves === 26);
  await cell(moves.good[0]).click(); await cell(moves.good[1]).click();
  await stable(() => JSON.parse(localStorage.getItem('rail-pop-v1')).current?.moves === 25);
  const firstMove = (await state()).current;
  check('real click exchange clears, scores and spends one move', firstMove.score > 0 && firstMove.moves === 25);
  await page.reload(); await ready();
  check('refresh resumes exact board and score', JSON.stringify((await state()).current) === JSON.stringify(firstMove));
  await cell(0).focus(); await page.keyboard.press('Enter');
  check('keyboard selection retains focused tile', await page.evaluate(() => document.activeElement?.getAttribute('data-cell') === '0'));
  await page.keyboard.press('Escape');
  const beforeHammer = await state();
  await click('hammer'); await cell(20).click();
  await stable(() => JSON.parse(localStorage.getItem('rail-pop-v1')).inventory.hammer === 2 && !document.querySelector('.popping,.dropping'));
  check('hammer consumes one item and no moves', (await state()).current.moves === beforeHammer.current.moves && (await state()).inventory.hammer === 2);
  await click('wand'); await cell(30).click(); await page.waitForTimeout(200);
  check('wand creates a line special without spending moves', (await state()).current.board[30].special === 'row' && (await state()).inventory.wand === 1 && (await state()).current.moves === 25);
  await click('moves');
  check('plus-five booster adds exactly five moves', (await state()).current.moves === 30 && (await state()).inventory.moves === 1);
  const beforeShuffle = (await state()).current;
  await click('shuffle');
  await stable(() => JSON.parse(localStorage.getItem('rail-pop-v1')).inventory.shuffle === 2);
  check('shuffle preserves score and moves', (await state()).current.score === beforeShuffle.score && (await state()).current.moves === beforeShuffle.moves);
  await click('map');
  check('map has 12 stations and locks future levels', await page.locator('.station').count() === 12 && await page.locator('.station[disabled]').count() === 11);
  await mkdir('artifacts', { recursive: true });
  await page.screenshot({ path: 'artifacts/journey-map.png', fullPage: true });
  await page.keyboard.press('Escape'); await click('friends');
  check('collection displays all six original characters', await page.locator('.friend-card').count() === 6);
  await click('close'); await click('help');
  check('help explains special combinations and keyboard controls', (await page.locator('.help-list').textContent()).includes('双彩虹') && (await page.locator('.help-list').textContent()).includes('Shift'));
  await page.keyboard.press('Escape');
  const soundBefore = (await state()).sound; await click('sound');
  check('audio preference persists', (await state()).sound === !soundBefore);

  // Test fixture loading uses a separate context to avoid the old page's pagehide save.
  async function freshFixture(type) {
    const fixtureSave = await page.evaluate(async type => {
      const { Game, LEVELS, findMatches } = await import('/src/engine.ts');
      const save = JSON.parse(localStorage.getItem('rail-pop-v1'));
      const game = new Game(LEVELS[type === 'ice' ? 10 : 0]);
      if (type !== 'ice') {
        game.board = game.board.map((t,i) => t ? ({ id: i + 1000, kind: (Math.floor(i / 8) * 2 + i % 8) % game.level.kinds }) : null);
        game.board[0].kind = 0; game.board[1].kind = 0; game.board[2].kind = 1; game.board[10].kind = 0;
        if (findMatches(game.board).length) throw new Error('fixture must start stable');
        game.moves = type === 'lose' ? 0 : 1;
        if (type === 'lose') game.score = 180;
        if (type === 'win') { game.collected[0] = game.level.goals[0].target - 1; }
      }
      save.current = game.serialize(); save.inventory = { hammer: 3, shuffle: 3, wand: 2, moves: 2 };
      return save;
    }, type);
    await page.goto('about:blank');
    await context.addInitScript(value => { if (location.protocol.startsWith('http') && !sessionStorage.getItem('fixture-' + value.current.level + '-' + value.current.moves + '-' + value.current.collected[0])) { localStorage.setItem('rail-pop-v1', JSON.stringify(value)); sessionStorage.setItem('fixture-' + value.current.level + '-' + value.current.moves + '-' + value.current.collected[0], 'yes'); } }, fixtureSave);
    await page.goto(base); await ready();
  }
  await freshFixture('win'); await cell(2).click(); await cell(10).click();
  await page.waitForSelector('.modal-win');
  check('last-move completion wins and unlocks the next station', (await state()).unlocked === 2 && !!(await state()).records[1]);
  check('first clear awards hammer and shuffle', (await state()).inventory.hammer === 4 && (await state()).inventory.shuffle === 4);
  await page.screenshot({ path: 'artifacts/victory.png', fullPage: true });
  await click('next'); check('next button starts station two', (await state()).current.level === 2);
  await freshFixture('lose');
  await page.waitForSelector('.modal-lose');
  check('running out of moves opens retry/continue flow', await page.locator('[data-action="retry"]').count() === 1 && await page.locator('[data-action="continue"]').count() === 1);
  await click('continue');
  check('continue spends one +5 item and retains score', (await state()).current.moves === 5 && (await state()).inventory.moves === 1 && (await state()).current.score > 0);
  await freshFixture('ice');
  check('double-ice level renders 12 layered ice tiles', await page.locator('.tile.ice-2').count() === 12);
  await click('hammer'); await cell(18).click();
  await stable(() => JSON.parse(localStorage.getItem('rail-pop-v1')).inventory.hammer === 2 && !document.querySelector('.popping,.dropping'));
  check('first hammer removes one ice layer', (await state()).current.ice[18] === 1 && (await state()).current.iceCleared === 0);
  await click('hammer'); await cell(18).click();
  await stable(() => JSON.parse(localStorage.getItem('rail-pop-v1')).inventory.hammer === 1 && !document.querySelector('.popping,.dropping'));
  check('second hammer completely melts ice and advances goal', (await state()).current.ice[18] === 0 && (await state()).current.iceCleared >= 1);
  for (const width of [360, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    check(`layout fits ${width}px viewport`, await page.evaluate(() => document.documentElement.scrollWidth === innerWidth));
  }
  await page.setViewportSize({ width: 390, height: 844 });
  const swipe = await page.evaluate(async () => {
    const { Game } = await import('/src/engine.ts');
    return Game.restore(JSON.parse(localStorage.getItem('rail-pop-v1')).current).validMoves()[0];
  });
  const a = await cell(swipe[0]).boundingBox(), b = await cell(swipe[1]).boundingBox();
  const beforeSwipe = (await state()).current.moves;
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 6 }); await page.mouse.up();
  await page.waitForFunction(n => JSON.parse(localStorage.getItem('rail-pop-v1')).current?.moves === n - 1, beforeSwipe);
  check('swipe performs a valid adjacent exchange', (await state()).current.moves === beforeSwipe - 1);
  await page.screenshot({ path: 'artifacts/mobile-ice.png', fullPage: true });
  check('no uncaught browser errors during all flows', errors.length === 0);
  await writeFile('artifacts/browser-report.json', JSON.stringify({ passed: results.length, results, errors }, null, 2));
  console.log(`Completed ${results.length} browser checks.`);
} finally { await browser.close(); }
