const minecraftCommand = require("../../contracts/minecraftCommand.js");
const { prettyName } = require("../../contracts/helperFunctions.js");

class IQCommand extends minecraftCommand {
  /** @param {import("minecraft-protocol").Client} minecraft */
  constructor(minecraft) {
    super(minecraft);

    this.name = "iq";
    this.aliases = ["smart"];
    this.description = "Get someone's IQ.";
    this.options = [
      {
        name: "player",
        description: "Player to get IQ of",
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

      const iq = Math.floor(Math.random() * 200) + 1; // Random IQ between 1 and 200
      this.send(`${await prettyName(targetPlayer)} has ${iq} IQ.`);
      
    } catch (error) {
      this.send(`[ERROR] ${error}`);
    }
  }
}

module.exports = IQCommand;
