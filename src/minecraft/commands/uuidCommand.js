const { formatNumber, formatError } = require("../../contracts/helperFunctions.js");
const { getUUID, resolveUsernameOrUUID } = require("../../contracts/API/mowojangAPI.js");
const minecraftCommand = require("../../contracts/minecraftCommand.js");
const hypixel = require("../../contracts/API/HypixelRebornAPI.js");
const config = require("../../../config.json");
// @ts-ignore
const { get } = require("axios");

class UUIDCommand extends minecraftCommand {
  /** @param {import("minecraft-protocol").Client} minecraft */
  constructor(minecraft) {
    super(minecraft);

    this.name = "uuid";
    this.aliases = [];
    this.description = "Get a user's UUID.";
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

      const args = this.getArgs(message);
      const username = (args.length < 1) ? player : args[0];

      this.send(`${(await resolveUsernameOrUUID(username)).username}'s UUID : ${await getUUID(username)}`);


    } catch (error) { 
      this.send(formatError(error));
    } 
  }
}

module.exports = UUIDCommand;
