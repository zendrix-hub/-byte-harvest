import { useState } from 'preact/hooks';
import { closePanel, openPanel, save, showToast } from '../../app/store';
import { buildPool, isHeld, pickSet, type PracticeOrder } from '../../core/practice';
import { BANK, HOLD_PAPER, PAPERS, subjectOf } from '../../data/bank';
import type { PaperId, Subject } from '../../data/types';
import { Button, Panel } from '../kit';
import './activities.css';

const topicsOf = (subject: Subject) => [...new Set(BANK.filter((q) => subjectOf(q.id) === subject).map((q) => q.topic))].sort();

const AREAS: Record<Subject, [string, string][]> = {
  A: [
    ['*', 'All topics'],
    ['strategy', '★ Market Garden — strategy & management'],
    ['tech', 'Tech Orchard — hardware, OS, network, logic'],
    ['devdb', 'Greenhouse — development & database'],
    ['security', 'Thorn Hedge — security'],
    ...topicsOf('A').map((t): [string, string] => [t, t]),
  ],
  B: [
    ['*', 'All Subject B'],
    ['code', 'Code Garden — programming (16 of 20)'],
    ['security', 'Thorn Hedge — security scenarios (4 of 20)'],
    ...topicsOf('B')
      .filter((t) => t !== 'Security')
      .map((t): [string, string] => [t, t]),
  ],
};

const PAPER_IDS = Object.keys(PAPERS) as PaperId[];
const valueOf = (e: Event) => (e.target as HTMLSelectElement).value;

export function PracticePanel({ subject, area: initialArea }: { subject: Subject; area?: string }) {
  const s = save.value;
  const isA = subject === 'A';
  const [paper, setPaper] = useState<PaperId | '*'>('*');
  const [area, setArea] = useState(initialArea ?? '*');
  const [size, setSize] = useState(10);
  const [order, setOrder] = useState<PracticeOrder>('smart');
  const filter = { subject, paper, topic: area };
  const pool = buildPool(s, filter);
  const seen = pool.filter((q) => s.att[q.id]?.length).length;
  const held = BANK.filter((q) => subjectOf(q.id) === subject && isHeld(s, q)).length;

  const start = () => {
    const ids = pickSet(s, filter, size, order, Math.random);
    if (!ids.length) {
      showToast('No questions match. Try another filter.');
      return;
    }
    openPanel({ kind: 'session', ids, mode: 'practice', title: isA ? 'Fishing' : 'Mining' });
  };

  return (
    <Panel title={isA ? 'Pond · Subject A' : 'Mine · Subject B'} onClose={closePanel}>
      <div class={`practice-hero ${isA ? 'pond' : 'mine'}`}>
        <b>{isA ? 'Cast for real past-paper questions' : 'Dig into real Subject B questions'}</b>
        <span>
          {isA
            ? 'About 90 seconds each. Every miss becomes a seed on your farm.'
            : 'About 5 minutes each; bail out of a trace after ~7. Misses grow in the Code Garden.'}
        </span>
      </div>
      <div class="card">
        <label class="field-row">
          Paper
          <select value={paper} onChange={(e) => setPaper(valueOf(e) as PaperId | '*')}>
            <option value="*">All papers</option>
            {PAPER_IDS.map((p) => (
              <option key={p} value={p}>
                {p} · {PAPERS[p]}
                {p === HOLD_PAPER && held ? ' (held for the mock)' : ''}
              </option>
            ))}
          </select>
        </label>
        <label class="field-row">
          Area
          <select value={area} onChange={(e) => setArea(valueOf(e))}>
            {AREAS[subject].map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label class="field-row">
          Size
          <select value={String(size)} onChange={(e) => setSize(Number(valueOf(e)))}>
            {[5, 10, 15, 20].map((n) => (
              <option key={n} value={String(n)}>
                {n} questions
              </option>
            ))}
            <option value="999">All</option>
          </select>
        </label>
        <label class="field-row">
          Order
          <select value={order} onChange={(e) => setOrder(valueOf(e) as PracticeOrder)}>
            <option value="smart">Smart: misses + unseen first</option>
            <option value="shuffle">Shuffle</option>
            <option value="paper">Paper order</option>
          </select>
        </label>
        <p class="muted">
          {pool.length} questions · {seen} seen · {pool.length - seen} new{held ? ` · ${held} held back for the ${HOLD_PAPER} mock` : ''}
        </p>
        <Button block onClick={start} disabled={!pool.length}>
          {isA ? 'Cast the line' : 'Start mining'}
        </Button>
      </div>
    </Panel>
  );
}
