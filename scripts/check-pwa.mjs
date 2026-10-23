import { existsSync, readFileSync, readdirSync } from 'node:fs';

const fail = (msg) => {
  console.error(`PWA check failed: ${msg}`);
  process.exit(1);
};

for (const f of ['dist/sw.js', 'dist/manifest.webmanifest', 'dist/icons/icon-192.png', 'dist/icons/icon-512.png', 'dist/icons/maskable-512.png']) {
  if (!existsSync(f)) fail(`missing ${f}`);
}
if (existsSync('dist/papers')) fail('dist/papers must not exist — questions are built-in text, not images');
const sw = readFileSync('dist/sw.js', 'utf8');
if (/\.webp/.test(sw)) fail('no question images may be precached');
const chunks = readdirSync('dist/assets').filter((f) => /^\d{4}[SA]_[AB]-.*\.js$/.test(f));
if (chunks.length !== 6) fail(`expected 6 question-text chunks, found ${chunks.length}: ${chunks.join(', ')}`);
for (const c of chunks) if (!sw.includes(c)) fail(`question chunk ${c} is not precached, so it would not work offline`);
const lessonChunks = readdirSync('dist/assets').filter((f) => /^(strategy|tech|security|devdb|code)-.*\.js$/.test(f));
if (lessonChunks.length !== 1) fail(`expected 1 lessons chunk, found ${lessonChunks.length}: ${lessonChunks.join(', ')}`);
if (!sw.includes(lessonChunks[0])) fail(`lessons chunk ${lessonChunks[0]} is not precached, so it would not work offline`);
const manifest = JSON.parse(readFileSync('dist/manifest.webmanifest', 'utf8'));
if (manifest.start_url !== '/-byte-harvest/') fail(`start_url is ${manifest.start_url}`);
if (manifest.display !== 'standalone') fail('display must be standalone');
console.log(`PWA check passed (${chunks.length} question chunks + ${lessonChunks.length} lessons chunk precached)`);
