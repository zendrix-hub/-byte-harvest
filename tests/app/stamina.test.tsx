import { act, fireEvent, render, screen } from '@testing-library/preact';
import { resting, stamina, stepStamina } from '../../src/app/staminaStore';
import { now, save, today } from '../../src/app/store';
import { defaultSave } from '../../src/core/save';
import { FOCUS_BLOCK_MS, newStamina } from '../../src/core/stamina';
import { RestOverlay } from '../../src/ui/RestOverlay';
import { StaminaBar } from '../../src/ui/StaminaBar';

beforeEach(() => {
  save.value = defaultSave();
  resting.value = null;
});

describe('stamina', () => {
  it('asks for a 3-minute break after 25 focused minutes', () => {
    const t0 = Date.now();
    now.value = t0;
    stamina.value = { ...newStamina(today.value, t0), sinceBreakMs: FOCUS_BLOCK_MS - 10_000 };
    act(() => stepStamina(t0 + 15_000));
    expect(resting.value).not.toBeNull();
    render(<RestOverlay />);
    expect(screen.getByRole('dialog', { name: 'Break time' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Resting…' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Skip this break' }));
    expect(resting.value).toBeNull();
    expect(stamina.value.sinceBreakMs).toBe(0);
  });

  it('logs focus minutes into the day', () => {
    const t0 = Date.now();
    now.value = t0;
    stamina.value = newStamina(today.value, t0, 4 * 60_000 + 50_000);
    act(() => stepStamina(t0 + 15_000));
    expect(save.value.days[today.value].focusMin).toBe(5);
  });

  it('shows the stamina level in the HUD bar', () => {
    stamina.value = { ...newStamina('2026-10-16', 0), sinceBreakMs: FOCUS_BLOCK_MS / 2 };
    render(<StaminaBar />);
    expect(screen.getByLabelText('Stamina 50%')).toBeInTheDocument();
  });
});
