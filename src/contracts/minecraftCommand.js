const { splitMessage, delay, generateID } = require("./helperFunctions.js");
const config = require("../../config.json");
const fs = require("fs");
const path = require("path");

let commandsCache = null;

class minecraftCommand {
  /** @param {import("minecraft-protocol").Client} minecraft */
  constructor(minecraft) {
    this.minecraft = minecraft;
    this.officer = false;
    this.isPrivate = false;
    this.privatePlayer = null;
  }

  get all_commands() {
    // If we already loaded them once, return the cached array instantly
    if (commandsCache) return commandsCache;

    const commandDir = path.join(__dirname, "../minecraft/commands");
    
    commandsCache = fs
      .readdirSync(commandDir)
      .filter(f => f.endsWith(".js"))
      .map(f => {
        try {
          const CommandClass = require(path.join(commandDir, f));
          return new CommandClass(this.minecraft);
        } catch (err) {
          console.error(`Failed to load command file ${f}:`, err);
          return null;
        }
      })
      .filter(cmd => cmd !== null);

    return commandsCache;
  }

  /**
   * Returns the arguments of a message.
   * @param {string} message
   * @returns {string[]}
   * */
  getArgs(message) {
    const args = message.split(" ");

    args.shift();

    return args;
  }

  /**
   * Sends a message in the Minecraft chat.
   * @param {string} message
   * @param {number} maxRetries - Maximum number of retries (default: 5)
   * @param {boolean} isErrorMessage - Flag to prevent recursive error messages
   */
  async send(message, maxRetries = 5, isErrorMessage = false) {
    if (!bot?._client?.chat) {
      return;
    }

    const startTime = Date.now();
    const maxExecutionTime = 10000;

    if (message.length > 256) {
      const messages = splitMessage(message, 256);
      for (const msg of messages) {
        await delay(1500);
        await this.send(msg, maxRetries, isErrorMessage);

        if (Date.now() - startTime > maxExecutionTime) {
          console.error("Message sending timed out after 10 seconds");
          return;
        }
      }
      return;
    }

    try {
      const sendMessage = async () => {
        return /** @type {Promise<void>} */ (
          new Promise((resolve, reject) => {
            const listener = async (/** @type {{ toString: () => any; }} */ msg) => {
              const msgStr = msg.toString();

              if (msgStr.includes("You are sending commands too fast!") && !msgStr.includes(":")) {
                bot.removeListener("message", listener);
                reject(new Error("rate-limited"));
              }

              if (msgStr.includes("You cannot say the same message twice!") && !msgStr.includes(":")) {
                bot.removeListener("message", listener);
                reject(new Error("duplicate-message"));
              }
            };

            bot.once("message", listener);

            // Automatically determine chat type: private, officer chat, or guild chat
            const chatType = this.isPrivate ? `w ${this.privatePlayer}` : (this.officer ? "oc" : "gc");
            bot.chat(`/${chatType} ${message}`);

            setTimeout(() => {
              bot.removeListener("message", listener);
              resolve();
            }, 500);
          })
        );
      };

      for (let i = 0; i < maxRetries; i++) {
        try {
          await sendMessage();
          return;
        } catch (error) {
          if (Date.now() - startTime > maxExecutionTime) {
            console.error("Message sending timed out after 10 seconds");
            return;
          }

          // @ts-ignore
          if (error.message === "rate-limited") {
            if (i === maxRetries - 1) {
              this.send(`Command failed to send message after ${maxRetries} attempts. Please try again later.`, 1);
              if (!isErrorMessage) {
                console.error(`Command failed to send message after ${maxRetries} attempts due to rate limiting.`);
              }
              return;
            }
            await delay(2000);
            continue;
          }

          // @ts-ignore
          if (error.message === "duplicate-message") {
            await delay(100);
            const randomId = generateID(config.minecraft.bot.messageRepeatBypassLength);
            const maxLength = 256 - randomId.length - 3; // -3 for space
            message = `${message.substring(0, maxLength)} - ${randomId}`;
            continue;
          }
          throw error;
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
  }

  /**
   * Sets the private message context for this command execution.
   * @param {string} player - The player who sent the private message
   */
  setPrivateContext(player) {
    this.isPrivate = true;
    this.privatePlayer = player;
  }

  /**
   * Clears the private message context (resets to public chat).
   */
  clearPrivateContext() {
    this.isPrivate = false;
    this.privatePlayer = null;
  }

  /**
   * Executes the command.
   * @param {string} player
   * @param {string} message
   */
  onCommand(player, message) {
    throw new Error("Command onCommand method is not implemented yet!");
  }
}

module.exports = minecraftCommand;