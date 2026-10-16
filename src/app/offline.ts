/** Fetch images through the service worker so its "papers" cache fills up for offline play. */
export async function prefetchImages(
  urls: string[],
  onProgress: (done: number, failed: number) => void,
  batch = 6,
): Promise<{ done: number; failed: number }> {
  let done = 0;
  let failed = 0;
  for (let i = 0; i < urls.length; i += batch) {
    const results = await Promise.all(
      urls.slice(i, i + batch).map((u) =>
        fetch(u)
          .then((r) => r.ok)
          .catch(() => false),
      ),
    );
    failed += results.filter((ok) => !ok).length;
    done += results.length;
    onProgress(done, failed);
  }
  return { done, failed };
}
