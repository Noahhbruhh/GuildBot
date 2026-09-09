/* eslint-disable no-console */
/**
 * Rogue Guild Bot — read-only terminal viewer.
 *
 * Runs as its own process and spawns the bot as a child so it can stream the
 * bot's real stdout/stderr. That matters: a lot of the bot's output comes from
 * plain console.log() calls that never reach logs/*.log, so tailing the log
 * files would show an incomplete picture.
 *
 * This server exposes no way to control the bot — there are no action routes.
 */
const { spawn } = require("child_process");
const { WebSocketServer } = require("ws");
const express = require("express");
const http = require("http");
const path = require("path");
const os = require("os");
const fs = require("fs");

const ROOT = process.env.DASHBOARD_ROOT || path.join(__dirname, "..");
const ENTRY = process.env.DASHBOARD_ENTRY || path.join(ROOT, "index.js");
const PORT = Number(process.env.DASHBOARD_PORT || 3001);
const SCROLLBACK = 3000;
// "HH:MM" in the server's local timezone, or "off" to disable.
const RESTART_AT = process.env.DASHBOARD_RESTART_AT || "04:00";
const STOP_GRACE_MS = 8000;

/**
 * Binds to the tailnet address so the viewer is reachable from other devices on
 * the tailnet but not from the LAN or the public internet. Tailscale hands out
 * addresses in 100.64.0.0/10.
 */
function detectBind() {
  if (process.env.DASHBOARD_BIND) return { host: process.env.DASHBOARD_BIND, why: "DASHBOARD_BIND" };

  const interfaces = Object.entries(os.networkInterfaces());
  const isTailnet = (a) => {
    if (a.family !== "IPv4" || a.internal) return false;
    const [first, second] = a.address.split(".").map(Number);
    return first === 100 && second >= 64 && second <= 127;
  };

  for (const [name, addrs] of interfaces) {
    if (!name.startsWith("tailscale")) continue;
    const hit = (addrs || []).find(isTailnet);
    if (hit) return { host: hit.address, why: `tailnet (${name})` };
  }

  for (const [name, addrs] of interfaces) {
    const hit = (addrs || []).find(isTailnet);
    if (hit) return { host: hit.address, why: `tailnet (${name})` };
  }

  return { host: "0.0.0.0", why: "no tailnet address found — falling back to all interfaces" };
}

const BIND = detectBind();
const clients = new Set();
let seq = 0;

function broadcast(payload) {
  const frame = JSON.stringify(payload);
  for (const ws of clients) {
    if (ws.readyState === ws.OPEN) ws.send(frame);
  }
}

/** Rolling scrollback so a browser that connects late still sees history. */
const scrollback = [];

function emit(text, stream = "out") {
  for (const raw of String(text).split(/\r?\n/)) {
    const line = { seq: ++seq, t: Date.now(), stream, text: raw };
    scrollback.push(line);
    if (scrollback.length > SCROLLBACK) scrollback.shift();
    broadcast({ type: "line", line });
  }
}

/** The viewer's own notices, marked so the UI can tint them differently. */
function notice(text) {
  emit(text, "sys");
}

const stripTrailingNewline = (text) => text.replace(/\r?\n$/, "");

class Supervisor {
  constructor() {
    this.child = null;
    this.status = "stopped";
    this.startedAt = null;
    this.lastExit = null;
    this.restarts = 0;
    this.cpu = { at: 0, ticks: 0, percent: 0 };
  }

  get running() {
    return this.child !== null && this.child.exitCode === null && !this.child.killed;
  }

  setStatus(status) {
    this.status = status;
    pushStatus();
  }

  start() {
    if (this.running) return;
    if (!fs.existsSync(ENTRY)) return notice(`Missing entrypoint: ${ENTRY}`);

    this.setStatus("starting");
    notice(`Starting bot — node index.js (cwd ${ROOT})`);

    // cwd must be the project root: renderItem.js and messageToImage.js register
    // fonts by relative path and throw on boot from anywhere else.
    // FORCE_COLOR keeps chalk emitting real escapes through the pipe.
    this.child = spawn(process.execPath, [ENTRY], {
      cwd: ROOT,
      env: { ...process.env, FORCE_COLOR: "3" },
      stdio: ["ignore", "pipe", "pipe"]
    });

    this.startedAt = Date.now();
    this.lastExit = null;
    this.cpu = { at: 0, ticks: 0, percent: 0 };

    this.child.stdout.on("data", (chunk) => emit(stripTrailingNewline(chunk.toString()), "out"));
    this.child.stderr.on("data", (chunk) => emit(stripTrailingNewline(chunk.toString()), "err"));

    this.child.on("spawn", () => {
      this.setStatus("running");
      notice(`Bot started — pid ${this.child.pid}`);
    });

    this.child.on("error", (error) => {
      notice(`Failed to spawn bot: ${error.message}`);
      this.child = null;
      this.setStatus("crashed");
    });

    this.child.on("exit", (code, signal) => {
      const wasStopping = this.status === "stopping";
      this.lastExit = { code, signal, at: Date.now() };
      this.child = null;
      this.startedAt = null;
      notice(`Bot exited — ${signal ? `signal ${signal}` : `code ${code}`}`);
      this.setStatus(wasStopping || code === 0 ? "stopped" : "crashed");
      if (!wasStopping) notice("Viewer is read-only, so the bot stays down. Restart the viewer to bring it back.");
    });
  }

