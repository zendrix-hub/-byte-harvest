import { useEffect } from 'preact/hooks';
import { Farm } from '../scene/Farm';
import { Hud } from '../ui/Hud';
import { ToastHost } from '../ui/kit';
import { RestOverlay } from '../ui/RestOverlay';
import { useStamina } from './staminaStore';
import { PanelHost } from './panels';
import { openPanel, panel, save, saveFailed, startClock, today, update } from './store';
import '../styles/base.css';

export function App() {
  useEffect(() => startClock(), []);
  useStamina();
  const t = today.value;
  useEffect(() => {
    if (save.value.seenAlmanac === t) return;
    update((s) => {
      s.seenAlmanac = t;
    });
    if (!panel.value) openPanel({ kind: 'almanac' });
  }, [t]);

  const p = panel.value;
  const calm = save.value.settings.batterySaver;
  return (
    <div class={`app${p ? ' has-panel' : ''}${calm ? ' calm' : ''}`}>
      <main class="stage">
        <Farm paused={!!p} />
        <Hud />
      </main>
      {p && <PanelHost panel={p} />}
      {saveFailed.value && (
        <div class="save-warn" role="alert">
          Couldn't save on this device. Export a backup in the House.
        </div>
      )}
      <ToastHost />
      <RestOverlay />
    </div>
  );
}
