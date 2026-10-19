// Usage: node scripts/build-questions.mjs [jsonDir=/tmp/bh-qwork/json] [--allow-missing]
// Merges one-question-per-file transcriptions into src/data/questions/<paper>_<subject>.json (one lazy chunk each).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const allowMissing = args.includes('--allow-missing');
const dir = args.find((a) => !a.startsWith('--')) ?? '/tmp/bh-qwork/json';
const bank = JSON.parse(readFileSync(join(root, 'src/data/bank.json'), 'utf8'));

const groups = {};
const missing = [];
for (const q of bank) {
  const file = join(dir, `${q.id}.json`);
  const key = q.id.split('_').slice(0, 2).join('_');
  groups[key] ??= {};
  if (!existsSync(file)) {
    missing.push(q.id);
    continue;
  }
  const text = JSON.parse(readFileSync(file, 'utf8'));
  if (text.id !== q.id) throw new Error(`${file}: id is ${text.id}`);
  groups[key][q.id] = text;
}
if (missing.length && !allowMissing) {
  console.error(`Missing ${missing.length} transcriptions: ${missing.join(', ')}`);
  process.exit(1);
}
const out = join(root, 'src/data/questions');
mkdirSync(out, { recursive: true });
for (const [key, qs] of Object.entries(groups)) writeFileSync(join(out, `${key}.json`), JSON.stringify(qs) + '\n');
console.log(`Wrote ${Object.keys(groups).length} files with ${bank.length - missing.length} questions to src/data/questions/${missing.length ? ` (${missing.length} missing)` : ''}`);
