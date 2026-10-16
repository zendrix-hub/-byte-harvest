import type { CropKind, FieldId, TopicInfo } from './types';

export interface FieldInfo {
  id: FieldId;
  name: string;
  blurb: string;
}

export const FIELDS: FieldInfo[] = [
  { id: 'strategy', name: 'Market Garden', blurb: 'Strategy & management · about a third of Subject A in the real papers' },
  { id: 'tech', name: 'Tech Orchard', blurb: 'Hardware, OS, network, numbers & logic, algorithms' },
  { id: 'security', name: 'Thorn Hedge', blurb: 'Security · Subject A plus 4 Subject B questions' },
  { id: 'devdb', name: 'Greenhouse', blurb: 'Development & database' },
  { id: 'code', name: 'Code Garden', blurb: 'Subject B programming (16 of 20 questions)' },
];

export const TOPICS: Record<string, TopicInfo> = {
  'Business strategy': { field: 'strategy', crop: 'sunflower' },
  'System strategy': { field: 'strategy', crop: 'corn' },
  'Service mgmt & audit': { field: 'strategy', crop: 'cabbage' },
  'Project management': { field: 'strategy', crop: 'pumpkin' },
  'Accounting & legal': { field: 'strategy', crop: 'wheat' },
  'Hardware & CPU': { field: 'tech', crop: 'tomato' },
  'OS & software': { field: 'tech', crop: 'eggplant' },
  'System config & reliability': { field: 'tech', crop: 'potato' },
  Network: { field: 'tech', crop: 'grape' },
  'Number & logic': { field: 'tech', crop: 'carrot' },
  'Math & statistics': { field: 'tech', crop: 'strawberry' },
  'Algorithms & data structures': { field: 'tech', crop: 'pepper' },
  Security: { field: 'security', crop: 'rose' },
  Development: { field: 'devdb', crop: 'turnip' },
  Database: { field: 'devdb', crop: 'onion' },
  'Arrays & loops': { field: 'code', crop: 'pea' },
  'Data structures': { field: 'code', crop: 'melon' },
  'Math & bits': { field: 'code', crop: 'blueberry' },
  Recursion: { field: 'code', crop: 'mushroom' },
  'Sorting & searching': { field: 'code', crop: 'radish' },
  Strings: { field: 'code', crop: 'bean' },
};

export const CROP_NAMES: Record<CropKind, string> = {
  sunflower: 'sunflower', corn: 'corn', cabbage: 'cabbage', pumpkin: 'pumpkin', wheat: 'wheat',
  tomato: 'tomato', eggplant: 'eggplant', potato: 'potato', grape: 'grape vine', carrot: 'carrot',
  strawberry: 'strawberry', pepper: 'pepper', rose: 'thorn rose', turnip: 'turnip', onion: 'onion',
  pea: 'pea pod', melon: 'melon', blueberry: 'blueberry', mushroom: 'mushroom', radish: 'radish', bean: 'string bean',
};

const FALLBACK: TopicInfo = { field: 'tech', crop: 'turnip' };

export const topicInfo = (topic: string): TopicInfo => TOPICS[topic] ?? FALLBACK;
export const fieldInfo = (id: FieldId): FieldInfo => FIELDS.find((f) => f.id === id) ?? FIELDS[0];
export const topicsInField = (id: FieldId): string[] => Object.keys(TOPICS).filter((t) => TOPICS[t].field === id);
