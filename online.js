// Online mode: peer-to-peer over WebRTC (PeerJS).
// The host's browser holds the room state and acts as the game server;
// every other phone connects to it directly and only ever receives its own role.

const PEER_PREFIX = "impostor-party-game-v1-";
const MAX_PLAYERS = 10;
const MIN_PLAYERS = 3;
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const HEARTBEAT_MS = 4000;
const TIMEOUT_MS = 15000;
const GIVE_UP_MS = 90000;
const LOCAL = { local: true }; // pseudo-connection for the host's own player

const $ = (id) => document.getElementById(id);

// ---------- Helpers ----------

function randInt(n) {
  const buf = new Uint32Array(1);
  const limit = Math.floor(0x100000000 / n) * n;
  do { crypto.getRandomValues(buf); } while (buf[0] >= limit);
  return buf[0] % n;
}
const pick = (arr) => arr[randInt(arr.length)];
const randId = () => Array.from(crypto.getRandomValues(new Uint8Array(8)),
  (b) => b.toString(16).padStart(2, "0")).join("");
const newCode = () => Array.from({ length: 4 }, () => pick(CODE_CHARS)).join("");

const store = {
  get(k) { try { return JSON.parse(sessionStorage.getItem(k)); } catch (_) { return null; } },
  set(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (_) { /* unavailable */ } },
  del(k) { try { sessionStorage.removeItem(k); } catch (_) { /* unavailable */ } },
};

function cleanName(name) {
  return typeof name === "string" ? name.trim().replace(/\s+/g, " ").slice(0, 20) : "";
}

let toastTimer;
function toast(msg) {
  const el = $("toast");
  el.textContent = msg;
  el.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add("hidden"), 3500);
}

function setStatus(msg) {
  $("status").textContent = msg;
  $("status").classList.toggle("hidden", !msg);
}

function showScreen(name) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
  $("screen-" + name).classList.add("active");
}

// ---------- Shared state ----------

let peer = null;
let view = null;                               // latest state received from the host
let session = store.get("impostor-session");   // { code, host: true } | { code, id, token }
let shownRound = -1;

// Host only
let room = null;

// Guest only
let conn = null;
let pendingName = "";
let lastHostMsg = 0;
let lostSince = 0;
let retryTimer = null;

const isHost = () => !!room;

// Send an action to the host (or handle it directly if we are the host).
function act(msg) {
  if (isHost()) hostHandle(LOCAL, msg);
  else if (conn && conn.open) conn.send(msg);
  else toast("Not connected to the room yet.");
}

// Messages from the host (delivered over the network, or directly for the host itself).
function onMessage(msg) {
  if (!msg || typeof msg !== "object") return;
  switch (msg.type) {
    case "session":
      session = { code: session.code, id: msg.id, token: msg.token };
      store.set("impostor-session", session);
      break;
    case "state":
      view = msg;
      render();
      break;
    case "error":
      if (!isHost() && !(session && session.id)) leaveRoom(msg.msg);
      else toast(msg.msg);
      break;
    case "session-expired": leaveRoom("Your spot in that room is gone."); break;
    case "kicked": leaveRoom("You were removed from the room."); break;
    case "closed": leaveRoom("The host ended the room."); break;
  }
}

// Reset to the home screen, optionally showing why.
function leaveRoom(reason) {
  clearTimeout(retryTimer);
  if (conn) { const c = conn; conn = null; setTimeout(() => c.close(), 300); }
  if (peer) { const p = peer; peer = null; setTimeout(() => p.destroy(), 400); }
  room = null;
  view = null;
  session = null;
  store.del("impostor-session");
  store.del("impostor-room");
  setStatus("");
  showScreen("home");
  if (reason) toast(reason);
}

// =====================================================================
// Host: owns the room and runs the game rules
// =====================================================================