  /** Only used when the viewer itself is shutting down. */
  stop() {
    if (!this.running) return Promise.resolve();

    const child = this.child;
    this.setStatus("stopping");

    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        if (child.exitCode === null) child.kill("SIGKILL");
      }, STOP_GRACE_MS);

      child.once("exit", () => {
        clearTimeout(timer);
        resolve();
      });

      child.kill("SIGTERM");
    });
  }

  /** Used only by the nightly schedule — there is no route that reaches this. */
  async restart() {
    if (this.running) {
      await this.stop();
      this.restarts += 1;
    }
    this.start();
  }

  /** RSS + CPU% sampled from procfs; cheap enough to poll every second. */
  sample() {
    if (!this.running) return { rss: null, cpu: null };

    const pid = this.child.pid;
    let rss = null;
    let cpu = this.cpu.percent;

    try {
      const match = fs.readFileSync(`/proc/${pid}/status`, "utf8").match(/VmRSS:\s+(\d+) kB/);
      if (match) rss = Number(match[1]) * 1024;
    } catch {
      // process vanished between the running check and the read
    }

    try {
      const stat = fs.readFileSync(`/proc/${pid}/stat`, "utf8");
      // utime and stime are fields 14 and 15, counted after the comm field which
      // may itself contain spaces — so slice from the last ')'.
      const fields = stat.slice(stat.lastIndexOf(")") + 2).split(" ");
      const ticks = Number(fields[11]) + Number(fields[12]);
      const now = Date.now();
      if (this.cpu.at) {
        const elapsed = (now - this.cpu.at) / 1000;
        if (elapsed > 0) cpu = Math.max(0, ((ticks - this.cpu.ticks) / 100 / elapsed) * 100);
      }
      this.cpu = { at: now, ticks, percent: cpu };
    } catch {
      // same as above
    }

    return { rss, cpu };
  }
}

const supervisor = new Supervisor();

/** Read-only git lookup, for the repo line in the header. */
function git(args) {
  return new Promise((resolve) => {
    const proc = spawn("git", args, { cwd: ROOT, env: process.env });
    let out = "";
    proc.stdout.on("data", (chunk) => (out += chunk));
    proc.on("error", () => resolve(""));
    // Only trailing newlines are stripped: `git status --porcelain` encodes the
    // staged/unstaged state in the first two columns, so a leading space is data.
    proc.on("close", () => resolve(out.replace(/\n+$/, "")));
  });
}

async function gitInfo() {
  const [branch, sha, subject, when, porcelain] = await Promise.all([
    git(["rev-parse", "--abbrev-ref", "HEAD"]),
    git(["rev-parse", "--short", "HEAD"]),
    git(["log", "-1", "--pretty=%s"]),
    git(["log", "-1", "--pretty=%cr"]),
    git(["status", "--porcelain"])
  ]);

  const dirty = porcelain ? porcelain.split("\n").filter(Boolean) : [];
  return { branch, sha, subject, when, dirty: dirty.length };
}

const BOOTED = Date.now();

function statusPayload() {
  const { rss, cpu } = supervisor.sample();
  return {
    type: "status",
    status: supervisor.status,
    pid: supervisor.child ? supervisor.child.pid : null,
    uptime: supervisor.startedAt ? Date.now() - supervisor.startedAt : 0,
    lastExit: supervisor.lastExit,
    restarts: supervisor.restarts,
    nextRestart,
    rss,
    cpu,
    viewerUptime: Date.now() - BOOTED,
    node: process.version
  };
}

let nextRestart = null;

/**
 * Milliseconds until the next occurrence of "HH:MM" in local time. Recomputed
 * after every run rather than using a fixed 24h interval, so it stays correct
 * across DST changes.
 */
