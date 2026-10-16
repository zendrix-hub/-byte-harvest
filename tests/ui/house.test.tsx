import { fireEvent, render, screen } from '@testing-library/preact';
import { now, save } from '../../src/app/store';
import { defaultSave, exportSave } from '../../src/core/save';
import { HousePanel } from '../../src/ui/house/HousePanel';

const dojo = {
  att: { '2025S_A_Q01': [{ d: '2026-10-14', p: 'c', ok: false, c: 'S', t: 70, tag: 'K', cue: '', m: 'practice' }] },
  rev: { '2025S_A_Q01': { due: '2026-10-15', step: 0, clean: 0, last: '2026-10-14', sbw: true } },
  mocks: [],
};

const paste = (text: string) => {
  fireEvent.input(screen.getByLabelText('Paste backup text'), { target: { value: text } });
  fireEvent.click(screen.getByRole('button', { name: 'Import pasted text' }));
};

beforeEach(() => {
  save.value = defaultSave();
  now.value = new Date(2026, 9, 16, 20, 0).getTime();
});

describe('house', () => {
  it("shows today's diary report", () => {
    render(<HousePanel />);
    expect((screen.getByLabelText('Diary report') as HTMLTextAreaElement).value).toContain('Byte Harvest diary · 2026-10-16 · D-9');
  });

  it('imports a pasted Dojo backup and says what happened', () => {
    render(<HousePanel />);
    paste(JSON.stringify(dojo));
    expect(save.value.crops['paper:2025S_A_Q01']).toMatchObject({ sbw: true, pest: 'K' });
    expect(screen.getByText('Dojo import: 1 answer, 1 crop planted, 0 mocks.')).toBeInTheDocument();
  });

  it('explains a wrong file and keeps the farm', () => {
    save.value = { ...defaultSave(), gold: 50 };
    render(<HousePanel />);
    paste('{"not":"a backup"}');
    expect(screen.getByText("That file isn't a Byte Harvest or Dojo backup.")).toBeInTheDocument();
    expect(save.value.gold).toBe(50);
  });

  it('asks before replacing the farm with a game backup', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<HousePanel />);
    paste(exportSave({ ...defaultSave(), gold: 999 }, new Date()));
    expect(confirm).toHaveBeenCalled();
    expect(save.value.gold).toBe(0);
    confirm.mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', { name: 'Import pasted text' }));
    expect(save.value.gold).toBe(999);
    confirm.mockRestore();
  });

  it('toggles battery saver and the 2026S hold', () => {
    render(<HousePanel />);
    fireEvent.click(screen.getByRole('checkbox', { name: /Battery saver/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Keep 2026S clean/ }));
    expect(save.value.settings.batterySaver).toBe(true);
    expect(save.value.hold).toBe(false);
  });
});
