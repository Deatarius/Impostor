const MAX_PLAYERS = 10;
const MIN_PLAYERS = 3;
const STORAGE_KEY = "impostor-settings";

const state = {
  players: [],
  categories: Object.keys(WORDS),
  hint: false,
  // per-round
  impostor: -1,
  word: "",
  category: "",
  turn: 0,
};

const $ = (id) => document.getElementById(id);

// Unbiased random integer in [0, n) using the crypto API.
function randInt(n) {
  const buf = new Uint32Array(1);
  const limit = Math.floor(0x100000000 / n) * n;
  do { crypto.getRandomValues(buf); } while (buf[0] >= limit);
  return buf[0] % n;
}

function pick(arr) { return arr[randInt(arr.length)]; }

function show(screen) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
  $("screen-" + screen).classList.add("active");
}

// ---------- Persistence ----------

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      players: state.players, categories: state.categories, hint: state.hint,
    }));
  } catch (_) { /* storage unavailable */ }
}

function load() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!data) return;
    if (Array.isArray(data.players)) state.players = data.players.slice(0, MAX_PLAYERS);
    if (Array.isArray(data.categories)) {
      const valid = data.categories.filter((c) => c in WORDS);
      if (valid.length) state.categories = valid;
    }
    state.hint = !!data.hint;
  } catch (_) { /* ignore corrupt storage */ }
}

// ---------- Setup screen ----------

function renderPlayers() {
  const list = $("player-list");
  list.innerHTML = "";
  state.players.forEach((name, i) => {
    const li = document.createElement("li");
    const span = document.createElement("span");
    span.textContent = name;
    const btn = document.createElement("button");
    btn.className = "remove";
    btn.textContent = "×";
    btn.title = "Remove";
    btn.onclick = () => { state.players.splice(i, 1); save(); renderPlayers(); };
    li.append(span, btn);
    list.append(li);
  });
  $("player-count").textContent = `${state.players.length}/${MAX_PLAYERS}`;
  const full = state.players.length >= MAX_PLAYERS;
  $("player-name").disabled = full;
  if (full) $("player-name").value = "";
  $("player-name").placeholder = full ? "Max players reached" : "Player name";
}

function renderCategories() {
  const box = $("category-list");
  box.innerHTML = "";
  Object.keys(WORDS).forEach((cat) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip" + (state.categories.includes(cat) ? " on" : "");
    chip.textContent = cat;
    chip.onclick = () => {
      if (state.categories.includes(cat)) {
        state.categories = state.categories.filter((c) => c !== cat);
      } else {
        state.categories.push(cat);
      }
      save();
      renderCategories();
    };
    box.append(chip);
  });
}

$("add-player-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const input = $("player-name");
  const name = input.value.trim();
  $("setup-error").textContent = "";
  if (!name) return;
  if (state.players.length >= MAX_PLAYERS) return;
  if (state.players.some((p) => p.toLowerCase() === name.toLowerCase())) {
    $("setup-error").textContent = "That name is already taken.";
    return;
  }
  state.players.push(name);
  input.value = "";
  save();
  renderPlayers();
  input.focus();
});

$("opt-hint").addEventListener("change", (e) => { state.hint = e.target.checked; save(); });

// ---------- Game flow ----------

function startRound() {
  const err = $("setup-error");
  if (state.players.length < MIN_PLAYERS) {
    err.textContent = `You need at least ${MIN_PLAYERS} players.`;
    show("setup");
    return;
  }
  if (!state.categories.length) {
    err.textContent = "Pick at least one category.";
    show("setup");
    return;
  }
  err.textContent = "";

  state.category = pick(state.categories);
  state.word = pick(WORDS[state.category]);
  state.impostor = randInt(state.players.length);
  state.turn = 0;
  showPass();
  show("reveal");
}

function showPass() {
  $("reveal-progress").textContent = `Player ${state.turn + 1} of ${state.players.length}`;
  $("pass-name").textContent = state.players[state.turn];
  $("pass-view").classList.remove("hidden");
  $("role-view").classList.add("hidden");
}

function showRole() {
  const isImpostor = state.turn === state.impostor;
  const card = $("role-card");
  card.classList.toggle("impostor", isImpostor);
  if (isImpostor) {
    $("role-label").textContent = "You are";
    $("role-word").textContent = "THE IMPOSTOR";
    $("role-extra").textContent = state.hint
      ? `Category: ${state.category}. Blend in!`
      : "Blend in and figure out the word!";
  } else {
    $("role-label").textContent = "The secret word is";
    $("role-word").textContent = state.word;
    $("role-extra").textContent = `Category: ${state.category}`;
  }
  $("pass-view").classList.add("hidden");
  $("role-view").classList.remove("hidden");
}

function nextTurn() {
  state.turn++;
  if (state.turn < state.players.length) {
    showPass();
  } else {
    $("first-player").textContent = pick(state.players);
    show("discuss");
  }
}

$("btn-start").onclick = startRound;
$("btn-show").onclick = showRole;
$("btn-hide").onclick = nextTurn;
$("btn-reveal").onclick = () => {
  $("result-impostor").textContent = state.players[state.impostor];
  $("result-word").textContent = state.word;
  show("result");
};
$("btn-again").onclick = startRound;
$("btn-setup").onclick = () => show("setup");

// ---------- Init ----------

load();
$("opt-hint").checked = state.hint;
renderPlayers();
renderCategories();
