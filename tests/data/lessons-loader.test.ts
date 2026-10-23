import type { Packet } from '../../src/data/lessons/types';

// A minimal, well-formed packet so a successful (retry) load can rebuild the index.
const FAKE_PACKET: Packet = {
  id: 'bs-fake-packet',
  topic: 'Business strategy',
  subs: [],
  title: 'Fake',
  hook: 'hook',
  model: ['m'],
  example: { q: 'q', steps: ['s'] },
  checks: [{ t: 'numeric', q: 'q', a: 1, why: 'because' }],
  src: ['FE Prep Book Vol.1 §7.2.2 p.270'],
  qids: [],
};

let calls = 0;
vi.mock('../../src/data/lessons/strategy.json', () => ({
  get default() {
    calls++;
    if (calls === 1) throw new Error('chunk load failed');
    return [FAKE_PACKET];
  },
}));

describe('lesson chunk loader: retry after a failed load', () => {
  it('clears the stuck pending promise on rejection so a later retry can succeed', async () => {
    const { loadPackets, getPacket } = await import('../../src/data/lessons');

    await expect(loadPackets()).rejects.toThrow('chunk load failed');
    // Without the fix, `pending` stays set to the rejected promise forever: this second call
    // would just replay the same rejection instead of trying the loader again.
    await expect(loadPackets()).resolves.toEqual([FAKE_PACKET]);
    expect(getPacket('bs-fake-packet')).toEqual(FAKE_PACKET);
  });
});
