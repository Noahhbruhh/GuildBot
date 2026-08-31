const HypixelAPIReborn = require("hypixel-api-reborn");
const config = require("../../../config.json");

// How long a successful player lookup stays cached, in seconds. Hypixel applies its own
// per-player lookup cooldown, so anything shorter than this just invites 429s.
const PLAYER_CACHE_SECONDS = 300;

// How long to stop calling the API for a player after Hypixel says we looked them up too
// recently. Retrying during the cooldown refreshes it on Hypixel's side, which is what kept
// the guild locked out of !b for minutes at a time.
const RECENT_LOOKUP_COOLDOWN_MS = 60 * 1000;

const hypixel = new HypixelAPIReborn.Client(config.minecraft.API.hypixelAPIkey, {
  cache: true,
  hypixelCacheTime: PLAYER_CACHE_SECONDS,
  mojangCacheTime: 600
});

/**
 * Players we are currently backing off from, keyed by lookup key.
 * @type {Map<string, number>}
 */
const recentLookupCooldowns = new Map();

/**
 * Lookups already in flight, keyed by lookup key, so simultaneous requests share one call.
 * @type {Map<string, Promise<any>>}
 */
const inFlightLookups = new Map();

/**
 * Builds a cache key for a player lookup.
 * @param {string} query
 * @param {object} [options]
 * @returns {string}
 */
function lookupKey(query, options) {
  const normalized = typeof query === "string" ? query.toLowerCase() : String(query);

  return `${normalized}:${JSON.stringify(options ?? {})}`;
}

/**
 * Whether an error is Hypixel's "looked up too recently" rate limit.
 * @param {Error | unknown} error
 * @returns {boolean}
 */
function isRecentLookupError(error) {
  return /requested that player recently/i.test(String(error));
}

const getPlayer = hypixel.getPlayer.bind(hypixel);

/**
 * getPlayer with in-flight de-duplication and a backoff window for Hypixel's per-player
 * lookup cooldown. The library only caches successful responses, so without this every
 * retry of a rate limited player hit the API again and refreshed the cooldown.
 * @param {string} query Username or UUID
 * @param {object} [options] Options forwarded to hypixel-api-reborn
 * @returns {Promise<any>}
 */
hypixel.getPlayer = async function (query, options) {
  const key = lookupKey(query, options);

  const cooldownUntil = recentLookupCooldowns.get(key);
  if (cooldownUntil !== undefined) {
    if (Date.now() < cooldownUntil) {
      const seconds = Math.ceil((cooldownUntil - Date.now()) / 1000);

      throw new Error(`${query} was looked up too recently. Try again in ${seconds}s.`);
    }

    recentLookupCooldowns.delete(key);
  }

  const pending = inFlightLookups.get(key);
  if (pending !== undefined) {
    return pending;
  }

  const request = getPlayer(query, options).catch((error) => {
    if (isRecentLookupError(error)) {
      recentLookupCooldowns.set(key, Date.now() + RECENT_LOOKUP_COOLDOWN_MS);

      throw new Error(`${query} was looked up too recently. Try again in ${Math.ceil(RECENT_LOOKUP_COOLDOWN_MS / 1000)}s.`);
    }

    throw error;
  });

  inFlightLookups.set(key, request);

  try {
    return await request;
  } finally {
    inFlightLookups.delete(key);
  }
};

module.exports = hypixel;
