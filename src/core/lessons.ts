import type { Confidence } from '../data/types';
import type { Packet } from '../data/lessons/types';
import { capDue } from './dates';
import { applyAnswer, cropId, type CropEvent } from './srs';
import { ensureDay, type Crop, type LessonRun, type SaveData } from './state';

export interface CheckResult {
  ok: boolean;
  conf: Confidence;
}

/**
 * Records one lesson attempt (learn or water) and grows/plants the packet's concept crop.
 * See task brief for the exact ordering of plant / grow / mastery rules.
 */
export function finishLesson(
  s: SaveData,
  p: Pick<Packet, 'id' | 'topic'>,
  results: CheckResult[],
  mode: 'learn' | 'water',
  today: string,
  ts: number,
): { event: CropEvent; run: LessonRun } {
  const solid = results.every((r) => r.ok && r.conf !== 'G');
  const sbw = results.some((r) => !r.ok && r.conf === 'S');
  const right = results.filter((r) => r.ok).length;
  const run: LessonRun = { d: today, right, n: results.length, solid, sbw, mode, ts };

  const existingLog = s.lessons[p.id];
  const isFirstRun = !existingLog;
  const log = existingLog ?? { first: today, runs: [], mastered: false };
  log.runs.push(run);
  s.lessons[p.id] = log;

  if (mode === 'learn' && isFirstRun) ensureDay(s, today).lessons += 1;

  const id = cropId('concept', p.id);
  const crop = s.crops[id];

  if (crop) {
    const outcome = applyAnswer(s, { kind: 'concept', ref: p.id, topic: p.topic, ok: solid, conf: solid ? 'S' : 'U', today });
    if (sbw && outcome.crop) outcome.crop.sbw = true;
    if (outcome.event === 'ready') log.mastered = true;
    return { event: outcome.event, run };
  }

  if (!log.mastered) {
    const fresh: Crop = {
      id, kind: 'concept', ref: p.id, topic: p.topic, stage: 1,
      due: capDue(today, 1), last: today, plantedOn: today, sbw, pest: null,
    };
    s.crops[id] = fresh;
    return { event: 'planted', run };
  }

  return { event: 'none', run };
}

/** 0–5 hearts, floored, from the fraction of packetIds that are mastered. */
export function heartsFor(s: SaveData, packetIds: string[]): number {
  if (packetIds.length === 0) return 0;
  const mastered = packetIds.filter((id) => s.lessons[id]?.mastered).length;
  return Math.floor((5 * mastered) / packetIds.length);
}

/** Count of packetIds that have at least one logged run. */
export function learnedCount(s: SaveData, packetIds: string[]): number {
  return packetIds.filter((id) => !!s.lessons[id]).length;
}
