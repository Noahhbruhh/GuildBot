const config = require("../../../config.json");
const cheerio = require("cheerio");
const Rss = require("rss-parser");
const axios = require("axios");
const parser = new Rss();

// hypixel.net sits behind Cloudflare bot protection and has been answering the
// forum feeds with 403s since early September. Polling those every 10 seconds
// is likely what earned the block, and news does not need that latency anyway.
const NEWS_INTERVAL = 5 * 60000;
const FEED_TIMEOUT = 15000;

/**
 * rss-parser's own parseURL rejects on any non-2xx status or timeout without
 * reading or destroying the response, which with Node's keep-alive agent leaves
 * the socket open forever. Under a steady stream of 403s that exhausted the
 * process's file descriptors in a few hours. axios always drains or destroys
 * the connection, so fetch with it and only hand rss-parser the text.
 * @param {string} url
 */
async function fetchFeed(url) {
  const { data } = await axios.get(url, {
    timeout: FEED_TIMEOUT,
    responseType: "text",
    headers: {
      "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0",
      Accept: "application/rss+xml, application/xml, text/xml"
    }
  });

  return parser.parseString(data);
}

if (config.minecraft.hypixelUpdates.enabled === true) {
  if (config.minecraft.hypixelUpdates.hypixelNews === true) {
    setInterval(checkForHypixelUpdates, NEWS_INTERVAL);
  }

  if (config.minecraft.hypixelUpdates.statusUpdates === true) {
    setInterval(checkForIncidents, 10000);
  }

  if (config.minecraft.hypixelUpdates.skyblockVersion === true) {
    setInterval(checkForSkyblockVersion, 10000);
  }
}

const hypixelIncidents = {};
async function checkForIncidents() {
  try {
    const { items: status } = await fetchFeed("https://status.hypixel.net/history.rss");

    const latestIcidents = status.filter((data) => new Date(data.pubDate).getTime() / 1000 + 43200 > Date.now() / 1000);

    for (const incident of latestIcidents) {
      const { title, link } = incident;

      if (hypixelIncidents[title]?.notified !== true) {
        hypixelIncidents[title] = { notified: true };
        bot.chat(`/gc [HYPIXEL STATUS] ${title} | ${link}`);
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }

      const updates = JSON.stringify(incident.contentSnippet)
        .split("\\n")
        .filter((_, index) => index % 2 !== 0);

      for (const update of updates) {
        if (hypixelIncidents[title]?.updates?.includes(update) === true) continue;

        hypixelIncidents[title].updates ??= [];
        if (bot !== undefined && bot._client.chat !== undefined) {
          hypixelIncidents[title].updates.push(update);
          bot.chat(`/gc [HYPIXEL STATUS UPDATE] ${title} | ${update}`);
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }
      }
    }
  } catch (error) {
    console.error(error);
  }
}

const hypixelUpdates = [];
async function checkForHypixelUpdates(firstTime = false) {
  try {
    const [{ items: news }, { items: skyblockNews }] = await Promise.all([
      fetchFeed("https://hypixel.net/forums/news-and-announcements.4/index.rss"),
      fetchFeed("https://hypixel.net/forums/skyblock-patch-notes.158/index.rss")
    ]);

    const latestFeed = news.concat(skyblockNews);
    for (const news of latestFeed) {
      const { title, link } = news;
      if (hypixelUpdates.includes(title) === true) {
        continue;
      }

      if (bot !== undefined && bot._client.chat !== undefined && firstTime === false) {
        const response = await axios.get(link, {
          headers: {
            "User-Agent": "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:89.0) Gecko/20100101 Firefox/89.0"
          }
        });

        const $ = cheerio.load(response.data);
        const time = parseInt($("time.u-dt").eq(0).attr("data-time"));
        if (time + 43200 < Math.floor(Date.now() / 1000)) {
          continue;
        }

        bot.chat(`/gc [HYPIXEL UPDATE] ${title} | ${link}`);
        hypixelUpdates.push(title);

        await new Promise((resolve) => setTimeout(resolve, 1500));
      } else if (firstTime === true) {
        hypixelUpdates.push(title);
      }
    }
  } catch (error) {
    console.error(error);
  }
}

checkForHypixelUpdates(true);

let skyblockVersion;
async function checkForSkyblockVersion() {
  try {
    const { data } = await axios.get("https://api.hypixel.net/v2/resources/skyblock/skills");

    if (skyblockVersion !== data.version) {
      if (skyblockVersion !== undefined) {
        bot.chat(`/gc [HYPIXEL SKYBLOCK] Skyblock version has been updated to ${data.version}! Server restarts might occur!`);
      }

      skyblockVersion = data.version;
    }
  } catch (error) {
    console.error(error);
  }
}
