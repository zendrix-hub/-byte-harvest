import { fireEvent, render, screen, within } from '@testing-library/preact';
import { now, panel, save, toast } from '../../src/app/store';
import { heartsFor, learnedCount } from '../../src/core/lessons';
import type { Crop } from '../../src/core/state';
import { defaultSave } from '../../src/core/save';
import { loadPackets, packetsFor } from '../../src/data/lessons';
import { waterAll, waterCrop } from '../../src/ui/actions';
import { TownPanel } from '../../src/ui/town/TownPanel';
import { makeCrop } from '../helpers';

const STRATEGY_TOPICS = ['Business strategy', 'System strategy', 'Service mgmt & audit', 'Project management', 'Accounting & legal'];

function makeConceptCrop(p: Partial<Crop> & { ref: string; topic: string }): Crop {
  return {
    id: `concept:${p.ref}`,
    kind: 'concept',
    stage: 1,
    due: '2026-10-16',
    last: '2026-10-15',
    plantedOn: '2026-10-15',
    sbw: false,
    pest: null,
    ...p,
  };
}

beforeEach(async () => {
  save.value = defaultSave();
  panel.value = null;
  toast.value = null;
  now.value = new Date(2026, 9, 16, 9, 0).getTime();
  await loadPackets();
});

describe('Town', () => {
  it('lists every strategy packet grouped by topic', () => {
    render(<TownPanel />);
    for (const topic of STRATEGY_TOPICS) {
      expect(screen.getByText(topic)).toBeInTheDocument();
    }
    expect(screen.getByText('Affiliate Marketing')).toBeInTheDocument();
    expect(screen.getByText('Auntie Rosa')).toBeInTheDocument();
    expect(screen.getByText('More villagers arrive with the Greenhouse, Orchard, Hedge and Code Garden lessons.')).toBeInTheDocument();
  });

  it('reflects hearts and learned count from the save', () => {
    const ids = STRATEGY_TOPICS.flatMap((topic) => packetsFor(topic).map((p) => p.id));
    const masteredIds = ids.slice(0, 26);
    const loggedOnlyIds = ids.slice(26, 30);
    save.value = {
      ...defaultSave(),
      lessons: {
        ...Object.fromEntries(masteredIds.map((id) => [id, { first: '2026-10-10', runs: [], mastered: true }])),
        ...Object.fromEntries(loggedOnlyIds.map((id) => [id, { first: '2026-10-15', runs: [], mastered: false }])),
      },
    };
    const expectedHearts = heartsFor(save.value, ids);
    const expectedLearned = learnedCount(save.value, ids);
    render(<TownPanel />);
    expect(screen.getByLabelText(`${expectedHearts} of 5 hearts`)).toBeInTheDocument();
    expect(screen.getByText(`Learned ${expectedLearned} / ${ids.length}`)).toBeInTheDocument();
  });

  it('shows READY for a mastered packet whose concept crop is still live at stage 3', async () => {
    const ids = STRATEGY_TOPICS.flatMap((topic) => packetsFor(topic).map((p) => p.id));
    const targetId = ids[0];
    const targetTopic = STRATEGY_TOPICS.find((topic) => packetsFor(topic).some((p) => p.id === targetId))!;
    save.value = {
      ...defaultSave(),
      lessons: { [targetId]: { first: '2026-10-10', runs: [], mastered: true } },
      crops: { [`concept:${targetId}`]: makeConceptCrop({ ref: targetId, topic: targetTopic, stage: 3 }) },
    };
    render(<TownPanel />);
    const title = packetsFor(targetTopic).find((p) => p.id === targetId)!.title;
    const row = screen.getByText(title).closest('li') as HTMLElement;
    expect(within(row).getByText('READY')).toBeInTheDocument();
    expect(within(row).queryByText('MASTERED')).toBeNull();
  });

  it('shows MASTERED once the ready crop is harvested away', () => {
    const ids = STRATEGY_TOPICS.flatMap((topic) => packetsFor(topic).map((p) => p.id));
    const targetId = ids[0];
    const targetTopic = STRATEGY_TOPICS.find((topic) => packetsFor(topic).some((p) => p.id === targetId))!;
    save.value = {
      ...defaultSave(),
      lessons: { [targetId]: { first: '2026-10-10', runs: [], mastered: true } },
      crops: {},
    };
    render(<TownPanel />);
    const title = packetsFor(targetTopic).find((p) => p.id === targetId)!.title;
    const row = screen.getByText(title).closest('li') as HTMLElement;
    expect(within(row).getByText('MASTERED')).toBeInTheDocument();
  });

  it('opens water mode when tapping a thirsty lesson row', async () => {
    save.value = {
      ...defaultSave(),
      crops: { 'concept:bs-affiliate-marketing': makeConceptCrop({ ref: 'bs-affiliate-marketing', topic: 'Business strategy' }) },
    };
    render(<TownPanel />);
    const thirstySection = screen.getByText('Thirsty lessons').closest('section') as HTMLElement;
    fireEvent.click(within(thirstySection).getByText('Affiliate Marketing'));
    await Promise.resolve();
    expect(panel.value).toEqual({ kind: 'lesson', id: 'bs-affiliate-marketing', mode: 'water' });
  });

  it('shows a toast instead of opening the lesson when the packet is unknown', async () => {
    const crop = makeConceptCrop({ ref: 'no-such-packet', topic: 'Business strategy' });
    waterCrop(crop);
    await Promise.resolve();
    expect(toast.value?.text).toBe('That lesson is no longer available — harvest or leave it.');
    expect(panel.value).toBeNull();
  });

  it('pluralizes the "lesson crops thirsty too" toast correctly', async () => {
    save.value = {
      ...defaultSave(),
      crops: {
        'paper:2025S_A_Q01': makeCrop({ ref: '2025S_A_Q01', topic: 'Number & logic', due: '2026-10-16' }),
        'concept:bs-affiliate-marketing': makeConceptCrop({ ref: 'bs-affiliate-marketing', topic: 'Business strategy' }),
      },
    };
    waterAll();
    expect(toast.value?.text).toBe('1 lesson crop is thirsty too — see Town');

    save.value = {
      ...defaultSave(),
      crops: {
        'paper:2025S_A_Q01': makeCrop({ ref: '2025S_A_Q01', topic: 'Number & logic', due: '2026-10-16' }),
        'concept:bs-affiliate-marketing': makeConceptCrop({ ref: 'bs-affiliate-marketing', topic: 'Business strategy' }),
        'concept:ss-machine-learning': makeConceptCrop({ ref: 'ss-machine-learning', topic: 'System strategy' }),
      },
    };
    waterAll();
    expect(toast.value?.text).toBe('2 lesson crops are thirsty too — see Town');
  });

  it('skips an unknown concept packet and waters the next due one, instead of giving up', async () => {
    save.value = {
      ...defaultSave(),
      crops: {
        'concept:no-such-packet': makeConceptCrop({ ref: 'no-such-packet', topic: 'Business strategy', due: '2026-10-10' }),
        'concept:bs-affiliate-marketing': makeConceptCrop({ ref: 'bs-affiliate-marketing', topic: 'Business strategy', due: '2026-10-16' }),
      },
    };
    waterAll();
    await Promise.resolve();
    await Promise.resolve();
    expect(panel.value).toEqual({ kind: 'lesson', id: 'bs-affiliate-marketing', mode: 'water' });
  });

  it('falls back to the first due concept lesson when waterAll has no paper crops thirsty', async () => {
    save.value = {
      ...defaultSave(),
      crops: { 'concept:bs-affiliate-marketing': makeConceptCrop({ ref: 'bs-affiliate-marketing', topic: 'Business strategy' }) },
    };
    waterAll();
    await Promise.resolve();
    expect(panel.value).toEqual({ kind: 'lesson', id: 'bs-affiliate-marketing', mode: 'water' });
  });
});
