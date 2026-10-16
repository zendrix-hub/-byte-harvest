import { fireEvent, render, screen } from '@testing-library/preact';
import { now, panel, save, toast } from '../../src/app/store';
import { defaultSave } from '../../src/core/save';
import type { Crop } from '../../src/core/state';
import { Farm } from '../../src/scene/Farm';
import { makeCrop } from '../helpers';

const farmWith = (crops: Crop[]) => {
  save.value = { ...defaultSave(), crops: Object.fromEntries(crops.map((c) => [c.id, c])) };
  return render(<Farm paused={false} />);
};

beforeEach(() => {
  now.value = new Date(2026, 9, 17, 10, 0).getTime();
  panel.value = null;
});

describe('farm scene', () => {
  it('draws a thirsty crop that opens a watering session', () => {
    farmWith([makeCrop({ ref: '2025S_A_Q01', topic: 'Number & logic', due: '2026-10-17' })]);
    fireEvent.click(screen.getByRole('button', { name: /^carrot, Number & logic: thirsty/ }));
    expect(panel.value).toEqual({ kind: 'session', ids: ['2025S_A_Q01'], mode: 'review', title: 'Watering' });
  });

  it('harvests a ready crop for gold', () => {
    farmWith([makeCrop({ ref: '2025S_A_Q03', topic: 'System strategy', stage: 3, sbw: true })]);
    fireEvent.click(screen.getByRole('button', { name: /^corn, System strategy: ready to harvest/ }));
    expect(save.value.gold).toBe(40);
    expect(save.value.crops).toEqual({});
    expect(toast.value?.text).toBe('Harvested! +40 gold');
  });

  it('says when a growing crop needs water next', () => {
    farmWith([makeCrop({ ref: '2025S_A_Q04', topic: 'Hardware & CPU', stage: 2, last: '2026-10-17', due: '2026-10-19' })]);
    fireEvent.click(screen.getByRole('button', { name: /^tomato, Hardware & CPU: growing/ }));
    expect(toast.value?.text).toBe('Growing — water it again Mon Oct 19.');
  });

  it('shows "+N" when a field overflows', () => {
    farmWith(Array.from({ length: 10 }, (_, i) => makeCrop({ ref: `2025S_A_X${i}`, topic: 'Security' })));
    expect(screen.getByRole('button', { name: /^3 more crops in Thorn Hedge/ })).toBeInTheDocument();
    expect(document.querySelectorAll('[data-crop]')).toHaveLength(7);
  });

  it('opens the pond, mine, house and field panels', () => {
    farmWith([]);
    fireEvent.click(screen.getByRole('button', { name: /^Pond/ }));
    expect(panel.value).toEqual({ kind: 'practice', subject: 'A' });
    fireEvent.click(screen.getByRole('button', { name: /^Mine/ }));
    expect(panel.value).toEqual({ kind: 'practice', subject: 'B' });
    fireEvent.click(screen.getByRole('button', { name: /^House/ }));
    expect(panel.value).toEqual({ kind: 'house' });
    fireEvent.click(screen.getByRole('button', { name: /^Market Garden:/ }));
    expect(panel.value).toEqual({ kind: 'field', field: 'strategy' });
  });
});
