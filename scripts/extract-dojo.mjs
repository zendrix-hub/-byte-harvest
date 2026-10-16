// Usage: node scripts/extract-dojo.mjs [dojo.html] [dojo_question_bank.json]
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = '/mnt/c/Users/riva.zn/Documents/philnits reviewer';
const htmlPath = process.argv[2] ?? join(SRC, 'FE_PastPaper_Dojo.html');
const bankPath = process.argv[3] ?? join(SRC, 'dojo_question_bank.json');

const html = readFileSync(htmlPath, 'utf8');
const match = html.match(/const IMG = (\{.*?\});\n/s);
if (!match) throw new Error(`IMG map not found in ${htmlPath}`);
const images = JSON.parse(match[1]);
const bank = JSON.parse(readFileSync(bankPath, 'utf8'));

const outDir = join(root, 'public', 'papers');
mkdirSync(outDir, { recursive: true });
let bytes = 0;
for (const q of bank) {
  const uri = images[q.id];
  if (!uri) throw new Error(`Missing image for ${q.id}`);
  const buf = Buffer.from(uri.split(',', 2)[1], 'base64');
  bytes += buf.length;
  writeFileSync(join(outDir, `${q.id}.webp`), buf);
}
mkdirSync(join(root, 'src', 'data'), { recursive: true });
writeFileSync(join(root, 'src', 'data', 'bank.json'), JSON.stringify(bank, null, 1) + '\n');
console.log(`Extracted ${bank.length} questions and ${Math.round(bytes / 1024)} KB of images into public/papers/`);
