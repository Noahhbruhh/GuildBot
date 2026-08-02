#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { EventEmitter } = require("events");

const projectRoot = path.resolve(__dirname, "..");
const commandsDir = path.join(projectRoot, "src", "minecraft", "commands");
const configPath = path.join(projectRoot, "config.json");

global.bot = new EventEmitter();
global.bot.username = "0bamaGang";
global.bot._client = { chat: () => {} };
global.bot.chat = async () => {};

function ensureConfigFile() {
  if (fs.existsSync(configPath)) return;

  const exampleConfig = path.join(projectRoot, "config.example.json");
  if (fs.existsSync(exampleConfig)) {
    fs.copyFileSync(exampleConfig, configPath);
    return;
  }

  const fallbackConfig = {
    minecraft: {
      bot: {
        prefix: "!",
        messageFormat: "{username} » {message}",
        messageRepeatBypassLength: 24
      }
    }
  };

  fs.writeFileSync(configPath, JSON.stringify(fallbackConfig, null, 2));
}

function loadCommands() {
  ensureConfigFile();

  const files = fs.readdirSync(commandsDir).filter((file) => file.endsWith(".js")).sort();
  const loaded = [];

  for (const file of files) {
    try {
      const fullPath = path.join(commandsDir, file);
      const CommandClass = require(fullPath);
      const instance = new CommandClass({});

      if (typeof instance.onCommand === "function") {
        loaded.push({
          file,
          name: instance.name || path.basename(file, ".js"),
          aliases: instance.aliases || [],
          instance
        });
      }
    } catch (error) {
      console.warn(`Skipping ${file}:\n${error.stack}`);
    }
  }

  return loaded;
}

function normalizeCommandText(input) {
  return input.trim();
}

function getCommandMatch(commands, input) {
  const normalized = normalizeCommandText(input);
  if (!normalized) return null;

  const withoutPrefix = normalized.replace(/^([!\-])/, "").trim();
  const firstToken = withoutPrefix.split(/\s+/)[0]?.toLowerCase();

  if (!firstToken) return null;

  return commands.find((command) => {
    const names = [command.name, ...(command.aliases || [])].map((value) => String(value).toLowerCase());
    return names.includes(firstToken);
  }) || null;
}

async function runCommand(command, input) {
  const outputs = [];
  command.instance.send = async (message) => {
    if (message === undefined || message === null || message === "") return;
    outputs.push(String(message));
  };

  await command.instance.onCommand("cherryrntz", input);

  if (outputs.length === 0) {
    console.log("[no response]");
    return;
  }

  for (const message of outputs) {
    console.log(message);
  }
}

function printHelp(commands) {
  console.log("Type a command like !help, !tntgames, or !skyblock Player");
  console.log("Type 'list' to show commands, or 'quit' to exit.\n");
  console.log("Available commands:");
  for (const command of commands) {
    const aliases = command.aliases?.length ? ` (${command.aliases.join(", ")})` : "";
    console.log(`- ${command.name}${aliases}`);
  }
}

async function main() {
  const commands = loadCommands();
  console.log(`Loaded ${commands.length} command handlers.`);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true
  });

  let activeCommand = Promise.resolve();

  rl.setPrompt("command> ");
  printHelp(commands);

  rl.on("line", async (input) => {
    const raw = input.trim();
    if (!raw || raw === "quit" || raw === "exit") {
      rl.close();
      return;
    }

    if (raw === "list" || raw === "help") {
      printHelp(commands);
      rl.prompt();
      return;
    }

    const command = getCommandMatch(commands, raw);
    if (!command) {
      console.log(`Unknown command: ${raw}`);
      rl.prompt();
      return;
    }

    activeCommand = (async () => {
      try {
        await runCommand(command, raw);
      } catch (error) {
        console.error(`Command failed: ${error.message}`);
      }

      rl.prompt();
    })();
  });

  rl.on("close", () => {
    activeCommand.finally(() => {
      console.log("Goodbye.");
      process.exit(0);
    });
  });

  rl.prompt();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
