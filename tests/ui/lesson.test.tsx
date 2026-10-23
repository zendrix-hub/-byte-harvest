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

describe('CheckView: match sides use independent seeds', () => {
  it('left and right sides are not shuffled by the same rng stream', () => {
    const check: Check = {
      t: 'match',
      q: 'Match them',
      pairs: [
        ['L1', 'R1'],
        ['L2', 'R2'],
        ['L3', 'R3'],
      ],
      why: 'because',
    };
    render(<CheckView check={check} seed={0} locked={false} onChange={() => {}} />);
    const rows = screen.getAllByRole('group');
    const leftOrder = rows.map((r) => Number(r.getAttribute('aria-label')!.replace('L', '')) - 1);
    const rightOrder = within(rows[0]).getAllByRole('button').map((b) => Number(b.textContent!.replace('R', '')) - 1);
    // Seed 0, under the old shared-rng implementation, produced leftOrder === rightOrder === [1,2,0]:
    // every row's correct chip then sat at that row's own display column — a free "diagonal" solve
    // with no reading required. Independent derived seeds for the two sides must break that coincidence.
    expect(rightOrder).not.toEqual(leftOrder);
  });
});

describe('CheckView: order never pre-solved', () => {
  it('a 3-step order check never renders in authored order across seeds 0..50', () => {
    const check: Check = { t: 'order', q: 'Put in order', steps: ['First', 'Second', 'Third'], why: 'because' };
    for (let seed = 0; seed <= 50; seed++) {
      const { unmount } = render(<CheckView check={check} seed={seed} locked={false} onChange={() => {}} />);
      const pool = screen.getAllByRole('button', { name: /^(First|Second|Third)$/ }).map((b) => b.textContent);
      expect(pool, `seed ${seed}`).not.toEqual(['First', 'Second', 'Third']);
      unmount();
    }
  });
});

describe('CheckView: match right side never pre-solved', () => {
  it('right-hand chips are never shown in authored order across seeds 0..50', () => {
    const check: Check = {
      t: 'match',
      q: 'Match them',
      pairs: [
        ['L1', 'R1'],
        ['L2', 'R2'],
        ['L3', 'R3'],
      ],
      why: 'because',
    };
    for (let seed = 0; seed <= 50; seed++) {
      const { unmount } = render(<CheckView check={check} seed={seed} locked={false} onChange={() => {}} />);
      const firstRow = screen.getAllByRole('group')[0];
      const rightTexts = within(firstRow).getAllByRole('button').map((b) => b.textContent);
      expect(rightTexts, `seed ${seed}`).not.toEqual(['R1', 'R2', 'R3']);
      unmount();
    }
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

  it('strips %, ₱, $ and spaces before parsing', () => {
    const onChange = vi.fn();
    render(<CheckView check={check} seed={2} locked={false} onChange={onChange} />);
    const input = screen.getByRole('textbox');
    fireEvent.input(input, { target: { value: '99.5%' } });
    expect(onChange).toHaveBeenLastCalledWith(99.5);
    fireEvent.input(input, { target: { value: '₱1,380' } });
    expect(onChange).toHaveBeenLastCalledWith(1380);
    fireEvent.input(input, { target: { value: '$500000' } });
    expect(onChange).toHaveBeenLastCalledWith(500000);
    fireEvent.input(input, { target: { value: ' 1 200 ' } });
    expect(onChange).toHaveBeenLastCalledWith(1200);
  });
});

describe('CheckView: reveal after lock', () => {
  it('mcq marks the correct option and a wrong pick after reveal', () => {
    const check: Check = { t: 'mcq', q: 'Pick one', opts: ['Alpha', 'Beta', 'Gamma'], a: 0, why: 'because' };
    const { rerender } = render(<CheckView check={check} seed={1} locked={false} onChange={() => {}} />);
    fireEvent.click(screen.getByText('Beta'));
    rerender(<CheckView check={check} seed={1} locked={true} onChange={() => {}} />);
    const correctBtn = screen.getByText('Alpha').closest('button') as HTMLElement;
    const wrongBtn = screen.getByText('Beta').closest('button') as HTMLElement;
    expect(within(correctBtn).getByText('✓')).toBeInTheDocument();
    expect(within(wrongBtn).getByText('✗')).toBeInTheDocument();
  });

  it('match marks each row and shows the correct target on a wrong row', () => {
    const check: Check = {
      t: 'match',
      q: 'Match them',
      pairs: [
        ['L1', 'R1'],
        ['L2', 'R2'],
      ],
      why: 'because',
    };
    const { rerender } = render(<CheckView check={check} seed={3} locked={false} onChange={() => {}} />);
    const row1 = screen.getByRole('group', { name: 'L1' });
    const row2 = screen.getByRole('group', { name: 'L2' });
    fireEvent.click(within(row1).getByText('R2')); // wrong: L1's correct partner is R1
    fireEvent.click(within(row2).getByText('R1'));
    rerender(<CheckView check={check} seed={3} locked={true} onChange={() => {}} />);
    expect(within(row1).getByText('✗')).toBeInTheDocument();
    expect(within(row1).getByText('Correct: R1')).toBeInTheDocument();
  });

  it('bucket marks each row and shows the correct bucket on a wrong row', () => {
    const check: Check = {
      t: 'bucket',
      q: 'Sort them',
      buckets: ['B0', 'B1'],
      items: [
        ['i1', 0],
        ['i2', 1],
      ],
      why: 'because',
    };
    const { rerender } = render(<CheckView check={check} seed={4} locked={false} onChange={() => {}} />);
    const row = screen.getByRole('group', { name: 'i1' });
    fireEvent.click(within(row).getByText('B1')); // wrong: i1's correct bucket is B0
    rerender(<CheckView check={check} seed={4} locked={true} onChange={() => {}} />);
    expect(within(row).getByText('✗')).toBeInTheDocument();
    expect(within(row).getByText('Correct: B0')).toBeInTheDocument();
  });

  it('order shows the correct sequence under the player’s after reveal', () => {
    const check: Check = { t: 'order', q: 'Order them', steps: ['First', 'Second', 'Third'], why: 'because' };
    const { rerender } = render(<CheckView check={check} seed={9} locked={false} onChange={() => {}} />);
    fireEvent.click(screen.getByText('Second'));
    fireEvent.click(screen.getByText('Third'));
    fireEvent.click(screen.getByText('First'));
    rerender(<CheckView check={check} seed={9} locked={true} onChange={() => {}} />);
    expect(screen.getByText('Correct order:')).toBeInTheDocument();
    const keyList = screen.getByText('Correct order:').parentElement!.querySelector('ol') as HTMLElement;
    expect(within(keyList).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['First', 'Second', 'Third']);
  });

  it('numeric shows "Answer: <a> <unit>" after reveal', () => {
    const check: Check = { t: 'numeric', q: 'How many?', a: 1200.5, unit: 'KB', why: 'because' };
    const { rerender } = render(<CheckView check={check} seed={2} locked={false} onChange={() => {}} />);
    fireEvent.input(screen.getByRole('textbox'), { target: { value: '1' } });
    rerender(<CheckView check={check} seed={2} locked={true} onChange={() => {}} />);
    expect(screen.getByText('Answer: 1200.5 KB')).toBeInTheDocument();
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
