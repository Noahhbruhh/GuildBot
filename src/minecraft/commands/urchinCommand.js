const { formatError } = require("../../contracts/helperFunctions.js");
const minecraftCommand = require("../../contracts/minecraftCommand.js");
const { resolveUsernameOrUUID, getUUID } = require("../../contracts/API/mowojangAPI.js");

const API_KEY = "4c3afa72-6a7f-4c6b-b03d-aa48f450e4ef" // cherryrntz's key! please dont steal it </3

class UrchinCommand extends minecraftCommand {
  /** @param {import("minecraft-protocol").Client} minecraft */
  constructor(minecraft) {
    super(minecraft);

    this.name = "urchin";
    this.aliases = ["tags"];
    this.description = "Check a provided user on the Urchin database.";
    this.options = [
      {
        name: "username",
        description: "Minecraft username",
        required: true
      },
    ];
  }

  /**
   * @param {string} player
   * @param {string} message
   * */
  async onCommand(player, message) {

    const args = this.getArgs(message);
    
    const username = (args[0] || player).toLowerCase();
    const uuid = getUUID(username);
    let formatted_username;

    try {
      formatted_username = (await resolveUsernameOrUUID(username)).username;
    } catch (error) {
      this.send("[ERROR] Player does not exist.") // janky please forgive me </3
      return;
    }
    
    try {
      const url = `https://api.urchin.gg/v3/player/tags?player=${encodeURIComponent(username)}&key=${API_KEY}`;
      // const url = `https://api.urchin.gg/v3/cubelify?uuid=${uuid}&key=4c3afa72-6a7f-4c6b-b03d-aa48f450e4ef`;

      const res = await fetch(url);
      if (res.status === 404) {
        this.send(`${formatted_username} has no tags in Urchin. (404 error)`)
        return;
      }

      if (!res.ok) {
        throw `Urchin API error: ${res.status}`
        return;
      }

      const data = await res.json();
      const tags = /** @type {{tag_type: string, added_on: string, reason: string}[]} */ (data.tags);

      console.log(data);

      if (tags.length === 0) {
        this.send(`${formatted_username} has no Urchin tags.`);
        return;
      }
      
      let s = `${formatted_username} >> `;
      
      tags.forEach((/** @type {{tag_type: string, added_on: string, reason: string}} */ tag) => {
        let ftag;

        const daysAgo = Math.floor(Math.abs(Date.now() - new Date(tag.added_on).getTime()) / (1000 * 60 * 60 * 24));
        
        switch(tag.tag_type) {
          case "sniper": ftag = "SNIPER"; break;
          case "blatant_cheater": ftag = "BLATANT CHEATER"; break;
          case "closet_cheater": ftag = "CLOSET CHEATER"; break;
          case "confirmed_cheater": ftag = "CONFIRMED CHEATER"; break;
          case "replays_needed": ftag = "Replays Needed"; break
          default: ftag = tag.tag_type; break;
        }

        const reasontag = tag.reason.length > 0 ? `| ${tag.reason} (added ${daysAgo} days ago) ` : ""
        
        s = s + `${ftag} ${reasontag}`;
      });

      this.send(s.substring(0, 250));
      
    } catch (error) { 
      this.send(formatError(error)); 
    } 
  }
}

module.exports = UrchinCommand;
