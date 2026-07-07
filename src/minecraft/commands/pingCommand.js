const { formatNumber, formatError } = require("../../contracts/helperFunctions.js");
const minecraftCommand = require("../../contracts/minecraftCommand.js");
const hypixel = require("../../contracts/API/HypixelRebornAPI.js");
const { resolveUsernameOrUUID, getUUID } = require("../../contracts/API/mowojangAPI.js");

const API_KEY = "6849d836-141f-6f99-ccef-f4e59127c737";
const POLL_PERIOD = 2; // days

class PingCommand extends minecraftCommand {
  /** @param {import("minecraft-protocol").Client} minecraft */
  constructor(minecraft) {
    super(minecraft);

    this.name = "ping";
    this.aliases = ["ms"];
    this.description = `Check a provided user's ping history (${POLL_PERIOD} days) through the Aurora API.`;
    this.options = [
      {
        name: "username",
        description: "Minecraft username",
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
    
    const username = args.length < 1 ? player : args[0];
    
    try {
      const uuid = await getUUID(username);
      const formattedUsername = (await resolveUsernameOrUUID(username)).username;
      
      const url = `https://bordic.xyz/api/v2/resources/ping?key=${API_KEY}&uuid=${uuid}`;
      const res = await fetch(url);

      if (!res.ok) {
        throw `Aurora / Bordic API error: ${res.status}`
        return;
      }

      const data = (await res.json()).data;

      // Get ping history over the last POLL_PERIOD days
      const recentData = data.slice(-POLL_PERIOD);

      const overallData = recentData.reduce((acc, datum, _, arr) => {
        acc.min = Math.min(acc.min, datum.min);
        acc.max = Math.max(acc.max, datum.max);
        acc.avg += datum.avg / arr.length;
        
        return acc;
        
      }, { min: 9999, avg: 0, max: 0 });

      this.send(`${formattedUsername}'s ping  : ${Math.round(overallData.min)}ms - avg ${Math.round(overallData.avg)}ms - ${Math.round(overallData.max)}ms`);
      
    } catch (error) { 
      this.send(formatError(error)); 
    } 
  }
}

module.exports = PingCommand;
