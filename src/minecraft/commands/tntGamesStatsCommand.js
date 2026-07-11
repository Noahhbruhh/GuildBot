const { formatNumber, formatError } = require("../../contracts/helperFunctions.js");
const minecraftCommand = require("../../contracts/minecraftCommand.js");
const hypixel = require("../../contracts/API/HypixelRebornAPI.js");

class TNTGamesStatsCommand extends minecraftCommand {
  /** @param {import("minecraft-protocol").Client} minecraft */
    constructor(minecraft) {
        super(minecraft);

        this.name = "tntgames";
        this.aliases = ["tnt"];
        this.description = "TNT Games stats of specified user. Defaults to sender if no user is specified.";
        this.options = [
            {
                name: "username",
                description: "Minecraft username",
                required: false
            },
            {
                name: "game",
                description: "Type of game",
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

        const gameAliases = {
            "tntrun" : "tntrun",
            "run" : "tntrun",
            "pvprun" : "pvprun",
            "pvp" : "pvprun",
            "tnttag" : "tnttag",
            "tag" : "tnttag",
            "bowspleef" : "bowspleef",
            "bow" : "bowspleef",
            "wizards" : "wizards",
            "wizard" : "wizards",
            "wz" : "wizards"

        }

        
        // argument handling : remember order is dynamic
        const args = this.getArgs(message);
        // first look for anything in gameAliases, if none, raise error and show game aliases
        const gameArg = args.find(arg => Object.keys(gameAliases).includes(arg.toLowerCase()));
        if (!gameArg) {
            const gameAliasesString = Object.keys(gameAliases).join(", ");
            return this.send(`[ERROR] Invalid game argument. Valid arguments are: ${gameAliasesString}.`);
        }

        const game = gameAliases[gameArg.toLowerCase()];


        // then look for a player name (any remaining argument)
        const targetPlayer = args.find(arg => !Object.keys(gameAliases).includes(arg.toLowerCase())) || player;
        const hypixelPlayer = await hypixel.getPlayer(targetPlayer); 
        if (!hypixelPlayer) throw "Player not found.";

        const stats = hypixelPlayer.stats?.tntgames;
        if (!stats || Object.keys(stats).length === 0) { 
            throw `${hypixelPlayer.nickname} has never played TNT games.`; 
        }
        
        const winstreak = stats.winstreak;

        if (game === "tntrun") { 
            const { wins, deaths, record } = stats.tntrun;
            this.send(`${hypixelPlayer.nickname}'s TNT Run: W ${wins} L ${deaths} | Best time: ${record}s | WS ${winstreak}`);
        } else if (game === "pvprun") { 
            const { kills, wins, deaths, record } = stats.pvprun;
            this.send(`${hypixelPlayer.nickname}'s PvP Run: K ${kills} W ${wins} L ${deaths} Best time: ${record}s | WS ${winstreak}`);
        } else if (game === "tnttag") { 
            const { wins } = stats.tnttag;
            this.send(`${hypixelPlayer.nickname}'s TNT Tag: W ${wins} WS ${winstreak}`);
        } else if (game === "bowspleef") { 
            const { wins, deaths } = stats.bowspleef;
            this.send(`${hypixelPlayer.nickname}'s Bow Spleef: W ${wins} L ${deaths} | WS ${winstreak}`);
        } else if (game === "wizards") { 
            const { wins, assists, KDRatio, deaths } = stats.wizards;
            this.send(`${hypixelPlayer.nickname}'s Wizards: W ${wins} A ${assists} KDR ${KDRatio} D ${deaths} | WS ${winstreak}`);
        }
       
    } catch (error) { 
        this.send(formatError(error));
    } 
  }
}

module.exports = TNTGamesStatsCommand;