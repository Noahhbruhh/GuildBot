// hypixel-api-reborn's Duels structure does not expose every duels gamemode: Boxing, Bed Wars
// Duels and Bed Wars Rush Duels are all missing from it, and the library throws the raw stats
// away once it has parsed them. Without this, `!d boxing` (and friends) hit the "was an option,
// but it was not present in the stats object" branch of the duels command.
//
// We rebuild those modes from the raw Hypixel payload using the same key layout the library
// uses for the modes it does support, and graft them onto the parsed Duels object.

/**
 * Missing gamemodes, keyed by the name the duels command uses, mapped to the raw Hypixel
 * stat prefix for that mode.
 * @type {Record<string, string>}
 */
const MISSING_DUELS_MODES = {
  boxing: "boxing_duel",
  bedwars: "bedwars_two_one_duels",
  bedwarsrush: "bedwars_two_one_duels_rush"
};

/**
 * Divides two numbers, rounded to 2 decimals, treating a zero divisor the way the library does.
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
function divide(a, b) {
  return b ? Number((a / b).toFixed(2)) : Number(a.toFixed(2));
}

/**
 * Builds a stats object for one duels gamemode from the raw Duels payload.
 * @param {Record<string, any>} data Raw `player.stats.Duels`
 * @param {string} mode Raw stat prefix, e.g. "boxing_duel"
 * @returns {Record<string, number>}
 */
function buildGamemode(data, mode) {
  const kills = data[`${mode}_kills`] || 0;
  const deaths = data[`${mode}_deaths`] || 0;
  const wins = data[`${mode}_wins`] || 0;
  const losses = data[`${mode}_losses`] || 0;

  return {
    winstreak: data[`current_winstreak_mode_${mode}`] || 0,
    bestWinstreak: data[`best_winstreak_mode_${mode}`] || 0,
    kills,
    deaths,
    KDRatio: divide(kills, deaths),
    wins,
    losses,
    WLRatio: divide(wins, losses),
    playedGames: data[`${mode}_rounds_played`] || 0,
    meleeSwings: data[`${mode}_melee_swings`] || 0,
    meleeHits: data[`${mode}_melee_hits`] || 0,
    coins: data[`${mode}_coins`] || 0
  };
}

/**
 * Adds the gamemodes hypixel-api-reborn omits to a parsed player's duels stats. No-op when the
 * player has no duels stats or the raw payload was not captured.
 * @param {any} player Parsed hypixel-api-reborn Player
 * @param {Record<string, any> | undefined} rawDuels Raw `player.stats.Duels` from the API
 * @returns {void}
 */
function attachMissingDuelsModes(player, rawDuels) {
  const duels = player?.stats?.duels;
  if (!duels || !rawDuels) {
    return;
  }

  for (const [name, mode] of Object.entries(MISSING_DUELS_MODES)) {
    if (name in duels) {
      continue;
    }

    duels[name] = buildGamemode(rawDuels, mode);
  }
}

module.exports = { attachMissingDuelsModes, MISSING_DUELS_MODES };
