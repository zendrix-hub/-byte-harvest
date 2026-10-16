import { useEffect, useState } from 'preact/hooks';
import { finishRest, resting } from '../app/staminaStore';
import { fmtClock } from '../core/dates';
import { Button } from './kit';
import './stamina.css';

export function RestOverlay() {
  const r = resting.value;
  const [nowMs, setNowMs] = useState(Date.now());
  useEffect(() => {
    if (!r) return;
    setNowMs(Date.now());
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [r]);
  if (!r) return null;
  const left = Math.max(0, Math.ceil((r.until - nowMs) / 1000));
  return (
    <div class="rest-layer" role="dialog" aria-label="Break time">
      <div class="rest-card">
        <svg viewBox="0 0 120 80" width="120" height="80" aria-hidden="true">
          <circle cx="92" cy="22" r="14" fill="#ffd76a" />
          <circle cx="98" cy="18" r="12" fill="#2b3a67" />
          <path d="M10 70Q60 40 110 70Z" fill="#6cc04a" />
          <text x="30" y="40" font-size="16" font-weight="900" fill="#8fa3d9">z</text>
          <text x="42" y="28" font-size="20" font-weight="900" fill="#8fa3d9">z</text>
        </svg>
        <h2>Your farmer needs a break</h2>
        <p>That was 25 focused minutes. Stand up, stretch, drink some water, and look at something far away.</p>
        <div class="rest-clock">{fmtClock(left)}</div>
        <Button block disabled={left > 0} onClick={finishRest}>
          {left > 0 ? 'Resting…' : "I'm back: refill stamina"}
        </Button>
        <button type="button" class="link-btn" onClick={finishRest}>
          Skip this break
        </button>
      </div>
    </div>
  );
}
