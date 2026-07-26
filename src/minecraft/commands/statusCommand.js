const { formatError } = require("../../contracts/helperFunctions.js");
const { getUUID } = require("../../contracts/API/mowojangAPI.js");
const minecraftCommand = require("../../contracts/minecraftCommand.js");
const hypixel = require("../../contracts/API/HypixelRebornAPI.js");
const config = require("../../../config.json");
// @ts-ignore
const { get } = require("axios");

class StatusCommand extends minecraftCommand {
  /** @param {import("minecraft-protocol").Client} minecraft */
  constructor(minecraft) {
    super(minecraft);

    this.name = "status";
    this.aliases = ["sts", "online"];
    this.description = "Online status of specified user.";
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
      if (args.length < 1) {
        this.send("Invalid usage. Usage: !status/sts/online <username>");
        return;
      }
      const targetPlayer = args[0];
      const hypixelPlayer = await hypixel.getPlayer(targetPlayer); if (!hypixelPlayer) { throw "Player not found."; }
      const uuid = await getUUID(targetPlayer);

      // hypixel API GET request
      try {
        const response = await get(`https://api.hypixel.net/v2/status?key=${config.minecraft.API.hypixelAPIkey}&uuid=${uuid}`);
        const data = response.data;
        
        if (data.success === false) {
          throw new Error("Request to Hypixel API failed. Please try again!");
        }
        
        const session = data.session;
      
        if (session.online === false) {
          const lastLogoutText = hypixelPlayer.lastLogoutTimestamp ? `Last logout: ${new Date(hypixelPlayer.lastLogoutTimestamp).toLocaleString()}` : "Logout API OFF";
          const lastPlayedText = hypixelPlayer.recentlyPlayedGame ? `| Last played ${hypixelPlayer.recentlyPlayedGame.name}` : "";
          this.send(`${hypixelPlayer.nickname} appears to be offline. ${lastLogoutText} ${lastPlayedText}`);
          return;
        }

        console.log(hypixelPlayer);

        const mapText = session.map ? ` on ${session.map}` : "";
      
        this.send(`${hypixelPlayer.nickname} is playing ${session.gameType} : ${session.mode.replace("_", " ")}${mapText}`);
      
      } catch (error) {
        if (error.response && error.response.status === 429) {
          this.send("[ERROR] You are being ratelimited. Please wait before trying again.");
        } else {
          this.send(`[ERROR] Something went wrong: ${error.message || error}`);
          console.error(error);
        }
      }
        
    } catch (error) { 
      this.send(formatError(error));
    } 
  }
}

module.exports = StatusCommand;
