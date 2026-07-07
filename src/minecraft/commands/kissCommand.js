const { formatNumber, formatError } = require("../../contracts/helperFunctions.js");
const { resolveUsernameOrUUID } = require("../../contracts/API/mowojangAPI.js");
const minecraftCommand = require("../../contracts/minecraftCommand.js");
const hypixel = require("../../contracts/API/HypixelRebornAPI.js");
const config = require("../../../config.json");
// @ts-ignore
const { get } = require("axios");

const kissMessages = [
  (p1, p2) => `${p1} has been kissed by ${p2} <3`,
  (p1, p2) => `${p2} gives ${p1} a warm kiss <3`,
  (p1, p2) => `${p2} kisses ${p1}! <3`,
  (p1, p2) => `${p2} shares a wonderful kiss with ${p1} <3`
];

class KissCommand extends minecraftCommand {
  /** @param {import("minecraft-protocol").Client} minecraft */
  constructor(minecraft) {
    super(minecraft);

    this.name = "kiss";
    this.aliases = [];
    this.description = "Kiss somebody! (requested by @Alirezamil)";
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
        this.send("You can't kiss nobody!");
        return;
      }

      try {
        const username = (await resolveUsernameOrUUID(args[0])).username;
        const message = kissMessages[Math.floor(Math.random() * kissMessages.length)];

        if (username.toLowerCase() === player.toLowerCase()) {
          return this.send("why are you trying to kiss yourself? smh")
        }
        
        this.send(message(username, player));
        
      } catch (error) {
        return this.send("Invalid username.")
      }


    } catch (error) { 
      this.send(formatError(error));
    } 
  }
}

module.exports = KissCommand;
