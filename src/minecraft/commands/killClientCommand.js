const { formatNumber, formatError, isStaff, delay } = require("../../contracts/helperFunctions.js");
const { getUUID } = require("../../contracts/API/mowojangAPI.js");
const minecraftCommand = require("../../contracts/minecraftCommand.js");
const hypixel = require("../../contracts/API/HypixelRebornAPI.js");
const messages = require("../../../messages.json");
const config = require("../../../config.json");

class KillClientCommand extends minecraftCommand {
  constructor(minecraft) {
    super(minecraft);
    this.name = "restart";
    this.aliases = ["die", "shutdown", "killclient"];
    this.description = "Disconnects the bot.";
    this.options = [];
  }

  async onCommand(player, message) {
    console.log(`[KILLCLIENT] Restart triggered by ${player}...`);

    try {
      if (this.minecraft && this.minecraft.bridge) {
        const bridge = this.minecraft.bridge;

        if (bridge.stateHandler && typeof bridge.stateHandler.getChannel === "function") {
          const channel = await bridge.stateHandler.getChannel("Guild");

          if (channel) {
            const uuid = await getUUID(player).catch(() => null);
            const avatarUrl = `https://mc-heads.net/avatar/${uuid || "steve"}/64`;

            await channel.send({
              embeds: [
                {
                  color: 16755200, // #FFAA00
                  description: `⚙️ **Restart**\nA restart was requested by **${player}**.`,
                  thumbnail: {
                    url: avatarUrl
                  }
                }
              ]
            }).catch(err => console.error("Discord send error:", err));
          }
        }
      }

      this.send(`${player} is disconnecting me...`)

      await delay(2000);
      
      console.log("[KILLCLIENT] Message sent successfully. Exiting process.");
      process.exit(0);

    } catch (error) {
      console.error("Couldn't kill client:", error);
      process.exit(1);
    }
  }
}

module.exports = KillClientCommand;