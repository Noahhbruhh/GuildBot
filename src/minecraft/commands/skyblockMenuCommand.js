const { formatError, delay } = require("../../contracts/helperFunctions.js");
const minecraftCommand = require("../../contracts/minecraftCommand.js");
const messages = require("../../../messages.json");

const skyblockCommands = [
  "accessories", "auctionhouse", "bestiary",
  "catacombs", "chocolate", "crimsonisle",
  "dojo", "essence", "fairysouls",
  "fetchur", "forge", "garden", 
  "hotm", "jacob", "kuudra",
  "mayor", "networth", "personalbest", 
  "armor", "equipment", "item", 
  "pet", "skills", "stats", 
  "level", "skills", "slayers", 
  "specialmayor", "trophyfish"
]

class skyblockMenuCommand extends minecraftCommand {
  /** @param {import("minecraft-protocol").Client} minecraft */
  constructor(minecraft) {
    super(minecraft);

    this.name = "skyblock";
    this.aliases = ["sb"];
    this.description = "Displays the Skyblock Commands page.";
    this.options = [
      {
        name: "command",
        description: `A command to receive information about.`,
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
      this.send(messages.skyblockMenuMessage);
      return;
    }
    
    const command_name = args[0].toLowerCase();

    if (!skyblockCommands.includes(command_name) && args[0] !== "cmds") {
      return this.send(`Couldn't find command "${command_name}": not in the commands list. Run !sb cmds to see the list.`)
    }
    
    let cmd;
    
    try {
      for (const c of this.all_commands) {
        if (c.name === command_name || (c.aliases && c.aliases.includes(command_name))) {
          cmd = c;
          break;
        }
      }

      if (!cmd) {
        return this.send(`Couldn't find command "${command_name}" but it was in the list!`);
      }
      
      // Check for 'cmds' keyword
      if (args[0] === "cmds") {
        // Loop through the array 10 commands at a time
        for (let i = 0; i < skyblockCommands.length; i += 10) {
          // Slice out a group of 10 commands
          const chunk = skyblockCommands.slice(i, i + 10);
          
          // Send each chunk formatted as a single message
          this.send(`Skyblock Commands [${i + 1}–${Math.min(i + 10, skyblockCommands.length)}]: ${chunk.join(", ")}`);
          await delay(1500);
        }
        return;
      }

      // SILENT INVOCATION
      
      cmd.officer = this.officer;
      cmd.isPrivate = this.isPrivate;
      cmd.privatePlayer = this.privatePlayer;

      await cmd.onCommand(player, `!${cmd.name} ${args.slice(1).join(" ")}`.trim());
      
    } catch (error) { 
      this.send(formatError(error)); 
    } 
  }
}

module.exports = skyblockMenuCommand;