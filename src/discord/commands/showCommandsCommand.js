const fs = require("fs");
const config = require("../../../config.json");
const { Embed } = require("../../contracts/embedHandler.js");
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

const page_size = 10;

module.exports = {
  name: "cmds",
  description: "Display all Minecraft commands with pagination.",
  options: [
    {
      name: "page",
      description: `Command page. Each page shows ${page_size} commands.`,
      type: 4,
      required: false
    }
  ],

  execute: async (interaction) => {
    try {
      const all_commands = fs
        .readdirSync("./src/minecraft/commands")
        .filter((file) => file.endsWith(".js"))
        .map((file) => new (require(`../../minecraft/commands/${file}`))());

      const max_page = Math.max(1, Math.ceil(all_commands.length / page_size));
      let page = interaction.options.getInteger("page") || 1;
      if (page < 1) page = 1;
      if (page > max_page) page = max_page;

      const buildEmbed = (p) => {
        const section = all_commands.slice((p - 1) * page_size, Math.min(p * page_size, all_commands.length));
        const description = section
          .map((cmd) => `\`${config.minecraft.bot.prefix}${cmd.name}\` (${cmd.aliases?.join(", ") || "No aliases"}) — ${cmd.description ?? "No description"}`)
          .join("\n");

        const embed = new Embed()
          .setTitle(`Minecraft Commands (Page ${p}/${max_page})`)
          .setDescription(description || "No commands available.");

        return embed;
      };

      const prevButton = new ButtonBuilder().setCustomId(`showCommands_prev_${interaction.user.id}`).setLabel("◀️ Prev").setStyle(ButtonStyle.Primary);
      const nextButton = new ButtonBuilder().setCustomId(`showCommands_next_${interaction.user.id}`).setLabel("Next ▶️").setStyle(ButtonStyle.Primary);

      const row = new ActionRowBuilder().addComponents(prevButton, nextButton);

      const message = await interaction.followUp({ embeds: [buildEmbed(page)], components: [row] });

      // disable buttons if only single page
      if (max_page <= 1) {
        prevButton.setDisabled(true);
        nextButton.setDisabled(true);
        await message.edit({ components: [new ActionRowBuilder().addComponents(prevButton, nextButton)] });
        return;
      }

      const filter = (i) => i.user.id === interaction.user.id && i.customId && i.customId.startsWith("showCommands_");
      const collector = message.createMessageComponentCollector({ filter, time: 120000 });

      collector.on("collect", async (btnInteraction) => {
        try {
          await btnInteraction.deferUpdate();
          if (btnInteraction.customId.includes("prev")) {
            page = Math.max(1, page - 1);
          } else if (btnInteraction.customId.includes("next")) {
            page = Math.min(max_page, page + 1);
          }

          // update embed
          await message.edit({ embeds: [buildEmbed(page)] });
        } catch (e) {
          console.error(e);
        }
      });

      collector.on("end", async () => {
        try {
          prevButton.setDisabled(true);
          nextButton.setDisabled(true);
          await message.edit({ components: [new ActionRowBuilder().addComponents(prevButton, nextButton)] });
        } catch (e) {
          console.error(e);
        }
      });
    } catch (error) {
      console.error(error);
    }
  }
};
