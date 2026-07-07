const { SuccessEmbed } = require("../../contracts/embedHandler.js");

module.exports = {
  name: "acceptinvite",
  description: "Accepts a guild join request by running /g accept.",
  moderatorOnly: true,
  requiresBot: true,
  options: [
    {
      name: "username",
      description: "Minecraft Username",
      type: 3,
      required: true
    },
  ],

  execute: async (interaction) => {
    const [name] = [interaction.options.getString("username")];
    bot.chat(`/g accept ${name}`);

    const embed = new SuccessEmbed(`Successfully ran \`/guild accept ${name}\`!`);

    await interaction.followUp({
      embeds: [embed]
    });
  }
};
