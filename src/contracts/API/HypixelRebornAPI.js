const HypixelAPIReborn = require("hypixel-api-reborn");
const config = require("../../../config.json");
const { attachMissingDuelsModes } = require("./duelsExtraModes.js");

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

/**
 * Raw `player.stats.Duels` payloads, keyed by undashed UUID, kept only long enough for the
 * getPlayer wrapper below to read them. The library parses the player response into structures
 * that drop the raw stats, and its Duels structure is missing several gamemodes, so we hold on
 * to the raw duels blob from the response that produced each player.
 * @type {Map<string, Record<string, any>>}
 */
const rawDuelsByUuid = new Map();

/**
 * Normalizes a UUID to the undashed lowercase form used as the stash key.
 * @param {string} uuid
 * @returns {string}
 */
function normalizeUuid(uuid) {
  return String(uuid).replace(/-/g, "").toLowerCase();
}

// eslint-disable-next-line no-underscore-dangle
const makeRequest = hypixel._makeRequest.bind(hypixel);

// The library's endpoint methods look `_makeRequest` up on the client at call time, so wrapping
// it here catches every player request, including ones served from the library's own cache.
// It has to stay non-enumerable: those methods spread the client's own properties over the
// already-bound request function, so an enumerable override would shadow it with an unbound one.
Object.defineProperty(hypixel, "_makeRequest", {
  configurable: true,
  enumerable: false,
  writable: true,
  value: async function (options, url, useRateLimitManager) {
    const response = await makeRequest(options, url, useRateLimitManager);

    if (typeof url === "string" && url.startsWith("/player?uuid=")) {
      const duels = response?.player?.stats?.Duels;
      const uuid = response?.player?.uuid;

      if (duels && uuid) {
        rawDuelsByUuid.set(normalizeUuid(uuid), duels);
      }
    }

    return response;
  }
});

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
    const player = await request;

    const stashKey = player?.uuid ? normalizeUuid(player.uuid) : undefined;
    if (stashKey !== undefined) {
      attachMissingDuelsModes(player, rawDuelsByUuid.get(stashKey));
      rawDuelsByUuid.delete(stashKey);
    }

    return player;
  } finally {
    inFlightLookups.delete(key);
  }
};

module.exports = hypixel;
