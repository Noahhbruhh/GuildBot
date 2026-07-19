const fs = require("fs");

const { formatNumber, formatError, delay } = require("../../contracts/helperFunctions.js");
const minecraftCommand = require("../../contracts/minecraftCommand.js");
const hypixel = require("../../contracts/API/HypixelRebornAPI.js");
const messages = require("../../../messages.json");

const info_sections = {
  "discord" : messages.discordHelpMessage,
  "ranks" : messages.rankHelpMessage,
  "help" : messages.helpMessage,
  "usefulcommands" : messages.usefulCommandsMessage,
  "botinfo" : messages.botInfoMessage,
  "inactivity" : messages.inactivityInfoMessage
}

class InfoCommand extends minecraftCommand {
  /** @param {import("minecraft-protocol").Client} minecraft */
  constructor(minecraft) {
    super(minecraft);

    this.name = "info";
    this.aliases = [];
    this.description = "Displays information on how the guild and the guild bot works.";
    this.options = [];
  }

  /**
   * @param {string} player
   * @param {string} message
   * */
  async onCommand(player, message) {

    try {

      const section = this.getArgs(message)?.[0];
      const section_names = Object.keys(info_sections);

      if (section === undefined) {
        return this.send(`Select a category (${section_names.join(", ")}) by typing !info <section> into chat.`)
      }

      if (!(section in info_sections)) {
        return this.send(`Unrecognised section \"${section}\". Options: ${section_names.join(", ")}`);
      }
      
      return this.send(info_sections[section]);
        
    } catch (error) { 
      this.send(formatError(error)); 
      throw error;
    } 
  }
}

module.exports = InfoCommand;