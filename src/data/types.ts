export type Subject = 'A' | 'B';
export type PaperId = '2025S' | '2025A' | '2026S';
export type OptionLetter = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h' | 'i' | 'j';
export type Confidence = 'S' | 'U' | 'G';
export type ErrorTag = 'K' | 'C' | 'N' | 'M' | 'T';

export interface BankQuestion {
  id: string;
  key: OptionLetter;
  agree: boolean;
  topic: string;
  sub: string;
  nopt: number;
  diff: number;
  why: string;
  trap: string;
  cue?: string;
  note?: string;
}

export type FieldId = 'strategy' | 'tech' | 'security' | 'devdb' | 'code';

export type CropKind =
  | 'sunflower' | 'corn' | 'cabbage' | 'pumpkin' | 'wheat'
  | 'tomato' | 'eggplant' | 'potato' | 'grape' | 'carrot' | 'strawberry' | 'pepper'
  | 'rose' | 'turnip' | 'onion'
  | 'pea' | 'melon' | 'blueberry' | 'mushroom' | 'radish' | 'bean';

export interface TopicInfo {
  field: FieldId;
  crop: CropKind;
}
