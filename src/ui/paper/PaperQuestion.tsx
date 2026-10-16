import { useEffect, useRef, useState } from 'preact/hooks';
import { buzz, sfx } from '../../app/feedback';
import { today, update } from '../../app/store';
import { fmtClock, formatDay } from '../../core/dates';
import { recordPaperAnswer, setCue, tagMiss, type PaperAnswerResult } from '../../core/record';
import type { CropEvent } from '../../core/srs';
import type { AttemptMode } from '../../core/state';
import { LETTERS, PACE_SECONDS, byId, imageUrl, optionCount, sourceLabel, subjectOf } from '../../data/bank';
import { CROP_NAMES, fieldInfo, topicInfo } from '../../data/topics';
import type { Confidence, ErrorTag } from '../../data/types';
import { Button } from '../kit';
import { ImageZoom } from './ImageZoom';
import { PestPicker } from './PestPicker';
import './paper.css';

export interface SessionResult {
  qid: string;
  ok: boolean;
  conf: Confidence;
  event: CropEvent;
  gold: number;
}

const CONFS: [Confidence, string][] = [
  ['S', 'Sure'],
  ['U', 'Unsure'],
  ['G', 'Guess'],
];

type Committed = PaperAnswerResult & { secs: number; conf: Confidence };

interface Props {
  qid: string;
  index: number;
  total: number;
  mode: AttemptMode;
  onNext: (r: SessionResult | null) => void;
}

function EventLine({ event, topic, gold, due }: { event: CropEvent; topic: string; gold: number; due?: string }) {
  const info = topicInfo(topic);
  const crop = CROP_NAMES[info.crop];
  const field = fieldInfo(info.field).name;
  const text =
    event === 'planted'
      ? `🌱 Planted a ${crop} in the ${field}. Water it tomorrow.`
      : event === 'grew'
        ? `💧 Watered! Your ${crop} grew.${due ? ` Next watering: ${formatDay(due)}.` : ''}`
        : event === 'ready'
          ? `✨ Your ${crop} is ready to harvest! Tap it on the farm.`
          : event === 'wilted'
            ? `🥀 Your ${crop} wilted a little. Water it again tomorrow.`
            : event === 'same-day'
              ? 'Already watered today. Come back tomorrow so it grows.'
              : gold > 0
                ? `⭐ +${gold} gold`
                : '';
  return text ? <p class="event">{text}</p> : null;
}

