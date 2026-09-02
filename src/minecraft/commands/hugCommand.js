const { formatError } = require("../../contracts/helperFunctions.js");
const { resolveUsernameOrUUID } = require("../../contracts/API/mowojangAPI.js");
const minecraftCommand = require("../../contracts/minecraftCommand.js");

/** @type {((p1: string, p2: string) => string)[]} */
const hugMessages = [
  (p1, p2) => `${p1} has been hugged by ${p2} <3`,
  (p1, p2) => `${p2} gives ${p1} a big warm hug <3`,
  (p1, p2) => `${p2} hugs ${p1}! <3`,
  (p1, p2) => `${p2} wraps ${p1} up in a tight hug <3`
];

class HugCommand extends minecraftCommand {
  /** @param {import("minecraft-protocol").Client} minecraft */
  constructor(minecraft) {
    super(minecraft);

    this.name = "hug";
    this.aliases = [];
    this.description = "Hug somebody!";
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
        this.send("You can't hug nobody!");
        return;
      }

      try {
        const username = (await resolveUsernameOrUUID(args[0])).username;
        const message = hugMessages[Math.floor(Math.random() * hugMessages.length)];

        if (username.toLowerCase() === player.toLowerCase()) {
          return this.send("lonely hug");
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

module.exports = HugCommand;
