import { buzz, sfx } from '../app/feedback';
import { openPanel, save, showToast, today, update } from '../app/store';
import { dueCrops, harvestCrop, readyCrops } from '../core/srs';
import type { Crop } from '../core/state';
import { getPacket, loadPackets } from '../data/lessons';
import { topicInfo } from '../data/topics';
import type { FieldId } from '../data/types';

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** Opens a concept crop's lesson in water mode, once its packet is confirmed to still exist. */
function openConceptCrop(c: Crop): void {
  void loadPackets().then(() => {
    if (!getPacket(c.ref)) {
      showToast('That lesson is no longer available — harvest or leave it.');
      return;
    }
    openPanel({ kind: 'lesson', id: c.ref, mode: 'water' });
  });
}

function openPaperSession(paper: Crop[], concept: Crop[]): void {
  openPanel({ kind: 'session', ids: paper.map((c) => c.ref), mode: 'review', title: 'Watering' });
  if (concept.length) showToast(`${concept.length} lesson crops are thirsty too — see Town`);
}

export function waterCrop(c: Crop): void {
  if (c.kind === 'paper') {
    openPanel({ kind: 'session', ids: [c.ref], mode: 'review', title: 'Watering' });
    return;
  }
  openConceptCrop(c);
}

export function waterAll(): void {
  const due = dueCrops(save.value, today.value);
  const paper = due.filter((c) => c.kind === 'paper');
  const concept = due.filter((c) => c.kind === 'concept');
  if (paper.length) {
    openPaperSession(paper, concept);
    return;
  }
  if (concept.length) {
    openConceptCrop(concept[0]);
    return;
  }
  showToast('No thirsty crops right now.');
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
  const due = dueCrops(save.value, today.value).filter((c) => topicInfo(c.topic).field === field);
  const paper = due.filter((c) => c.kind === 'paper');
  const concept = due.filter((c) => c.kind === 'concept');
  if (paper.length) {
    openPaperSession(paper, concept);
    return;
  }
  if (concept.length) {
    openConceptCrop(concept[0]);
    return;
  }
  showToast('Nothing thirsty in this field.');
}
