const minecraftCommand = require("../../contracts/minecraftCommand.js");
const { delay } = require("../../contracts/helperFunctions.js");
const { getUUID } = require("../../contracts/API/mowojangAPI.js");

const TitlesCommand = require("./duelsTitlesCommand.js");
const UrchinCommand = require("./urchinCommand.js");
const PlayerCommand = require("./playerCommand.js");

class PlayerOverviewCommand extends minecraftCommand {
  /** @param {import("minecraft-protocol").Client} minecraft */
  constructor(minecraft) {
    super(minecraft);

    this.name = "overview";
    this.aliases = [];
    this.description = "Shows an overview for a specified player by running informative commands. Invokes !titles, !urchin, and !player.";
    this.options = [
      {
        name: "player",
        description: "The player to show an overview for",
        required: true
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
      const targetPlayer = args[0] || player;

      // first check if the target player exists
      const targetPlayerUUID = await getUUID(targetPlayer);
      if (!targetPlayerUUID) {
        return this.send(`[ERROR] Player ${targetPlayer} not found.`);
      }

      const titlesCommand = new TitlesCommand(this.minecraft);
      const urchinCommand = new UrchinCommand(this.minecraft);
      const playerCommand = new PlayerCommand(this.minecraft);

      await titlesCommand.onCommand(targetPlayer, message);
      await delay(1000);
      await urchinCommand.onCommand(targetPlayer, message);
      await delay(1000);
      await playerCommand.onCommand(targetPlayer, message);
      
    } catch (error) {
      this.send(`[ERROR] ${error}`);
    }
  }
}

module.exports = PlayerOverviewCommand;
