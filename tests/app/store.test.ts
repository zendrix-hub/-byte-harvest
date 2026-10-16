import { closePanel, flush, now, openPanel, panel, save, showToast, toast, today, update } from '../../src/app/store';
import { SAVE_KEY, defaultSave } from '../../src/core/save';

beforeEach(() => {
  localStorage.clear();
  save.value = defaultSave();
  panel.value = null;
});

describe('store', () => {
  it('applies updates to a copy and persists on flush', () => {
    const before = save.value;
    const result = update((s) => {
      s.gold = 42;
      return 'done';
    });
    expect(result).toBe('done');
    expect(save.value.gold).toBe(42);
    expect(before.gold).toBe(0);
    flush();
    expect(JSON.parse(localStorage.getItem(SAVE_KEY)!).gold).toBe(42);
  });

  it('follows the clock across local midnight', () => {
    now.value = new Date(2026, 9, 16, 23, 59).getTime();
    expect(today.value).toBe('2026-10-16');
    now.value = new Date(2026, 9, 17, 0, 1).getTime();
    expect(today.value).toBe('2026-10-17');
  });

  it('opens and closes one panel at a time', () => {
    openPanel({ kind: 'house' });
    expect(panel.value).toEqual({ kind: 'house' });
    openPanel({ kind: 'almanac' });
    expect(panel.value).toEqual({ kind: 'almanac' });
    closePanel();
    expect(panel.value).toBeNull();
  });

  it('shows a toast that clears itself', () => {
    vi.useFakeTimers();
    showToast('Shipped!');
    expect(toast.value?.text).toBe('Shipped!');
    vi.advanceTimersByTime(3000);
    expect(toast.value).toBeNull();
    vi.useRealTimers();
  });
});
