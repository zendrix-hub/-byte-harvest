import { openPanel, save, today } from '../app/store';
import { daysToExam, formatDay } from '../core/dates';
import { dueCrops } from '../core/srs';
import { waterAll } from './actions';
import { CoinIcon, DropIcon } from './icons';
import { StaminaBar } from './StaminaBar';
import './hud.css';

function countdownLabel(d: number): string {
  if (d > 0) return `D-${d} · Festival`;
  return d === 0 ? 'Festival day!' : 'Festival done';
}

export function Hud() {
  const s = save.value;
  const t = today.value;
  const due = dueCrops(s, t).length;
  return (
    <header class="hud">
      <button type="button" class="hud-date" onClick={() => openPanel({ kind: 'almanac' })} aria-label={`Open almanac: ${formatDay(t)}`}>
        <span class="hud-day">{formatDay(t)}</span>
        <span class="hud-count">{countdownLabel(daysToExam(t))}</span>
      </button>
      <StaminaBar />
      <button type="button" class="hud-chip water" onClick={waterAll} disabled={!due} aria-label={`Water ${due} thirsty crops`}>
        <DropIcon /> {due}
      </button>
      <span class="hud-chip gold" aria-label={`${s.gold} gold`}>
        <CoinIcon /> {s.gold}
      </span>
    </header>
  );
}
