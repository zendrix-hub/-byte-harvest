import type { AttemptMode } from '../core/state';
import type { FieldId, Subject } from '../data/types';

export type PanelState =
  | { kind: 'almanac' }
  | { kind: 'session'; ids: string[]; mode: AttemptMode; title: string }
  | { kind: 'field'; field: FieldId }
  | { kind: 'practice'; subject: Subject; area?: string }
  | { kind: 'house' }
  | { kind: 'lesson'; id: string; mode: 'learn' | 'water' }
  | { kind: 'town' };
