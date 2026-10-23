import { render, screen, waitFor } from '@testing-library/preact';
import { panel, save, toast } from '../../src/app/store';
import { defaultSave } from '../../src/core/save';
import { LessonPanel } from '../../src/ui/lesson/LessonPanel';
import { waterCrop } from '../../src/ui/actions';

// Always-rejecting chunk load: the lesson content fetch is down for this whole file (a flaky
// network / offline-before-first-visit scenario), isolated from every other test file's cache.
vi.mock('../../src/data/lessons/strategy.json', () => ({
  get default(): never {
    throw new Error('network down');
  },
}));

beforeEach(() => {
  save.value = defaultSave();
  panel.value = null;
  toast.value = null;
});

describe('lesson chunk load failure', () => {
  it('LessonPanel shows the connection toast and closes instead of hanging on "Loading lesson…"', async () => {
    panel.value = { kind: 'lesson', id: 'bs-affiliate-marketing', mode: 'learn' };
    render(<LessonPanel id="bs-affiliate-marketing" mode="learn" />);
    expect(screen.getByText('Loading lesson…')).toBeInTheDocument();

    await waitFor(() => expect(toast.value?.text).toBe("Couldn't load lessons — check your connection and try again."));
    await waitFor(() => expect(panel.value).toBeNull());
  });

  it('does not close a different panel the player already navigated to before the chunk rejected', async () => {
    panel.value = { kind: 'lesson', id: 'bs-affiliate-marketing', mode: 'learn' };
    render(<LessonPanel id="bs-affiliate-marketing" mode="learn" />);
    // The player backs out to the almanac while the chunk fetch is still in flight.
    panel.value = { kind: 'almanac' };

    await waitFor(() => expect(toast.value?.text).toBe("Couldn't load lessons — check your connection and try again."));
    expect(panel.value).toEqual({ kind: 'almanac' });
  });

  it('waterCrop (via openConceptCrop) shows the connection toast instead of leaving the panel unopened silently', async () => {
    waterCrop({
      id: 'concept:bs-affiliate-marketing',
      kind: 'concept',
      ref: 'bs-affiliate-marketing',
      topic: 'Business strategy',
      stage: 1,
      due: '2026-10-16',
      last: '2026-10-15',
      plantedOn: '2026-10-15',
      sbw: false,
      pest: null,
    });
    await waitFor(() => expect(toast.value?.text).toBe("Couldn't load lessons — check your connection and try again."));
    expect(panel.value).toBeNull();
  });
});
