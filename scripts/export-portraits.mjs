import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage();
  await page.goto('http://localhost:5173');
  await page.waitForSelector('#loading.loaded');
  await page.goto('http://localhost:5173/portrait-studio.html');
  await page.waitForFunction(() => window.generatedPortraits);
  const data = await page.evaluate(() => window.generatedPortraits);
  await mkdir('public/characters', { recursive: true });
  for (const [name, url] of Object.entries(data)) await writeFile(`public/characters/${name}.png`, Buffer.from(url.split(',')[1], 'base64'));
  console.log('Exported', Object.keys(data).length, 'original model portraits');
} finally { await browser.close(); }