function startHosting(code, name, resume, attempt = 0) {
  setStatus(resume ? "Restoring room…" : "Creating room…");
  const p = new Peer(PEER_PREFIX + code);
  peer = p;

  p.on("open", () => {
    if (peer !== p) return;
    setStatus("");
    if (!room) {
      room = {
        code, hostId: null, players: [], phase: "lobby", roundNo: 0, round: null,
        settings: { categories: Object.keys(WORDS), hint: false },
      };
      session = { code, host: true };
      store.set("impostor-session", session);
      addPlayer(LOCAL, name);
    } else {
      broadcast();
    }
  });

  p.on("connection", (c) => {
    c.on("data", (msg) => hostHandle(c, msg));
    c.on("close", () => dropConn(c));
    c.on("error", () => dropConn(c));
  });

  p.on("disconnected", () => {
    if (peer === p && !p.destroyed) setTimeout(() => !p.destroyed && p.reconnect(), 1000);
  });

  p.on("error", (err) => {
    if (peer !== p) return;
    if (err.type === "unavailable-id") {
      p.destroy();
      if (!resume) return startHosting(newCode(), name, false);
      // The signalling server hasn't released our old id yet (page reload) — retry.
      if (attempt < 20) return setTimeout(() => startHosting(code, name, true, attempt + 1), 1500);
      leaveRoom("Couldn't restore the room.");
    } else if (["network", "server-error", "socket-error", "socket-closed"].includes(err.type)) {
      setStatus("Connection problem — retrying…");
    } else {
      console.warn("PeerJS error", err);
    }
  });
}

const hostPlayer = () => room.players.find((p) => p.id === room.hostId);

function addPlayer(c, name) {
  const p = { id: randId(), token: randId(), name, conn: c, lastSeen: Date.now() };
  room.players.push(p);
  if (c === LOCAL) room.hostId = p.id;
  else {
    c.player = p;
    sendTo(c, { type: "session", id: p.id, token: p.token });
  }
  broadcast();
}

function removePlayer(p, kicked) {
  room.players = room.players.filter((q) => q !== p);
  const c = p.conn;
  if (c && c !== LOCAL) {
    c.player = null;
    if (kicked) sendTo(c, { type: "kicked" });
    setTimeout(() => c.close(), 500);
  }
  broadcast();
}

function dropConn(c) {
  if (room && c.player && c.player.conn === c) {
    c.player.conn = null;
    broadcast();
  }
}

function sendTo(c, msg) {
  if (c === LOCAL) onMessage(msg);
  else if (c && c.open) c.send(msg);
}

function saveRoom() {
  store.set("impostor-room", {
    ...room,
    players: room.players.map(({ id, token, name }) => ({ id, token, name })),
  });
}

function broadcast() {
  saveRoom();
  for (const p of room.players) sendTo(p.conn, viewFor(p));
}

// What one particular player is allowed to see.
function viewFor(p) {
  const r = room.round;
  let role = null;
  if (r && room.phase !== "lobby" && r.ids.includes(p.id)) {
    role = p.id === r.impostorId
      ? { impostor: true, category: room.settings.hint ? r.category : null }
      : { impostor: false, word: r.word, category: r.category };
  }
  return {
    type: "state",
    code: room.code,
    you: p.id,
    hostId: room.hostId,
    phase: room.phase,
    roundNo: room.roundNo,
    players: room.players.map((q) => ({ id: q.id, name: q.name, online: !!q.conn })),
    settings: room.settings,
    categories: Object.keys(WORDS),
    role,
    firstName: r ? r.firstName : null,
    result: room.phase === "result" ? { impostorName: r.impostorName, word: r.word } : null,
  };
}

