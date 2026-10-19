import { fireEvent, render, screen } from '@testing-library/preact';
import { now, save } from '../../src/app/store';
import { defaultSave } from '../../src/core/save';
import { byId } from '../../src/data/bank';
import type { QuestionText } from '../../src/data/qtext';
import { PaperQuestion } from '../../src/ui/paper/PaperQuestion';
import { Session } from '../../src/ui/paper/Session';

const noop = () => {};

const FIXTURES: Record<string, QuestionText> = {
  '2025S_A_Q01': {
    id: '2025S_A_Q01',
    stem: [{ t: 'p', x: 'For an 8-bit binary integer, which of the following extracts the most significant 4-bits?' }],
    opts: ['a', 'b', 'c', 'd'].map((k) => ({ k: k as 'a', b: [{ t: 'p' as const, x: `Option ${k}` }] })),
  },
  '2025S_A_Q02': {
    id: '2025S_A_Q02',
    stem: [{ t: 'p', x: 'Second question' }],
    opts: ['a', 'b', 'c', 'd'].map((k) => ({ k: k as 'a', b: [{ t: 'p' as const, x: `Choice ${k}` }] })),
  },
};
vi.mock('../../src/data/qtext', async () => {
  const { signal } = await import('@preact/signals');
  return {
    textVersion: signal(0),
    getQuestionText: (id: string) => FIXTURES[id] ?? null,
    loadQuestionText: async (id: string) => FIXTURES[id] ?? null,
    preloadQuestionText: async () => undefined,
  };
});

beforeEach(() => {
  save.value = defaultSave();
  now.value = new Date(2026, 9, 16, 9, 0).getTime();
});

describe('past-paper question', () => {
  it('never reveals the answer or explanation before commit', () => {
    render(<PaperQuestion qid="2025S_A_Q01" index={0} total={1} mode="practice" onNext={noop} />);
    expect(screen.queryByText(byId['2025S_A_Q01'].why)).toBeNull();
    expect(screen.queryByText(/answer a\)/)).toBeNull();
    const commit = screen.getByRole('button', { name: 'Commit answer' });
    expect(commit).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'a' }));
    expect(commit).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '1 · Sure' }));
    expect(commit).toBeEnabled();
    fireEvent.click(commit);
    expect(screen.getByText(byId['2025S_A_Q01'].why)).toBeInTheDocument();
    expect(screen.getByText(/Correct!/)).toBeInTheDocument();
  });

  it('turns a sure-but-wrong answer into a golden crop with a pest diagnosis', () => {
    render(<PaperQuestion qid="2025S_A_Q01" index={0} total={1} mode="practice" onNext={noop} />);
    fireEvent.click(screen.getByRole('button', { name: 'c' }));
    fireEvent.click(screen.getByRole('button', { name: '1 · Sure' }));
    fireEvent.click(screen.getByRole('button', { name: 'Commit answer' }));
    expect(screen.getByText(/Sure but wrong/)).toBeInTheDocument();
    expect(screen.getByText(/Planted a carrot in the Tech Orchard/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /K · Blight/ }));
    expect(save.value.crops['paper:2025S_A_Q01']).toMatchObject({ sbw: true, pest: 'K' });
    expect(save.value.att['2025S_A_Q01'][0].tag).toBe('K');
  });

  it('offers all ten options on the widest question', () => {
    render(<PaperQuestion qid="2025A_B_Q10" index={0} total={1} mode="practice" onNext={noop} />);
    expect(screen.getByRole('group', { name: 'Answer options' }).querySelectorAll('button.opt')).toHaveLength(10);
  });

  it('shows the question as built-in text, not an image', () => {
    render(<PaperQuestion qid="2025S_A_Q01" index={0} total={1} mode="practice" onNext={noop} />);
    expect(screen.getByText(/extracts the most significant 4-bits/)).toBeInTheDocument();
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('lets you pick an answer by tapping the option text', () => {
    render(<PaperQuestion qid="2025S_A_Q01" index={0} total={1} mode="practice" onNext={noop} />);
    fireEvent.click(screen.getByText('Option c'));
    expect(screen.getByRole('button', { name: 'c' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('explains when a question has no text', async () => {
    render(<PaperQuestion qid="2025A_B_Q10" index={0} total={1} mode="practice" onNext={noop} />);
    expect(await screen.findByRole('alert')).toHaveTextContent("couldn't be loaded");
  });

  it('supports keyboard answering on a PC', () => {
    render(<PaperQuestion qid="2025S_A_Q01" index={0} total={1} mode="practice" onNext={noop} />);
    fireEvent.keyDown(window, { key: 'a' });
    fireEvent.keyDown(window, { key: '1' });
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(screen.getByText(/Correct!/)).toBeInTheDocument();
  });
});

describe('session', () => {
  it('runs questions to a summary with farm events', () => {
    render(<Session ids={['2025S_A_Q01', '2025S_A_Q02']} mode="practice" title="Fishing" />);
    fireEvent.click(screen.getByRole('button', { name: 'c' }));
    fireEvent.click(screen.getByRole('button', { name: '2 · Unsure' }));
    fireEvent.click(screen.getByRole('button', { name: 'Commit answer' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next →' }));
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    expect(screen.getByText('0/1')).toBeInTheDocument();
    expect(screen.getByText(/1 skipped/)).toBeInTheDocument();
    expect(screen.getByText(/1 seed planted/)).toBeInTheDocument();
  });
});
