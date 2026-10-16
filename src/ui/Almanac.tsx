import { closePanel, openPanel, save, today } from '../app/store';
import { daysToExam, formatDay } from '../core/dates';
import { dueCrops, readyCrops } from '../core/srs';
import { PLAN, planFor, type Suggestion } from '../data/plan';
import { waterAll } from './actions';
import { Button, Chip, Panel } from './kit';
import './almanac.css';

function run(sg: Suggestion) {
  if (sg.kind === 'water') waterAll();
  else if (sg.kind === 'practice') openPanel({ kind: 'practice', subject: sg.subject, area: sg.area });
  else openPanel({ kind: 'house' });
}

function countdown(d: number): string {
  if (d > 1) return `${d} days to the Harvest Festival`;
  if (d === 1) return 'The Harvest Festival is tomorrow!';
  if (d === 0) return 'Harvest Festival — today! You trained for this.';
  return 'The festival has passed. Well farmed!';
}

export function AlmanacPanel() {
  const s = save.value;
  const t = today.value;
  const plan = planFor(t);
  const thirsty = dueCrops(s, t).length;
  const ready = readyCrops(s).length;
  return (
    <Panel title="Almanac" onClose={closePanel}>
      <div class={`almanac-hero mood-${plan.mood}`}>
        <div class="almanac-date">{formatDay(t)}</div>
        <div class="almanac-count">{countdown(daysToExam(t))}</div>
      </div>
      <div class="cal-strip" role="list" aria-label="Days to the festival">
        {PLAN.map((p) => (
          <div
            role="listitem"
            key={p.date}
            class={`cal-day mood-${p.mood}${p.date === t ? ' today' : p.date < t ? ' past' : ''}`}
            title={`${formatDay(p.date)} · ${p.title}`}
          >
            <span class="wd">{formatDay(p.date).slice(0, 3)}</span>
            <span class="dn">{Number(p.date.slice(8))}</span>
          </div>
        ))}
      </div>
      <div class="card">
        <h3>{plan.title}</h3>
        <p class="muted">{plan.focus}</p>
        <ol class="tasks">
          {plan.tasks.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ol>
        {plan.suggest.length > 0 && (
          <div class="row">
            {plan.suggest.map((sg) => (
              <Button key={sg.label} onClick={() => run(sg)}>
                {sg.label}
              </Button>
            ))}
          </div>
        )}
      </div>
      <div class="card">
        <h3>Your farm this morning</h3>
        <div class="row">
          <Chip tone="blue">{thirsty} thirsty</Chip>
          <Chip tone="gold">{ready} ready to harvest</Chip>
          <Chip>{Object.keys(s.crops).length} crops growing</Chip>
          <Chip tone="gold">{s.gold} gold</Chip>
        </div>
        <p class="muted">Thirsty crops are earlier misses coming back. Water them before you fish for new questions.</p>
      </div>
    </Panel>
  );
}
