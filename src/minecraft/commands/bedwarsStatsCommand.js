const { formatNumber, formatError, titleCase } = require("../../contracts/helperFunctions.js");
const minecraftCommand = require("../../contracts/minecraftCommand.js");
const hypixel = require("../../contracts/API/HypixelRebornAPI.js");

class BedwarsCommand extends minecraftCommand {
  /** @param {import("minecraft-protocol").Client} minecraft */
  constructor(minecraft) {
    super(minecraft);

    this.name = "bedwars";
    this.aliases = ["bw", "bws"];
    this.description = "BedWars stats of specified user.";
    this.options = [
      {
        name: "username",
        description: "Minecraft username",
        required: false
      },
      {
        name: "ratio",
        description: "Switch to ratio view",
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
      const args = this.getArgs(message).map((arg) => arg.replaceAll("/", ""));
      const allowedRatioKeywords = ["ratio", "ratios"];
      const isRatio = args.some((arg) => allowedRatioKeywords.includes(arg.toLowerCase()));
      let remaining = isRatio ? args.filter((arg) => !allowedRatioKeywords.includes(arg.toLowerCase())) : args;

      /** @type {Record<string, string>} */
      const modeAliases = {
        overall: "overall",
        all: "overall",
        solo: "solo",
        doubles: "doubles",
        threes: "threes",
        fours: "fours",
        "4v4": "4v4"
      };

      const normalizedModeArg = remaining.find((arg) => modeAliases[arg.toLowerCase()]);
      const mode = normalizedModeArg ? modeAliases[normalizedModeArg.toLowerCase()] : "overall";

      if (normalizedModeArg) {
        remaining = remaining.filter((arg) => arg !== normalizedModeArg);
      }

      const targetPlayer = remaining[0] ?? player;

      const hypixelPlayer = await hypixel.getPlayer(targetPlayer);
      if (hypixelPlayer === undefined) {
        return this.send(`Couldn't find player ${targetPlayer}.`);
      }

      if (hypixelPlayer?.stats?.bedwars === undefined) {
        return this.send(`${targetPlayer} has no BedWars Stats.`);
      }

      /** @type {Record<string, any>} */
      const bedwarsStats = hypixelPlayer.stats.bedwars;
      const modeStats = mode === "overall" ? bedwarsStats : bedwarsStats?.[mode];

      if (modeStats === undefined) {
        return this.send(`Invalid mode. Valid modes: overall, solo, doubles, threes, fours, 4v4`);
      }

      const { level } = bedwarsStats;
      const { finalKills, finalKDRatio, wins, losses, WLRatio, winstreak, finalDeaths } = modeStats;
      const { broken, lost, BLRatio } = modeStats.beds;

      if (isRatio) {
        const nextFKDR = Math.ceil(finalKDRatio);
        const difference = nextFKDR - finalKDRatio;
        const nextFinalKills = nextFKDR * finalDeaths;
        const killIncrease = nextFinalKills - finalKills;
        const pctKillIncrease = finalKills > 0 ? (killIncrease / finalKills) * 100 : 0;

        return this.send(
          `[${level}✫] ${hypixelPlayer.nickname}'s next FKDR: ${nextFKDR} (+${difference.toFixed(2)}) | FK at next FKDR: ${formatNumber(nextFinalKills)} (+${formatNumber(killIncrease)} / ${pctKillIncrease.toFixed(1)}%) | +${(1 / finalDeaths).toPrecision(3)} FKDR per kill`
        );
      }

      const modeText = ["overall", "all"].includes(mode) ? "" : ` [${mode.toUpperCase()}]`;

      this.send(
        `[${level}✫] ${hypixelPlayer.nickname}${modeText} FK ${formatNumber(finalKills)} FD ${formatNumber(finalDeaths)} FKDR ${finalKDRatio} | W ${formatNumber(wins)} L ${formatNumber(losses)} WLR ${WLRatio} | BB ${formatNumber(broken)} BL ${formatNumber(lost)} BLR ${BLRatio} | WS ${winstreak}`
      );
      
    } catch (error) {
      this.send(formatError(error));
    }
  }
}

module.exports = BedwarsCommand;
