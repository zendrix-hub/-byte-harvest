import { closePanel, openPanel, save, today } from '../../app/store';
import { topicMastery, type Mastery } from '../../core/report';
import { cropsInField, isThirsty } from '../../core/srs';
import { CROP_NAMES, TOPICS, fieldInfo, topicsInField } from '../../data/topics';
import type { FieldId } from '../../data/types';
import { cropHref } from '../../scene/art';
import { waterField } from '../actions';
import { Button, Chip, Panel } from '../kit';
import './activities.css';

const STATUS: Record<Mastery, { label: string; tone?: 'red' | 'yel' | 'grn' }> = {
  new: { label: 'NEW' },
  red: { label: 'RED', tone: 'red' },
  yel: { label: 'YELLOW', tone: 'yel' },
  grn: { label: 'GREEN', tone: 'grn' },
};

function PracticeButtons({ field }: { field: FieldId }) {
  if (field === 'code')
    return (
      <Button variant="blue" onClick={() => openPanel({ kind: 'practice', subject: 'B', area: 'code' })}>
        Mine this field
      </Button>
    );
  if (field === 'security')
    return (
      <>
        <Button variant="blue" onClick={() => openPanel({ kind: 'practice', subject: 'A', area: 'security' })}>
          Fish (Subject A)
        </Button>
        <Button variant="blue" onClick={() => openPanel({ kind: 'practice', subject: 'B', area: 'security' })}>
          Mine (Subject B)
        </Button>
      </>
    );
  return (
    <Button variant="blue" onClick={() => openPanel({ kind: 'practice', subject: 'A', area: field })}>
      Fish this field
    </Button>
  );
}

export function FieldPanel({ field }: { field: FieldId }) {
  const s = save.value;
  const t = today.value;
  const info = fieldInfo(field);
  const crops = cropsInField(s, field, t);
  const thirsty = crops.filter((c) => isThirsty(c, t)).length;
  return (
    <Panel title={info.name} onClose={closePanel}>
      <p class="muted">{info.blurb}</p>
      <div class="row field-actions">
        <Button onClick={() => waterField(field)} disabled={!thirsty}>
          Water this field ({thirsty})
        </Button>
        <PracticeButtons field={field} />
      </div>
      <ul class="topic-list">
        {topicsInField(field).map((topic) => {
          const m = topicMastery(s, topic);
          const mine = crops.filter((c) => c.topic === topic);
          const st = STATUS[m.status];
          const crop = TOPICS[topic].crop;
          return (
            <li key={topic} class="topic-row">
              <svg class="topic-icon" viewBox="-30 -58 60 64" width="44" height="44" aria-hidden="true">
                <use href={cropHref(crop, 3)} />
              </svg>
              <div class="topic-main">
                <b>{topic}</b>
                <span class="muted">
                  {CROP_NAMES[crop]} · {mine.length} growing · {mine.filter((c) => isThirsty(c, t)).length} thirsty · {s.harvested[topic] ?? 0} harvested
                </span>
              </div>
              <div class="topic-score">
                <Chip tone={st.tone}>{st.label}</Chip>
                <span class="muted">{m.n ? `${m.right}/${m.n}` : '–'}</span>
              </div>
            </li>
          );
        })}
      </ul>
      <p class="muted">RED &lt; 50% · YELLOW 50–79% · GREEN ≥ 80% (3+ answers). NEW = fewer than 3 answers.</p>
    </Panel>
  );
}
