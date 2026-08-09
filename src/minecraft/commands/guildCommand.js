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
        if (guild == null) {
          return this.send("[ERROR] You are not in a guild.");
        }
      // otherwise get from argument
      } else {
        guild = await hypixel.getGuild("name", args.join(" "), {noCaching: false});
      }

      if (guild == null) {
        return this.send("[ERROR] Could not find a guild with that name.");
      }

      // find player with "Guild Master" rank
      const guildMaster = guild.members.find((member) => member.rank === "Guild Master");
      const guildMasterUUID = guildMaster?.uuid;
      const guildMasterUsername = guildMasterUUID ? await getUsername(guildMasterUUID) : "Unknown";
      const tagMessage = guild.tag ? `[${guild.tag}] ` : "";

      // Scale all exp in exp history then sum
      const scaledWeeklyGexp = guild.expHistory.map((datum) => scaledGEXP(datum.exp)).reduce((a, b) => a + b, 0);

      this.send(
        `(${guild.level}) ${tagMessage}${guild.name} | ${guild.members.length} members, owned by ${guildMasterUsername} | ${formatNumber(guild.totalWeeklyGexp)} Raw GEXP (${formatNumber(scaledWeeklyGexp)} Scaled)`
      );
    } catch (error) {
      this.send(formatError(error));
    }
  }
}

module.exports = GuildInformationCommand;
