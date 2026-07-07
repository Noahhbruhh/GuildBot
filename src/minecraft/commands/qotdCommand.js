const minecraftCommand = require("../../contracts/minecraftCommand.js");
const { formatError } = require("../../contracts/helperFunctions.js");
const { get } = require("axios");

class QOTDCommand extends minecraftCommand {
  /** @param {import("minecraft-protocol").Client} minecraft */
  constructor(minecraft) {
    super(minecraft);

    this.name = "questionoftheday";
    this.aliases = ["qotd", "qoftheday"];
    this.description = "Question of the day.";
    this.options = [];

    this.expiryTime = 24 * 60 * 60 * 1000;
    this.timeofLastQOTD = -1;
    this.question;
  }

  /**
   * @param {string} player
   * @param {string} message
   * */
  async onCommand(player, message) {

    try {

      const date = new Date();
      const timestamp = date.getTime();

      // If the last QOTD has expired, get a new one
      if (this.question == null || this.timeofLastQOTD + this.expiryTime <= timestamp) {

        this.send("Last QOTD expired, getting a new one...")
        
        // API GET request
        const response = await get(`https://api.harys.is-a.dev/v1/qotd`,
                                   // NOTE: This auth key is public! https://open-api.js.org/api-key/
                                   { headers: {'Authorization' : 'NZCt6JqttVGwkzERMGxn8FjcsHVbvPku'} });
        this.question = response.data.questions[0];
        this.timeofLastQOTD = timestamp;
      }
      
      this.send(`Question of the Day: ${this.question}`);

    } catch (error) {
      this.send(formatError(error));
    }
  }
}

module.exports = QOTDCommand;
