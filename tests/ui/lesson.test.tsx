import { fireEvent, render, screen, within } from '@testing-library/preact';
import type { Check } from '../../src/data/lessons/types';
import { CheckView } from '../../src/ui/lesson/CheckView';

describe('CheckView: mcq', () => {
  const check: Check = { t: 'mcq', q: 'Pick one', opts: ['Alpha', 'Beta', 'Gamma'], a: 0, why: 'because' };

  it('reports the picked index', () => {
    const onChange = vi.fn();
    render(<CheckView check={check} seed={1} locked={false} onChange={onChange} />);
    fireEvent.click(screen.getByText('Gamma'));
    expect(onChange).toHaveBeenLastCalledWith(2);
    fireEvent.click(screen.getByText('Beta'));
    expect(onChange).toHaveBeenLastCalledWith(1);
  });

  it('keeps shuffled order stable across rerenders', () => {
    const onChange = vi.fn();
    const { rerender } = render(<CheckView check={check} seed={7} locked={false} onChange={onChange} />);
    const order1 = screen.getAllByRole('button').map((b) => b.textContent);
    rerender(<CheckView check={check} seed={7} locked={false} onChange={onChange} />);
    const order2 = screen.getAllByRole('button').map((b) => b.textContent);
    expect(order1).toEqual(order2);
  });

  it('new check of same type starts empty and reports null', () => {
    const onChange = vi.fn();
    const checkA: Check = { t: 'mcq', q: 'Pick one', opts: ['Alpha', 'Beta', 'Gamma'], a: 0, why: 'because' };
    const checkB: Check = { t: 'mcq', q: 'Pick one', opts: ['Alpha', 'Beta', 'Gamma'], a: 0, why: 'because' };
    const { rerender } = render(<CheckView check={checkA} seed={1} locked={false} onChange={onChange} />);
    fireEvent.click(screen.getByText('Gamma'));
    expect(onChange).toHaveBeenLastCalledWith(2);

    rerender(<CheckView check={checkB} seed={1} locked={false} onChange={onChange} />);
    expect(onChange).toHaveBeenLastCalledWith(null);
    expect(document.querySelector('.sel')).toBeNull();
  });
});

describe('CheckView: match', () => {
  const check: Check = {
    t: 'match',
    q: 'Match the pairs',
    pairs: [
      ['Row1', 'Right1'],
      ['Row2', 'Right2'],
    ],
    why: 'because',
  };

  it('reports null until every row is set', () => {
    const onChange = vi.fn();
    render(<CheckView check={check} seed={3} locked={false} onChange={onChange} />);
    expect(onChange).toHaveBeenLastCalledWith(null);

    const row1 = screen.getByRole('group', { name: 'Row1' });
    fireEvent.click(within(row1).getByText('Right1'));
    expect(onChange).toHaveBeenLastCalledWith(null);

    const row2 = screen.getByRole('group', { name: 'Row2' });
    fireEvent.click(within(row2).getByText('Right2'));
    expect(onChange).toHaveBeenLastCalledWith([0, 1]);
  });
});

describe('CheckView: order', () => {
  const check: Check = { t: 'order', q: 'Put in order', steps: ['First', 'Second', 'Third'], why: 'because' };

  it('builds the sequence and undo removes the last', () => {
    const onChange = vi.fn();
    render(<CheckView check={check} seed={5} locked={false} onChange={onChange} />);
    fireEvent.click(screen.getByText('Second'));
    expect(onChange).toHaveBeenLastCalledWith(null);
    fireEvent.click(screen.getByText('First'));
    fireEvent.click(screen.getByText('Third'));
    expect(onChange).toHaveBeenLastCalledWith([1, 0, 2]);

    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(onChange).toHaveBeenLastCalledWith(null);
    expect(screen.getByText('Third')).toBeInTheDocument();
  });
});

describe('CheckView: numeric', () => {
  const check: Check = { t: 'numeric', q: 'How many?', a: 1200.5, unit: 'KB', why: 'because' };

  it("parses '1,200.5' as 1200.5 and empty as null", () => {
    const onChange = vi.fn();
    render(<CheckView check={check} seed={2} locked={false} onChange={onChange} />);
    const input = screen.getByRole('textbox');
    fireEvent.input(input, { target: { value: '1,200.5' } });
    expect(onChange).toHaveBeenLastCalledWith(1200.5);
    fireEvent.input(input, { target: { value: '' } });
    expect(onChange).toHaveBeenLastCalledWith(null);
    fireEvent.input(input, { target: { value: ',' } });
    expect(onChange).toHaveBeenLastCalledWith(null);
  });
});

describe('CheckView: locked', () => {
  const check: Check = { t: 'mcq', q: 'Pick one', opts: ['Alpha', 'Beta'], a: 0, why: 'because' };

  it('disables input', () => {
    const onChange = vi.fn();
    render(<CheckView check={check} seed={1} locked={true} onChange={onChange} />);
    for (const b of screen.getAllByRole('button')) expect(b).toBeDisabled();
  });
});
