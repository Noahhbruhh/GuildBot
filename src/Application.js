const MinecraftManager = require("./minecraft/MinecraftManager.js");
const { existsSync, mkdirSync, writeFileSync } = require("fs");
const DiscordManager = require("./discord/DiscordManager.js");
const webManager = require("./web/WebsiteManager.js");

class Application {
  constructor() {
    require("./Configuration.js");
    require("./Updater.js");
    require("./Logger.js");
    silenceDependencyNotices();
    if (!existsSync("./data/")) mkdirSync("./data/", { recursive: true });
    if (!existsSync("./data/linked.json")) writeFileSync("./data/linked.json", JSON.stringify({}));
    if (!existsSync("./data/inactivity.json")) writeFileSync("./data/inactivity.json", JSON.stringify({}));
  }

  async register() {
    this.discord = new DiscordManager(this);
    this.minecraft = new MinecraftManager(this);
    this.web = new webManager(this);

    this.discord.setBridge(this.minecraft);
    this.minecraft.setBridge(this.discord);
  }

  async connect() {
    this.discord.connect();
    this.minecraft.connect();
    this.web.connect();

    // keep processes alive
    setInterval(() => {
      if (global.gc) global.gc(); // Optional garbage collection hint if enabled
    }, 600000); 
  }
}

/**
 * skyhelper-networth polls npm every 10 minutes and warns that a newer version
 * exists, which put thousands of identical lines into the logs. Only the
 * version check is stopped here; networth calculation is untouched.
 */
function silenceDependencyNotices() {
  try {
    require("skyhelper-networth").UpdateManager.disable();
  } catch (error) {
    // older copies do not expose UpdateManager; nothing to silence
  }
}

module.exports = new Application();
