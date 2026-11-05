const eventHandler = require("../../contracts/EventHandler.js");

// A connect attempt that never reaches "login" has to be retried on a timer.
// A failed Microsoft auth surfaces as an "error" with no "end" to follow, and
// because reconnection used to hang off "end" alone, a single bad token refresh
// left the bot offline until the process was restarted.
const LOGIN_TIMEOUT = 60000;
const RECONNECT_STEP = 15000;
const RECONNECT_MAX = 60000;

class StateHandler extends eventHandler {
  /** @param {import("../MinecraftManager.js")} minecraft */
  constructor(minecraft) {
    super();

    this.minecraft = minecraft;
    this.loginAttempts = 0;
    this.reconnectTimer = null;
    this.loginTimer = null;
  }

  registerEvents(bot) {
    this.bot = bot;

    this.bot.on("login", (...args) => this.onLogin(...args));
    this.bot.on("end", (...args) => this.onEnd(...args));
    this.bot.on("kicked", (...args) => this.onKicked(...args));
  }

  onLogin() {
    console.minecraft("Client ready, logged in as " + this.bot.username);

    this.loginAttempts = 0;
    this.clearTimers();
  }

  onEnd(reason) {
    // connect() quits the previous client with this reason before replacing it,
    // so it is a planned teardown rather than a disconnect worth reacting to.
    if (reason === "restart") return;

    this.scheduleReconnect(`has disconnected (${reason})`);
  }

  onKicked(reason) {
    console.warn(`Minecraft bot has been kicked from the server for "${reason}"`);
  }

  /**
   * Errors raised before login never produce an "end" event, so ErrorHandler
   * routes them here. Safe to call alongside onEnd — scheduleReconnect keeps
   * only the first request.
   * @param {string} why
   */
  onFailedLogin(why) {
    this.scheduleReconnect(why);
  }

  /** Catches a connect that neither logs in nor reports an error. */
  armLoginTimeout() {
    clearTimeout(this.loginTimer);

    this.loginTimer = setTimeout(() => {
      this.loginTimer = null;
      this.scheduleReconnect(`did not log in within ${LOGIN_TIMEOUT / 1000}s`);
    }, LOGIN_TIMEOUT);
  }

  /**
   * Queues a single reconnect. One failure often raises several events, so the
   * first wins and the rest are dropped until it has run; without that guard
   * each event started its own client and the duplicate sessions kicked each
   * other off Hypixel.
   * @param {string} why
   */
  scheduleReconnect(why) {
    if (this.reconnectTimer !== null) return;

    clearTimeout(this.loginTimer);
    this.loginTimer = null;

    this.loginAttempts++;
    const delay = Math.min(this.loginAttempts * RECONNECT_STEP, RECONNECT_MAX);
    console.warn(`Minecraft bot ${why}. Reconnecting in ${delay / 1000}s (attempt ${this.loginAttempts}).`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.minecraft.connect();
    }, delay);
  }

  clearTimers() {
    clearTimeout(this.reconnectTimer);
    clearTimeout(this.loginTimer);

    this.reconnectTimer = null;
    this.loginTimer = null;
  }
}

module.exports = StateHandler;
