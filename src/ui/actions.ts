import { buzz, sfx } from '../app/feedback';
import { openPanel, save, showToast, today, update } from '../app/store';
import { dueCrops, harvestCrop, readyCrops } from '../core/srs';
import type { Crop } from '../core/state';
import { topicInfo } from '../data/topics';
import type { FieldId } from '../data/types';

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

export function waterCrop(c: Crop): void {
  if (c.kind !== 'paper') return;
  openPanel({ kind: 'session', ids: [c.ref], mode: 'review', title: 'Watering' });
}

export function waterAll(): void {
  const ids = dueCrops(save.value, today.value)
    .filter((c) => c.kind === 'paper')
    .map((c) => c.ref);
  if (!ids.length) {
    showToast('No thirsty crops right now.');
    return;
  }
  openPanel({ kind: 'session', ids, mode: 'review', title: 'Watering' });
}

export function harvestOne(id: string): number {
  const t = today.value;
  const r = update((s) => harvestCrop(s, id, t));
  if (r.ok) {
    sfx('harvest');
    buzz(20);
    showToast(`Harvested! +${r.gold} gold`);
  }
  return r.gold;
}

export function shipAll(): number {
  const t = today.value;
  const ready = readyCrops(save.value);
  if (!ready.length) {
    showToast('Nothing is ready yet. Water thirsty crops on later days.');
    return 0;
  }
  const gold = update((s) => ready.reduce((sum, c) => sum + harvestCrop(s, c.id, t).gold, 0));
  sfx('harvest');
  buzz(30);
  showToast(`Shipped ${plural(ready.length, 'crop')} · +${gold} gold`);
  return gold;
}

export function waterField(field: FieldId): void {
  const ids = dueCrops(save.value, today.value)
    .filter((c) => c.kind === 'paper' && topicInfo(c.topic).field === field)
    .map((c) => c.ref);
  if (!ids.length) {
    showToast('Nothing thirsty in this field.');
    return;
  }
  openPanel({ kind: 'session', ids, mode: 'review', title: 'Watering' });
}
