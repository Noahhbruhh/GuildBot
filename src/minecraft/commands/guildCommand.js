const minecraftCommand = require("../../contracts/minecraftCommand.js");
const hypixel = require("../../contracts/API/HypixelRebornAPI.js");
const { formatNumber, formatError, titleCase } = require("../../contracts/helperFunctions.js");

class GuildInformationCommand extends minecraftCommand {
  /** @param {import("minecraft-protocol").Client} minecraft */
  constructor(minecraft) {
    super(minecraft);

    this.name = "guild";
    this.aliases = ["g"];
    this.description = "View information of a guild";
    this.options = [
      {
        name: "guild",
        description: "Guild name",
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

      const args = this.getArgs(message.replace("_", " "));
      let guild;

      // default to own guild
      if (args.length === 0) {
        guild = await hypixel.getGuild("player", player, {noCaching: false});
      } else {
        const guildName = args
          .map((arg) => titleCase(arg))
          .join(" ");
  
        guild = await hypixel.getGuild("name", guildName, { noCaching: false });
      }
      if (!guild) {
        return this.send(`Guild ${guildName} not found (use _ in place of spaces)`);
      }

      this.send(
        `Guild ${guild.name} | Tag: [${guild.tag}] | Members: ${guild.members.length} | Level: ${guild.level} | Weekly GEXP: ${formatNumber(guild.totalWeeklyGexp)}`
      );
    } catch (error) {
      this.send(formatError(error));
    }
  }
}

module.exports = GuildInformationCommand;
