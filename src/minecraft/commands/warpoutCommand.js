const { delay } = require("../../contracts/helperFunctions.js");
const minecraftCommand = require("../../contracts/minecraftCommand.js");

class warpoutCommand extends minecraftCommand {
  /** @param {import("minecraft-protocol").Client} minecraft */
  constructor(minecraft) {
    super(minecraft);
    this.name = "warpout";
    this.aliases = ["warp"];
    this.description = "Warp players out of the game. Provide names separated by spaces.";
    this.options = [];
    this.isOnCooldown = false;
  }
  /**
   * @param {string} player
   * @param {string} message
   * */
  async onCommand(player, message) {
    try {
      if (this.isOnCooldown) {
        return this.send(`Command is on cooldown!`);
      }

      this.isOnCooldown = true;

      let partySize = 0;

      const users = this.getArgs(message);
      if (users === undefined) {
        throw "Please provide a username.";
      }

      this.send("Partying players...");

      // @ts-ignore
      const warpoutListener = async (message) => {
        message = message.toString();

        if (message.includes("You cannot invite that player since they're not online.")) {
          this.isOnCooldown = false;
          // this.send(`A player is offline!`);
          // await delay(1500);
          partySize += 1;
          
        } else if (message.includes("You cannot invite that player")) {
          this.isOnCooldown = false;
          // this.send(`A player has party requests disabled!`);
          // await delay(1500);
          partySize += 1;
        } 
          
        // else if (message.includes("invited") && message.includes("to the party! They have 60 seconds to accept.")) {
        //   this.send(`Partying player...`)
        //   await delay(1500);
        // } 
        else if (message.includes(" joined the party.")) {
          partySize += 1;
          if (partySize === users.length) {
            bot.chat("/lobby megawalls");
            await delay(1500);
            bot.chat("/p warp");
            await delay(1500);
            bot.chat("/p warp");
            await delay(1500);
            
            this.isOnCooldown = false;
            this.send(`Ran /p warp!`);
            bot.chat("/p disband");
            await delay(1500);
            bot.chat("/limbo");
          }
        }
        
        // else if (message.includes(" cannot warp from Limbo")) {
        //   this.isOnCooldown = false;
        //   this.send(`Player cannot be warped from Limbo!`);
        //   partySize += 1;
        //   await delay(1500);
          
        // } else if (message.includes(" is not allowed on your server!")) {
        //   this.isOnCooldown = false;
        //   this.send(`A player is not allowed on my server!`);
        //   partySize += 1;
        //   await delay(1500);
          
        // } else if (message.includes("You are not allowed to invite players.")) {
        //   bot.removeListener("message", warpoutListener);
        //   this.isOnCooldown = false;
        //   this.send(`Somehow I'm not allowed to invite players? Disbanding party...`);
        //   bot.chat("/p disband");
        //   await delay(1500);
        //   bot.chat("/limbo");
          
        // } else if (message.includes("You are not allowed to disband this party.")) {
        //   bot.removeListener("message", warpoutListener);
        //   this.isOnCooldown = false;
        //   this.send(`Somehow I'm not allowed to disband this party? Leaving party..`);
        //   bot.chat("/p leave");
        //   await delay(1500);
        //   bot.chat("/limbo");
          
        // } else if (message.includes("You can't party warp into limbo!")) {
        //   bot.removeListener("message", warpoutListener);
        //   this.isOnCooldown = false;
        //   this.send(`Somehow I'm inside in limbo? Disbanding party..`);
        //   bot.chat("/p disband");
          
        // } else if (message.includes("Couldn't find a player with that name!")) {
        //   bot.removeListener("message", warpoutListener);
        //   this.isOnCooldown = false;
        //   this.send(`Couldn't find a player with that name!`);
          
        // } else if (message.includes("You cannot party yourself!")) {
        //   bot.removeListener("message", warpoutListener);
        //   this.isOnCooldown = false;
        //   this.send(`I cannot party myself!`);
          
        // } else if (message.includes("didn't warp correctly!")) {
        //   bot.removeListener("message", warpoutListener);
        //   this.isOnCooldown = false;
        //   this.send(`A player didn't warp correctly!`);
        // }
      };

      bot.on("message", warpoutListener);
      bot.chat(`/p invite ${users.join(" ")} `);
      setTimeout(() => {
        bot.removeListener("message", warpoutListener);

        if (this.isOnCooldown === true) {
          this.send("Disbanding party...");
          bot.chat("/p disband");
          bot.chat("/limbo");

          this.isOnCooldown = false;
        }
      }, 30000);
    } catch (error) {
      this.send(`${player} [ERROR] ${error || "Something went wrong.."}`);
      this.isOnCooldown = false;
    }
  }
}

module.exports = warpoutCommand;
