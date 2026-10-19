import { fireEvent, render, screen } from '@testing-library/preact';
import type { QuestionText } from '../../src/data/qtext';
import { QuestionBody, parseInline, safeSvg } from '../../src/ui/paper/QuestionBody';

describe('question text rendering', () => {
  it('renders the inline markup without HTML injection', () => {
    const { container } = render(<p>{parseInline('Use `x ← 1`, **bold**, 2^{10}, log_{2}, ~{A} and [[B]].\nNext <b>line</b>')}</p>);
    expect(container.querySelector('code')).toHaveTextContent('x ← 1');
    expect(container.querySelector('b')).toHaveTextContent('bold');
    expect(container.querySelector('sup')).toHaveTextContent('10');
    expect(container.querySelector('sub')).toHaveTextContent('2');
    expect(container.querySelector('.q-ov')).toHaveTextContent('A');
    expect(container.querySelector('.q-blank')).toHaveTextContent('B');
    expect(container.querySelector('br')).not.toBeNull();
    expect(container.textContent).toContain('<b>line</b>');
  });

  it('strips anything executable from figures', () => {
    expect(safeSvg('<svg viewBox="0 0 10 10"><script>alert(1)</script></svg>')).toBeNull();
    expect(safeSvg('<svg viewBox="0 0 10 10"><rect onclick="x()" width="5"/></svg>')).toBe('<svg viewBox="0 0 10 10"><rect width="5"/></svg>');
  });

  it('renders code blanks, tables and an answer-group table with tappable rows', () => {
    const q: QuestionText = {
      id: '2025S_B_Q01',
      stem: [
        { t: 'code', x: 'if ( [[A]] )\n  return [[B]]' },
        { t: 'table', rows: [['n', 'x'], ['1', '2']], head: 1 },
      ],
      optTable: { head: ['A', 'B'], rows: [{ k: 'a', c: ['`year mod 4 = 0`', 'true'] }, { k: 'b', c: ['`year mod 4 ≠ 0`', 'false'] }] },
    };
    const onPick = vi.fn();
    const { container } = render(<QuestionBody q={q} pick={null} answer={null} onPick={onPick} />);
    expect(container.querySelectorAll('pre .q-blank')).toHaveLength(2);
    expect(container.querySelectorAll('th').length).toBeGreaterThan(2);
    fireEvent.click(screen.getByText('year mod 4 ≠ 0'));
    expect(onPick).toHaveBeenCalledWith('b');
  });

  it('marks the right and wrong rows only after commit, and ignores taps then', () => {
    const q: QuestionText = { id: 'x', stem: [{ t: 'p', x: 'Q' }], opts: [{ k: 'a', b: [{ t: 'p', x: 'A1' }] }, { k: 'b', b: [{ t: 'p', x: 'B1' }] }] };
    const onPick = vi.fn();
    const { container } = render(<QuestionBody q={q} pick="b" answer="a" onPick={onPick} />);
    expect(container.querySelector('.q-opt.right')).toHaveTextContent('A1');
    expect(container.querySelector('.q-opt.wrong')).toHaveTextContent('B1');
    fireEvent.click(screen.getByText('A1'));
    expect(onPick).not.toHaveBeenCalled();
  });
});
