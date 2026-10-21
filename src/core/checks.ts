import type { Check, CheckAnswer } from '../data/lessons/types';

const sameLengthEveryIndex = (ans: unknown, len: number): ans is number[] =>
  Array.isArray(ans) && ans.length === len && ans.every((v, i) => v === i);

/** Pure grading for one check. numeric: within tol (default 0) of the correct value. */
export function gradeCheck(c: Check, ans: CheckAnswer): boolean {
  switch (c.t) {
    case 'mcq':
      return typeof ans === 'number' && ans === c.a;
    case 'match':
      return sameLengthEveryIndex(ans, c.pairs.length);
    case 'order':
      return sameLengthEveryIndex(ans, c.steps.length);
    case 'bucket':
      return (
        Array.isArray(ans) &&
        ans.length === c.items.length &&
        ans.every((v, i) => v === c.items[i][1])
      );
    case 'numeric':
      return typeof ans === 'number' && Math.abs(ans - c.a) <= (c.tol ?? 0);
  }
}
