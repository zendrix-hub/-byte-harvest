// All strings use the inline markup of qtext.ts (`code`, **bold**, ^{sup}, _{sub}, \n).
export type Check =
  | { t: 'mcq'; q: string; opts: string[]; a: number; why: string } // a = index into opts
  | { t: 'match'; q: string; pairs: [string, string][]; why: string } // correct left→right; UI shuffles the right side
  | { t: 'bucket'; q: string; buckets: string[]; items: [string, number][]; why: string } // item → bucket index
  | { t: 'order'; q: string; steps: string[]; why: string } // correct order; UI shuffles
  | { t: 'numeric'; q: string; a: number; tol?: number; unit?: string; why: string };

// mcq/numeric: number; match: right-index per left row; bucket: bucket per item; order: step indices in chosen order
export type CheckAnswer = number | number[];

export interface Packet {
  id: string; // kebab-case, unique, prefix by topic: bs- ss- sm- pm- al-
  topic: string; // a TOPICS key in the strategy field
  subs: string[]; // bank `sub` values this packet covers (exact strings)
  title: string;
  hook: string; // 1–2 sentences: why the exam cares
  model: string[]; // 3–6 bullet facts
  example: { q: string; steps: string[] }; // worked example
  checks: Check[]; // ≥ 2, at least 2 different `t` values when ≥ 3 checks
  trap?: string; // the classic wrong answer and why
  src: string[]; // ≥ 1, forms in Global Constraints
  qids: string[]; // bank question ids for the subs (practice links)
}
