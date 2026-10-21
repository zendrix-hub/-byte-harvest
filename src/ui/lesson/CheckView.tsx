import { useEffect, useRef, useState } from 'preact/hooks';
import { mulberry32, shuffle } from '../../core/rng';
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
        {order.map((authoredIdx) => (
          <button
            type="button"
            key={authoredIdx}
            class={`chk-mcq-opt${picked === authoredIdx ? ' sel' : ''}`}
            aria-pressed={picked === authoredIdx}
            disabled={locked}
            onClick={() => setPicked(authoredIdx)}
          >
            {parseInline(check.opts[authoredIdx])}
          </button>
        ))}
      </div>
    </div>
  );
}

function MatchCheck({ check, seed, locked, onChange }: Props & { check: Extract<Check, { t: 'match' }> }) {
  const n = check.pairs.length;
  const { leftOrder, rightOrder } = useSeeded(seed, (rng) => ({
    leftOrder: shuffle(range(n), rng),
    rightOrder: shuffle(range(n), rng),
  }));
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
        {leftOrder.map((leftIdx) => (
          <div class="chk-match-row" role="group" aria-label={check.pairs[leftIdx][0]} key={leftIdx}>
            <div class="chk-match-left">{parseInline(check.pairs[leftIdx][0])}</div>
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
          </div>
        ))}
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
        {itemOrder.map((idx) => (
          <div class="chk-bucket-row" role="group" aria-label={check.items[idx][0]} key={idx}>
            <div class="chk-bucket-item">{parseInline(check.items[idx][0])}</div>
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
          </div>
        ))}
      </div>
    </div>
  );
}

function OrderCheck({ check, seed, locked, onChange }: Props & { check: Extract<Check, { t: 'order' }> }) {
  const n = check.steps.length;
  const poolOrder = useSeeded(seed, (rng) => shuffle(range(n), rng));
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
    </div>
  );
}

function parseDecimal(s: string): number | null {
  const trimmed = s.trim();
  if (!trimmed) return null;
  const n = Number(trimmed.replace(/,/g, ''));
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
    </div>
  );
}

/** Collects an answer for one Check; does not grade, reveal `why`, or handle confidence (that's the Lesson panel). */
export function CheckView({ check, seed, locked, onChange }: Props) {
  switch (check.t) {
    case 'mcq':
      return <McqCheck check={check} seed={seed} locked={locked} onChange={onChange} />;
    case 'match':
      return <MatchCheck check={check} seed={seed} locked={locked} onChange={onChange} />;
    case 'bucket':
      return <BucketCheck check={check} seed={seed} locked={locked} onChange={onChange} />;
    case 'order':
      return <OrderCheck check={check} seed={seed} locked={locked} onChange={onChange} />;
    case 'numeric':
      return <NumericCheck check={check} seed={seed} locked={locked} onChange={onChange} />;
  }
}
