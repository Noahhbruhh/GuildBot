const { formatError } = require("../../contracts/helperFunctions.js");
const { resolveUsernameOrUUID } = require("../../contracts/API/mowojangAPI.js");
const minecraftCommand = require("../../contracts/minecraftCommand.js");

/** @type {((p1: string, p2: string) => string)[]} */
const cuddleMessages = [
  (p1, p2) => `${p1} has been cuddled by ${p2} <3`,
  (p1, p2) => `${p2} gives ${p1} a cozy cuddle <3`,
  (p1, p2) => `${p2} cuddles up with ${p1}! <3`,
  (p1, p2) => `${p2} snuggles in close with ${p1} <3`
];

class CuddleCommand extends minecraftCommand {
  /** @param {import("minecraft-protocol").Client} minecraft */
  constructor(minecraft) {
    super(minecraft);

    this.name = "cuddle";
    this.aliases = [];
    this.description = "Cuddle somebody!";
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
        this.send("You can't cuddle nobody!");
        return;
      }

      try {
        const username = (await resolveUsernameOrUUID(args[0])).username;
        const message = cuddleMessages[Math.floor(Math.random() * cuddleMessages.length)];

        if (username.toLowerCase() === player.toLowerCase()) {
          return this.send("you can't cuddle yourself! Try cuddling someone else instead");
        }

        this.send(message(username, player));
      } catch (error) {
        return this.send("Invalid username.");
      }
    } catch (error) {
      this.send(formatError(error));
    }
  }
}

module.exports = CuddleCommand;
