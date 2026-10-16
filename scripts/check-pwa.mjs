import { existsSync, readFileSync } from 'node:fs';

const fail = (msg) => {
  console.error(`PWA check failed: ${msg}`);
  process.exit(1);
};

for (const f of [
  'dist/sw.js',
  'dist/manifest.webmanifest',
  'dist/icons/icon-192.png',
  'dist/icons/icon-512.png',
  'dist/icons/maskable-512.png',
  'dist/papers/2025S_A_Q01.webp',
]) {
  if (!existsSync(f)) fail(`missing ${f}`);
}
const sw = readFileSync('dist/sw.js', 'utf8');
if (sw.includes('.webp')) fail('question images must not be precached (they are cached on demand)');
if (!sw.includes('papers')) fail('the "papers" runtime cache is missing');
const manifest = JSON.parse(readFileSync('dist/manifest.webmanifest', 'utf8'));
if (manifest.start_url !== '/-byte-harvest/') fail(`start_url is ${manifest.start_url}`);
if (manifest.display !== 'standalone') fail('display must be standalone');
console.log('PWA check passed');
