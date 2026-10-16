import type { Confidence, ErrorTag, PaperId, Subject } from '../data/types';

export type AttemptMode = 'practice' | 'review' | 'mock' | 'lesson';

export interface Attempt {
  d: string; // local date YYYY-MM-DD
  p: string; // picked letter, '-' when blank
  ok: boolean;
  c: Confidence | null;
  t: number | null; // seconds spent
  tag: ErrorTag | null;
  cue: string;
  m: AttemptMode;
  ts?: number; // epoch ms (game attempts only; Dojo attempts have none)
}

export type CropSource = 'paper' | 'concept';
export type Stage = 1 | 2 | 3;

export interface Crop {
  id: string; // `${kind}:${ref}`
  kind: CropSource;
  ref: string; // question id (or concept id from M2)
  topic: string; // bank topic name
  stage: Stage; // 3 = ready to harvest
  due: string; // next watering day (ignored at stage 3)
  last: string; // day of the last planting / growth / wilt
  plantedOn: string;
  sbw: boolean; // ever sure-but-wrong → golden
  pest: ErrorTag | null;
}

export interface DayLog {
  answered: number;
  correct: number;
  planted: number;
  harvested: number;
  goldEarned: number;
  focusMin: number;
}

export interface MockRecord {
  d: string;
  name: string;
  paper: PaperId;
  subj: Subject;
  full: boolean;
  score: number;
  n: number;
  pct: number;
}

export interface Settings {
  sound: boolean;
  haptics: boolean;
  batterySaver: boolean;
}

export interface SaveData {
  v: 1;
  farmer: string;
  att: Record<string, Attempt[]>;
  crops: Record<string, Crop>;
  harvested: Record<string, number>;
  gold: number;
  days: Record<string, DayLog>;
  mocks: MockRecord[];
  hold: boolean;
  settings: Settings;
  seenAlmanac: string;
}

export const emptyDay = (): DayLog => ({ answered: 0, correct: 0, planted: 0, harvested: 0, goldEarned: 0, focusMin: 0 });

export const ensureDay = (s: SaveData, date: string): DayLog => (s.days[date] ??= emptyDay());

export const cloneSave = (s: SaveData): SaveData => JSON.parse(JSON.stringify(s)) as SaveData;
