import { useState } from 'preact/hooks';
import { closePanel } from '../../app/store';
import type { CropEvent } from '../../core/srs';
import type { AttemptMode } from '../../core/state';
import { sourceLabel } from '../../data/bank';
import { Button, Panel } from '../kit';
import { PaperQuestion, type SessionResult } from './PaperQuestion';

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

export function SessionSummary({ results, total }: { results: SessionResult[]; total: number }) {
  const right = results.filter((r) => r.ok).length;
  const half = Math.ceil(results.length / 2);
  const pct = (a: SessionResult[]) => (a.length ? Math.round((100 * a.filter((r) => r.ok).length) / a.length) : 0);
  const first = pct(results.slice(0, half));
  const second = pct(results.slice(half));
  const sbw = results.filter((r) => !r.ok && r.conf === 'S');
  const lucky = results.filter((r) => r.ok && r.conf === 'G');
  const count = (e: CropEvent) => results.filter((r) => r.event === e).length;
  const gold = results.reduce((g, r) => g + r.gold, 0);
  const drop = results.length >= 6 && second <= first - 20;
  const skipped = total - results.length;
  const lines = [
    count('planted') ? `🌱 ${plural(count('planted'), 'seed')} planted from misses — water tomorrow` : '',
    count('grew') ? `💧 ${plural(count('grew'), 'crop')} grew` : '',
    count('ready') ? `✨ ${plural(count('ready'), 'crop')} ready to harvest` : '',
    count('wilted') ? `🥀 ${plural(count('wilted'), 'crop')} wilted — thirsty again tomorrow` : '',
  ].filter(Boolean);
  return (
    <div class="summary">
      <div class="card center">
        <div class="summary-big">
          {right}/{results.length}
        </div>
        <div class="muted">
          {skipped > 0 ? `${skipped} skipped · ` : ''}+{gold} gold
        </div>
        {results.length >= 4 && (
          <p class="muted">
            First half {first}% · second half {second}%{drop ? ' · late drop: take a break before the next set' : ''}
          </p>
        )}
      </div>
      <div class="card">
        <h3>On the farm</h3>
        <ul class="events">{lines.length ? lines.map((l) => <li key={l}>{l}</li>) : <li>All clean — nothing new to tend.</li>}</ul>
      </div>
      {sbw.length > 0 && (
        <div class="card warn">
          <h3>Sure but wrong ({sbw.length})</h3>
          <p class="muted">{sbw.map((r) => sourceLabel(r.qid)).join(', ')}. These are golden crops: fix them first.</p>
        </div>
      )}
      {lucky.length > 0 && <p class="muted">Lucky guesses ({lucky.length}) count as not learned, so they were planted too.</p>}
      <Button block onClick={closePanel}>
        Back to the farm
      </Button>
    </div>
  );
}

export function Session({ ids, mode, title }: { ids: string[]; mode: AttemptMode; title: string }) {
  const [i, setI] = useState(0);
  const [results, setResults] = useState<SessionResult[]>([]);
  const body = !ids.length ? (
    <div class="card">
      <p>No questions here right now.</p>
    </div>
  ) : i >= ids.length ? (
    <SessionSummary results={results} total={ids.length} />
  ) : (
    <PaperQuestion
      key={ids[i]}
      qid={ids[i]}
      index={i}
      total={ids.length}
      mode={mode}
      onNext={(r) => {
        if (r) setResults((rs) => [...rs, r]);
        setI((x) => x + 1);
      }}
    />
  );
  return (
    <Panel title={title} onClose={closePanel}>
      {body}
    </Panel>
  );
}
