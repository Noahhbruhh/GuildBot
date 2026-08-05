const { formatError, delay } = require("../../contracts/helperFunctions.js");
const minecraftCommand = require("../../contracts/minecraftCommand.js");

const page_size = 8;

class ShowCommandsCommand extends minecraftCommand {
  /** @param {import("minecraft-protocol").Client} minecraft */
  constructor(minecraft) {
    super(minecraft);

    this.name = "cmds";
    this.aliases = ["cmd", "commands"];
    this.description = "Display all commands in a given page index.";
    this.options = [
      {
        name: "page",
        description: `Command page. Each page shows ${page_size} commands.`,
        required: true
      },
    ];
    
  }

  /**
   * @param {string} player
   * @param {string} message
   * */
  async onCommand(player, message) {

    const args = this.getArgs(message);
    const max_page = Math.ceil(this.all_commands.length / page_size)

    if (args.length < 1) {
      this.send(`Please specify a commands page (1-${max_page}).`);
      return;
    }
    
    const page = parseInt(args[0]);

    if (isNaN(page)) {
      this.send(`${page} is not a valid page number.`);
      return;
    }

    if (page > max_page) {
      this.send(`Page number is too big (1-${Math.floor(this.all_commands.length / page_size)}.`);
      return
    } else if (page <= 0) {
      this.send(`Page number must be positive.`);
      return
    }
    
    try {

      const command_section = this.all_commands.slice((page - 1) * page_size, Math.min(page * page_size, this.all_commands.length));
      
      for (const cmd of command_section) {
        // base line for the command
        bot.chat(`/w ${player} !${cmd.name} (${cmd.aliases?.join(", ") || "No aliases"}) || ${cmd.description ?? "No description"}`);
      
        // // if the command has options, append them
        // if (cmd.options && cmd.options.length) {
        //   cmd.options.forEach(opt => {
        //     bot.chat(`/w ${player} ${opt.name}: ${opt.description} ${opt.required ? "(required)" : "(optional)"}`);
        //   });
        // }

        await delay(1500);
        
      };
      
    } catch (error) { 
      this.send(formatError(error)); 
    } 
  }
}

module.exports = ShowCommandsCommand;
