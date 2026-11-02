import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

// Run against a production build served by `npm run preview -- --port 4186 --strictPort`.
const base = process.env.GAME_URL || 'http://127.0.0.1:4186/';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = [];
await mkdir('artifacts', {recursive:true});
const check = (name, pass) => { assert.ok(pass, name); results.push(name); console.log('PASS', name); };
try {
  const context = await browser.newContext({ viewport: { width:390,height:844 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const session = await context.newCDPSession(page);
  await session.send('Network.enable');
  await session.send('Network.setCacheDisabled', { cacheDisabled:true });
  await session.send('Network.emulateNetworkConditions', {offline:false,latency:150,downloadThroughput:200*1024,uploadThroughput:100*1024});
  await page.goto(base, { waitUntil:'domcontentloaded' });
  await page.waitForSelector('#loading.loaded', { timeout:15000 });
  const report = await page.evaluate(() => ({
    readyMs:performance.now(),
    resources:performance.getEntriesByType('resource').map(r => ({name:r.name,bytes:r.encodedBodySize})),
    decoded:[...document.querySelectorAll('.tile img')].every(image=>image.complete&&image.naturalWidth>0),
  }));
  check('cold startup under 5s at 200KB/s and 150ms latency', report.readyMs < 5000);
  check('playable first board has decoded portraits', report.decoded);
  check('startup resources stay under 350KB', report.resources.reduce((n,r)=>n+r.bytes,0) < 350*1024);
  check('no original PNG or celebration GIF on startup', report.resources.every(r=>! /\.(png|gif)(\?|$)/.test(r.name)));
  check('hidden mobile sidebar does not download full portraits', report.resources.every(r=>!r.name.includes('-full.webp')));
  await page.waitForFunction(()=>getComputedStyle(document.querySelector('#loading')).opacity==='0');
  await page.screenshot({path:'artifacts/fast-startup-mobile.png',fullPage:true});
  await context.close();

  const held = await browser.newContext({ viewport: { width:1440,height:1000 } });
  const desktop = await held.newPage();
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const requested = [];
  desktop.on('request', request=>requested.push(request.url()));
  await desktop.route(/(?:-full\.webp|\.gif)(?:\?|$)/, async route => { await gate; await route.continue(); });
  await desktop.goto(base, { waitUntil:'domcontentloaded' });
  await desktop.waitForSelector('#loading.loaded', { timeout:5000 });
  check('slow decoration cannot block the desktop board', await desktop.locator('.tile').count()===25);
  check('expressions wait until the first interaction', !requested.some(url=>url.endsWith('.gif')));
  await desktop.locator('[data-action="hint"]').click();
  await desktop.waitForFunction(()=>document.querySelectorAll('.tile.hint').length===2);
  check('game remains interactive while decoration is stalled', true);
  release();
  await desktop.locator('#hero-bear').evaluate(image=>image.decode());
  await desktop.locator('#hero-usagi').evaluate(image=>image.decode());
  await desktop.waitForFunction(()=>getComputedStyle(document.querySelector('#loading')).opacity==='0');
  await desktop.screenshot({path:'artifacts/fast-startup-desktop.png',fullPage:true});
  await held.close();

  const retry = await browser.newContext();
  const retryPage = await retry.newPage();
  let failed = false;
  await retryPage.route('**/chiikawa.webp', route => {
    if (!failed) { failed = true; return route.abort(); }
    return route.continue();
  });
  await retryPage.goto(base, { waitUntil:'domcontentloaded' });
  await retryPage.locator('#loading button').waitFor();
  check('failed critical image offers a retry', await retryPage.locator('#loading').innerText().then(text=>text.includes('重新加载')));
  await retryPage.locator('#loading button').click();
  await retryPage.waitForSelector('#loading.loaded');
  check('retry recovers the board without reloading the page', await retryPage.locator('.tile img').evaluateAll(images=>images.every(image=>image.complete&&image.naturalWidth>0)));
  check('no uncaught startup exceptions', errors.length===0);
  await retry.close();
  await mkdir('artifacts', {recursive:true});
  await writeFile('artifacts/startup-report.json', JSON.stringify({results,...report,errors},null,2));
  console.log(`Completed ${results.length} startup checks. Cold ready: ${Math.round(report.readyMs)}ms`);
} finally { await browser.close(); }
