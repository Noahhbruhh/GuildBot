const { formatNumber, formatError } = require("../../contracts/helperFunctions.js");
const minecraftCommand = require("../../contracts/minecraftCommand.js");
const hypixel = require("../../contracts/API/HypixelRebornAPI.js");
const { getUUID } = require("../../contracts/API/mowojangAPI.js");

class PlayerCommand extends minecraftCommand {
  /** @param {import("minecraft-protocol").Client} minecraft */
  constructor(minecraft) {
    super(minecraft);

    this.name = "player";
    this.aliases = ["p", "me"];
    this.description = "Get Hypixel Player Stats";
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
      
      player = this.getArgs(message)[0] || player;
      const { achievementPoints, nickname, rank, karma, level, guild, giftsSent } = await hypixel.getPlayer(player, {
        guild: true
      });

      const uuid = await getUUID(player);
      const member = guild?.members.find(m => m.uuid === uuid);

      if (member === undefined) {
        throw "[ERROR] Got guild from player, but not guild from member?"; // this won't ever happen
      }

      const guildMessage = guild 
        ? `[${guild.name} ${member.rank} with ${formatNumber(member.weeklyExperience, 0)} GEXP] ` 
        : "";

      this.send(
        `(${level}) ${nickname} ${guildMessage}| ${formatNumber(karma, 0)} Karma | ${formatNumber(achievementPoints, 0)} AP | ${giftsSent} Gifts`
      );
      
    } catch (error) {
      console.error(error);
      this.send(formatError(error));
    }
  }
}

module.exports = PlayerCommand;
