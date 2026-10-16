import { PESTS } from '../../core/economy';
import type { ErrorTag } from '../../data/types';

const ORDER: ErrorTag[] = ['K', 'C', 'N', 'M', 'T'];

interface Props {
  value: ErrorTag | null;
  suggest: ErrorTag | null;
  onPick: (t: ErrorTag) => void;
}

export function PestPicker({ value, suggest, onPick }: Props) {
  return (
    <div class="pest-picker">
      <b>Which pest got this one?</b>
      {suggest && <span class="muted"> Over pace, so maybe Frost?</span>}
      <div class="pests">
        {ORDER.map((t) => (
          <button
            type="button"
            key={t}
            class={`pest${value === t ? ' on' : ''}${suggest === t && value !== t ? ' suggest' : ''}`}
            aria-pressed={value === t}
            onClick={() => onPick(t)}
          >
            <b>
              {t} · {PESTS[t].name}
            </b>
            <small>{PESTS[t].label}</small>
          </button>
        ))}
      </div>
      {value && <p class="muted">Remedy: {PESTS[value].remedy}</p>}
    </div>
  );
}
