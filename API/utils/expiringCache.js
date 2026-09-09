/**
 * Helpers for the API response caches.
 *
 * Every cache in here stores entries shaped `{ last_save, ... }` and reads them
 * back with a freshness check, but none of them ever removed a key. Since the
 * SkyBlock profile blobs are megabytes each, a bot that had looked up a few
 * hundred players was holding all of them forever. Sweeping on a timer keeps
 * each cache down to its actual working set.
 */

/**
 * Deletes every entry that has aged past `ttl`.
 * @param {Map<string, { last_save?: number }>} cache
 * @param {number} ttl milliseconds an entry stays fresh
 * @returns {number} how many entries were dropped
 */
function sweepExpired(cache, ttl) {
  const cutoff = Date.now() - ttl;
  let dropped = 0;

  for (const [key, entry] of cache) {
    // A missing last_save already reads as stale, so drop it too.
    if (entry?.last_save === undefined || entry.last_save <= cutoff) {
      cache.delete(key);
      dropped++;
    }
  }

  return dropped;
}

/**
 * Sweeps `cache` on a timer. The timer is unref'd so it never keeps the process
 * alive on its own.
 * @param {Map<string, { last_save?: number }>} cache
 * @param {number} ttl milliseconds an entry stays fresh
 * @param {number} [interval] how often to sweep, defaults to once a minute
 * @returns {NodeJS.Timeout}
 */
function autoSweep(cache, ttl, interval = 60000) {
  const timer = setInterval(() => sweepExpired(cache, ttl), interval);
  timer.unref();
  return timer;
}

module.exports = { sweepExpired, autoSweep };
