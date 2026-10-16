import { byId, sourceLabel, subjectOf } from '../data/bank';
import { daysToExam, fmtClock } from './dates';
import { dueCrops } from './srs';
import type { Attempt, SaveData } from './state';

export type Row = Attempt & { id: string };
export type Mastery = 'new' | 'red' | 'yel' | 'grn';

const CONF_WORD = { S: 'sure', U: 'unsure', G: 'guess' } as const;

export function allAttempts(s: SaveData): Row[] {
  return Object.entries(s.att).flatMap(([id, list]) => (byId[id] ? list.map((a) => ({ ...a, id })) : []));
}

const rightOf = (rows: Row[]) => rows.filter((r) => r.ok).length;
const frac = (rows: Row[]) => (rows.length ? `${rightOf(rows)}/${rows.length}` : '–');
const pct = (rows: Row[]) => (rows.length ? `${Math.round((100 * rightOf(rows)) / rows.length)}%` : '–');

export function masteryOf(right: number, n: number): Mastery {
  if (n < 3) return 'new';
  const p = right / n;
  return p < 0.5 ? 'red' : p < 0.8 ? 'yel' : 'grn';
}

export function topicMastery(s: SaveData, topic: string): { right: number; n: number; status: Mastery } {
  const rows = allAttempts(s).filter((r) => byId[r.id].topic === topic);
  const right = rightOf(rows);
  return { right, n: rows.length, status: masteryOf(right, rows.length) };
}

export function weakTopics(s: SaveData): string[] {
  const tally = new Map<string, [number, number]>();
  for (const r of allAttempts(s)) {
    const key = `${subjectOf(r.id)} · ${byId[r.id].topic}`;
    const v = tally.get(key) ?? [0, 0];
    v[1] += 1;
    if (r.ok) v[0] += 1;
    tally.set(key, v);
  }
  return [...tally.entries()]
    .filter(([, [a, n]]) => n >= 2 && a / n < 0.6)
    .sort((x, y) => x[1][0] / x[1][1] - y[1][0] / y[1][1])
    .slice(0, 6)
    .map(([k, [a, n]]) => `${k} ${a}/${n}`);
}

function line(r: Row): string {
  const q = byId[r.id];
  return (
    `${sourceLabel(r.id)} ${q.topic}/${q.sub} picked ${r.p} key ${q.key}` +
    `${r.c ? ` ${CONF_WORD[r.c]}` : ''}${r.t ? ` ${fmtClock(r.t)}` : ''}${r.tag ? ` [${r.tag}]` : ''}${r.cue ? ` cue: ${r.cue}` : ''}`
  );
}

/** Same shape as the Dojo report, so the reviewer-chat workflow keeps working. */
export function diaryReport(s: SaveData, today: string): string {
  const td = allAttempts(s)
    .filter((r) => r.d === today)
    .sort((a, b) => (a.ts ?? 0) - (b.ts ?? 0));
  const half = Math.ceil(td.length / 2);
  const miss = td.filter((r) => !r.ok);
  const crops = Object.values(s.crops);
  const day = s.days[today];
  return [
    `Byte Harvest diary · ${today} · D-${daysToExam(today)}`,
    `Today: ${frac(td)} (A ${frac(td.filter((r) => subjectOf(r.id) === 'A'))}, B ${frac(td.filter((r) => subjectOf(r.id) === 'B'))}) · first half ${pct(td.slice(0, half))} · second half ${pct(td.slice(half))}`,
    `Sure but wrong: ${miss.filter((r) => r.c === 'S').map(line).join('; ') || 'none'}`,
    `Other misses: ${miss.filter((r) => r.c !== 'S').map(line).join('; ') || 'none'}`,
    `Lucky guesses: ${td.filter((r) => r.ok && r.c === 'G').map((r) => sourceLabel(r.id)).join(', ') || 'none'}`,
    `Weak topics (all time): ${weakTopics(s).join(', ') || 'none yet'}`,
    `Farm: ${crops.length} crops (${dueCrops(s, today).length} thirsty, ${crops.filter((c) => c.stage === 3).length} ready) · harvested today ${day?.harvested ?? 0} · gold ${s.gold} · focus ${day?.focusMin ?? 0} min`,
    `Mocks: ${s.mocks.map((m) => `${m.name} ${m.pct}%`).join(', ') || 'none'}`,
  ].join('\n');
}
