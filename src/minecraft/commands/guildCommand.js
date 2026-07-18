const minecraftCommand = require("../../contracts/minecraftCommand.js");
const hypixel = require("../../contracts/API/HypixelRebornAPI.js");
const { formatNumber, formatError, titleCase } = require("../../contracts/helperFunctions.js");

class GuildInformationCommand extends minecraftCommand {
  /** @param {import("minecraft-protocol").Client} minecraft */
  constructor(minecraft) {
    super(minecraft);

    this.name = "guild";
    this.aliases = ["g"];
    this.description = "View information about a guild";
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

      const args = this.getArgs(message);
      let guild;

      // default to own guild
      if (args.length === 0) {
        guild = await hypixel.getGuild("player", player, {noCaching: false});
      // otherwise get from argument
      } else {
        guild = await hypixel.getGuild("name", args.join(" "), {noCaching: false});
      }

      const tagMessage = guild.tag ? `[${guild.tag}] ` : "";

      this.send(
        `${tagMessage}${guild.name} | ${guild.members.length} members | LEVEL ${guild.level} | ${formatNumber(guild.totalWeeklyGexp)} Weekly GEXP`
      );
    } catch (error) {
      this.send(formatError(error));
    }
  }
}

module.exports = GuildInformationCommand;
