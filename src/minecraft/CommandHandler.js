const { Collection } = require("discord.js");
const config = require("../../config.json");
const axios = require("axios");
const fs = require("fs");

class CommandHandler {
  /** @param {import("minecraft-protocol").Client} minecraft */
  constructor(minecraft) {
    this.minecraft = minecraft;

    this.prefix = config.minecraft.bot.prefix;
    this.commands = new Collection();

    const commandFiles = fs.readdirSync("./src/minecraft/commands").filter((file) => file.endsWith(".js"));
    for (const file of commandFiles) {
      const command = new (require(`./commands/${file}`))(minecraft);

      this.commands.set(command.name, command);
    }
  }

  handle(player, message, officer) {

    const cleanMessage = message.replace(/§[0-9a-fk-or]/gi, "").trim();
    
    const isPrivate = cleanMessage.startsWith("From ");
    let targetPlayer = player;
    let privateMessage = cleanMessage;
    let privateResponder = null;
    
    if (isPrivate) {
      // Accounts for optional ranks like [VIP], [MVP++], etc.
      const match = cleanMessage.match(/^From (?:\[.*?\]\s*)?(\w+): (.+)$/);
      if (match) {
        privateResponder = match[1];
        privateMessage = match[2];
        targetPlayer = privateResponder;
      } else {
        return; 
      }
    }
  
    if (privateMessage.startsWith(this.prefix)) {
      if (config.minecraft.commands.normal === false) {
        return;
      }
  
      const args = privateMessage.slice(this.prefix.length).trim().split(/ +/);
      const commandName = args.shift().toLowerCase();
      const command = this.commands.get(commandName) ?? this.commands.find((cmd) => cmd.aliases && cmd.aliases.includes(commandName));
  
      if (command === undefined) {
        return;
      }
      
      console.minecraft(`${targetPlayer} - [${command.name}] ${privateMessage}`);
      command.officer = officer;
      
      if (isPrivate) {
        command.setPrivateContext(targetPlayer);
      } else {
        command.clearPrivateContext();
      }
      
      command.onCommand(targetPlayer, privateMessage);
      
    } else if (privateMessage.startsWith("-") && privateMessage.startsWith("- ") === false) {
      if (config.minecraft.commands.soopy === false || privateMessage.at(1) === "-") {
        return;
      }
  
      const command = privateMessage.slice(1).split(" ")[0];
      if (isNaN(parseInt(command.replace(/[^-()\d/*+.]/g, ""))) === false) {
        return;
      }
  
      // Use "w {player}" for private responses, "oc" or "gc" for public
      const chat = isPrivate ? `w ${privateResponder}` : (officer ? "oc" : "gc");
  
      bot.chat(`/${chat} [SOOPY V2] ${privateMessage}`);
  
      console.minecraft(`${targetPlayer} - [${command}] ${privateMessage}`);
      (async () => {
        try {
          const URI = encodeURI(`https://soopy.dev/api/guildBot/runCommand?user=${targetPlayer}&cmd=${privateMessage.slice(1)}`);
          const response = await axios.get(URI);
  
          if (response?.data?.msg === undefined) {
            return bot.chat(`/${chat} [SOOPY V2] An error occured while running the command`);
          }
  
          bot.chat(`/${chat} [SOOPY V2] ${response.data.msg}`);
        } catch (e) {
          bot.chat(`/${chat} [SOOPY V2] ${e.cause ?? e.message ?? "Unknown error"}`);
        }
      })();
    }
  }
}

module.exports = CommandHandler;