function hostHandle(c, msg) {
  if (!room || !msg || typeof msg !== "object") return;
  const p = c === LOCAL ? hostPlayer() : c.player;
  if (p) p.lastSeen = Date.now();
  const fail = (text) => sendTo(c, { type: "error", msg: text });

  switch (msg.type) {
    case "ping":
      return;

    case "join": {
      if (p) return;
      const name = cleanName(msg.name);
      if (!name) return fail("Enter a name.");
      if (room.phase === "playing") return fail("A round is in progress — try again in a moment.");
      if (room.players.length >= MAX_PLAYERS) return fail("That room is full.");
      if (room.players.some((q) => q.name.toLowerCase() === name.toLowerCase())) {
        return fail("That name is already taken in this room.");
      }
      return addPlayer(c, name);
    }

    case "rejoin": {
      const q = room.players.find((x) => x.id === msg.id && x.token === msg.token);
      if (!q || q.conn === LOCAL) return sendTo(c, { type: "session-expired" });
      if (q.conn && q.conn !== c) { q.conn.player = null; q.conn.close(); }
      q.conn = c;
      q.lastSeen = Date.now();
      c.player = q;
      return broadcast();
    }

    case "leave":
      if (p && c !== LOCAL) removePlayer(p, false);
      return;
  }

  if (c !== LOCAL) return; // everything below is host-only

  switch (msg.type) {
    case "settings": {
      const cats = Array.isArray(msg.categories) ? msg.categories.filter((k) => k in WORDS) : [];
      room.settings = { categories: cats, hint: !!msg.hint };
      return broadcast();
    }

    case "start": {
      if (room.players.length < MIN_PLAYERS) return fail(`You need at least ${MIN_PLAYERS} players.`);
      if (!room.settings.categories.length) return fail("Pick at least one category.");
      const category = pick(room.settings.categories);
      const options = WORDS[category].filter((w) => !room.round || w !== room.round.word);
      const impostor = pick(room.players);
      room.round = {
        ids: room.players.map((q) => q.id),
        impostorId: impostor.id,
        impostorName: impostor.name,
        word: pick(options),
        category,
        firstName: pick(room.players).name,
      };
      room.roundNo++;
      room.phase = "playing";
      return broadcast();
    }

    case "reveal":
      if (room.phase === "playing") { room.phase = "result"; broadcast(); }
      return;

    case "lobby":
      room.phase = "lobby";
      return broadcast();

    case "kick": {
      const target = room.players.find((q) => q.id === msg.id);
      if (target && target.id !== room.hostId) removePlayer(target, true);
      return;
    }

    case "end":
      for (const q of room.players) if (q.conn !== LOCAL) sendTo(q.conn, { type: "closed" });
      return leaveRoom();
  }
}

// =====================================================================
// Guest: connects to the host's peer
// =====================================================================

function joinRoom(code, name) {
  session = { code };
  pendingName = name;
  lostSince = Date.now();
  setStatus("Joining room…");
  guestConnect();
}

function guestConnect() {
  clearTimeout(retryTimer);
  if (!session || isHost()) return;
  if (!peer || peer.destroyed) {
    const p = new Peer();
    peer = p;
    // "open" fires again after a signalling reconnect; keep a working connection.
    p.on("open", () => { if (peer === p && !(conn && conn.open)) openConn(); });
    p.on("disconnected", () => { if (peer === p && !p.destroyed) p.reconnect(); });
    p.on("error", (err) => { if (peer === p) onGuestPeerError(err); });
  } else if (peer.open) {
    openConn();
  } else if (peer.disconnected) {
    peer.reconnect();
    scheduleRetry();
  } else {
    scheduleRetry();
  }
}

function openConn() {
  if (conn) { const old = conn; conn = null; old.close(); }
  const c = peer.connect(PEER_PREFIX + session.code, { reliable: true });
  conn = c;
  lastHostMsg = Date.now();
  c.on("open", () => {
    if (conn !== c) return;
    lastHostMsg = Date.now();
    if (session.id) c.send({ type: "rejoin", id: session.id, token: session.token });
    else c.send({ type: "join", name: pendingName });
  });
  c.on("data", (msg) => {
    if (conn !== c) return;
    lastHostMsg = Date.now();
    if (lostSince) { lostSince = 0; setStatus(""); }
    onMessage(msg);
  });
  c.on("close", () => { if (conn === c) hostLost(); });
  c.on("error", () => { if (conn === c) hostLost(); });
}

function hostLost() {
  conn = null;
  if (!session) return;
  if (!lostSince) lostSince = Date.now();
  if (Date.now() - lostSince > GIVE_UP_MS) {
    return leaveRoom(session.id ? "Lost connection to the room." : "Couldn't reach that room.");
  }
  setStatus(session.id ? "Reconnecting…" : "Joining room…");
  scheduleRetry();
}

function scheduleRetry() {
  clearTimeout(retryTimer);
  retryTimer = setTimeout(guestConnect, 2000);
}

function onGuestPeerError(err) {
  if (err.type === "peer-unavailable") {
    // No host with that code. For a fresh join that means a wrong code;
    // for an existing player the host is probably reloading, so keep trying.
    if (!session || !session.id) return leaveRoom("Room not found — check the code.");
    if (conn) { const c = conn; conn = null; c.close(); }
    return hostLost();
  }
  if (["network", "server-error", "socket-error", "socket-closed"].includes(err.type)) {
    setStatus("Connection problem — retrying…");
    if (peer && peer.destroyed) peer = null;
    return hostLost();
  }
  console.warn("PeerJS error", err);
}

