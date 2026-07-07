const fs = require("fs");

const { formatNumber, formatError, delay } = require("../../contracts/helperFunctions.js");
const minecraftCommand = require("../../contracts/minecraftCommand.js");
const hypixel = require("../../contracts/API/HypixelRebornAPI.js");
const messages = require("../../../messages.json");

class ImNewCommand extends minecraftCommand {
  /** @param {import("minecraft-protocol").Client} minecraft */
  constructor(minecraft) {
    super(minecraft);

    this.name = "imnew";
    this.aliases = [];
    this.description = "Displays information on how to use the bot for new players.";
    this.options = [];
  }

  /**
   * @param {string} player
   * @param {string} message
   * */
  async onCommand(player, message) {

    try {
      
      this.send(messages.imNewMessage);
      
    } catch (error) { 
      this.send(formatError(error)); 
    } 
  }
}

module.exports = ImNewCommand;