const { formatError } = require("../../contracts/helperFunctions.js");
const minecraftCommand = require("../../contracts/minecraftCommand.js");
const hypixel = require("../../contracts/API/HypixelRebornAPI.js");
const messages = require("../../../messages.json");

class helpCommand extends minecraftCommand {
  /** @param {import("minecraft-protocol").Client} minecraft */
  constructor(minecraft) {
    super(minecraft);

    this.name = "help";
    this.aliases = ["h"];
    this.description = "Displays the help message.";
    this.options = [
      {
        name: "command",
        description: `An optional command to receive information about.`,
        required: false
      },
    ];
    
  }

  /**
   * @param {string} player
   * @param {string} message
   * */
  async onCommand(player, message) {
    const args = this.getArgs(message);

    if (args.length < 1) {
      this.send(messages.helpMessage);
      return;
    }
    
    const command_name = args[0].toLowerCase();
    let cmd;
    
    try {
      for (const c of this.all_commands) {
        if (c.name === command_name || (c.aliases && c.aliases.includes(command_name))) {
          cmd = c;
          break;
        }
      }

      if (!cmd) {
        this.send(`Couldn't find command "${command_name}".`);
        return;
      }
      
      // build the base command info
      const aliasText = (cmd.aliases && cmd.aliases.length !== 0) ? cmd.aliases.join("/") : "No aliases";
      let finalMessage = `${cmd.name} (${aliasText}) | ${cmd.description ?? "No description"}`;

      // append options if they exist
      if (cmd.options && cmd.options.length > 0) {
        let options_messages = [];
        for (const opt of cmd.options) {
          options_messages.push(`${opt.name}: ${opt.description}${opt.required ? " (required)" : ""}`);
        }
        
        finalMessage += ` ➔ ${options_messages.join(" | ")}`;
      }
      
      this.send(finalMessage);
      
    } catch (error) { 
      this.send(formatError(error)); 
    } 
  }
}

module.exports = helpCommand;