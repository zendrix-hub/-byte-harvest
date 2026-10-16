import { fireEvent, render, screen } from '@testing-library/preact';
import { now, panel, save } from '../../src/app/store';
import { defaultSave } from '../../src/core/save';
import { Hud } from '../../src/ui/Hud';
import { makeCrop } from '../helpers';

beforeEach(() => {
  now.value = new Date(2026, 9, 16, 9, 0).getTime();
  panel.value = null;
  save.value = defaultSave();
});

describe('HUD', () => {
  it('shows the day, the festival countdown and gold', () => {
    save.value = { ...defaultSave(), gold: 120 };
    render(<Hud />);
    expect(screen.getByRole('button', { name: /^Open almanac/ })).toHaveTextContent('Fri Oct 16D-9 · Festival');
    expect(screen.getByLabelText('120 gold')).toBeInTheDocument();
  });

  it('disables watering when nothing is thirsty', () => {
    render(<Hud />);
    expect(screen.getByRole('button', { name: 'Water 0 thirsty crops' })).toBeDisabled();
  });

  it('starts one watering session for all thirsty crops, golden first', () => {
    save.value = {
      ...defaultSave(),
      crops: {
        'paper:2025S_A_Q01': makeCrop({ ref: '2025S_A_Q01', topic: 'Number & logic', due: '2026-10-15' }),
        'paper:2025S_A_Q03': makeCrop({ ref: '2025S_A_Q03', topic: 'System strategy', due: '2026-10-16', sbw: true }),
      },
    };
    render(<Hud />);
    fireEvent.click(screen.getByRole('button', { name: 'Water 2 thirsty crops' }));
    expect(panel.value).toEqual({ kind: 'session', ids: ['2025S_A_Q03', '2025S_A_Q01'], mode: 'review', title: 'Watering' });
  });
});
