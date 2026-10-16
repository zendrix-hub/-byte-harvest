import { fireEvent, render, screen, within } from '@testing-library/preact';
import { now, panel, save } from '../../src/app/store';
import { defaultSave } from '../../src/core/save';
import { AlmanacPanel } from '../../src/ui/Almanac';

beforeEach(() => {
  panel.value = null;
  save.value = defaultSave();
});

describe('almanac', () => {
  it("shows today's plan, the countdown and suggestions", () => {
    now.value = new Date(2026, 9, 16, 8, 0).getTime();
    render(<AlmanacPanel />);
    expect(screen.getByRole('dialog', { name: 'Almanac' })).toHaveTextContent('Management blitz');
    expect(screen.getByText('9 days to the Harvest Festival')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Fish: strategy & management' }));
    expect(panel.value).toEqual({ kind: 'practice', subject: 'A', area: 'strategy' });
  });

  it('highlights today in the 10-day strip', () => {
    now.value = new Date(2026, 9, 20, 8, 0).getTime();
    render(<AlmanacPanel />);
    const days = within(screen.getByRole('list', { name: 'Days to the festival' })).getAllByRole('listitem');
    expect(days).toHaveLength(10);
    expect(days[4]).toHaveClass('today');
    expect(days[0]).toHaveClass('past');
  });
});
