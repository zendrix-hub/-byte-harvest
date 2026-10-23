import { render, waitFor } from '@testing-library/preact';
import { panel, save, toast } from '../../src/app/store';
import { defaultSave } from '../../src/core/save';
import { TownPanel } from '../../src/ui/town/TownPanel';

// Always-rejecting chunk load: isolated from every other test file's cache, mirroring
// lesson-load-error.test.tsx's approach for LessonPanel.
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

describe('Town chunk load failure', () => {
  it('shows the connection toast instead of an unhandled rejection with nothing happening', async () => {
    render(<TownPanel />);
    await waitFor(() => expect(toast.value?.text).toBe("Couldn't load lessons — check your connection and try again."));
  });
});
