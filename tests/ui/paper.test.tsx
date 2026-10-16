import { fireEvent, render, screen } from '@testing-library/preact';
import { now, save } from '../../src/app/store';
import { defaultSave } from '../../src/core/save';
import { byId } from '../../src/data/bank';
import { PaperQuestion } from '../../src/ui/paper/PaperQuestion';
import { Session } from '../../src/ui/paper/Session';

const noop = () => {};

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

  it('shows a friendly message when the image is not cached offline', () => {
    render(<PaperQuestion qid="2025S_A_Q01" index={0} total={1} mode="practice" onNext={noop} />);
    fireEvent.error(screen.getByRole('img'));
    expect(screen.getByRole('alert')).toHaveTextContent("isn't on this device yet");
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
