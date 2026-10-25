import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.log('PAGE ERROR:', e.message));
  page.on('console', m => { if (m.type() === 'error') console.log('CONSOLE ERROR:', m.text().slice(0, 200)); });
  await page.goto('http://localhost:5173');
  await page.waitForSelector('#loading.loaded', { timeout: 30000 });
  await page.waitForTimeout(500);
  await mkdir('artifacts', { recursive: true });
  await page.screenshot({ path: 'artifacts/desktop.png', fullPage: true });
  console.log(await page.evaluate(() => ({ title: document.title, tiles: document.querySelectorAll('button[data-cell]').length, scrollWidth: document.documentElement.scrollWidth, width: innerWidth })));
  console.log(await page.evaluate(() => ({goalsDisplay:getComputedStyle(document.querySelector('#goals')).display,goalItems:[...document.querySelectorAll('.goal-item')].map(el=>({width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height,display:getComputedStyle(el).display})),grid:getComputedStyle(document.querySelector('.game-layout')).gridTemplateColumns})));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'artifacts/mobile.png', fullPage: true });
  console.log(await page.evaluate(() => ({ mobileWidth: innerWidth, scrollWidth: document.documentElement.scrollWidth, board: document.querySelector('#board').getBoundingClientRect().toJSON() })));
} finally { await browser.close(); }
