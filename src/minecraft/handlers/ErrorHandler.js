const eventHandler = require("../../contracts/EventHandler.js");
// eslint-disable-next-line
const Logger = require("../.././Logger.js");

class StateHandler extends eventHandler {
  /** @param {import("../MinecraftManager.js")} minecraft */
  constructor(minecraft) {
    super();

    this.minecraft = minecraft;
  }

  registerEvents(bot) {
    this.bot = bot;

    this.bot.on("error", (...args) => this.onError(...args));
  }

  onError(error) {
    // Once logged in, a dropped connection also raises "end", and that is what
    // drives the reconnect. Before login there is no "end", so this handler is
    // the only chance to retry — it used to just log and give up for good.
    const loggedIn = this.bot?.player !== undefined;

    if (this.isConnectionRefusedError(error)) {
      console.error("Connection refused while attempting to login via the Minecraft client");
    } else if (!this.isConnectionResetError(error)) {
      console.warn(error);
    }

    if (loggedIn === false) {
      this.minecraft.stateHandler.onFailedLogin(`failed to connect (${error.code ?? error.message})`);
    }
  }

  isConnectionResetError(error) {
    return error.code && error.code == "ECONNRESET";
  }

  isConnectionRefusedError(error) {
    return error.code && error.code == "ECONNREFUSED";
  }
}

module.exports = StateHandler;
