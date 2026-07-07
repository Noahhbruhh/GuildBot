const { getLatestProfile } = require("../../../API/functions/getLatestProfile.js");
const minecraftCommand = require("../../contracts/minecraftCommand.js");
const { formatNumber } = require("../../contracts/helperFunctions.js");
const { getHotm } = require("../../../API/stats/hotm.js");

class HotmCommand extends minecraftCommand {
  /** @param {import("minecraft-protocol").Client} minecraft */
  constructor(minecraft) {
    super(minecraft);

    this.name = "hotm";
    this.aliases = ["mining"];
    this.description = "Skyblock Hotm Stats of specified user.";
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
      const args = this.getArgs(message);
      player = args[0] || player;

      const { username, profile, profileData } = await getLatestProfile(player);
      const rawXp = profile?.mining_core?.experience || 0;

      if (!profile?.mining_core) {
        throw `${username} has never gone to Dwarven Mines on ${profileData.cute_name}.`;
      }

      const hotmXpTable = {
        1: 0,      2: 3000,   3: 9000,   4: 25000,  5: 60000,
        6: 100000, 7: 150000, 8: 220000, 9: 300000, 10: 400000
      };

      let calculatedLevel = 1;
      for (let l = 1; l <= 10; l++) {
        if (rawXp >= hotmXpTable[l]) {
          calculatedLevel = l;
        } else {
          break;
        }
      }

      let levelWithProgress = calculatedLevel;
      if (calculatedLevel < 10) {
        const xpThisLevelStart = hotmXpTable[calculatedLevel];
        const xpNextLevelStart = hotmXpTable[calculatedLevel + 1];
        const totalXpNeededForNext = xpNextLevelStart - xpThisLevelStart;
        const playerXpInCurrentLevel = rawXp - xpThisLevelStart;
        
        levelWithProgress = calculatedLevel + (playerXpInCurrentLevel / totalXpNeededForNext);
      }

      const mithrilTotal = (profile.mining_core.powder_mithril || 0) + (profile.mining_core.powder_spent_mithril || 0);
      const gemstoneTotal = (profile.mining_core.powder_gemstone || 0) + (profile.mining_core.powder_spent_gemstone || 0);
      const glaciteTotal = (profile.mining_core.powder_glacite || 0) + (profile.mining_core.powder_spent_glacite || 0);
      const selectedAbility = profile.mining_core.selected_ability || "None";

      const formattedAbility = selectedAbility.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

      this.send(
        `${username}'s Hotm: ${formatNumber(levelWithProgress, 2)} | Gemstone Powder: ${formatNumber(
          gemstoneTotal
        )} | Mithril Powder: ${formatNumber(mithrilTotal)} | Glacite Powder: ${formatNumber(glaciteTotal)} | Selected Ability: ${formattedAbility}`
      );

    } catch (error) {
      this.send(`[ERROR] ${error}`);
    }
  }
}

module.exports = HotmCommand;
