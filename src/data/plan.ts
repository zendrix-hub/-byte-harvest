import type { Subject } from './types';

export type Suggestion =
  | { label: string; kind: 'water' }
  | { label: string; kind: 'practice'; subject: Subject; area?: string }
  | { label: string; kind: 'house' };

export interface PlanDay {
  date: string;
  title: string;
  focus: string;
  tasks: string[];
  suggest: Suggestion[];
  mood: 'study' | 'mock' | 'rest' | 'exam';
}

const WATER: Suggestion = { label: 'Water crops', kind: 'water' };

export const PLAN: PlanDay[] = [
  {
    date: '2026-10-16', title: 'Management blitz', mood: 'study',
    focus: 'EVM, critical path, SLA availability, audit, depreciation, licensing',
    tasks: [
      'Water every thirsty crop first',
      'Fish 2 sets in the Market Garden (strategy & management) from 2025S/2025A',
      'Pick a pest for every miss',
      'Sleep in the House, then paste the diary into the reviewer chat',
    ],
    suggest: [WATER, { label: 'Fish: strategy & management', kind: 'practice', subject: 'A', area: 'strategy' }],
  },
  {
    date: '2026-10-17', title: 'Mock day', mood: 'mock',
    focus: 'Full mock: 2026S Subject A (90 min) → 45–60 min break → 2026S Subject B (100 min)',
    tasks: [
      'Take both mocks in FE_PastPaper_Dojo.html → Timed mock',
      'Rate your confidence on every answer',
      'Dojo → Progress → Export backup, then House → Import here: your misses become crops',
    ],
    suggest: [{ label: 'Import Dojo backup', kind: 'house' }],
  },
  {
    date: '2026-10-18', title: 'Mock review', mood: 'study',
    focus: 'Water every mock miss and tag each pest',
    tasks: ['Water all thirsty crops (golden ones first)', 'For each miss: read why + trap, then pick the pest', 'Copy the diary for Monday'],
    suggest: [WATER],
  },
  {
    date: '2026-10-19', title: 'Re-teach the top 3', mood: 'study',
    focus: 'Your three weakest topics (House → Diary → Weak topics)',
    tasks: ['Reviewer chat: re-teach the top 3 missed ideas', 'Fish one set per weak topic', 'Water crops'],
    suggest: [WATER, { label: 'Fish: all topics', kind: 'practice', subject: 'A' }],
  },
  {
    date: '2026-10-20', title: 'Development + Database', mood: 'study',
    focus: 'UML, testing, coverage · normalization, dependencies, GROUP BY/HAVING',
    tasks: ['Water crops', 'Fish 2 sets in the Greenhouse', 'Tag every pest'],
    suggest: [WATER, { label: 'Fish: Greenhouse', kind: 'practice', subject: 'A', area: 'devdb' }],
  },
  {
    date: '2026-10-21', title: 'Subject B speed', mood: 'study',
    focus: 'Data structures + recursion; trace on scrap paper',
    tasks: ['Water crops', 'Mine 2 sets: data structures, recursion', 'Bail out of a trace after ~7 minutes'],
    suggest: [WATER, { label: 'Mine: data structures', kind: 'practice', subject: 'B', area: 'Data structures' }],
  },
  {
    date: '2026-10-22', title: 'Yellow sweep', mood: 'study',
    focus: "Two's complement, subnetting, units, cache/paging · last day of new content",
    tasks: ['Water crops', 'Fish a Tech Orchard set', 'One mixed set'],
    suggest: [WATER, { label: 'Fish: Tech Orchard', kind: 'practice', subject: 'A', area: 'tech' }],
  },
  {
    date: '2026-10-23', title: 'Top 20 + pacing', mood: 'study',
    focus: 'Top 20 missed ideas · pacing strategy · exam checklist · review only',
    tasks: ['Water every crop', 'Read your pest list (House → Diary)', 'No new topics today'],
    suggest: [WATER],
  },
  {
    date: '2026-10-24', title: 'Rest day', mood: 'rest',
    focus: 'Rest. Pencils, eraser, admission card. Sleep early.',
    tasks: ['A light look at golden crops only if you want', 'Pack pencils, eraser, admission card and ID', 'Sleep early'],
    suggest: [],
  },
  {
    date: '2026-10-25', title: 'Harvest Festival — exam day', mood: 'exam',
    focus: 'Answer every question. Flag after ~2 min (A) or ~6 min (B). Blanks score zero.',
    tasks: ['Eat breakfast', 'Bubble in batches of 10', 'Answer everything'],
    suggest: [],
  },
];

export function planFor(date: string): PlanDay {
  if (date <= PLAN[0].date) return PLAN[0];
  const last = PLAN[PLAN.length - 1];
  if (date >= last.date) return last;
  return PLAN.find((p) => p.date === date) ?? PLAN[0];
}
