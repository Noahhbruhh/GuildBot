const { Embed } = require("../../contracts/embedHandler.js");

module.exports = {
  name: "online",
  description: "List of online members.",
  requiresBot: true,

  execute: async (interaction) => {
    const cachedMessages = [];
    const messages = new Promise((resolve, reject) => {
      const listener = (message) => {
        message = message.toString();

        cachedMessages.push(message);
        if (message.startsWith("Offline Members")) {
          bot.removeListener("message", listener);
          resolve(cachedMessages);
        }
      };

      bot.on("message", listener);
      bot.chat("/g online");

      setTimeout(() => {
        bot.removeListener("message", listener);
        reject("Command timed out. Please try again.");
      }, 5000);
    });

    const message = await messages;

    const onlineMembers = message.find((m) => m.startsWith("Online Members: "));
    const totalMembers = message.find((message) => message.startsWith("Total Members: "));

    const selfUsernameLower = bot.username?.trim().toLowerCase();
    const onlineMembersList = message;
    const online = [];
    let onlineCount = 0;

    onlineMembersList.forEach((item, index) => {
      if (item.includes("-- ") === false) return;

      const nextLine = onlineMembersList[parseInt(index) + 1];
      if (nextLine.includes("●") === false) return;

      const rank = item.replaceAll("--", "").trim();
      const players = nextLine
        .split("●")
        .map((item) => item.trim())
        .filter((item) => item)
        .filter((player) => {
          const normalizedPlayer = player.replace(/§[0-9a-fk-or]/g, "").trim();
          return normalizedPlayer.toLowerCase() !== selfUsernameLower;
        });

      if (players.length === 0) return;

      onlineCount += players.length;
      online.push(`**${rank}**\n${players.map((item) => `\`${item}\``).join(", ")}`);
    });

    const adjustedOnlineMembers = onlineMembers?.replace(/\d+/, onlineCount.toString());

    const description = `${totalMembers}\n${adjustedOnlineMembers}\n\n${online.join("\n")}`;
    const embed = new Embed().setAuthor({ name: "Online Members" }).setDescription(description);

    return await interaction.followUp({ embeds: [embed] });
  }
};
