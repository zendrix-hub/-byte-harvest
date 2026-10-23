import { readdirSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

// The app shell must stay light for the A21s; question text ships as six lazily loaded, precached
// chunks; lesson content (src/data/lessons/*.json) ships as its own lazily loaded, precached chunk.
const LIMITS = { js: 120 * 1024, css: 20 * 1024, questions: 320 * 1024, lessons: 120 * 1024 };
const total = { js: 0, css: 0, questions: 0, lessons: 0 };
const isQuestions = (f) => /^\d{4}[SA]_[AB]-.*\.js$/.test(f);
const isLessons = (f) => /^(strategy|tech|security|devdb|code)-.*\.js$/.test(f);
for (const f of readdirSync('dist/assets')) {
  const kind = f.endsWith('.js') ? (isQuestions(f) ? 'questions' : isLessons(f) ? 'lessons' : 'js') : f.endsWith('.css') ? 'css' : null;
  if (kind) total[kind] += gzipSync(readFileSync(`dist/assets/${f}`)).length;
}
const kb = (n) => (n / 1024).toFixed(1);
console.log(
  `App JS ${kb(total.js)} KB gz (limit ${kb(LIMITS.js)}) · CSS ${kb(total.css)} KB gz (limit ${kb(LIMITS.css)}) · question text ${kb(total.questions)} KB gz (limit ${kb(LIMITS.questions)}) · lessons ${kb(total.lessons)} KB gz (limit ${kb(LIMITS.lessons)})`,
);
if (total.js > LIMITS.js || total.css > LIMITS.css || total.questions > LIMITS.questions || total.lessons > LIMITS.lessons) {
  console.error('Bundle budget exceeded');
  process.exit(1);
}
