const { formatError } = require("../../contracts/helperFunctions.js");
const minecraftCommand = require("../../contracts/minecraftCommand.js");

class RandomCommandCommand extends minecraftCommand {
  /** @param {import("minecraft-protocol").Client} minecraft */
  constructor(minecraft) {
    super(minecraft);

    this.name = "randomcommand";
    this.aliases = ["randomcmd", "random"];
    this.description = "Displays information about a random command.";
    this.options = [];
  }

  /**
   * @param {string} player
   * @param {string} message
   * */
  async onCommand(player, message) {
    try {
      const disallowedCommands = ["randomcommand", "help", "cmds"]
      const validCommands = this.all_commands.filter(
        cmd => cmd && cmd.name !== this.name && !(disallowedCommands.includes(cmd.name))
      );

      if (validCommands.length === 0) {
        return this.send("No other valid commands found to randomize.");
      }

      const cmd = validCommands[Math.floor(Math.random() * validCommands.length)];

      // taken from helpCommand.js

      // build the base command info
      const aliasText = (cmd.aliases && cmd.aliases.length !== 0) ? cmd.aliases.join("/") : "No aliases";
      let finalMessage = `${cmd.name} (${aliasText}) || ${cmd.description ?? "No description"}`;

      // append options if they exist
      if (cmd.options && cmd.options.length > 0) {
        let options_messages = [];
        for (const opt of cmd.options) {
          options_messages.push(`<${opt.name}>: ${opt.description}${opt.required ? " (required)" : ""}`);
        }
        
        finalMessage += ` ➔ Options: ${options_messages.join(" || ")}`;
      }
      
      this.send(finalMessage);
      
    } catch (error) { 
      this.send(formatError(error)); 
    } 
  }
}

module.exports = RandomCommandCommand;