const minecraftCommand = require("../../contracts/minecraftCommand.js");
const { prettyName } = require("../../contracts/helperFunctions.js");

const SUPER_IQ_CHANCE = 0.1;

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

      // recursively test super IQ chance and keep track of successes until failure
      let superIQCount = 0;
      while (Math.random() < SUPER_IQ_CHANCE) {
        superIQCount++;
      }

      const iq = Math.floor(Math.random() * 200) + 1 + superIQCount * 100;

      // add 1 exclam for each super IQ
      this.send(`${await prettyName(targetPlayer)} has ${iq} IQ${"!".repeat(superIQCount + 1)}`);
      
    } catch (error) {
      this.send(`[ERROR] ${error}`);
    }
  }
}

module.exports = IQCommand;
