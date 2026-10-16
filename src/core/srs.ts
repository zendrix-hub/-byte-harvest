import { topicInfo } from '../data/topics';
import type { Confidence, FieldId } from '../data/types';
import { capDue } from './dates';
import { harvestValue } from './economy';
import { ensureDay, type Crop, type CropSource, type SaveData, type Stage } from './state';

export type CropEvent = 'none' | 'planted' | 'grew' | 'ready' | 'wilted' | 'same-day';

export interface AnswerInput {
  kind: CropSource;
  ref: string;
  topic: string;
  ok: boolean;
  conf: Confidence | null;
  today: string;
}

export interface AnswerOutcome {
  event: CropEvent;
  crop: Crop | null;
}

export const cropId = (kind: CropSource, ref: string) => `${kind}:${ref}`;
export const isShaky = (ok: boolean, conf: Confidence | null) => !ok || conf === 'G';
export const isThirsty = (c: Crop, today: string) => c.stage < 3 && c.due <= today;

/**
 * Misses and lucky guesses plant (or wilt) a crop. A solid answer grows an existing
 * crop only on a later day than its last change: +1 day → stage 2 (+2 days) → ready.
 */
export function applyAnswer(s: SaveData, a: AnswerInput): AnswerOutcome {
  const id = cropId(a.kind, a.ref);
  const crop = s.crops[id];
  if (isShaky(a.ok, a.conf)) {
    const sureWrong = !a.ok && a.conf === 'S';
    if (crop) {
      crop.stage = Math.max(1, crop.stage - 1) as Stage;
      crop.due = capDue(a.today, 1);
      crop.last = a.today;
      crop.sbw = crop.sbw || sureWrong;
      return { event: 'wilted', crop };
    }
    const fresh: Crop = {
      id, kind: a.kind, ref: a.ref, topic: a.topic, stage: 1,
      due: capDue(a.today, 1), last: a.today, plantedOn: a.today, sbw: sureWrong, pest: null,
    };
    s.crops[id] = fresh;
    return { event: 'planted', crop: fresh };
  }
  if (!crop) return { event: 'none', crop: null };
  if (crop.stage === 3) return { event: 'none', crop };
  if (crop.last === a.today) return { event: 'same-day', crop };
  crop.stage = (crop.stage + 1) as Stage;
  crop.last = a.today;
  if (crop.stage === 3) return { event: 'ready', crop };
  crop.due = capDue(a.today, 2);
  return { event: 'grew', crop };
}

export function harvestCrop(s: SaveData, id: string, today: string): { ok: boolean; gold: number } {
  const crop = s.crops[id];
  if (!crop || crop.stage !== 3) return { ok: false, gold: 0 };
  const gold = harvestValue(crop);
  delete s.crops[id];
  s.harvested[crop.topic] = (s.harvested[crop.topic] ?? 0) + 1;
  s.gold += gold;
  const day = ensureDay(s, today);
  day.harvested += 1;
  day.goldEarned += gold;
  return { ok: true, gold };
}

const byPriority = (a: Crop, b: Crop) =>
  Number(b.sbw) - Number(a.sbw) || a.due.localeCompare(b.due) || a.stage - b.stage || a.id.localeCompare(b.id);

export function dueCrops(s: SaveData, today: string): Crop[] {
  return Object.values(s.crops).filter((c) => isThirsty(c, today)).sort(byPriority);
}

export function readyCrops(s: SaveData): Crop[] {
  return Object.values(s.crops).filter((c) => c.stage === 3).sort((a, b) => a.id.localeCompare(b.id));
}

export function cropsInField(s: SaveData, field: FieldId, today: string): Crop[] {
  const rank = (c: Crop) => (c.stage === 3 ? 0 : isThirsty(c, today) ? (c.sbw ? 1 : 2) : 3);
  return Object.values(s.crops)
    .filter((c) => topicInfo(c.topic).field === field)
    .sort((a, b) => rank(a) - rank(b) || a.plantedOn.localeCompare(b.plantedOn) || a.id.localeCompare(b.id));
}
