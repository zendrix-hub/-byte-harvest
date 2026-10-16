import { prefetchImages } from '../../src/app/offline';

describe('offline download', () => {
  it('fetches every url in small batches and counts failures', async () => {
    const fetchMock = vi.fn(async (url: string) => ({ ok: !url.includes('bad') }) as Response);
    vi.stubGlobal('fetch', fetchMock);
    const progress: number[] = [];
    const r = await prefetchImages(['a', 'b', 'bad', 'c'], (done) => progress.push(done), 2);
    expect(r).toEqual({ done: 4, failed: 1 });
    expect(progress).toEqual([2, 4]);
    expect(fetchMock).toHaveBeenCalledTimes(4);
    vi.unstubAllGlobals();
  });
});
