import { FieldPanel } from '../ui/activities/FieldPanel';
import { PracticePanel } from '../ui/activities/PracticePanel';
import { AlmanacPanel } from '../ui/Almanac';
import { HousePanel } from '../ui/house/HousePanel';
import { Panel } from '../ui/kit';
import { LessonPanel } from '../ui/lesson/LessonPanel';
import { Session } from '../ui/paper/Session';
import type { PanelState } from './panel-types';
import { closePanel } from './store';

export function PanelHost({ panel }: { panel: PanelState }) {
  return <div class="panel-layer">{renderPanel(panel)}</div>;
}

function renderPanel(p: PanelState) {
  switch (p.kind) {
    case 'almanac':
      return <AlmanacPanel />;
    case 'session':
      return <Session key={`${p.title}:${p.ids.join(',')}`} ids={p.ids} mode={p.mode} title={p.title} />;
    case 'practice':
      return <PracticePanel key={`${p.subject}:${p.area ?? '*'}`} subject={p.subject} area={p.area} />;
    case 'field':
      return <FieldPanel field={p.field} />;
    case 'house':
      return <HousePanel />;
    case 'lesson':
      return <LessonPanel key={`${p.id}:${p.mode}`} id={p.id} mode={p.mode} />;
    default:
      return (
        <Panel title="Coming soon" onClose={closePanel}>
          <p class="muted">This part of the farm is still being built.</p>
        </Panel>
      );
  }
}
