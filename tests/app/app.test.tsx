import { render, screen } from '@testing-library/preact';
import { App } from '../../src/app/App';
import { now, panel, save } from '../../src/app/store';
import { defaultSave } from '../../src/core/save';

describe('app', () => {
  it('opens the almanac on the first visit of the day only', () => {
    now.value = new Date(2026, 9, 16, 8, 0).getTime();
    save.value = defaultSave();
    panel.value = null;
    const first = render(<App />);
    expect(screen.getByRole('dialog', { name: 'Almanac' })).toBeInTheDocument();
    expect(save.value.seenAlmanac).toBe('2026-10-16');
    first.unmount();
    panel.value = null;
    render(<App />);
    expect(screen.queryByRole('dialog', { name: 'Almanac' })).toBeNull();
  });
});
