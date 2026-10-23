import { fireEvent, render, screen, within } from '@testing-library/preact';
import { panel, save } from '../../src/app/store';
import { defaultSave } from '../../src/core/save';
import { loadPackets } from '../../src/data/lessons';
import { LessonPanel } from '../../src/ui/lesson/LessonPanel';

// bs-affiliate-marketing: checks = [order (5 steps), mcq (a=1)], qids = ['2025S_A_Q55'] (no hold concerns)
const AFFILIATE_ORDER_STEPS = [
  "Site owner joins the advertiser's affiliate program",
  'Visitor clicks the ad on the site',
  "Visitor is taken to the advertiser's sales page",
  'Visitor buys the product',
  'Advertiser pays the site owner a success fee',
];
const AFFILIATE_MCQ_RIGHT = 'The advertiser (EC site) pays the site owner';

function answerAffiliateOrder() {
  for (const step of AFFILIATE_ORDER_STEPS) fireEvent.click(screen.getByText(step));
}

function pickConfidence(label: 'Sure' | 'Unsure' | 'Guess') {
  fireEvent.click(screen.getByRole('button', { name: label }));
}

function commitCheck() {
  fireEvent.click(screen.getByRole('button', { name: 'Check' }));
}

beforeEach(() => {
  save.value = defaultSave();
  panel.value = null;
});

// This must run before any other test touches loadPackets(), since the lesson-content cache
// is a module-level singleton for the whole file: once loaded it stays loaded.
describe('LessonPanel: loading state', () => {
  it('shows a loading message before the first packet chunk resolves', () => {
    render(<LessonPanel id="bs-affiliate-marketing" mode="learn" />);
    expect(screen.getByText('Loading lesson…')).toBeInTheDocument();
  });
});

