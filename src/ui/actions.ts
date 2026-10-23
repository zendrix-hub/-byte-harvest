import { buzz, sfx } from '../app/feedback';
import { openPanel, save, showToast, today, update } from '../app/store';
import { dueCrops, harvestCrop, readyCrops } from '../core/srs';
import type { Crop } from '../core/state';
import { getPacket, loadPackets } from '../data/lessons';
import { topicInfo } from '../data/topics';
import type { FieldId } from '../data/types';

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** Opens the first of `cands` whose packet still exists (in the given order), skipping any that
 * have been removed from the content instead of giving up on the whole batch. Shows the
 * "no longer available" toast only once none of them exist. */
function openFirstKnownConceptCrop(cands: Crop[]): void {
  void loadPackets()
    .then(() => {
      const known = cands.find((c) => getPacket(c.ref));
      if (!known) {
        showToast('That lesson is no longer available — harvest or leave it.');
        return;
      }
      openPanel({ kind: 'lesson', id: known.ref, mode: 'water' });
    })
    .catch(() => showToast("Couldn't load lessons — check your connection and try again."));
}

function openPaperSession(paper: Crop[], concept: Crop[]): void {
  openPanel({ kind: 'session', ids: paper.map((c) => c.ref), mode: 'review', title: 'Watering' });
  if (concept.length) showToast(`${plural(concept.length, 'lesson crop')} ${concept.length === 1 ? 'is' : 'are'} thirsty too — see Town`);
}

export function waterCrop(c: Crop): void {
  if (c.kind === 'paper') {
    openPanel({ kind: 'session', ids: [c.ref], mode: 'review', title: 'Watering' });
    return;
  }
  openFirstKnownConceptCrop([c]);
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
    openFirstKnownConceptCrop(concept);
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
    openFirstKnownConceptCrop(concept);
    return;
  }
  showToast('Nothing thirsty in this field.');
}
