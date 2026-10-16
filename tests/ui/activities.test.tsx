import { fireEvent, render, screen } from '@testing-library/preact';
import type { PanelState } from '../../src/app/panel-types';
import { now, panel, save } from '../../src/app/store';
import { defaultSave } from '../../src/core/save';
import { FieldPanel } from '../../src/ui/activities/FieldPanel';
import { PracticePanel } from '../../src/ui/activities/PracticePanel';
import { makeCrop } from '../helpers';

type SessionPanel = Extract<PanelState, { kind: 'session' }>;

beforeEach(() => {
  save.value = defaultSave();
  panel.value = null;
  now.value = new Date(2026, 9, 16, 9, 0).getTime();
});

describe('pond and mine', () => {
  it('casts a smart set from the pond and honours the 2026S hold', () => {
    render(<PracticePanel subject="A" />);
    expect(screen.getByText('120 questions · 0 seen · 120 new · 60 held back for the 2026S mock')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Area'), { target: { value: 'strategy' } });
    expect(screen.getByText(/^43 questions/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cast the line' }));
    const p = panel.value as SessionPanel;
    expect(p.kind).toBe('session');
    expect(p.title).toBe('Fishing');
    expect(p.ids).toHaveLength(10);
    expect(p.ids.every((id) => !id.startsWith('2026S'))).toBe(true);
  });

  it('mines Subject B programming in paper order', () => {
    render(<PracticePanel subject="B" area="code" />);
    fireEvent.change(screen.getByLabelText('Paper'), { target: { value: '2025S' } });
    fireEvent.change(screen.getByLabelText('Order'), { target: { value: 'paper' } });
    fireEvent.change(screen.getByLabelText('Size'), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Start mining' }));
    const p = panel.value as SessionPanel;
    expect(p.title).toBe('Mining');
    expect(p.ids).toEqual(['2025S_B_Q01', '2025S_B_Q02', '2025S_B_Q03', '2025S_B_Q04', '2025S_B_Q05']);
  });
});

describe('field panel', () => {
  it('lists the field topics and waters only that field', () => {
    save.value = {
      ...defaultSave(),
      crops: {
        'paper:2025S_A_Q01': makeCrop({ ref: '2025S_A_Q01', topic: 'Number & logic', due: '2026-10-16' }),
        'paper:2025S_A_Q03': makeCrop({ ref: '2025S_A_Q03', topic: 'System strategy', due: '2026-10-16' }),
      },
    };
    render(<FieldPanel field="tech" />);
    expect(screen.getByText('Number & logic')).toBeInTheDocument();
    expect(screen.queryByText('System strategy')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Water this field (1)' }));
    expect(panel.value).toEqual({ kind: 'session', ids: ['2025S_A_Q01'], mode: 'review', title: 'Watering' });
  });

  it('offers both subjects for the security hedge', () => {
    render(<FieldPanel field="security" />);
    fireEvent.click(screen.getByRole('button', { name: 'Mine (Subject B)' }));
    expect(panel.value).toEqual({ kind: 'practice', subject: 'B', area: 'security' });
  });
});
