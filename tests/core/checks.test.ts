import { gradeCheck } from '../../src/core/checks';
import type { Check } from '../../src/data/lessons/types';

const mcq: Check = { t: 'mcq', q: 'Pick one', opts: ['a', 'b', 'c'], a: 1, why: 'because' };
const match: Check = {
  t: 'match',
  q: 'Match them',
  pairs: [
    ['L1', 'R1'],
    ['L2', 'R2'],
    ['L3', 'R3'],
  ],
  why: 'because',
};
const bucket: Check = {
  t: 'bucket',
  q: 'Sort them',
  buckets: ['B0', 'B1'],
  items: [
    ['i1', 0],
    ['i2', 1],
    ['i3', 0],
  ],
  why: 'because',
};
const order: Check = { t: 'order', q: 'Order them', steps: ['S1', 'S2', 'S3'], why: 'because' };
const numeric: Check = { t: 'numeric', q: 'How much', a: 2.5, tol: 0.05, why: 'because' };

describe('gradeCheck', () => {
  it('mcq grades by index', () => {
    expect(gradeCheck(mcq, 1)).toBe(true);
    expect(gradeCheck(mcq, 0)).toBe(false);
  });

  it('match needs every row right', () => {
    expect(gradeCheck(match, [1, 0, 2])).toBe(false);
    expect(gradeCheck(match, [0, 1, 2])).toBe(true);
  });

  it('bucket grades every item', () => {
    expect(gradeCheck(bucket, [0, 1, 0])).toBe(true);
    expect(gradeCheck(bucket, [0, 1, 1])).toBe(false);
  });

  it('order compares the full sequence', () => {
    expect(gradeCheck(order, [0, 1, 2])).toBe(true);
    expect(gradeCheck(order, [1, 0, 2])).toBe(false);
  });

  it('numeric honours tol', () => {
    expect(gradeCheck(numeric, 2.54)).toBe(true);
    expect(gradeCheck(numeric, 2.6)).toBe(false);
  });

  it('wrong-shaped answer is false', () => {
    expect(gradeCheck(mcq, [1])).toBe(false);
    expect(gradeCheck(match, [0, 1])).toBe(false);
  });
});
