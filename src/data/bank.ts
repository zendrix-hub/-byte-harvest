import raw from './bank.json';
import type { BankQuestion, OptionLetter, PaperId, Subject } from './types';

export const BANK = raw as unknown as BankQuestion[];
export const byId: Record<string, BankQuestion> = Object.fromEntries(BANK.map((q) => [q.id, q]));
export const LETTERS: OptionLetter[] = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];
export const PAPERS: Record<PaperId, string> = { '2025S': 'Apr 2025', '2025A': 'Oct 2025', '2026S': 'Apr 2026' };
export const HOLD_PAPER: PaperId = '2026S';
export const PACE_SECONDS: Record<Subject, number> = { A: 90, B: 300 };

export const paperOf = (id: string) => id.split('_')[0] as PaperId;
export const subjectOf = (id: string) => id.split('_')[1] as Subject;
export const numberOf = (id: string) => parseInt(id.split('_')[2].slice(1), 10);
export const sourceLabel = (id: string) => `(${paperOf(id)}, FE, Subject-${subjectOf(id)}, Q${numberOf(id)})`;
export const optionCount = (q: BankQuestion) => Math.max(q.nopt, LETTERS.indexOf(q.key) + 1);
export const imageUrl = (id: string) => `${import.meta.env.BASE_URL}papers/${id}.webp`;
