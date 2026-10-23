import { useEffect, useRef, useState } from 'preact/hooks';
import { mulberry32, shuffle, type Rng } from '../../core/rng';
import type { Check, CheckAnswer } from '../../data/lessons/types';
import { Button } from '../kit';
import { parseInline } from '../paper/QuestionBody';
import './lesson.css';

interface Props {
  check: Check;
  seed: number;
  locked: boolean;
  onChange: (a: CheckAnswer | null) => void;
}

function range(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i);
}

/** Shuffles, rerolling from the same rng stream until the result matches neither the authored
 * order nor `against` position-for-position. An order check (or a match check's right-hand side)
 * landing on the authored order gives the answer away for free; landing on the same arrangement as
 * `against` (the match check's independently-shuffled left column) does too, at the row level —
 * row i's correct chip would sit in column i even though the two sides were shuffled separately.
 * Bounded to 50 rerolls: empirically sufficient for n >= 3 (the smallest match/order check size
 * this app ships), leaving a vanishingly rare residual collision as the fallback return. */
function shuffleAvoidMatches(arr: number[], rng: Rng, against: number[] = arr): number[] {
  let s = shuffle(arr, rng);
  let guard = 0;
  const bad = (cand: number[]) => cand.every((v, i) => v === arr[i]) || cand.some((v, i) => v === against[i]);
  while (guard++ < 50 && bad(s)) {
    s = shuffle(arr, rng);
  }
  return s;
}

// Gives every distinct Check object a stable identity so it can be used as a Preact `key`:
// when the caller swaps in a new check (even same `t`), the sub-component remounts instead
// of reusing stale answer state from the previous check.
let nextCheckId = 0;
const checkIds = new WeakMap<Check, number>();
function idFor(check: Check): number {
  let id = checkIds.get(check);
  if (id === undefined) {
    id = nextCheckId++;
    checkIds.set(check, id);
  }
  return id;
}

