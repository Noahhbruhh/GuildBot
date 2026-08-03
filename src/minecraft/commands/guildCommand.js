const minecraftCommand = require("../../contracts/minecraftCommand.js");
const hypixel = require("../../contracts/API/HypixelRebornAPI.js");
const { formatNumber, formatError, scaledGEXP } = require("../../contracts/helperFunctions.js");
const { getUsername } = require("../../contracts/API/mowojangAPI.js")

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

      const guildMasterUUID = guild.members[0].uuid;
      const guildMasterUsername = await getUsername(guildMasterUUID);
      const tagMessage = guild.tag ? `[${guild.tag}] ` : "";

      // Scale all exp in exp history then sum
      const scaledWeeklyGexp = guild.expHistory.map((datum) => scaledGEXP(datum.exp)).reduce((a, b) => a + b, 0);

      this.send(
        ` (${guild.level}) ${tagMessage}${guild.name} | ${guild.members.length} members, owned by ${guildMasterUsername} | ${formatNumber(guild.totalWeeklyGexp)} Raw WGEXP ${formatNumber(scaledWeeklyGexp)} Scaled WGEXP`
      );
    } catch (error) {
      this.send(formatError(error));
    }
  }
}

module.exports = GuildInformationCommand;
