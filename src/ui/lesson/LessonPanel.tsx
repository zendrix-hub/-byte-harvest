import { useEffect, useRef, useState } from 'preact/hooks';
import { buzz, sfx } from '../../app/feedback';
import { closePanel, openPanel, save, showToast, today, update } from '../../app/store';
import { gradeCheck } from '../../core/checks';
import { type CheckResult, finishLesson } from '../../core/lessons';
import { isHeld } from '../../core/practice';
import type { CropEvent } from '../../core/srs';
import { byId } from '../../data/bank';
import { getPacket, loadPackets, packetsVersion } from '../../data/lessons';
import type { Check, CheckAnswer, Packet } from '../../data/lessons/types';
import { CROP_NAMES, fieldInfo, topicInfo } from '../../data/topics';
import type { Confidence } from '../../data/types';
import { Button, Panel } from '../kit';
import { parseInline } from '../paper/QuestionBody';
import { CheckView } from './CheckView';
import './lesson.css';

const CONFS: [Confidence, string][] = [
  ['S', 'Sure'],
  ['U', 'Unsure'],
  ['G', 'Guess'],
];

/** Small string hash so the shuffle seed is deterministic and changes with the day: used for both
 * learn and water mode, so a learn-mode check order is never a fixed, memorisable sequence. */
function hashSeed(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33 + s.charCodeAt(i)) >>> 0;
  return h >>> 0;
}

function eventLine(event: CropEvent, topic: string): string {
  const info = topicInfo(topic);
  const crop = CROP_NAMES[info.crop];
  const field = fieldInfo(info.field).name;
  switch (event) {
    case 'planted':
      return `🌱 Planted a ${crop} in the ${field}. Water it tomorrow.`;
    case 'grew':
      return `💧 Watered! Your ${crop} grew.`;
    case 'ready':
      return `✨ Your ${crop} is ready to harvest! Tap it on the farm.`;
    case 'wilted':
      return `🥀 Your ${crop} wilted a little. Water it again tomorrow.`;
    case 'same-day':
      return 'Already watered today. Come back tomorrow so it grows.';
    default:
      return '';
  }
}

type Phase = 'hook' | 'model' | 'example' | 'checks' | 'summary';

interface Summary {
  event: CropEvent;
  right: number;
  n: number;
}

interface CheckStepProps {
  check: Check;
  seed: number;
  isLast: boolean;
  onReveal: (result: CheckResult) => void;
  onAdvance: () => void;
}

function CheckStep({ check, seed, isLast, onReveal, onAdvance }: CheckStepProps) {
  const [answer, setAnswer] = useState<CheckAnswer | null>(null);
  const [conf, setConf] = useState<Confidence | null>(null);
  const [revealed, setRevealed] = useState<{ ok: boolean } | null>(null);
  // A ref (not state) so a second Check tap landing before the reveal re-render has applied is
  // still caught: state updates are not guaranteed to be visible to doCheck's own closure yet.
  const revealedRef = useRef(false);

  const doCheck = () => {
    if (revealedRef.current) return;
    if (answer === null || !conf) return;
    revealedRef.current = true;
    const ok = gradeCheck(check, answer);
    setRevealed({ ok });
    sfx(ok ? 'right' : 'wrong');
    buzz(ok ? 12 : 45);
    onReveal({ ok, conf });
  };

  return (
    <div class="card lesson-check">
      <CheckView check={check} seed={seed} locked={!!revealed} onChange={setAnswer} />
      <div class="confs" role="group" aria-label="Confidence">
        {CONFS.map(([k, label]) => (
          <button
            type="button"
            key={k}
            class={`conf${conf === k ? ' on' : ''}`}
            aria-pressed={conf === k}
            disabled={!!revealed}
            onClick={() => setConf(k)}
          >
            {label}
          </button>
        ))}
      </div>
      {!revealed ? (
        <Button block onClick={doCheck} disabled={answer === null || !conf}>
          Check
        </Button>
      ) : (
        <div class={`feedback ${revealed.ok ? 'ok' : 'no'}`} aria-live="polite">
          <div class="head">{revealed.ok ? 'Correct' : 'Not quite'}</div>
          <p>{parseInline(check.why)}</p>
          <Button block onClick={onAdvance}>
            {isLast ? 'See summary' : 'Next check'}
          </Button>
        </div>
      )}
    </div>
  );
}

function practiceIdsFor(p: Packet): string[] {
  const s = save.value;
  return p.qids.filter((qid) => {
    const q = byId[qid];
    return !q || !isHeld(s, q);
  });
}