export function PaperQuestion({ qid, index, total, mode, onNext }: Props) {
  const q = byId[qid];
  const letters = LETTERS.slice(0, optionCount(q)) as string[];
  const pace = PACE_SECONDS[subjectOf(qid)];
  const [pick, setPick] = useState<string | null>(null);
  const [conf, setConf] = useState<Confidence | null>(null);
  const [done, setDone] = useState<Committed | null>(null);
  const [tag, setTag] = useState<ErrorTag | null>(null);
  const [zoom, setZoom] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const [secs, setSecs] = useState(0);
  const t0 = useRef(Date.now());

  useEffect(() => {
    if (done) return;
    const timer = setInterval(() => setSecs(Math.round((Date.now() - t0.current) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [done]);

  const commit = () => {
    if (done) {
      onNext({ qid, ok: done.ok, conf: done.conf, event: done.event, gold: done.gold });
      return;
    }
    if (!pick || !conf) return;
    const spent = Math.round((Date.now() - t0.current) / 1000);
    const r = update((s) => recordPaperAnswer(s, { qid, pick, conf, secs: spent, mode, today: today.value, ts: Date.now() }));
    setDone({ ...r, secs: spent, conf });
    sfx(r.ok ? 'right' : 'wrong');
    buzz(r.ok ? 12 : 45);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
      const k = e.key.toLowerCase();
      if (!done && k.length === 1 && letters.includes(k)) setPick(k);
      else if (!done && (k === '1' || k === '2' || k === '3')) setConf(CONFS[Number(k) - 1][0]);
      else if (k === 'enter') {
        e.preventDefault();
        commit();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const shownSecs = done ? done.secs : secs;
  const slow = shownSecs > pace;
  const headline = !done
    ? ''
    : done.ok
      ? done.conf === 'G'
        ? 'Right, but a guess — planted for review'
        : 'Correct!'
      : done.conf === 'S'
        ? 'Sure but wrong — a golden crop to fix first'
        : 'Not quite';

  return (
    <div class="paper-q">
      <div class="q-meta">
        <span>
          {index + 1}/{total} · <span class={`q-clock${slow ? ' over' : ''}`}>{fmtClock(shownSecs)}</span> / {fmtClock(pace)}
        </span>
        <span class="q-src">{sourceLabel(qid)}</span>
      </div>
      <div class="q-topic">
        {q.topic} · {q.sub}
      </div>
      <div class="q-image">
        {imgFailed ? (
          <div class="img-missing" role="alert">
            This question image isn't on this device yet. Go online once, or use House → Download all questions.
          </div>
        ) : (
          <img src={imageUrl(qid)} alt={`Question ${sourceLabel(qid)}`} decoding="async" onClick={() => setZoom(true)} onError={() => setImgFailed(true)} />
        )}
        {!imgFailed && <div class="q-hint">Tap the question to zoom</div>}
      </div>
      <div class="opts" role="group" aria-label="Answer options">
        {letters.map((c) => (
          <button
            type="button"
            key={c}
            class={`opt${pick === c ? ' sel' : ''}${done && c === q.key ? ' right' : ''}${done && c === pick && c !== q.key ? ' wrong' : ''}`}
            aria-pressed={pick === c}
            disabled={!!done}
            onClick={() => {
              setPick(c);
              sfx('tap');
            }}
          >
            {c}
          </button>
        ))}
      </div>
      <div class="confs" role="group" aria-label="Confidence">
        {CONFS.map(([k, label], i) => (
          <button type="button" key={k} class={`conf${conf === k ? ' on' : ''}`} aria-pressed={conf === k} disabled={!!done} onClick={() => setConf(k)}>
            {i + 1} · {label}
          </button>
        ))}
      </div>
      <div class="q-actions">
        {!done && (
          <Button variant="ghost" onClick={() => onNext(null)}>
            Skip
          </Button>
        )}
        <Button onClick={commit} disabled={!done && !(pick && conf)}>
          {done ? (index + 1 < total ? 'Next →' : 'Finish') : 'Commit answer'}
        </Button>
      </div>
      {done && (
        <div class={`feedback ${done.ok ? 'ok' : 'no'}`} aria-live="polite">
          <div class="head">
            {headline} · answer {q.key})
          </div>
          <EventLine event={done.event} topic={q.topic} gold={done.gold} due={done.crop?.due} />
          <p>{q.why}</p>
          {q.trap && (
            <p class="trap">
              <b>Trap:</b> {q.trap}
            </p>
          )}
          {q.cue && (
            <p class="cue">
              <b>Cue:</b> {q.cue}
            </p>
          )}
          {q.note && (
            <p class="keynote">
              <b>Key note:</b> {q.note}
            </p>
          )}
          {!done.ok && (
            <>
              <PestPicker
                value={tag}
                suggest={slow ? 'T' : null}
                onPick={(t) => {
                  setTag(t);
                  update((s) => tagMiss(s, qid, t));
                }}
              />
              <input
                type="text"
                class="cue-in"
                placeholder="My cue that would have caught it (optional)"
                aria-label="My cue"
                onChange={(e) => {
                  const v = (e.target as HTMLInputElement).value;
                  update((s) => setCue(s, qid, v));
                }}
              />
            </>
          )}
        </div>
      )}
      {zoom && <ImageZoom src={imageUrl(qid)} alt={sourceLabel(qid)} onClose={() => setZoom(false)} />}
    </div>
  );
}
