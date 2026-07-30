/*                                                  */
/*            HEAVILY requested by Tryqo            */
/*                                                  */

const { formatError } = require("../../contracts/helperFunctions.js");
const { resolveUsernameOrUUID } = require("../../contracts/API/mowojangAPI.js");
const minecraftCommand = require("../../contracts/minecraftCommand.js");

class SniffCommand extends minecraftCommand {
  /** @param {import("minecraft-protocol").Client} minecraft */
  constructor(minecraft) {
    super(minecraft);

    this.name = "sniff";
    this.aliases = [];
    this.description = "Sniff somebody..? (requested by @Tryqo)";
    this.options = [
      {
        name: "username",
        description: "Minecraft username",
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

      this.send(`Permanently banning ${player}...`);

    } catch (error) { 
      this.send(formatError(error));
    } 
  }
}

module.exports = SniffCommand;