export function LessonPanel({ id, mode }: { id: string; mode: 'learn' | 'water' }) {
  packetsVersion.value; // re-render once the lesson chunk loads
  useEffect(() => {
    // A flaky/offline chunk fetch must not leave the panel stuck on "Loading lesson…" forever.
    void loadPackets().catch(() => {
      showToast("Couldn't load lessons — check your connection and try again.");
      closePanel();
    });
  }, []);

  const loaded = packetsVersion.value > 0;
  const p = getPacket(id);
  const [phase, setPhase] = useState<Phase>(mode === 'water' ? 'checks' : 'hook');
  const [exampleStep, setExampleStep] = useState(1);
  const [ci, setCi] = useState(0);
  const [summary, setSummary] = useState<Summary | null>(null);
  const resultsRef = useRef<CheckResult[]>([]);

  if (!loaded) {
    return (
      <Panel title="Lesson" onClose={closePanel}>
        <p>Loading lesson…</p>
      </Panel>
    );
  }

  if (!p) {
    return (
      <Panel title="Lesson" onClose={closePanel}>
        <p>This lesson isn't available</p>
      </Panel>
    );
  }

  const seedBase = hashSeed(id + today.value);

  const body = (() => {
    if (phase === 'hook') {
      return (
        <div class="card">
          <p>{parseInline(p.hook)}</p>
          <Button block onClick={() => setPhase('model')}>
            Continue
          </Button>
        </div>
      );
    }
    if (phase === 'model') {
      return (
        <div class="card">
          <ul class="lesson-model">
            {p.model.map((line, i) => (
              <li key={i}>{parseInline(line)}</li>
            ))}
          </ul>
          <Button block onClick={() => setPhase('example')}>
            Continue
          </Button>
        </div>
      );
    }
    if (phase === 'example') {
      const total = p.example.steps.length;
      const done = exampleStep >= total;
      return (
        <div class="card">
          <p class="lesson-example-q">{parseInline(p.example.q)}</p>
          <ol class="lesson-example-steps">
            {p.example.steps.slice(0, exampleStep).map((s, i) => (
              <li key={i}>{parseInline(s)}</li>
            ))}
          </ol>
          {done ? (
            <Button block onClick={() => setPhase('checks')}>
              Start checks
            </Button>
          ) : (
            <Button block onClick={() => setExampleStep((x) => x + 1)}>
              Next step
            </Button>
          )}
        </div>
      );
    }
    if (phase === 'checks') {
      const check = p.checks[ci];
      const isLast = ci === p.checks.length - 1;
      return (
        <CheckStep
          key={ci}
          check={check}
          seed={seedBase + ci}
          isLast={isLast}
          onReveal={(result) => {
            resultsRef.current = [...resultsRef.current, result];
            if (isLast) {
              const { event } = update((s) => finishLesson(s, p, resultsRef.current, mode, today.value, Date.now()));
              setSummary({ event, right: resultsRef.current.filter((r) => r.ok).length, n: resultsRef.current.length });
            }
          }}
          onAdvance={() => {
            if (isLast) setPhase('summary');
            else setCi((x) => x + 1);
          }}
        />
      );
    }
    // summary
    const s = summary as Summary;
    const practiceIds = practiceIdsFor(p);
    return (
      <div class="summary">
        <div class="card center">
          <div class="summary-big">
            {s.right}/{s.n}
          </div>
          {eventLine(s.event, p.topic) && <p class="event">{eventLine(s.event, p.topic)}</p>}
        </div>
        {p.trap && (
          <div class="card warn">
            <h3>Trap</h3>
            <p>{parseInline(p.trap)}</p>
          </div>
        )}
        <div class="card">
          <h3>Sources</h3>
          <ul class="events">
            {p.src.map((src, i) => (
              <li key={i}>{src}</li>
            ))}
          </ul>
        </div>
        {practiceIds.length > 0 && (
          <Button
            block
            variant="blue"
            onClick={() => openPanel({ kind: 'session', ids: practiceIds, mode: 'practice', title: `Practice: ${p.title}` })}
          >
            Practice the past-paper question{practiceIds.length > 1 ? 's' : ''}
          </Button>
        )}
        <Button block onClick={closePanel}>
          Back to the farm
        </Button>
      </div>
    );
  })();

  return (
    <Panel title={p.title} onClose={closePanel}>
      {body}
    </Panel>
  );
}
