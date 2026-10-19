// node render.mjs <id> [...]  — renders /tmp/bh-qwork/json/<id>.json to /tmp/bh-qwork/png/<id>.png (needs LD_LIBRARY_PATH for Chromium)
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { CSS, questionHtml } from './qformat.mjs';

const ids = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 820, height: 600 }, deviceScaleFactor: 1 });
for (const id of ids) {
  try {
    const q = JSON.parse(readFileSync(`/tmp/bh-qwork/json/${id}.json`, 'utf8'));
    const n = Number(id.split('_Q')[1]);
    await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body>${questionHtml(q, n)}</body></html>`);
    await page.locator('article').screenshot({ path: `/tmp/bh-qwork/png/${id}.png` });
    console.log(`rendered /tmp/bh-qwork/png/${id}.png`);
  } catch (e) {
    console.log(`FAIL ${id}: ${e.message}`);
  }
}
await browser.close();
