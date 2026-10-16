import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';

const logo = readFileSync('public/icons/logo.svg', 'utf8').replace('<svg ', '<svg width="100%" height="100%" ');
// Rounded tile for browser/desktop icons; full-bleed square where the launcher applies its own mask.
const targets = [
  { file: 'icon-192.png', size: 192, square: false },
  { file: 'icon-512.png', size: 512, square: false },
  { file: 'apple-touch-icon.png', size: 180, square: true },
  { file: 'maskable-512.png', size: 512, square: true },
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const t of targets) {
  const svg = t.square ? logo.replace('rx="112"', 'rx="0"') : logo;
  await page.setViewportSize({ width: t.size, height: t.size });
  await page.setContent(`<html><body style="margin:0"><div style="width:${t.size}px;height:${t.size}px">${svg}</div></body></html>`);
  await page.screenshot({ path: `public/icons/${t.file}`, omitBackground: !t.square });
}
await browser.close();
console.log('Icons written to public/icons/');
