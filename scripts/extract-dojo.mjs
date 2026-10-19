// Usage: node scripts/extract-dojo.mjs [dojo_question_bank.json]  — copies the answer-key bank (no images: questions are built-in text)
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = '/mnt/c/Users/riva.zn/Documents/philnits reviewer';
const bankPath = process.argv[2] ?? join(SRC, 'dojo_question_bank.json');

const bank = JSON.parse(readFileSync(bankPath, 'utf8'));

mkdirSync(join(root, 'src', 'data'), { recursive: true });
writeFileSync(join(root, 'src', 'data', 'bank.json'), JSON.stringify(bank, null, 1) + '\n');
console.log(`Copied ${bank.length} answer-key entries to src/data/bank.json`);
