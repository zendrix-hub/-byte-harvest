import { BANK } from '../../src/data/bank';
import { topicInfo } from '../../src/data/topics';
import strategyPackets from '../../src/data/lessons/strategy.json';
import type { Check, Packet } from '../../src/data/lessons/types';

const packets = strategyPackets as unknown as Packet[];

// Controller ruling: widened to allow any Vol.1 section (not just chapter 7), 2- or
// 3-level section numbers, and single-page or page-range citations, since real packets
// cite sections like §3.1.4, §6.2.1 and the past papers go beyond Subject-A alone.
const SRC_RE = /^FE Prep Book Vol\.1 §\d+\.\d+(\.\d+)? pp?\.\d{1,3}(–\d{1,3})?$|^\(20(25|26)[SA], FE, Subject-[AB], Q\d{1,2}\)$/;
const ID_RE = /^(bs|ss|sm|pm|al)-[a-z0-9-]+$/;

const strategyBank = BANK.filter((q) => topicInfo(q.topic).field === 'strategy');

describe('lesson packets (strategy & management)', () => {
  it('every strategy (topic, sub) in the bank is covered', () => {
    const uncovered = strategyBank.filter(
      (q) => !packets.some((p) => p.topic === q.topic && p.subs.includes(q.sub)),
    );
    expect(uncovered.map((q) => `${q.topic} / ${q.sub}`)).toEqual([]);
  });

  it('packets are well-formed', () => {
    const ids = packets.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const p of packets) {
      expect(p.id, p.id).toMatch(ID_RE);
      expect(p.checks.length, p.id).toBeGreaterThanOrEqual(2);

      for (const c of p.checks as Check[]) {
        expect(c.why, `${p.id} ${c.t}`).toBeTruthy();
        switch (c.t) {
          case 'mcq':
            expect(c.opts.length, p.id).toBeGreaterThanOrEqual(3);
            expect(c.a, p.id).toBeGreaterThanOrEqual(0);
            expect(c.a, p.id).toBeLessThan(c.opts.length);
            break;
          case 'match':
            expect(c.pairs.length, p.id).toBeGreaterThanOrEqual(3);
            break;
          case 'bucket':
            expect(c.buckets.length, p.id).toBeGreaterThanOrEqual(2);
            for (const [, bi] of c.items) {
              expect(bi, p.id).toBeGreaterThanOrEqual(0);
              expect(bi, p.id).toBeLessThan(c.buckets.length);
            }
            break;
          case 'order':
            expect(c.steps.length, p.id).toBeGreaterThanOrEqual(3);
            break;
          case 'numeric':
            expect(Number.isFinite(c.a), p.id).toBe(true);
            break;
        }
      }
    }
  });

  it('sources use the allowed forms', () => {
    for (const p of packets) {
      for (const s of p.src) {
        expect(s, p.id).toMatch(SRC_RE);
      }
    }
  });

  it('qids are exact', () => {
    for (const p of packets) {
      const expected = BANK.filter((q) => p.subs.includes(q.sub))
        .map((q) => q.id)
        .sort();
      expect(p.qids, p.id).toEqual(expected);
    }
  });
});
