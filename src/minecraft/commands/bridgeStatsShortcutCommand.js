const minecraftCommand = require("../../contracts/minecraftCommand.js");
const DuelsStatsCommand = require("./duelsStatsCommand.js");

class BridgeShortcutCommand extends minecraftCommand {
  constructor(minecraft) {
    super(minecraft);

    this.name = "bridge";
    this.aliases = ["b"];
    this.description = "Shortcut for !duels bridge <player>";
  }

  async onCommand(player, message) {
    message = message.trim();
    message = message.replace(/^(!|\/)?(bridge|b)\s*/i, "");
  
    const argsForDuels = message ? `!duels bridge ${message}` : "!duels bridge";
    const duelsCommand = new DuelsStatsCommand(this.minecraft);

    // Pass down the routing contexts to the new instance
    duelsCommand.officer = this.officer; 
    
    if (this.isPrivate) {
      duelsCommand.setPrivateContext(this.privatePlayer);
    } else {
      duelsCommand.clearPrivateContext();
    }
    
    await duelsCommand.onCommand(player, argsForDuels);
  }
}

module.exports = BridgeShortcutCommand;
