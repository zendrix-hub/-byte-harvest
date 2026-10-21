import { BANK } from '../../src/data/bank';
import { topicInfo } from '../../src/data/topics';
import strategyPackets from '../../src/data/lessons/strategy.json';
import type { Check, Packet } from '../../src/data/lessons/types';

const packets = strategyPackets as unknown as Packet[];

// Controller ruling (fix round 1): tightened to the forms actually used — every book
// citation is a 3-level Vol.1 section (chapter.section.subsection) with a single 3-digit
// page; no `pp.` range ever appears in the authored content, so that alternative is dropped.
const SRC_RE = /^FE Prep Book Vol\.1 §\d+\.\d+\.\d+ p\.\d{3}$|^\(20(25|26)[SA], FE, Subject-[AB], Q\d{1,2}\)$/;
const ID_RE = /^(bs|ss|sm|pm|al)-[a-z0-9-]+$/;

/** Every rendered (parseInline) string on a packet: title/hook/trap/model/example + per-check text. */
function proseStrings(p: Packet): string[] {
  const out: string[] = [p.title, p.hook];
  if (p.trap) out.push(p.trap);
  out.push(...p.model, p.example.q, ...p.example.steps);
  for (const c of p.checks as Check[]) {
    out.push(c.q, c.why);
    switch (c.t) {
      case 'mcq':
        out.push(...c.opts);
        break;
      case 'match':
        for (const [l, r] of c.pairs) out.push(l, r);
        break;
      case 'bucket':
        out.push(...c.buckets);
        for (const [label] of c.items) out.push(label);
        break;
      case 'order':
        out.push(...c.steps);
        break;
      case 'numeric':
        if (c.unit) out.push(c.unit);
        break;
    }
  }
  return out;
}

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

  it('lesson text uses only supported markup', () => {
    // parseInline (src/ui/paper/QuestionBody.tsx) only understands `code`, **bold**,
    // ^{sup}, _{sub}, ~{overline} and \n — a bare *x* or lone _ renders literally.
    for (const p of packets) {
      for (const s of proseStrings(p)) {
        const withoutBold = s.replace(/\*\*.*?\*\*/g, '');
        // allow `*` only as multiplication, surrounded by spaces/digits (e.g. "3 * 4")
        const withoutMul = withoutBold.replace(/(?<=[\d ])\*(?=[\d ])/g, '');
        expect(withoutMul, `${p.id}: ${s}`).not.toContain('*');

        for (const m of s.matchAll(/_/g)) {
          expect(s[m.index! + 1], `${p.id}: ${s}`).toBe('{');
        }
      }
    }
  });
});
