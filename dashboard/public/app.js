/* Rogue Guild Bot dashboard client. */
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const logEl = $("log");
  const MAX_ROWS = 3000;
  const SGR = /\x1b\[[0-9;:]*[a-zA-Z]/g;

  let rows = [];        // { seq, t, stream, segments, plain }
  let follow = true;
  let filter = "";
  let showStamps = false;
  let socket = null;
  let retry = 0;

  /* ---------------- ANSI ---------------- */

  // chalk runs with FORCE_COLOR=3 in the child, so output carries real SGR codes.
  const BASIC = [
    "#3b4048", "#ff6b7f", "#3ddc97", "#ffc45e", "#5aa9ff", "#c678dd", "#4dd8ff", "#c8cfdb",
    "#5c6370", "#ff8b9c", "#6ff0b5", "#ffd68a", "#87c3ff", "#dda0ea", "#8ee7ff", "#ffffff"
  ];

  const cube = (n) => {
    if (n < 16) return BASIC[n];
    if (n < 232) {
      const i = n - 16;
      const f = (v) => (v ? v * 40 + 55 : 0);
      return `rgb(${f(Math.floor(i / 36) % 6)},${f(Math.floor(i / 6) % 6)},${f(i % 6)})`;
    }
    const g = (n - 232) * 10 + 8;
    return `rgb(${g},${g},${g})`;
  };

  function parseAnsi(input) {
    // A lone \r means the line was rewritten in place; keep the final revision.
    const text = input.includes("\r") ? input.slice(input.lastIndexOf("\r") + 1) : input;
    const segments = [];
    let state = { fg: null, bg: null, bold: false, dim: false, italic: false, underline: false, inverse: false };
    let buffer = "";

    const flush = () => {
      if (buffer) segments.push({ text: buffer, style: { ...state } });
      buffer = "";
    };

    // Matches CSI sequences; only SGR (final byte 'm') changes style, the rest are dropped.
    const csi = /\x1b\[([0-9;:]*)([a-zA-Z])/g;
    let last = 0;
    let match;

    while ((match = csi.exec(text)) !== null) {
      buffer += text.slice(last, match.index);
      last = csi.lastIndex;
      if (match[2] !== "m") continue;
      flush();

      const codes = (match[1] || "0").split(";").map((n) => Number(n) || 0);
      for (let i = 0; i < codes.length; i++) {
        const code = codes[i];
        if (code === 0) state = { fg: null, bg: null, bold: false, dim: false, italic: false, underline: false, inverse: false };
        else if (code === 1) state.bold = true;
        else if (code === 2) state.dim = true;
        else if (code === 3) state.italic = true;
        else if (code === 4) state.underline = true;
        else if (code === 7) state.inverse = true;
        else if (code === 22) { state.bold = false; state.dim = false; }
        else if (code === 23) state.italic = false;
        else if (code === 24) state.underline = false;
        else if (code === 27) state.inverse = false;
        else if (code >= 30 && code <= 37) state.fg = BASIC[code - 30];
        else if (code === 39) state.fg = null;
        else if (code >= 40 && code <= 47) state.bg = BASIC[code - 40];
        else if (code === 49) state.bg = null;
        else if (code >= 90 && code <= 97) state.fg = BASIC[code - 90 + 8];
        else if (code >= 100 && code <= 107) state.bg = BASIC[code - 100 + 8];
        else if (code === 38 || code === 48) {
          const target = code === 38 ? "fg" : "bg";
          if (codes[i + 1] === 5) { state[target] = cube(codes[i + 2]); i += 2; }
          else if (codes[i + 1] === 2) { state[target] = `rgb(${codes[i + 2]},${codes[i + 3]},${codes[i + 4]})`; i += 4; }
        }
      }
    }

    buffer += text.slice(last);
    flush();
    return segments.length ? segments : [{ text: "", style: {} }];
  }

  function styleOf(style) {
    const css = [];
    let { fg, bg } = style;
    if (style.inverse) {
      const swapFg = bg || "#06080c";
      const swapBg = fg || "#e8edf5";
      fg = swapFg;
      bg = swapBg;
    }
    if (fg) css.push(`color:${fg}`);
    if (bg) css.push(`background:${bg}`);
    if (style.bold) css.push("font-weight:700");
    if (style.dim) css.push("opacity:.62");
    if (style.italic) css.push("font-style:italic");
    if (style.underline) css.push("text-decoration:underline");
    return css.join(";");
  }

  /* ---------------- rendering ---------------- */

  const stamp = (t) => new Date(t).toLocaleTimeString("en-GB", { hour12: false }) + " ";

  // Everything is written with textContent — bot output includes live guild chat,
  // so it must never be interpreted as markup.
  function buildRow(row) {
    const el = document.createElement("span");
    el.className = "row" + (row.stream === "out" ? "" : ` ${row.stream}`);
    el.dataset.seq = row.seq;

    if (showStamps) {
      const time = document.createElement("span");
      time.style.color = "#59616f";
      time.textContent = stamp(row.t);
      el.appendChild(time);
    }

    const needle = filter.toLowerCase();

    for (const segment of row.segments) {
      const css = styleOf(segment.style);
      if (!needle || !segment.text.toLowerCase().includes(needle)) {
        const span = document.createElement("span");
        if (css) span.style.cssText = css;
        span.textContent = segment.text;
        el.appendChild(span);
        continue;
      }
      // Split the segment around each match so hits can be highlighted.
      let rest = segment.text;
      while (rest) {
        const at = rest.toLowerCase().indexOf(needle);
        if (at === -1) break;
        if (at > 0) {
          const before = document.createElement("span");
          if (css) before.style.cssText = css;
          before.textContent = rest.slice(0, at);
          el.appendChild(before);
        }
        const hit = document.createElement("mark");
        hit.textContent = rest.slice(at, at + needle.length);
        el.appendChild(hit);
        rest = rest.slice(at + needle.length);
      }
      if (rest) {
        const tail = document.createElement("span");
        if (css) tail.style.cssText = css;
        tail.textContent = rest;
        el.appendChild(tail);
      }
    }

    el.appendChild(document.createTextNode("\n"));
    return el;
  }

  const matches = (row) => !filter || row.plain.toLowerCase().includes(filter.toLowerCase());

  function renderAll() {
    logEl.textContent = "";
    const frag = document.createDocumentFragment();
    let shown = 0;
    for (const row of rows) {
      if (!matches(row)) continue;
      frag.appendChild(buildRow(row));
      shown++;
    }
    if (!shown) {
      const empty = document.createElement("span");
      empty.className = "empty";
      empty.textContent = rows.length ? "No lines match that filter." : "Waiting for output...";
      frag.appendChild(empty);
    }
    logEl.appendChild(frag);
    updateCount();
    if (follow) scrollToEnd();
  }

  const toRow = (line) => ({
    seq: line.seq,
    t: line.t,
    stream: line.stream,
    segments: parseAnsi(line.text),
    plain: line.text.replace(SGR, "")
  });

  function addRow(line) {
    rows.push(toRow(line));

    let trimmed = false;
    while (rows.length > MAX_ROWS) {
      rows.shift();
      trimmed = true;
    }

    if (trimmed) return renderAll();

    const placeholder = logEl.querySelector(".empty");
    if (placeholder) placeholder.remove();
    const row = rows[rows.length - 1];
    if (matches(row)) logEl.appendChild(buildRow(row));
    updateCount();
    if (follow) scrollToEnd();
  }

  const scrollToEnd = () => { logEl.scrollTop = logEl.scrollHeight; };

  const updateCount = () => {
    const shown = filter ? rows.filter(matches).length : rows.length;
    $("count").textContent = filter ? `${shown} / ${rows.length} lines` : `${rows.length} lines`;
  };

  /* ---------------- formatting ---------------- */

  function duration(ms) {
    if (!ms || ms < 0) return "-";
    const s = Math.floor(ms / 1000);
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (d) return `${d}d ${h}h`;
    if (h) return `${h}h ${m}m`;
    if (m) return `${m}m ${sec}s`;
    return `${sec}s`;
  }

  const bytes = (n) => (n == null ? "-" : `${(n / 1048576).toFixed(0)}<small>MB</small>`);

  /* ---------------- state ---------------- */

  function applyStatus(s) {
    $("statusPill").dataset.state = s.status;
    $("statusText").textContent = s.status;

    const up = s.status === "running";
    $("uptime").textContent = up ? duration(s.uptime) : "-";
    $("rss").innerHTML = up ? bytes(s.rss) : "-";
    $("cpu").innerHTML = up && s.cpu != null ? `${s.cpu.toFixed(1)}<small>%</small>` : "-";
    $("pid").textContent = s.pid ?? "-";
    $("restarts").textContent = s.restarts ?? 0;
    $("nextRestart").textContent = s.nextRestart ? duration(s.nextRestart - Date.now()) : "off";
  }

  const escapeHtml = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  function applyGit(g) {
    if (!g) return;
    const tag = g.dirty > 0
      ? `<span class="tag dirty">${g.dirty} dirty</span>`
      : '<span class="tag clean">clean</span>';

    $("branch").innerHTML = `${escapeHtml(g.branch || "?")}${tag}`;
    $("commit").textContent = g.sha ? `${g.sha} · ${g.subject} · ${g.when}` : "-";
  }

  /* ---------------- socket ---------------- */

  function setLink(live, text) {
    $("link").className = `link-status ${live ? "live" : "dead"}`;
    $("linkText").textContent = text;
  }

  function connect() {
    const proto = location.protocol === "https:" ? "wss:" : "ws:";
    socket = new WebSocket(`${proto}//${location.host}/stream`);

    socket.addEventListener("open", () => {
      retry = 0;
      setLink(true, "live");
    });

    socket.addEventListener("message", (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === "hello") {
        $("host").textContent = `${msg.host} · ${msg.cwd}`;
        rows = msg.scrollback.map(toRow);
        renderAll();
      } else if (msg.type === "line") addRow(msg.line);
      else if (msg.type === "status") applyStatus(msg);
      else if (msg.type === "git") applyGit(msg.git);
    });

    socket.addEventListener("close", () => {
      setLink(false, "reconnecting");
      retry = Math.min(retry + 1, 6);
      setTimeout(connect, retry * 800);
    });

    socket.addEventListener("error", () => socket.close());
  }

  /* ---------------- actions ---------------- */

  function toast(message, kind = "info") {
    const el = document.createElement("div");
    el.className = `toast ${kind}`;
    el.textContent = message;
    $("toasts").appendChild(el);
    setTimeout(() => {
      el.classList.add("leaving");
      setTimeout(() => el.remove(), 250);
    }, 5200);
  }

  $("btnClear").onclick = () => {
    rows = [];
    renderAll();
    toast("View cleared. Reload to pull scrollback back from the server.", "info");
  };

  $("btnDownload").onclick = () => {
    const blob = new Blob([rows.map((r) => r.plain).join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rogue-bot-${new Date().toISOString().replace(/[:.]/g, "-")}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  $("filter").addEventListener("input", (e) => {
    filter = e.target.value.trim();
    renderAll();
  });

  $("follow").addEventListener("change", (e) => {
    follow = e.target.checked;
    if (follow) scrollToEnd();
  });

  $("stamps").addEventListener("change", (e) => {
    showStamps = e.target.checked;
    renderAll();
  });

  // Scrolling away from the bottom releases follow; scrolling back re-arms it.
  logEl.addEventListener("scroll", () => {
    const atEnd = logEl.scrollHeight - logEl.scrollTop - logEl.clientHeight < 40;
    if (atEnd !== follow) {
      follow = atEnd;
      $("follow").checked = atEnd;
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT") return;
    if (e.key === "/") { e.preventDefault(); $("filter").focus(); }
  });

  connect();
})();
