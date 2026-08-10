const minecraftCommand = require("../../contracts/minecraftCommand.js");
const hypixel = require("../../contracts/API/HypixelRebornAPI.js");
const { delay } = require("../../contracts/helperFunctions.js");
const { getUUID } = require("../../contracts/API/mowojangAPI.js");

const TitlesCommand = require("./duelsTitlesCommand.js");
const UrchinCommand = require("./urchinCommand.js");
const PlayerCommand = require("./playerCommand.js");
const GuildCommand = require("./guildCommand.js");

class PlayerOverviewCommand extends minecraftCommand {
  /** @param {import("minecraft-protocol").Client} minecraft */
  constructor(minecraft) {
    super(minecraft);

    this.name = "overview";
    this.aliases = [];
    this.description = "Shows an overview for a specified player by running informative commands. Invokes !titles, !urchin, !player and !guild commands.";
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

      const playerCommand = new PlayerCommand(this.minecraft);
      const guildCommand = new GuildCommand(this.minecraft);
      const titlesCommand = new TitlesCommand(this.minecraft);
      const urchinCommand = new UrchinCommand(this.minecraft);

      const guild = await hypixel.getGuild("player", targetPlayer, { noCaching: false });

      const commands = [
        playerCommand,
        guild ? guildCommand : null,
        titlesCommand,
        urchinCommand,
      ].filter(Boolean);

      for (const command of commands) {
        if (!command) { continue; } // error resolving! this is already handled in the filter
        await command.onCommand(targetPlayer, targetPlayer);
        await delay(1000);
      }
      
    } catch (error) {
      this.send(`[ERROR] ${error}`);
    }
  }
}

module.exports = PlayerOverviewCommand;
