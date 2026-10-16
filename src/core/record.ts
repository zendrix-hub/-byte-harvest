import { byId } from '../data/bank';
import type { Confidence, ErrorTag } from '../data/types';
import { catchValue } from './economy';
import { applyAnswer, cropId, type CropEvent } from './srs';
import { ensureDay, type Attempt, type AttemptMode, type Crop, type SaveData } from './state';

export interface PaperAnswerInput {
  qid: string;
  pick: string;
  conf: Confidence | null;
  secs: number | null;
  mode: AttemptMode;
  today: string;
  ts: number;
}

export interface PaperAnswerResult {
  ok: boolean;
  event: CropEvent;
  gold: number;
  crop: Crop | null;
}

export const lastAttempt = (s: SaveData, qid: string): Attempt | undefined => {
  const list = s.att[qid];
  return list ? list[list.length - 1] : undefined;
};

export function recordPaperAnswer(s: SaveData, a: PaperAnswerInput): PaperAnswerResult {
  const q = byId[a.qid];
  if (!q) throw new Error(`Unknown question ${a.qid}`);
  const ok = a.pick === q.key;
  (s.att[a.qid] ??= []).push({ d: a.today, p: a.pick, ok, c: a.conf, t: a.secs, tag: null, cue: '', m: a.mode, ts: a.ts });
  const { event, crop } = applyAnswer(s, { kind: 'paper', ref: a.qid, topic: q.topic, ok, conf: a.conf, today: a.today });
  const gold = ok ? catchValue(a.conf) : 0;
  s.gold += gold;
  const day = ensureDay(s, a.today);
  day.answered += 1;
  if (ok) day.correct += 1;
  if (event === 'planted') day.planted += 1;
  day.goldEarned += gold;
  return { ok, event, gold, crop: crop ? { ...crop } : null };
}

export function tagMiss(s: SaveData, qid: string, tag: ErrorTag): void {
  const a = lastAttempt(s, qid);
  if (a && !a.ok) a.tag = tag;
  const crop = s.crops[cropId('paper', qid)];
  if (crop) crop.pest = tag;
}

export function setCue(s: SaveData, qid: string, cue: string): void {
  const a = lastAttempt(s, qid);
  if (a) a.cue = cue.trim().slice(0, 200);
}
