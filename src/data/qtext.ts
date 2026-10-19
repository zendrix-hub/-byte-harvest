import { signal } from '@preact/signals';
import type { OptionLetter } from './types';

/** Structured, built-in question text (see docs: question-text format). Inline strings use a tiny markup:
 * `code`, **bold**, ^{sup}, _{sub}, ~{overline}, [[A]] answer blank, \n line break. */
export type Block =
  | { t: 'p'; x: string }
  | { t: 'note'; x: string }
  | { t: 'code'; x: string }
  | { t: 'list'; items: string[] }
  | { t: 'table'; rows: string[][]; head?: number }
  | { t: 'svg'; svg: string; alt: string };

export interface QuestionText {
  id: string;
  stem: Block[];
  opts?: { k: OptionLetter; b: Block[] }[];
  optTable?: { head: string[]; rows: { k: OptionLetter; c: string[] }[] };
}

export type PaperKey = `${'2025S' | '2025A' | '2026S'}_${'A' | 'B'}`;

// One lazily loaded chunk per paper and subject keeps the first load small on the phone.
const loaders = import.meta.glob<Record<string, QuestionText>>('./questions/*.json', { import: 'default' });
const cache = new Map<string, Record<string, QuestionText>>();
const pending = new Map<string, Promise<Record<string, QuestionText> | null>>();

/** Bumps whenever a paper finishes loading, so components can re-read the cache. */
export const textVersion = signal(0);

export const paperKeyOf = (id: string) => id.split('_').slice(0, 2).join('_') as PaperKey;

function loadPaper(key: string): Promise<Record<string, QuestionText> | null> {
  const hit = cache.get(key);
  if (hit) return Promise.resolve(hit);
  let p = pending.get(key);
  if (!p) {
    const load = loaders[`./questions/${key}.json`];
    p = load
      ? load().then((data) => {
          cache.set(key, data);
          pending.delete(key);
          textVersion.value++;
          return data;
        })
      : Promise.resolve(null);
    pending.set(key, p);
  }
  return p;
}

export function getQuestionText(id: string): QuestionText | null {
  return cache.get(paperKeyOf(id))?.[id] ?? null;
}

export async function loadQuestionText(id: string): Promise<QuestionText | null> {
  const paper = await loadPaper(paperKeyOf(id));
  return paper?.[id] ?? null;
}

/** Warm the chunks a session will need (e.g. while the first question is on screen). */
export function preloadQuestionText(ids: string[]): Promise<unknown> {
  return Promise.all([...new Set(ids.map(paperKeyOf))].map(loadPaper));
}
