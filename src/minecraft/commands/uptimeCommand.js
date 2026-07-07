const minecraftCommand = require("../../contracts/minecraftCommand.js");

class UptimeCommand extends minecraftCommand {
  /** @param {import("minecraft-protocol").Client} minecraft */
  constructor(minecraft) {
    super(minecraft);

    this.name = "uptime";
    this.aliases = ["up", "runtime"];
    this.description = "Displays how long the bot has been online.";
    this.options = [];
  }

  /**
   * @param {string} player
   * @param {string} message
   * */
  async onCommand(player, message) {
    try {
      const totalSeconds = process.uptime();

      // --- Date formatting
      const days = Math.floor(totalSeconds / (3600 * 24));
      const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = Math.floor(totalSeconds % 60);

      const timeSegments = [];
      if (days > 0) timeSegments.push(`${days}d`);
      if (hours > 0) timeSegments.push(`${hours}h`);
      if (minutes > 0) timeSegments.push(`${minutes}m`);
      if (seconds > 0 || timeSegments.length === 0) timeSegments.push(`${seconds}s`);
      // ---

      this.send(`Bot Uptime: ${timeSegments.join(" ")}`);

    } catch (error) {
      this.send(`[ERROR] Failed to calculate uptime: ${error.message}`);
    }
  }
}

module.exports = UptimeCommand;