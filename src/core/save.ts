import { byId } from '../data/bank';
import { LAST_REVIEW_DAY } from './dates';
import { cloneSave, type Attempt, type Crop, type LessonLog, type LessonRun, type MockRecord, type SaveData, type Settings } from './state';

export const SAVE_KEY = 'byteHarvest_v1';
export const CORRUPT_KEY = 'byteHarvest_v1_corrupt';

export function defaultSave(): SaveData {
  return {
    v: 1,
    farmer: 'Farmer',
    att: {},
    crops: {},
    lessons: {},
    harvested: {},
    gold: 0,
    days: {},
    mocks: [],
    hold: true,
    settings: { sound: true, haptics: true, batterySaver: false },
    seenAlmanac: '',
  };
}

type Obj = Record<string, unknown>;
const isObj = (x: unknown): x is Obj => typeof x === 'object' && x !== null && !Array.isArray(x);
const isDate = (x: unknown): x is string => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x);
const num = (x: unknown): number => (typeof x === 'number' && Number.isFinite(x) && x >= 0 ? x : 0);
const tagOf = (x: unknown): Attempt['tag'] => (typeof x === 'string' && /^[KCNMT]$/.test(x) ? (x as Attempt['tag']) : null);
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

function cleanAttempt(x: unknown): Attempt | null {
  if (!isObj(x) || !isDate(x.d) || typeof x.ok !== 'boolean') return null;
  const a: Attempt = {
    d: x.d,
    p: typeof x.p === 'string' ? x.p : '-',
    ok: x.ok,
    c: x.c === 'S' || x.c === 'U' || x.c === 'G' ? x.c : null,
    t: typeof x.t === 'number' && Number.isFinite(x.t) ? x.t : null,
    tag: tagOf(x.tag),
    cue: typeof x.cue === 'string' ? x.cue : '',
    m: x.m === 'review' || x.m === 'mock' || x.m === 'lesson' ? x.m : 'practice',
  };
  if (typeof x.ts === 'number') a.ts = x.ts;
  return a;
}

function cleanCrop(x: unknown): Crop | null {
  if (!isObj(x) || typeof x.id !== 'string' || typeof x.ref !== 'string' || typeof x.topic !== 'string') return null;
  if (x.kind !== 'paper' && x.kind !== 'concept') return null;
  if (!isDate(x.due) || !isDate(x.last) || !isDate(x.plantedOn)) return null;
  const stage = x.stage === 2 || x.stage === 3 ? x.stage : 1;
  return {
    id: x.id, kind: x.kind, ref: x.ref, topic: x.topic, stage,
    due: x.due, last: x.last, plantedOn: x.plantedOn, sbw: x.sbw === true, pest: tagOf(x.pest),
  };
}

function cleanLessonRun(x: unknown): LessonRun | null {
  if (!isObj(x) || !isDate(x.d) || typeof x.right !== 'number' || typeof x.n !== 'number') return null;
  const run: LessonRun = {
    d: x.d,
    right: Math.floor(num(x.right)),
    n: Math.floor(num(x.n)),
    solid: x.solid === true,
    sbw: x.sbw === true,
    mode: x.mode === 'water' ? 'water' : 'learn',
  };
  if (typeof x.ts === 'number') run.ts = x.ts;
  return run;
}

function cleanLessonLog(x: unknown): LessonLog | null {
  if (!isObj(x) || !isDate(x.first) || !Array.isArray(x.runs)) return null;
  const runs = x.runs.map(cleanLessonRun).filter((r): r is LessonRun => r !== null);
  return { first: x.first, runs, mastered: x.mastered === true };
}

function cleanMock(x: unknown): MockRecord | null {
  if (!isObj(x) || !isDate(x.d) || typeof x.name !== 'string') return null;
  if (x.paper !== '2025S' && x.paper !== '2025A' && x.paper !== '2026S') return null;
  if (x.subj !== 'A' && x.subj !== 'B') return null;
  return { d: x.d, name: x.name, paper: x.paper, subj: x.subj, full: x.full === true, score: num(x.score), n: num(x.n), pct: num(x.pct) };
}