// Heartbeats so dropped phones are noticed quickly on both sides.
setInterval(() => {
  if (isHost()) {
    let changed = false;
    for (const p of room.players) {
      if (!p.conn || p.conn === LOCAL) continue;
      if (Date.now() - p.lastSeen > TIMEOUT_MS) {
        const c = p.conn;
        p.conn = null;
        c.player = null;
        c.close();
        changed = true;
      } else {
        sendTo(p.conn, { type: "ping" });
      }
    }
    if (changed) broadcast();
  } else if (session) {
    if (conn && conn.open) conn.send({ type: "ping" });
    if (conn && Date.now() - lastHostMsg > TIMEOUT_MS) {
      const c = conn;
      conn = null;
      c.close();
      hostLost();
    }
  }
}, HEARTBEAT_MS);

// Phones suspend tabs when locked; reconnect as soon as we're visible again.
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible") return;
  if (isHost()) {
    if (peer && peer.disconnected && !peer.destroyed) peer.reconnect();
  } else if (session && session.id && !(conn && conn.open)) {
    guestConnect();
  }
});

// =====================================================================
// Rendering
// =====================================================================

function render() {
  if (!view) return showScreen("home");
  const host = view.you === view.hostId;
  document.querySelectorAll(".host-only").forEach((el) => el.classList.toggle("hidden", !host));
  document.querySelectorAll(".guest-only").forEach((el) => el.classList.toggle("hidden", host));
  document.querySelectorAll(".btn-leave").forEach((el) => {
    el.textContent = host ? "End room" : "Leave room";
  });

  if (view.phase === "lobby") renderLobby(host);
  else if (view.phase === "playing") renderGame();
  else renderResult();
}

function renderLobby(host) {
  $("lobby-code").textContent = view.code;
  $("lobby-count").textContent = `${view.players.length}/${MAX_PLAYERS}`;

  const list = $("lobby-players");
  list.innerHTML = "";
  for (const p of view.players) {
    const li = document.createElement("li");
    if (!p.online) li.classList.add("offline");
    const label = document.createElement("span");
    label.textContent = p.name;
    if (p.id === view.hostId) label.append(tag("host", "host"));
    if (p.id === view.you) label.append(tag("you"));
    if (!p.online) label.append(tag("offline"));
    li.append(label);
    if (host && p.id !== view.you) {
      const btn = document.createElement("button");
      btn.className = "remove";
      btn.textContent = "×";
      btn.title = "Remove player";
      btn.onclick = () => { if (confirm(`Remove ${p.name}?`)) act({ type: "kick", id: p.id }); };
      li.append(btn);
    }
    list.append(li);
  }

  $("host-settings").classList.toggle("hidden", !host);
  $("guest-settings").classList.toggle("hidden", host);

  if (host) {
    const box = $("category-list");
    box.innerHTML = "";
    for (const cat of view.categories) {
      const on = view.settings.categories.includes(cat);
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip" + (on ? " on" : "");
      chip.textContent = cat;
      chip.onclick = () => {
        const cats = on
          ? view.settings.categories.filter((c) => c !== cat)
          : [...view.settings.categories, cat];
        act({ type: "settings", categories: cats, hint: view.settings.hint });
      };
      box.append(chip);
    }
    $("opt-hint").checked = view.settings.hint;
    const short = MIN_PLAYERS - view.players.length;
    $("btn-start").disabled = short > 0 || !view.settings.categories.length;
    $("start-hint").textContent = short > 0
      ? `Waiting for ${short} more player${short > 1 ? "s" : ""} to join…`
      : !view.settings.categories.length ? "Pick at least one category." : "";
  } else {
    const cats = view.settings.categories;
    $("settings-summary").textContent =
      `Categories: ${cats.length === view.categories.length ? "All" : cats.join(", ") || "None"}`;
  }

  showScreen("lobby");
}

function tag(text, cls) {
  const t = document.createElement("span");
  t.className = "tag" + (cls ? " " + cls : "");
  t.textContent = text;
  return t;
}

function renderGame() {
  if (view.roundNo !== shownRound) {
    shownRound = view.roundNo;
    $("role-card").dataset.open = "";
  }
  renderRoleCard();
  $("first-player").textContent = view.firstName;
  showScreen("game");
}