/** Strips the inline markup tokens (`code`, **bold**, ^{sup}, _{sub}, ~{overline}, [[blank]]) to plain text for aria-labels. */
function plainText(s: string): string {
  let out = s;
  let prev: string;
  do {
    prev = out;
    out = out
      .replace(/`([^`]*)`/g, '$1')
      .replace(/\*\*([^*]*)\*\*/g, '$1')
      .replace(/[\^_~]\{([^{}]*)\}/g, '$1')
      .replace(/\[\[([^\]]*)\]\]/g, '$1');
  } while (out !== prev);
  return out.replace(/\n/g, ' ');
}

/** Lazily computes a value from `seed`, recomputing only when `seed` changes (stable across other rerenders). */
function useSeeded<T>(seed: number, build: (rng: () => number) => T): T {
  const ref = useRef<{ seed: number; value: T } | null>(null);
  if (!ref.current || ref.current.seed !== seed) {
    ref.current = { seed, value: build(mulberry32(seed)) };
  }
  return ref.current.value;
}

function McqCheck({ check, seed, locked, onChange }: Props & { check: Extract<Check, { t: 'mcq' }> }) {
  const order = useSeeded(seed, (rng) => shuffle(range(check.opts.length), rng));
  const [picked, setPicked] = useState<number | null>(null);

  useEffect(() => {
    onChange(picked);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked]);

  return (
    <div class="chk chk-mcq">
      <p class="chk-q">{parseInline(check.q)}</p>
      <div class="chk-mcq-opts" role="group" aria-label="Options">
        {order.map((authoredIdx) => {
          const isPicked = picked === authoredIdx;
          const isCorrect = authoredIdx === check.a;
          return (
            <button
              type="button"
              key={authoredIdx}
              class={`chk-mcq-opt${isPicked ? ' sel' : ''}${locked && isCorrect ? ' correct' : ''}${locked && isPicked && !isCorrect ? ' wrong' : ''}`}
              aria-pressed={isPicked}
              disabled={locked}
              onClick={() => setPicked(authoredIdx)}
            >
              {parseInline(check.opts[authoredIdx])}
              {locked && isCorrect && <span class="chk-mark"> ✓</span>}
              {locked && isPicked && !isCorrect && <span class="chk-mark"> ✗</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MatchCheck({ check, seed, locked, onChange }: Props & { check: Extract<Check, { t: 'match' }> }) {
  const n = check.pairs.length;
  // Left and right sides are shuffled from independently derived seeds (not one shared rng stream):
  // sharing a stream can put every row's correct chip at that row's own display column — a free
  // "diagonal" solve that needs no reading at all.
  const { leftOrder, rightOrder } = useSeeded(seed, () => {
    const leftOrder = shuffle(range(n), mulberry32(seed * 2 + 1));
    const rightOrder = shuffleAvoidMatches(range(n), mulberry32(seed * 2 + 2), leftOrder);
    return { leftOrder, rightOrder };
  });
  const [sel, setSel] = useState<Partial<Record<number, number>>>({});

  useEffect(() => {
    const complete = Object.keys(sel).length === n;
    onChange(complete ? range(n).map((i) => sel[i] as number) : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel]);

  return (
    <div class="chk chk-match">
      <p class="chk-q">{parseInline(check.q)}</p>
      <div class="chk-match-rows">
        {leftOrder.map((leftIdx) => {
          const rowOk = sel[leftIdx] === leftIdx;
          return (
            <div
              class={`chk-match-row${locked ? (rowOk ? ' correct' : ' wrong') : ''}`}
              role="group"
              aria-label={plainText(check.pairs[leftIdx][0])}
              key={leftIdx}
            >
              <div class="chk-match-left">
                {parseInline(check.pairs[leftIdx][0])}
                {locked && <span class="chk-mark">{rowOk ? ' ✓' : ' ✗'}</span>}
              </div>
              <div class="chk-chips">
                {rightOrder.map((rightIdx) => (
                  <button
                    type="button"
                    key={rightIdx}
                    class={`chk-chip${sel[leftIdx] === rightIdx ? ' sel' : ''}`}
                    aria-pressed={sel[leftIdx] === rightIdx}
                    disabled={locked}
                    onClick={() => setSel((prev) => ({ ...prev, [leftIdx]: rightIdx }))}
                  >
                    {parseInline(check.pairs[rightIdx][1])}
                  </button>
                ))}
              </div>
              {locked && !rowOk && <div class="chk-key">Correct: {parseInline(check.pairs[leftIdx][1])}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BucketCheck({ check, seed, locked, onChange }: Props & { check: Extract<Check, { t: 'bucket' }> }) {
  const n = check.items.length;
  const itemOrder = useSeeded(seed, (rng) => shuffle(range(n), rng));
  const [picked, setPicked] = useState<Partial<Record<number, number>>>({});

  useEffect(() => {
    const complete = Object.keys(picked).length === n;
    onChange(complete ? range(n).map((i) => picked[i] as number) : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked]);

  return (
    <div class="chk chk-bucket">
      <p class="chk-q">{parseInline(check.q)}</p>
      <div class="chk-bucket-rows">
        {itemOrder.map((idx) => {
          const correctBucket = check.items[idx][1];
          const rowOk = picked[idx] === correctBucket;
          return (
            <div
              class={`chk-bucket-row${locked ? (rowOk ? ' correct' : ' wrong') : ''}`}
              role="group"
              aria-label={plainText(check.items[idx][0])}
              key={idx}
            >
              <div class="chk-bucket-item">
                {parseInline(check.items[idx][0])}
                {locked && <span class="chk-mark">{rowOk ? ' ✓' : ' ✗'}</span>}
              </div>
              <div class="chk-seg">
                {check.buckets.map((label, bIdx) => (
                  <button
                    type="button"
                    key={bIdx}
                    class={`chk-seg-opt${picked[idx] === bIdx ? ' sel' : ''}`}
                    aria-pressed={picked[idx] === bIdx}
                    disabled={locked}
                    onClick={() => setPicked((prev) => ({ ...prev, [idx]: bIdx }))}
                  >
                    {parseInline(label)}
                  </button>
                ))}
              </div>
              {locked && !rowOk && <div class="chk-key">Correct: {parseInline(check.buckets[correctBucket])}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OrderCheck({ check, seed, locked, onChange }: Props & { check: Extract<Check, { t: 'order' }> }) {
  const n = check.steps.length;
  const poolOrder = useSeeded(seed, (rng) => shuffleAvoidMatches(range(n), rng));
  const [seq, setSeq] = useState<number[]>([]);

  useEffect(() => {
    onChange(seq.length === n ? seq : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seq]);

  const remaining = poolOrder.filter((i) => !seq.includes(i));

  return (
    <div class="chk chk-order">
      <p class="chk-q">{parseInline(check.q)}</p>
      {seq.length > 0 && (
        <ol class="chk-order-list">
          {seq.map((idx, i) => (
            <li key={i}>{parseInline(check.steps[idx])}</li>
          ))}
        </ol>
      )}
      <div class="chk-order-pool" role="group" aria-label="Steps">
        {remaining.map((idx) => (
          <button
            type="button"
            key={idx}
            class="chk-order-opt"
            disabled={locked}
            onClick={() => setSeq((prev) => [...prev, idx])}
          >
            {parseInline(check.steps[idx])}
          </button>
        ))}
      </div>
      <Button variant="ghost" small onClick={() => setSeq((prev) => prev.slice(0, -1))} disabled={locked || seq.length === 0}>
        Undo
      </Button>
      {locked && (
        <div class="chk-key">
          <div>Correct order:</div>
          <ol class="chk-order-list">
            {check.steps.map((s, i) => (
              <li key={i}>{parseInline(s)}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

function parseDecimal(s: string): number | null {
  const trimmed = s.trim();
  if (!trimmed) return null;
  // Lets an exam-style answer like "99.5%", "₱1,380" or "$500000" be typed as shown and still parse.
  const stripped = trimmed.replace(/[%₱$,\s]/g, '');
  if (!stripped) return null;
  const n = Number(stripped);
  return Number.isFinite(n) ? n : null;
}

function NumericCheck({ check, locked, onChange }: Props & { check: Extract<Check, { t: 'numeric' }> }) {
  const [raw, setRaw] = useState('');

  useEffect(() => {
    onChange(parseDecimal(raw));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raw]);

  return (
    <div class="chk chk-numeric">
      <p class="chk-q">{parseInline(check.q)}</p>
      <div class="chk-numeric-row">
        <input
          type="text"
          inputMode="decimal"
          class="chk-numeric-in"
          aria-label="Answer"
          value={raw}
          disabled={locked}
          onInput={(e) => setRaw((e.target as HTMLInputElement).value)}
        />
        {check.unit && <span class="chk-unit">{parseInline(check.unit)}</span>}
      </div>
      {locked && (
        <div class="chk-key">
          Answer: {check.a}
          {check.unit ? <> {parseInline(check.unit)}</> : null}
        </div>
      )}
    </div>
  );
}

/** Collects an answer for one Check; does not grade, reveal `why`, or handle confidence (that's the Lesson panel). */
export function CheckView({ check, seed, locked, onChange }: Props) {
  // Keying by the check's own identity (+ seed) forces Preact to unmount/remount the
  // sub-component whenever the caller swaps in a different check, even one of the same
  // `t` and shape, instead of reusing stale per-check answer state.
  const key = `${idFor(check)}:${seed}`;
  switch (check.t) {
    case 'mcq':
      return <McqCheck key={key} check={check} seed={seed} locked={locked} onChange={onChange} />;
    case 'match':
      return <MatchCheck key={key} check={check} seed={seed} locked={locked} onChange={onChange} />;
    case 'bucket':
      return <BucketCheck key={key} check={check} seed={seed} locked={locked} onChange={onChange} />;
    case 'order':
      return <OrderCheck key={key} check={check} seed={seed} locked={locked} onChange={onChange} />;
    case 'numeric':
      return <NumericCheck key={key} check={check} seed={seed} locked={locked} onChange={onChange} />;
  }
}