/** Accept anything; keep only well-formed parts; fill the rest with defaults. */
export function normalizeSave(raw: unknown): SaveData {
  const s = defaultSave();
  if (!isObj(raw)) return s;
  if (typeof raw.farmer === 'string' && raw.farmer.trim()) s.farmer = raw.farmer.trim().slice(0, 24);
  if (isObj(raw.att)) {
    for (const [id, list] of Object.entries(raw.att)) {
      if (!Array.isArray(list)) continue;
      const clean = list.map(cleanAttempt).filter((a): a is Attempt => a !== null);
      if (clean.length) s.att[id] = clean;
    }
  }
  if (isObj(raw.crops)) {
    for (const [id, c] of Object.entries(raw.crops)) {
      const crop = cleanCrop(c);
      if (crop && crop.id === id) s.crops[id] = crop;
    }
  }
  if (isObj(raw.lessons)) {
    for (const [id, log] of Object.entries(raw.lessons)) {
      const clean = cleanLessonLog(log);
      if (clean) s.lessons[id] = clean;
    }
  }
  if (isObj(raw.harvested)) {
    for (const [topic, n] of Object.entries(raw.harvested)) if (num(n) > 0) s.harvested[topic] = Math.floor(num(n));
  }
  s.gold = Math.floor(num(raw.gold));
  if (isObj(raw.days)) {
    for (const [d, log] of Object.entries(raw.days)) {
      if (!isDate(d) || !isObj(log)) continue;
      s.days[d] = {
        answered: num(log.answered), correct: num(log.correct), planted: num(log.planted),
        harvested: num(log.harvested), goldEarned: num(log.goldEarned), focusMin: num(log.focusMin),
        lessons: num(log.lessons),
      };
    }
  }
  if (Array.isArray(raw.mocks)) s.mocks = raw.mocks.map(cleanMock).filter((m): m is MockRecord => m !== null);
  if (typeof raw.hold === 'boolean') s.hold = raw.hold;
  if (isObj(raw.settings)) {
    const set = raw.settings;
    for (const k of Object.keys(s.settings) as (keyof Settings)[]) {
      const v = set[k];
      if (typeof v === 'boolean') s.settings[k] = v;
    }
  }
  if (isDate(raw.seenAlmanac)) s.seenAlmanac = raw.seenAlmanac;
  return s;
}

export function loadSave(storage: Storage | null): SaveData {
  let raw: string | null = null;
  try {
    raw = storage ? storage.getItem(SAVE_KEY) : null;
  } catch {
    return defaultSave();
  }
  if (!raw) return defaultSave();
  try {
    return normalizeSave(JSON.parse(raw));
  } catch {
    try {
      if (storage && !storage.getItem(CORRUPT_KEY)) storage.setItem(CORRUPT_KEY, raw);
    } catch {
      // Storage is full or blocked; the defaults below still let the game run.
    }
    return defaultSave();
  }
}

export function persistSave(storage: Storage | null, s: SaveData): boolean {
  if (!storage) return false;
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(s));
    return true;
  } catch {
    return false;
  }
}

export function exportSave(s: SaveData, now: Date): string {
  return JSON.stringify({ app: 'byte-harvest', exportedAt: now.toISOString(), save: s });
}

export type ImportResult =
  | { ok: true; kind: 'game' | 'dojo'; save: SaveData; summary: string }
  | { ok: false; error: string };

export function importBackup(current: SaveData, text: string, today: string): ImportResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: "That file isn't valid JSON." };
  }
  if (isObj(data) && data.app === 'byte-harvest' && isObj(data.save)) {
    const save = normalizeSave(data.save);
    return { ok: true, kind: 'game', save, summary: `Restored farm: ${plural(Object.keys(save.crops).length, 'crop')}, ${save.gold} gold.` };
  }
  if (isObj(data) && isObj(data.att) && isObj(data.rev)) return importDojo(current, data, today);
  return { ok: false, error: "That file isn't a Byte Harvest or Dojo backup." };
}

const attemptKey = (a: Attempt) => `${a.d}|${a.p}|${a.ok}|${a.c}|${a.t}|${a.m}`;

/** Merge a FE_PastPaper_Dojo backup ({att, rev, mocks, ...}). Idempotent. */
function importDojo(current: SaveData, data: Obj, today: string): ImportResult {
  const save = cloneSave(current);
  let answers = 0;
  let planted = 0;
  let mocks = 0;
  for (const [id, list] of Object.entries(data.att as Obj)) {
    if (!byId[id] || !Array.isArray(list)) continue;
    const seen = new Set((save.att[id] ?? []).map(attemptKey));
    for (const a of list.map(cleanAttempt)) {
      if (!a || seen.has(attemptKey(a))) continue;
      (save.att[id] ??= []).push(a);
      seen.add(attemptKey(a));
      answers += 1;
    }
  }
  for (const [id, r] of Object.entries(data.rev as Obj)) {
    const q = byId[id];
    const cropKey = `paper:${id}`;
    if (!q || !isObj(r) || save.crops[cropKey]) continue;
    const last = isDate(r.last) ? r.last : today;
    let due = isDate(r.due) ? r.due : today;
    if (due > LAST_REVIEW_DAY && today < LAST_REVIEW_DAY) due = LAST_REVIEW_DAY;
    const history = save.att[id] ?? [];
    save.crops[cropKey] = {
      id: cropKey,
      kind: 'paper',
      ref: id,
      topic: q.topic,
      stage: typeof r.clean === 'number' && r.clean >= 1 ? 2 : 1,
      due,
      last,
      plantedOn: last,
      sbw: r.sbw === true,
      pest: history[history.length - 1]?.tag ?? null,
    };
    planted += 1;
  }
  if (Array.isArray(data.mocks)) {
    for (const m of data.mocks.map(cleanMock)) {
      if (!m || save.mocks.some((x) => x.d === m.d && x.name === m.name && x.score === m.score)) continue;
      save.mocks.push(m);
      mocks += 1;
    }
  }
  return {
    ok: true,
    kind: 'dojo',
    save,
    summary: `Dojo import: ${plural(answers, 'answer')}, ${plural(planted, 'crop')} planted, ${plural(mocks, 'mock')}.`,
  };
}
