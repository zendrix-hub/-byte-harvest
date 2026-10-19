import { existsSync, readFileSync } from 'node:fs';
import { BANK, optionCount } from '../../src/data/bank';
import type { Block, QuestionText } from '../../src/data/qtext';

const LETTERS = 'abcdefghij';
const files = ['2025S_A', '2025S_B', '2025A_A', '2025A_B', '2026S_A', '2026S_B'];
const all: Record<string, QuestionText> = {};
for (const f of files) {
  const path = `src/data/questions/${f}.json`;
  if (existsSync(path)) Object.assign(all, JSON.parse(readFileSync(path, 'utf8')));
}

const blocks = (q: QuestionText): Block[] => [...q.stem, ...(q.opts ?? []).flatMap((o) => o.b)];

describe('built-in question text', () => {
  it('has text for every one of the 240 questions', () => {
    const missing = BANK.filter((q) => !all[q.id]).map((q) => q.id);
    expect(missing).toEqual([]);
  });

  it('has exactly the printed option letters for every question', () => {
    for (const q of BANK) {
      const t = all[q.id];
      if (!t) continue;
      const letters = (t.opts?.map((o) => o.k) ?? t.optTable?.rows.map((r) => r.k) ?? []).join('');
      expect(letters, q.id).toBe(LETTERS.slice(0, optionCount(q)));
    }
  });

  it('uses only known block types, never images, and only safe figures', () => {
    for (const t of Object.values(all)) {
      for (const b of blocks(t)) {
        expect(['p', 'note', 'code', 'list', 'table', 'svg'], t.id).toContain(b.t);
        if (b.t === 'svg') {
          expect(b.svg, t.id).toMatch(/^<svg[\s\S]*viewBox[\s\S]*<\/svg>$/);
          expect(b.svg, t.id).not.toMatch(/<script|<foreignObject|<image|\son[a-z]+=/i);
        }
      }
      expect(JSON.stringify(t), t.id).not.toMatch(/\.webp|data:image/);
    }
  });
});
