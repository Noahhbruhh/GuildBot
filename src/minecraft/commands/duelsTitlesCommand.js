const { formatError, getDivision, titleCase } = require("../../contracts/helperFunctions.js");
const minecraftCommand = require("../../contracts/minecraftCommand.js");
const hypixel = require("../../contracts/API/HypixelRebornAPI.js");

const MAX_TITLES = 5;

class DuelsTitlesCommand extends minecraftCommand {
  /** @param {import("minecraft-protocol").Client} minecraft */
  constructor(minecraft) {
    super(minecraft);

    this.name = "titles";
    this.aliases = ["dueltitles"];
    this.description = "Duel stats of specified user. Defaults to sender if no user is specified.";
    this.options = [
      {
        name: "username",
        description: "Minecraft username",
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
  
        const targetPlayer = this.getArgs(message)[0] ?? player;
        const hypixelPlayer = await hypixel.getPlayer(targetPlayer); 
        if (!hypixelPlayer) throw "Player not found.";
        
        if (!hypixelPlayer.stats?.duels) { 
            throw `${hypixelPlayer.nickname} has never played duels.`; 
        }
        
        const duelsRoot = hypixelPlayer.stats.duels;

        /** @type {Record<string, {division: string, wins: number}>} */
        let divisions = {};

        // iter through all values (duel gamemodes) in duelsRoot
        for (const [modeName, modeStats] of Object.entries(duelsRoot)) {
            let wins = 0;

            // summing loop
            for (const [k, v] of Object.entries(modeStats)) {
                // deleted games are HERE vv
                if (["overall", "2v2v2v2", "3v3v3v3", "ctf"].includes(k)) continue;
                // deleted games are HERE ^^
                wins += v.wins ?? 0;
            }

            let division = getDivision(wins, modeName);
            if (division !== "Unranked") {
                divisions[modeName] = { "division" : getDivision(wins, modeName), "wins" : wins };
            }
        }

        // output the top 5 divisions with most wins
        const topDivisions = Object.entries(divisions).sort((a, b) => b[1].wins - a[1].wins).slice(0, MAX_TITLES);
        const topDivisionsString = topDivisions.map(d => `${titleCase(d[0])} ${d[1].division} (${d[1].wins} W)`).join(" | ");

        this.send(`${hypixelPlayer.nickname}'s top ${MAX_TITLES} titles : ${topDivisionsString}`);
        
    } catch (error) { 
      this.send(formatError(error));
    } 
  }
}

module.exports = DuelsTitlesCommand;
