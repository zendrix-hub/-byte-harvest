import { stamina } from '../app/staminaStore';
import { staminaPct } from '../core/stamina';
import { LeafIcon } from './icons';
import './stamina.css';

export function StaminaBar() {
  const pct = Math.round(staminaPct(stamina.value));
  return (
    <div class="stamina" aria-label={`Stamina ${pct}%`} title="Stamina refills after a short break">
      <LeafIcon />
      <div class="bar">
        <i style={{ width: `${pct}%`, background: pct < 25 ? 'var(--red)' : 'var(--green)' }} />
      </div>
    </div>
  );
}
