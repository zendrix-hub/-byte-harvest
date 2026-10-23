import { fireEvent, render, screen } from '@testing-library/preact';
import { now, panel, save, toast } from '../../src/app/store';
import { defaultSave } from '../../src/core/save';
import type { Crop } from '../../src/core/state';
import { Farm } from '../../src/scene/Farm';
import { LANDMARKS } from '../../src/scene/layout';
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

  it('ignores pointer events on the farmer sprite, so it never steals a tap from what it is standing on', () => {
    farmWith([]);
    const farmer = document.querySelector('g.farmer');
    expect(farmer?.getAttribute('pointer-events')).toBe('none');
  });

  it("keeps the yellow Flowers decoration clear of the Town gate's hit-rect", () => {
    farmWith([]);
    const yellowGroup = Array.from(document.querySelectorAll('svg.farm-svg > g')).find((el) =>
      el.querySelector('circle[fill="#ffd23f"]'),
    ) as SVGGElement | undefined;
    expect(yellowGroup).toBeTruthy();
    const m = yellowGroup!.getAttribute('transform')!.match(/translate\(([-\d.]+) ([-\d.]+)\)/);
    const [ox, oy] = [Number(m![1]), Number(m![2])];
    // Flowers' spots span x -10..10 (+/- a 4-radius petal) and y -4..1 (+/- a 4-radius petal, plus
    // an 8-unit stem hanging below each head) — see art.tsx's Flowers component.
    const cluster = { x1: ox - 14, y1: oy - 8, x2: ox + 14, y2: oy + 9 };
    const g = LANDMARKS.town;
    const hit = { x1: g.x - 5, y1: g.y - 24, x2: g.x - 5 + 120, y2: g.y - 24 + 80 };
    const overlaps = cluster.x1 < hit.x2 && hit.x1 < cluster.x2 && cluster.y1 < hit.y2 && hit.y1 < cluster.y2;
    expect(overlaps).toBe(false);
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
