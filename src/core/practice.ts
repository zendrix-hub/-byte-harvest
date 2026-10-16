import { BANK, HOLD_PAPER, paperOf, subjectOf } from '../data/bank';
import { topicInfo } from '../data/topics';
import type { BankQuestion, FieldId, PaperId, Subject } from '../data/types';
import { shuffle, type Rng } from './rng';
import type { SaveData } from './state';

export type PracticeOrder = 'smart' | 'shuffle' | 'paper';

/** topic: '*' (all), a FieldId ('strategy', 'tech', 'security', 'devdb', 'code') or an exact bank topic. */
export interface PoolFilter {
  subject: Subject | '*';
  paper: PaperId | '*';
  topic: string;
}

const FIELD_IDS: readonly string[] = ['strategy', 'tech', 'security', 'devdb', 'code'] satisfies FieldId[];

export const mockDone = (s: SaveData, paper: PaperId, subj: Subject) =>
  s.mocks.some((m) => m.paper === paper && m.subj === subj && m.full);

export const isHeld = (s: SaveData, q: BankQuestion) =>
  s.hold && paperOf(q.id) === HOLD_PAPER && !mockDone(s, HOLD_PAPER, subjectOf(q.id));

export function topicMatches(q: BankQuestion, topic: string): boolean {
  if (topic === '*') return true;
  if (FIELD_IDS.includes(topic)) return topicInfo(q.topic).field === topic;
  return q.topic === topic;
}

export function buildPool(s: SaveData, f: PoolFilter): BankQuestion[] {
  return BANK.filter(
    (q) =>
      (f.subject === '*' || subjectOf(q.id) === f.subject) &&
      (f.paper === '*' || paperOf(q.id) === f.paper) &&
      topicMatches(q, f.topic) &&
      !isHeld(s, q),
  );
}

/** 0 sure-but-wrong last time · 1 missed or guessed · 2 unseen · 3 answered solidly. */
export function tierOf(s: SaveData, q: BankQuestion): 0 | 1 | 2 | 3 {
  const list = s.att[q.id];
  const last = list?.[list.length - 1];
  if (!last) return 2;
  if (!last.ok && last.c === 'S') return 0;
  if (!last.ok || last.c === 'G') return 1;
  return 3;
}

export function pickSet(s: SaveData, f: PoolFilter, size: number, order: PracticeOrder, rng: Rng): string[] {
  let pool = buildPool(s, f);
  if (order === 'paper') pool = [...pool].sort((a, b) => a.id.localeCompare(b.id));
  else if (order === 'shuffle') pool = shuffle(pool, rng);
  else pool = shuffle(pool, rng).sort((a, b) => tierOf(s, a) - tierOf(s, b));
  return pool.slice(0, size).map((q) => q.id);
}
