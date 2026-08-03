const { formatNumber, formatError, getDivision, TIERS, REDUCED_REQUIREMENT_GAMEMODES } = require("../../contracts/helperFunctions.js");
const minecraftCommand = require("../../contracts/minecraftCommand.js");
const hypixel = require("../../contracts/API/HypixelRebornAPI.js");

class DuelsStatsCommand extends minecraftCommand {
  /** @param {import("minecraft-protocol").Client} minecraft */
  constructor(minecraft) {
    super(minecraft);

    this.name = "duels";
    this.aliases = ["duel", "d"];
    this.description = "Duel stats of specified user or self.";
    this.options = [
      {
        name: "username",
        description: "Minecraft username",
        required: false
      },
      {
        name: "duel",
        description: "Type of a duel",
        required: false
      },
      {
        name: "teammode",
        description: "A team mode e.g. 2v2",
        required: false
      },
      {
        name: "type",
        description: "Switch to ratio or rankup view",
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
      /**
       * @type {Record<string, string>}
       */
      const duelAliases = {
        arena: "arena",
        bedwars: "bedwars",
        bw: "bedwars",
        bedwarsrush: "bedwarsrush",
        bwrush: "bedwarsrush",
        bwr: "bedwarsrush",
        bridge: "bridge",
        b: "bridge",
        blitz: "blitz",
        bow: "bow",
        bowspleef: "bowspleef",
        boxing: "boxing",
        classic: "classic",
        combo: "combo",
        megawalls: "megawalls",
        nb: "nodebuff",
        nodebuff: "nodebuff",
        op: "op",
        parkour: "parkour",
        quakecraft: "quakecraft",
        quake: "quakecraft",
        qc: "quakecraft",
        skywars: "skywars",
        sumo: "sumo",
        sw: "skywars",
        uhc: "uhc",
      };

      // argument bullshit </3
      //
  
      const args = this.getArgs(message);

      // find type keyword ("ratio" or "rankup") if it exists
      const isRatio = args.some(arg => arg.toLowerCase() === "ratio");
      const isRankup = args.some(arg => arg.toLowerCase() === "rankup");
      let remaining = (isRatio || isRankup) ? args.filter(arg => !["ratio", "rankup"].includes(arg.toLowerCase())) : args;
      
      // find anything from duelAliases exclusively
      const duelArg = remaining.find(arg => duelAliases[arg.toLowerCase()]);
      const duel = duelArg ? duelAliases[duelArg.toLowerCase()] : undefined;
      
      // filter out the mode argument from the pool if it was found
      if (duelArg) remaining = remaining.filter(arg => arg !== duelArg);
      
      const dummyPlayer = await hypixel.getPlayer(bot.username);
      const validSubModes = Object.keys(dummyPlayer?.stats?.duels?.[duel] ?? {});
      
      // find anything from the sub-modes (if a duel mode exists)
      const typeArg = duel ? remaining.find(arg => validSubModes.includes(arg.toLowerCase()) || arg.toLowerCase() === "legacy") : null;
      const teamMode = isRankup ? "legacy" : typeArg || undefined; // force legacy if rankup (we need )
      
      // filter out the duel type argument if it was found
      if (typeArg) remaining = remaining.filter(arg => arg !== typeArg);
      
      // get player argument from whatever's left! and breathe
      const targetPlayer = remaining[0] ?? player;

      //
      // argument bullshit end <3

      // get hypixel player and duel stats
      //

      const hypixelPlayer = await hypixel.getPlayer(targetPlayer); 
      if (!hypixelPlayer) throw "Player not found.";
      
      if (!hypixelPlayer.stats?.duels) { 
        throw `${hypixelPlayer.nickname} has never played duels.`; 
      }
      
      const duelsRoot = hypixelPlayer.stats.duels;
      
      // init boooo
      let wins = 0;
      let losses = 0;
      let winstreak = 0;
      let bestWinstreak = 0;
      let wlRatio = 0;
      let prefixMode = "MAIN";
      let duelData;
      
      // no duel mode given...
      if (duel === undefined) {
        // ...global overall stats
        wins = duelsRoot.wins ?? 0;
        losses = duelsRoot.losses ?? 0;
        winstreak = duelsRoot.winstreak ?? 0;
        bestWinstreak = duelsRoot.bestWinstreak ?? 0;
        wlRatio = duelsRoot.WLRatio ?? 0;
        
      // duel mode given...
      } else {
        // ...specific mode stats
        duelData = duelsRoot[duel] ?? {};
        const hasOverallBranch = "overall" in duelData;

        // if a team mode is given...
        if (teamMode) {
          // ...specific team mode branch
          const selectedMode = teamMode.toLowerCase() === "legacy" ? "overall" : teamMode;
          
          if (!(selectedMode in duelData)) {
            const validTeams = Object.keys(duelData).join(", ");
            return this.send(`[ERROR] "${teamMode}" is not a valid mode for that duel. Options: ${validTeams}`);
          }
      
          const teamData = duelData[selectedMode] ?? {};
          wins = teamData.wins ?? 0;
          losses = teamData.losses ?? 0;
          winstreak = teamData.winstreak ?? 0;
          bestWinstreak = teamData.bestWinstreak ?? 0;
          wlRatio = teamData.WLRatio ?? 0;
          prefixMode = teamMode.toLowerCase() === "legacy" ? "TOTAL" : teamMode.toUpperCase();
        }

        // if not, overall branch found...
        else if (hasOverallBranch) {
          // ...sum stats from all branches except overall
          // (since hypixel's "overall") ignores modes like 3s and 4s
          
          // sum mode branches (ignoring deleted games; might need to update if i miss any !!)
          winstreak = duelData.overall?.winstreak ?? 0;
          bestWinstreak = duelData.overall?.bestWinstreak ?? 0;

          // summing loop
          for (const [k, v] of Object.entries(duelData)) {
            // deleted games are HERE vv
            if (["overall", "2v2v2v2", "3v3v3v3", "ctf"].includes(k)) continue;
            // deleted games are HERE ^^
            wins += v.wins ?? 0;
            losses += v.losses ?? 0;
          }
          wlRatio = losses > 0 ? parseFloat((wins / losses).toFixed(2)) : parseFloat(wins.toFixed(2));
        } 
          
        // no overall branch (meaning we are in the stats directory)...
        else {
          // ...stats straight from the root
          wins = duelData?.wins ?? 0;
          losses = duelData?.losses ?? 0;
          winstreak = duelData?.winstreak ?? 0; 
          bestWinstreak = duelData?.bestWinstreak ?? 0; 
          wlRatio = duelData?.WLRatio ?? 0; 
        }
      }

      // output vv
      //

      const prefix = duel 
        ? `[${prefixMode} ${duel.toUpperCase()}]` 
        : `[Duels]`;
      const divisionWins = !duel 
        ? wins
        : (teamMode && duelData?.overall?.wins != null ? duelData.overall.wins : wins);
      // use the overall win total for team submodes so division reflects total wins, not mode-only wins
      const division = getDivision(divisionWins, duel);

      // ratio check
      if (isRatio) {
        const nextWLR = Math.ceil(wlRatio);
        const difference = nextWLR - wlRatio;

        const nextWins = nextWLR * losses;    // WLR = wins / losses -> wins = WLR * losses
        const winIncrease = nextWins - wins;
        const pctWinIncrease = winIncrease / wins * 100;

        return this.send(`${prefix} ${division} ${hypixelPlayer.nickname}'s next WLR: ${nextWLR} (+${difference.toFixed(2)}) | Wins at next WLR: ${nextWins} (+${winIncrease} / ${pctWinIncrease.toFixed(1)}%) | +${(1 / losses).toPrecision(3)} WLR per win`)
      } // return gateway! we dont need to `} else {`

      // rankup check
      if (isRankup) {
        const titleName = division.split(" ")[0].toLowerCase();
        const currentTier = TIERS.find(t => t.name.toLowerCase() === titleName);
        const actualDivisionWins = divisionWins;

        if (!currentTier) { return this.send("[ERROR] Couldn't find your current division?"); } // just error resolving!

        let scaledDivisionWins = actualDivisionWins;
        if (duel === undefined) {
          scaledDivisionWins /= 2;
        } else if (REDUCED_REQUIREMENT_GAMEMODES.includes(duel)) {
          scaledDivisionWins *= 2;
        }

        const { start, step } = currentTier;
        const sub = Math.floor((scaledDivisionWins - start) / step);

        let nextRankupWins = start + (sub + 1) * step;
        if (duel === undefined) {
          nextRankupWins *= 2;
        } else if (REDUCED_REQUIREMENT_GAMEMODES.includes(duel)) {
          nextRankupWins /= 2;
        }

        const nextRankupDiff = nextRankupWins - actualDivisionWins;
        const nextRankupPct = actualDivisionWins > 0
          ? (nextRankupDiff / actualDivisionWins * 100).toFixed(1)
          : "N/A";

        const nextDivision = getDivision(nextRankupWins, duel);
        
        return this.send(`${hypixelPlayer.nickname}'s next division is ${nextDivision} at ${nextRankupWins} Wins (+${nextRankupDiff}${actualDivisionWins > 0 ? ` / ${nextRankupPct}%` : ""})`);
      }
      
      const winstreakText = bestWinstreak === 0 
        ? "WS OFF" 
        : `WS ${winstreak} BWS ${bestWinstreak}`;
      
      return this.send(`${prefix} ${division} ${hypixelPlayer.nickname} W ${formatNumber(wins)} L ${formatNumber(losses)} WLR ${wlRatio} | ${winstreakText}`); 
       
    } catch (error) { 
      this.send(formatError(error));
    } 
  }
}

module.exports = DuelsStatsCommand;
