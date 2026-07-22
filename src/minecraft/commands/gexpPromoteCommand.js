const minecraftCommand = require("../../contracts/minecraftCommand.js");
const { formatError, isStaff, delay } = require("../../contracts/helperFunctions.js");
const hypixel = require("../../contracts/API/HypixelRebornAPI.js");
const { getUUID, getUsername } = require("../../contracts/API/mowojangAPI.js");
const messages = require("../../../messages.json");

class GexpPromoteCommand extends minecraftCommand {
  /** @param {import("minecraft-protocol").Client} minecraft */
  constructor(minecraft) {
    super(minecraft);

    this.name = "gexppromote";
    this.aliases = ["gprom"];
    this.description = "Promotes all members with sufficient guild EXP to be promoted.";
    this.options = [];
  }

  /**
   * @param {string} player
   * @param {string} message
   * */
  async onCommand(player, message) {
    try {
      /** @type {import('hypixel-api-reborn').Guild['members']} */
      const [uuid, guild] = await Promise.all([getUUID(player), hypixel.getGuild("player", bot.username, { noCaching: false })]);

      // Staff-only check
      if (!isStaff(uuid, guild)) {
        return this.send(messages.staffOnlyMessage);
      }

      let zeroGEXPPlayers = [];
      const chunkSize = 10;

      this.send("Promoting all members above 75k GEXP...");
      await delay(1500);

      for (const member of guild.members) {
        
        if (member.weeklyExperience > 75000 && member.rank === "Member") {
          bot.chat(`/g promote ${await getUsername(member.uuid)}`);
          await delay(1500);
        } else if (member.weeklyExperience === 0 && ["Member", "Elite"].includes(member.rank)) {
          zeroGEXPPlayers.push(await getUsername(member.uuid));
        }
      }

      bot.chat(`/oc Following MEMBERs and ELITEs have 0 GEXP:`);

      for (let i = 0; i < zeroGEXPPlayers.length; i += chunkSize) {
        const chunk = zeroGEXPPlayers.slice(i, i + chunkSize);
        await delay(1500);
        bot.chat(`/oc ${chunk.join(", ")}`);
      }
      
    } catch (error) {
      this.send(formatError(error));
    }
  }
}

module.exports = GexpPromoteCommand;
