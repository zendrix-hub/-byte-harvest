import type { Confidence, ErrorTag } from '../data/types';
import type { Crop } from './state';

/** Gold for a correct past-paper answer. Gold is motivation only; it never buys answers. */
export function catchValue(conf: Confidence | null): number {
  return conf === 'S' ? 5 : conf === 'U' ? 3 : conf === 'G' ? 1 : 2;
}

export function harvestValue(c: Crop): number {
  return c.kind === 'paper' ? 25 + (c.sbw ? 15 : 0) : 15;
}

export interface PestInfo {
  name: string;
  label: string;
  remedy: string;
}

export const PESTS: Record<ErrorTag, PestInfo> = {
  K: { name: 'Blight', label: 'Concept gap', remedy: 'Re-read why + trap, then write the rule in one line.' },
  C: { name: 'Beetle', label: 'Calculation slip', remedy: 'Redo it slowly on paper and check the units.' },
  N: { name: 'Weed', label: 'Notation', remedy: 'Circle the notation first: ←, =, mod, 1-based arrays.' },
  M: { name: 'Mole', label: 'Misread / lost state', remedy: 'Underline what is asked; keep a trace table for loops.' },
  T: { name: 'Frost', label: 'Too slow', remedy: 'Flag and move on after ~2 min (A) or ~6 min (B).' },
};