function msUntil(hours, minutes) {
  const now = new Date();
  const next = new Date(now);
  next.setHours(hours, minutes, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next.getTime() - now.getTime();
}

async function runScheduledRestart() {
  // Never spawn a second bot alongside one we do not own.
  if (!supervisor.running) {
    const strays = await findStrayBots();
    if (strays.length) {
      notice(`Skipping scheduled restart — a bot is running outside this viewer (pid ${strays.join(", ")}).`);
      return;
    }
    notice("Scheduled restart — bot was down, bringing it back up.");
  } else {
    notice(`Scheduled ${RESTART_AT} restart — cycling the bot.`);
  }

  await supervisor.restart();
}

function scheduleDailyRestart() {
  if (RESTART_AT.toLowerCase() === "off") {
    notice("Scheduled restart disabled (DASHBOARD_RESTART_AT=off).");
    return;
  }

  const match = /^(\d{1,2}):(\d{2})$/.exec(RESTART_AT);
  const hours = match ? Number(match[1]) : NaN;
  const minutes = match ? Number(match[2]) : NaN;

  if (!match || hours > 23 || minutes > 59) {
    notice(`Ignoring DASHBOARD_RESTART_AT="${RESTART_AT}" — expected HH:MM or "off". No restart scheduled.`);
    return;
  }

  const wait = msUntil(hours, minutes);
  nextRestart = Date.now() + wait;
  notice(`Next scheduled restart: ${new Date(nextRestart).toLocaleString()} (in ${Math.round(wait / 60000)} min).`);

  setTimeout(async () => {
    await runScheduledRestart();
    scheduleDailyRestart();
  }, wait).unref();
}

const pushStatus = () => broadcast(statusPayload());

const app = express();
app.use(express.static(path.join(__dirname, "public")));

// Read-only surface: status and repo info. There are deliberately no POST routes.
app.get("/api/status", (_req, res) => res.json(statusPayload()));
app.get("/api/git", async (_req, res) => res.json(await gitInfo()));

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/stream" });

wss.on("connection", async (ws) => {
  clients.add(ws);
  ws.on("close", () => clients.delete(ws));
  ws.on("error", () => clients.delete(ws));

  ws.send(JSON.stringify({ type: "hello", scrollback, cwd: ROOT, host: `${BIND.host}:${PORT}` }));
  ws.send(JSON.stringify(statusPayload()));
  ws.send(JSON.stringify({ type: "git", git: await gitInfo() }));
});

setInterval(pushStatus, 1000).unref();
setInterval(async () => broadcast({ type: "git", git: await gitInfo() }), 30000).unref();

/**
 * ws forwards the HTTP server's "error" event onto the WebSocketServer, so both
 * emitters need a listener — otherwise Node throws on the unhandled one before
 * this ever runs.
 */
let reported = false;
function handleServerError(error) {
  if (reported) return;
  reported = true;

  if (error.code === "EADDRINUSE") {
    console.error(`\nSomething is already listening on ${BIND.host}:${PORT}.`);
    console.error("That is usually an older viewer still running. Find and stop it with:");
    console.error(`  ss -ltnp | grep ${PORT}`);
    console.error(`Or run this one elsewhere:  DASHBOARD_PORT=3002 npm run dashboard\n`);
  } else if (error.code === "EADDRNOTAVAIL") {
    console.error(`\nCannot bind ${BIND.host}:${PORT} — is Tailscale up? Check with: tailscale ip -4`);
    console.error(`To bind every interface instead:  DASHBOARD_BIND=0.0.0.0 npm run dashboard\n`);
  } else {
    console.error(`Server error: ${error.message}`);
  }

  process.exit(1);
}

server.on("error", handleServerError);
wss.on("error", handleServerError);

server.listen(PORT, BIND.host, async () => {
  console.log(`Rogue terminal → http://${BIND.host}:${PORT}  [${BIND.why}]`);
  notice(`Terminal viewer listening on http://${BIND.host}:${PORT} — ${BIND.why}`);
  notice(`Project root: ${ROOT}`);

  const strays = await findStrayBots();
  if (strays.length) {
    notice("");
    notice(`Heads up: ${strays.length} bot process(es) already running outside this viewer:`);
    for (const pid of strays) notice(`  pid ${pid}`);
    notice("Their output cannot be captured. Stop them, then restart this viewer to see the bot.");
  } else {
    supervisor.start();
  }

  scheduleDailyRestart();
});

/** Finds `node index.js` processes for this project that we did not spawn. */
function findStrayBots() {
  return new Promise((resolve) => {
    fs.readdir("/proc", (error, entries) => {
      if (error) return resolve([]);
      const found = [];
      for (const entry of entries) {
        if (!/^\d+$/.test(entry) || Number(entry) === process.pid) continue;
        try {
          const cmdline = fs.readFileSync(`/proc/${entry}/cmdline`, "utf8").split("\0").filter(Boolean);
          if (cmdline.length < 2 || !/node$/.test(cmdline[0]) || !cmdline[1].endsWith("index.js")) continue;
          if (fs.readlinkSync(`/proc/${entry}/cwd`) === ROOT) found.push(Number(entry));
        } catch {
          // process exited, or not ours to read
        }
      }
      resolve(found);
    });
  });
}

function shutdown() {
  notice("Viewer shutting down — stopping bot.");
  supervisor.stop().finally(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