function renderRoleCard() {
  const card = $("role-card");
  const role = view.role;
  const open = card.dataset.open === "1";
  card.classList.toggle("covered", !open);
  card.classList.toggle("impostor", open && !!role && role.impostor);

  if (!open) {
    $("role-label").textContent = "";
    $("role-word").textContent = "Tap to reveal";
    $("role-extra").textContent = "Keep your screen hidden from others";
  } else if (!role) {
    $("role-label").textContent = "";
    $("role-word").textContent = "Sit this one out";
    $("role-extra").textContent = "You joined mid-round. You'll be in the next one.";
  } else if (role.impostor) {
    $("role-label").textContent = "You are";
    $("role-word").textContent = "THE IMPOSTOR";
    $("role-extra").textContent = role.category
      ? `Category: ${role.category}. Blend in!`
      : "Blend in and figure out the word!";
  } else {
    $("role-label").textContent = "The secret word is";
    $("role-word").textContent = role.word;
    $("role-extra").textContent = `Category: ${role.category}`;
  }
}

function renderResult() {
  $("result-impostor").textContent = view.result.impostorName;
  $("result-word").textContent = view.result.word;
  showScreen("result");
}

// =====================================================================
// UI wiring
// =====================================================================

function readName() {
  const name = cleanName($("name").value);
  if (!name) { toast("Enter your name first."); $("name").focus(); return null; }
  try { localStorage.setItem("impostor-name", name); } catch (_) { /* unavailable */ }
  return name;
}

$("btn-create").onclick = () => {
  const name = readName();
  if (name && !peer) startHosting(newCode(), name, false);
};

function doJoin() {
  const name = readName();
  if (!name) return;
  const code = $("join-code").value.trim().toUpperCase();
  if (!/^[A-Z]{4}$/.test(code)) { toast("Room codes are 4 letters."); return; }
  if (!peer) joinRoom(code, name);
}
$("btn-join").onclick = doJoin;
$("join-code").addEventListener("keydown", (e) => { if (e.key === "Enter") doJoin(); });
$("join-code").addEventListener("input", (e) => {
  e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, "");
});

$("opt-hint").onchange = (e) =>
  act({ type: "settings", categories: view.settings.categories, hint: e.target.checked });
$("btn-start").onclick = () => act({ type: "start" });
$("btn-reveal").onclick = () => act({ type: "reveal" });
$("btn-again").onclick = () => act({ type: "start" });
$("btn-lobby").onclick = () => act({ type: "lobby" });

$("role-card").onclick = () => {
  const card = $("role-card");
  card.dataset.open = card.dataset.open === "1" ? "" : "1";
  renderRoleCard();
};

document.querySelectorAll(".btn-leave").forEach((btn) => {
  btn.onclick = () => {
    if (isHost()) {
      if (confirm("End the room for everyone?")) act({ type: "end" });
    } else if (confirm("Leave this room?")) {
      act({ type: "leave" });
      leaveRoom();
    }
  };
});

$("btn-share").onclick = async () => {
  const url = `${location.origin}${location.pathname}?room=${view.code}`;
  try {
    if (navigator.share) await navigator.share({ title: "Join my Impostor game", url });
    else { await navigator.clipboard.writeText(url); toast("Invite link copied!"); }
  } catch (_) { /* share cancelled */ }
};

// ---------- Startup ----------

(function init() {
  try { $("name").value = localStorage.getItem("impostor-name") || ""; } catch (_) { /* unavailable */ }
  const invite = new URLSearchParams(location.search).get("room");
  if (invite) $("join-code").value = invite.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4);

  if (typeof Peer === "undefined") {
    toast("Couldn't load the networking library. Check your connection.");
    return;
  }

  const savedRoom = store.get("impostor-room");
  if (session && session.host && savedRoom && savedRoom.code === session.code) {
    // Host reloaded the page: restore the room and reclaim the same code.
    room = savedRoom;
    for (const p of room.players) {
      p.conn = p.id === room.hostId ? LOCAL : null;
      p.lastSeen = Date.now();
    }
    broadcast();
    startHosting(room.code, null, true);
  } else if (session && session.id) {
    lostSince = Date.now();
    setStatus("Reconnecting…");
    guestConnect();
  } else {
    session = null;
    store.del("impostor-session");
    store.del("impostor-room");
  }
})();
