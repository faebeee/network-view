/**
 * Maps items with at most `limit` promises in flight. Stops picking up new
 * items once `signal` is aborted; results for skipped items are undefined.
 */
export async function mapConcurrent<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
  signal?: AbortSignal,
): Promise<Array<R | undefined>> {
  const results: Array<R | undefined> = Array.from({ length: items.length });
  let next = 0;
  const worker = async () => {
    while (next < items.length && !signal?.aborted) {
      const index = next++;
      results[index] = await fn(items[index] as T, index);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/** Resolves with the promise's value, or with `fallback` after `ms` milliseconds. */
export function withTimeout<T, F>(promise: Promise<T>, ms: number, fallback: F): Promise<T | F> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<F>((resolve) => {
    timer = setTimeout(() => resolve(fallback), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