describe('LessonPanel: learn flow', () => {
  beforeEach(async () => {
    await loadPackets();
  });

  it('shows hook, model, example, then checks in order', () => {
    render(<LessonPanel id="bs-affiliate-marketing" mode="learn" />);

    expect(screen.getByText(/FE shows an affiliate-program flow/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(screen.getByText('It is pay-for-results: no sale, no fee.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(screen.getByText("A blogger joins a bookstore's affiliate program. Trace one sale.")).toBeInTheDocument();
    expect(screen.getByText("Blogger joins and puts the bookstore's ad on the blog.")).toBeInTheDocument();
    expect(screen.queryByText("A reader clicks the ad and lands on the bookstore's product page.")).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
    expect(screen.getByText('The bookstore pays the blogger a commission based on that sale.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Start checks' }));
    expect(screen.getByText('Order the steps of an affiliate program.')).toBeInTheDocument();
  });

  it('keeps the answer and why hidden until a confidence is picked and Check is pressed', () => {
    render(<LessonPanel id="bs-affiliate-marketing" mode="water" />);

    answerAffiliateOrder();
    expect(screen.getByRole('button', { name: 'Check' })).toBeDisabled();
    expect(screen.queryByText(/Join → click → link → buy → commission/)).toBeNull();

    pickConfidence('Sure');
    expect(screen.getByRole('button', { name: 'Check' })).not.toBeDisabled();

    commitCheck();
    expect(screen.getByText(/Join → click → link → buy → commission/)).toBeInTheDocument();
  });

  it('plants a concept crop on finish and shows the summary with trap, sources, and the practice button', () => {
    render(<LessonPanel id="bs-affiliate-marketing" mode="water" />);

    answerAffiliateOrder();
    pickConfidence('Sure');
    commitCheck();
    fireEvent.click(screen.getByRole('button', { name: 'Next check' }));

    fireEvent.click(screen.getByText(AFFILIATE_MCQ_RIGHT));
    pickConfidence('Sure');
    commitCheck();

    expect(save.value.crops['concept:bs-affiliate-marketing']).toMatchObject({ kind: 'concept', ref: 'bs-affiliate-marketing', stage: 1 });
    expect(save.value.lessons['bs-affiliate-marketing']).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'See summary' }));

    expect(screen.getByText('2/2')).toBeInTheDocument();
    expect(screen.getByText(/Planted a/)).toBeInTheDocument();
    expect(screen.getByText(/Mixing up the purchase/)).toBeInTheDocument();
    expect(screen.getByText('(2025S, FE, Subject-A, Q55)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Practice the past-paper question' })).toBeInTheDocument();
  });

  it('records nothing if the player closes mid-lesson, before the last check is revealed', () => {
    render(<LessonPanel id="bs-affiliate-marketing" mode="water" />);

    answerAffiliateOrder();
    pickConfidence('Sure');
    commitCheck();
    expect(screen.getByText(/Join → click → link → buy → commission/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(save.value.lessons).toEqual({});
    expect(save.value.crops).toEqual({});
  });

  it('double-clicking Check on the last check records exactly one run (idempotent reveal)', () => {
    render(<LessonPanel id="bs-affiliate-marketing" mode="water" />);

    answerAffiliateOrder();
    pickConfidence('Sure');
    commitCheck();
    fireEvent.click(screen.getByRole('button', { name: 'Next check' }));

    fireEvent.click(screen.getByText(AFFILIATE_MCQ_RIGHT));
    pickConfidence('Sure');
    // Grab the Check button once and fire it twice (simulates a rapid double-tap landing on
    // the same element before the reveal re-render swaps it out).
    const checkBtn = screen.getByRole('button', { name: 'Check' });
    fireEvent.click(checkBtn);
    fireEvent.click(checkBtn);

    expect(save.value.lessons['bs-affiliate-marketing'].runs).toHaveLength(1);
    expect(save.value.lessons['bs-affiliate-marketing'].runs[0].n).toBe(2);
  });

  it('water mode skips straight to the checks', () => {
    render(<LessonPanel id="bs-affiliate-marketing" mode="water" />);

    expect(screen.queryByText(/FE shows an affiliate-program flow/)).toBeNull();
    expect(screen.getByText('Order the steps of an affiliate program.')).toBeInTheDocument();
  });
});

describe('LessonPanel: practice button hold', () => {
  beforeEach(async () => {
    await loadPackets();
  });

  const finishMachineLearning = () => {
    render(<LessonPanel id="ss-machine-learning" mode="water" />);
    fireEvent.click(screen.getByText('A camera app trained on millions of photos gets better at recognizing faces'));
    pickConfidence('Sure');
    commitCheck();
    fireEvent.click(screen.getByRole('button', { name: 'Next check' }));

    const bucketItem = (text: string, bucket: string) => {
      const group = screen.getByRole('group', { name: text });
      fireEvent.click(within(group).getByText(bucket));
    };
    bucketItem('Spam filter improves from emails users mark as spam', 'Learns from data (ML)');
    bucketItem('Expert system using rules entered by doctors', 'Not ML');
    bucketItem('Airbag fires when the accelerometer passes a threshold', 'Not ML');
    bucketItem('Shop recommends items based on past purchase patterns', 'Learns from data (ML)');
    pickConfidence('Sure');
    commitCheck();
    fireEvent.click(screen.getByRole('button', { name: 'See summary' }));
  };

  it('hides the 2026S questions while hold is on', () => {
    save.value = { ...defaultSave(), hold: true };
    finishMachineLearning();

    fireEvent.click(screen.getByRole('button', { name: /Practice the past-paper question/ }));
    const p = panel.value as Extract<typeof panel.value, { kind: 'session' }>;
    expect(p?.kind).toBe('session');
    expect(p?.ids).toEqual(['2025S_A_Q03']);
  });

  it('includes 2026S questions once hold is off', () => {
    save.value = { ...defaultSave(), hold: false };
    finishMachineLearning();

    fireEvent.click(screen.getByRole('button', { name: /Practice the past-paper question/ }));
    const p = panel.value as Extract<typeof panel.value, { kind: 'session' }>;
    expect(p?.ids).toEqual(['2025S_A_Q03', '2026S_A_Q54', '2026S_A_Q55']);
  });

  it('includes 2026S questions once the 2026S Subject-A mock is recorded, even with hold on (isHeld mock-done escape)', () => {
    save.value = {
      ...defaultSave(),
      hold: true,
      mocks: [{ d: '2026-10-20', name: 'Mock 1', paper: '2026S', subj: 'A', full: true, score: 18, n: 20, pct: 90 }],
    };
    finishMachineLearning();

    fireEvent.click(screen.getByRole('button', { name: /Practice the past-paper question/ }));
    const p = panel.value as Extract<typeof panel.value, { kind: 'session' }>;
    expect(p?.ids).toEqual(['2025S_A_Q03', '2026S_A_Q54', '2026S_A_Q55']);
  });
});

describe('LessonPanel: unknown id', () => {
  beforeEach(async () => {
    await loadPackets();
  });

  it('shows a not-available message and a close button', () => {
    render(<LessonPanel id="does-not-exist" mode="learn" />);
    expect(screen.getByText("This lesson isn't available")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
  });
});
