import { readdirSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const LIMITS = { js: 120 * 1024, css: 20 * 1024 };
const total = { js: 0, css: 0 };
for (const f of readdirSync('dist/assets')) {
  const ext = f.endsWith('.js') ? 'js' : f.endsWith('.css') ? 'css' : null;
  if (ext) total[ext] += gzipSync(readFileSync(`dist/assets/${f}`)).length;
}
const kb = (n) => (n / 1024).toFixed(1);
console.log(`JS ${kb(total.js)} KB gz (limit ${kb(LIMITS.js)}) · CSS ${kb(total.css)} KB gz (limit ${kb(LIMITS.css)})`);
if (total.js > LIMITS.js || total.css > LIMITS.css) {
  console.error('Bundle budget exceeded');
  process.exit(1);
}
