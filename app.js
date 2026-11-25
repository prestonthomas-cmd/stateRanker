// State Ranker: builds a full ranking from head-to-head picks using
// binary insertion sort. Each new state is placed into the ranked list
// by comparing it against the middle of the remaining range, so every
// state needs only about log2(n) matchups.

const STORAGE_KEY = "stateRanker.v1";
const $ = (id) => document.getElementById(id);

// state: { question, ranked: [name], pending: [name], lo, hi, picks }
// The current challenger is pending[0]; it is compared with ranked[mid].
let state = null;
let history = []; // snapshots for undo

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ state, history }));
  } catch (_) { /* storage unavailable: progress just won't persist */ }
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (!data || !data.state) return false;
    state = data.state;
    history = Array.isArray(data.history) ? data.history : [];
    return true;
  } catch (_) {
    return false;
  }
}

function clearSaved() {
  try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
}

function shuffled(list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function start() {
  let names = STATES.map((s) => s[0]);
  if ($("includeDC").checked) names.push(DC[0]);
  if ($("shuffle").checked) names = shuffled(names);
  const question = $("question").value.trim() || "Which state is better?";
  state = { question, ranked: [names[0]], pending: names.slice(1), lo: 0, hi: 1, picks: 0 };
  history = [];
  save();
  render();
}

const mid = () => Math.floor((state.lo + state.hi) / 2);

// Upper bound on matchups still to go (exact for the current state's
// remaining range, worst case for states not yet introduced).
function remainingEstimate() {
  if (!state.pending.length) return 0;
  let total = Math.ceil(Math.log2(state.hi - state.lo + 1));
  let size = state.ranked.length + 1;
  for (let i = 1; i < state.pending.length; i++, size++) {
    total += Math.ceil(Math.log2(size + 1));
  }
  return total;
}

// winnerIsChallenger: true if the new state beats the ranked state shown.
function choose(winnerIsChallenger) {
  if (!state.pending.length) return;
  history.push(JSON.stringify(state));
  const m = mid();
  if (winnerIsChallenger) state.hi = m; // ranks above ranked[m]
  else state.lo = m + 1;                // ranks below ranked[m]
  state.picks++;

  if (state.lo >= state.hi) {
    state.ranked.splice(state.lo, 0, state.pending.shift());
    state.lo = 0;
    state.hi = state.ranked.length;
  }
  save();
  render();
}

function undo() {
  if (!history.length) return;
  state = JSON.parse(history.pop());
  save();
  render();
}

function reset() {
  if (state && state.picks > 0 && !confirm("Discard your progress and start over?")) return;
  state = null;
  history = [];
  clearSaved();
  render();
}

// Randomize which side each state appears on so position doesn't bias picks.
let sideSwap = false;
let lastPairKey = "";

function show(section) {
  for (const id of ["setup", "battle", "results"]) $(id).hidden = id !== section;
}

function fillList(ol, names) {
  ol.replaceChildren(...names.map((n) => {
    const li = document.createElement("li");
    li.textContent = n;
    return li;
  }));
}

function render() {
  if (!state) {
    show("setup");
    return;
  }
  if (!state.pending.length) {
    show("results");
    $("resultsTitle").textContent = `Your ranking — ${state.question}`;
    fillList($("ranking"), state.ranked);
    $("undoLastBtn").disabled = !history.length;
    return;
  }

  show("battle");
  const challenger = state.pending[0];
  const opponent = state.ranked[mid()];
  const key = challenger + "|" + opponent + "|" + state.picks;
  if (key !== lastPairKey) {
    sideSwap = Math.random() < 0.5;
    lastPairKey = key;
  }
  $("prompt").textContent = state.question;
  $("left").textContent = sideSwap ? opponent : challenger;
  $("right").textContent = sideSwap ? challenger : opponent;

  const left = state.picks + remainingEstimate();
  const pct = left ? Math.round((state.picks / left) * 100) : 100;
  $("bar").style.width = pct + "%";
  $("progressText").textContent =
    `${state.picks} picks made · at most ${remainingEstimate()} to go · ` +
    `${state.ranked.length} of ${state.ranked.length + state.pending.length} states placed`;
  $("undoBtn").disabled = !history.length;
  fillList($("partialList"), state.ranked);
}

function pick(side) {
  // side: "left" | "right"; challenger is on the left unless swapped.
  const challengerOnLeft = !sideSwap;
  choose(side === "left" ? challengerOnLeft : !challengerOnLeft);
}

async function copyRanking() {
  const text = `${state.question}\n` + state.ranked.map((n, i) => `${i + 1}. ${n}`).join("\n");
  try {
    await navigator.clipboard.writeText(text);
    $("copyBtn").textContent = "Copied!";
  } catch (_) {
    $("copyBtn").textContent = "Copy failed";
  }
  setTimeout(() => ($("copyBtn").textContent = "Copy ranking"), 1500);
}

$("startBtn").addEventListener("click", start);
$("left").addEventListener("click", () => pick("left"));
$("right").addEventListener("click", () => pick("right"));
$("undoBtn").addEventListener("click", undo);
$("undoLastBtn").addEventListener("click", undo);
$("resetBtn").addEventListener("click", reset);
$("restartBtn").addEventListener("click", reset);
$("copyBtn").addEventListener("click", copyRanking);

document.addEventListener("keydown", (e) => {
  if ($("battle").hidden || e.target.tagName === "INPUT") return;
  if (e.key === "ArrowLeft") pick("left");
  else if (e.key === "ArrowRight") pick("right");
  else if (e.key === "u" || e.key === "U" || e.key === "Backspace") { e.preventDefault(); undo(); }
});

load();
render();
