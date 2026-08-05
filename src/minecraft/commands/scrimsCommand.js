const { formatError, prettyName } = require("../../contracts/helperFunctions.js");
const minecraftCommand = require("../../contracts/minecraftCommand.js");

// @ts-ignore
const { get } = require("axios");

/**
 * Aggregates the stats from an object of game types to a single object of totals.
 * @param {Record<string, Record<string, number>>} obj - The object containing game type stats.
 * @return {Record<string, number>} - The object containing the aggregated stats.
 */
function aggregateStats(obj) {
  const totals = {
      wins: 0,
      draws: 0,
      losses: 0,
      winLossRatio: 0
  };

  // Safety check to ensure we have a valid object
  if (typeof obj !== 'object' || obj === null) {
    return totals;
  }

  // Loop through the game types
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const subObj = obj[key];

      // Ensure the sub-item is actually an object before reading keys
      if (subObj && typeof subObj === 'object') {
        if (typeof subObj.wins === 'number')   totals.wins += subObj.wins;
        if (typeof subObj.draws === 'number')  totals.draws += subObj.draws;
        if (typeof subObj.losses === 'number') totals.losses += subObj.losses;
      }
    }
  }

  totals.winLossRatio = totals.losses === 0 ? totals.wins : Number((totals.wins / totals.losses).toFixed(2));

  return totals;
}

function formatStats(stats) {
  const total = stats.wins + stats.draws + stats.losses;
  return `W ${stats.wins} (${(stats.wins / total * 100).toFixed(1)}%) D ${stats.draws} (${(stats.draws / total * 100).toFixed(1)}%) L ${stats.losses} (${(stats.losses / total * 100).toFixed(1)}%) WLR ${stats.winLossRatio}`
}

function formatPrefix(prefix) {
  // janky but remove everything except uppercase letters
  return prefix.replace(/[^A-Z]/g, "");
}

class ScrimsCommand extends minecraftCommand {
  /** @param {import("minecraft-protocol").Client} minecraft */
  constructor(minecraft) {
    super(minecraft);

    this.name = "scrims";
    this.aliases = ["scrim"];
    this.description = "Scrims stats of specified user.";
    this.options = [
      {
        name: "username",
        description: "Minecraft username. Defaults to sender if none specified.",
        required: true
      },
      {
        name: "dueltype",
        description: "Type of duel. 'overall' aggregates from 'casual', 'duel', and 'private'.",
        required: false
      }
    ];
  }

  /**
   * @param {string} player
   * @param {string} message
   * */
  async onCommand(player, message) {
    
    try {

      const args = this.getArgs(message);
      let targetPlayer;
      
      if (args.length < 1) { // Default to sender
        targetPlayer = player;
      } else {
        targetPlayer = args[0];
      }
      const duelType = args[1]?.toLowerCase();

      const response = await get(`https://api.scrims.network/v1/user?username=${targetPlayer}`);
      const data = response.data.user_data;

      if (!data) {
        this.send(`[ERROR] ${prettyName(targetPlayer)} has no Scrims data.`);
        return;
      }

      const stats = data.stats["bridge"];

      if (duelType && !(Object.keys(stats).includes(duelType))) {
        this.send(`[ERROR] ${duelType} is not a valid duel type. Options : ${Object.keys(stats).join(", ")}`);
        return;
      }

      if (args.length > 1 && duelType !== "overall") {
        const typeStats = aggregateStats(stats[duelType]);

        this.send(`${formatPrefix(data.prefix)} ${data.username} [${data.skillRole.toUpperCase()}] ${duelType.toUpperCase()} ${formatStats(typeStats)}`);
        
      } else {
        const casual = aggregateStats(stats["casual"]);
        const duel = aggregateStats(stats["duel"]);
        const priv = aggregateStats(stats["private"]);
  
        const totals = {
          "wins" : casual.wins + duel.wins + priv.wins,
          "draws" : casual.draws + duel.draws + priv.draws,
          "losses" : casual.losses + duel.losses + priv.losses,
          "winLossRatio" : ((casual.wins + duel.wins + priv.wins) / (casual.losses + duel.losses + priv.losses)).toFixed(2)
        }
        
        this.send(`${formatPrefix(data.prefix)} ${data.username} [${data.skillRole.toUpperCase()}] OVERALL ${formatStats(totals)}`);
      }
      
    } catch (error) { 
      this.send(formatError(error));
    } 
  }
}

module.exports = ScrimsCommand;
