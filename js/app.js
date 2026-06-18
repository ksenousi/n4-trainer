// Main app logic: home screen, quiz session, summary, dashboard.

const READING_QUESTIONS = READING_DATA.flatMap((p) =>
  p.questions.map((q) => ({ ...q, passageId: p.id }))
);

const DECKS = {
  vocab:       { data: VOCAB_DATA,          label: "Vocabulary",       idPrefix: "vocab" },
  kanji:       { data: KANJI_DATA,          label: "Kanji",            idPrefix: "kanji" },
  grammar:     { data: GRAMMAR_DATA,        label: "Grammar",          idPrefix: "grammar" },
  sentencecomp:{ data: SENTENCE_COMP_DATA,  label: "Sentence Building",idPrefix: "sentencecomp" },
  reading:     { data: READING_QUESTIONS,   label: "Reading",          idPrefix: "reading" },
};

// Quiz styles randomly mixed per card within each deck.
const DECK_QUIZ_TYPES = {
  vocab:        ["quiz-kana2kanji", "quiz-meaning"],
  kanji:        ["quiz-kana2kanji", "quiz-meaning"],
  grammar:      ["quiz-cloze", "sentencecomp"],
  reading:      ["reading-quiz"],
  sentencecomp: ["sentencecomp"],
};

const state = {
  view: "home",          // "home" | "quiz" | "summary" | "dashboard"
  deck: "vocab",         // vocab | kanji | grammar | reading | mix
  sessionSize: 20,       // 0 = all
  filterMode: "all",     // all | unknown | weak
  queue: [],
  index: 0,
  readingQIndex: 0,
  currentMode: null,
  session: { correct: 0, wrong: 0, wrongItems: [] },
};

// ---- Helpers ----

function pickMode(deck) {
  const types = DECK_QUIZ_TYPES[deck];
  if (!types || !types.length) return null;
  return types[Math.floor(Math.random() * types.length)];
}

function cardId(deck, item) {
  return `${deck}:${item.id}`;
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function currentItem() {
  return state.queue[state.index];
}

// ---- Queue building ----

function buildQueue() {
  const { deck, sessionSize, filterMode } = state;

  if (deck === "mix") {
    // Combine all non-reading decks; tag each item with its source deck
    let items = [
      ...VOCAB_DATA.map(i => ({ ...i, _deck: "vocab" })),
      ...KANJI_DATA.map(i => ({ ...i, _deck: "kanji" })),
      ...GRAMMAR_DATA.map(i => ({ ...i, _deck: "grammar" })),
      ...SENTENCE_COMP_DATA.map(i => ({ ...i, _deck: "sentencecomp" })),
    ];
    let shuffled = shuffle(items);
    if (sessionSize > 0) shuffled = shuffled.slice(0, sessionSize);
    state.queue = shuffled;
    state.index = 0;
    state.readingQIndex = 0;
    state.currentMode = pickMode(shuffled[0]?._deck || "vocab");
    return;
  }

  if (deck === "reading") {
    let shuffled = shuffle(READING_DATA);
    if (sessionSize > 0) shuffled = shuffled.slice(0, sessionSize);
    state.queue = shuffled;
    state.index = 0;
    state.readingQIndex = 0;
    state.currentMode = "reading-quiz";
    return;
  }

  // Standard deck (vocab / kanji / grammar)
  const pool = DECKS[deck].data;
  const progressDeck = deck;
  const allIds = pool.map(i => `${progressDeck}:${i.id}`);

  let items = pool;
  if (filterMode === "unknown") {
    const unknownSet = new Set(Progress.unknownIds(progressDeck, allIds));
    items = items.filter(i => unknownSet.has(`${progressDeck}:${i.id}`));
  } else if (filterMode === "weak") {
    const weakSet = new Set(Progress.weakest(progressDeck, allIds, 9999));
    items = items.filter(i => weakSet.has(`${progressDeck}:${i.id}`));
  }

  let shuffled = shuffle(items);
  if (sessionSize > 0) shuffled = shuffled.slice(0, sessionSize);
  state.queue = shuffled;
  state.index = 0;
  state.readingQIndex = 0;
  state.currentMode = pickMode(deck === "grammar" ? "grammar" : deck);
}

function startSession() {
  buildQueue();
  state.session = { correct: 0, wrong: 0, wrongItems: [] };
  state.view = "quiz";
  render();
}

function nextCard() {
  state.readingQIndex = 0;
  if (state.index < state.queue.length - 1) {
    state.index += 1;
    const nextDeck = currentItem()._deck || state.deck;
    state.currentMode = pickMode(nextDeck === "grammar" ? "grammar" : nextDeck);
    render();
  } else {
    // Session complete
    state.view = "summary";
    render();
  }
}

// ---- Rendering ----

function renderHome() {
  const nav = document.getElementById("nav");
  const controls = document.getElementById("controls");
  const el = document.getElementById("card-area");
  nav.innerHTML = "";
  controls.innerHTML = "";

  const deckOptions = [
    { id: "vocab",   label: "📚 Vocabulary" },
    { id: "kanji",   label: "字 Kanji" },
    { id: "grammar", label: "🔤 Grammar" },
    { id: "reading", label: "📖 Reading" },
    { id: "mix",     label: "🎲 Mix All" },
  ];
  const sizeOptions = [10, 20, 30, 50, 0];

  el.innerHTML = `
    <div class="home-card">
      <div class="home-section-label">Choose a deck</div>
      <div class="pill-row" id="deck-pills">
        ${deckOptions.map(d => `
          <button class="option-pill${state.deck === d.id ? " active" : ""}" data-deck="${d.id}">${d.label}</button>
        `).join("")}
      </div>

      <div class="home-section-label">Focus</div>
      <div class="pill-row" id="filter-pills">
        ${[{id:"all",label:"All"},{id:"unknown",label:"Unknown"},{id:"weak",label:"Weak"}].map(f => `
          <button class="option-pill${state.filterMode === f.id ? " active" : ""}" data-filter="${f.id}">${f.label}</button>
        `).join("")}
      </div>

      <div class="home-section-label">Session length</div>
      <div class="pill-row" id="size-pills">
        ${sizeOptions.map(s => `
          <button class="option-pill${state.sessionSize === s ? " active" : ""}" data-size="${s}">
            ${s === 0 ? "All" : s}
          </button>
        `).join("")}
      </div>

      <button class="start-btn" id="start-btn">Start →</button>

      <button class="dash-link" id="home-dashboard-btn">📊 Dashboard</button>
    </div>
  `;

  el.querySelectorAll("[data-filter]").forEach(btn => {
    btn.onclick = () => {
      state.filterMode = btn.dataset.filter;
      renderHome();
    };
  });
  el.querySelectorAll("[data-deck]").forEach(btn => {
    btn.onclick = () => {
      state.deck = btn.dataset.deck;
      renderHome();
    };
  });
  el.querySelectorAll("[data-size]").forEach(btn => {
    btn.onclick = () => {
      state.sessionSize = Number(btn.dataset.size);
      renderHome();
    };
  });
  document.getElementById("start-btn").onclick = () => startSession();
  document.getElementById("home-dashboard-btn").onclick = () => {
    state.view = "dashboard";
    render();
  };
}

function emptyStateHtml() {
  return `<div class="empty-state">🎉 Nothing to study here right now!<br>Try a different filter, or switch decks.</div>`;
}

function renderQuizView() {
  const nav = document.getElementById("nav");
  const controls = document.getElementById("controls");
  const el = document.getElementById("card-area");
  nav.innerHTML = "";
  controls.innerHTML = "";

  if (!state.queue.length) {
    el.innerHTML = emptyStateHtml();
    return;
  }

  if (state.currentMode === "reading-quiz") {
    renderReadingQuiz(el);
    return;
  }

  // For mix/grammar, sentencecomp mode needs an item from SENTENCE_COMP_DATA
  let quizItem, quizDeck;
  if (state.currentMode === "sentencecomp") {
    quizDeck = "sentencecomp";
    quizItem = SENTENCE_COMP_DATA[Math.floor(Math.random() * SENTENCE_COMP_DATA.length)];
  } else {
    quizItem = currentItem();
    quizDeck = quizItem._deck || state.deck;
  }

  const question = buildQuizQuestion(quizDeck, state.currentMode, quizItem);
  const total = state.queue.length;
  const current = state.index + 1;
  const { correct, wrong } = state.session;
  el.innerHTML = `
    <div class="quiz-header">
      <div class="quiz-topbar">
        <button class="quiz-exit-btn" id="quiz-exit-btn">✕ Exit</button>
        <div class="quiz-score-live"><span class="qs-correct">✓${correct}</span> <span class="qs-wrong">✗${wrong}</span></div>
      </div>
      <div class="session-progress">
        <div class="session-progress-bar" style="width:${Math.round((current / total) * 100)}%"></div>
      </div>
      <div class="progress-label">${current} / ${total}</div>
    </div>
    <div id="quiz-container"></div>
  `;
  document.getElementById("quiz-exit-btn").onclick = () => { state.view = "home"; render(); };
  renderChoiceQuiz(
    document.getElementById("quiz-container"),
    question,
    (id, deck, knewIt) => {
      Progress.record(id, deck, knewIt);
      if (knewIt) state.session.correct++;
      else {
        state.session.wrong++;
        state.session.wrongItems.push(quizItem);
      }
    },
    () => nextCard()
  );
}

function renderReadingQuiz(el) {
  const passage = currentItem();
  const qIndex = state.readingQIndex || 0;
  const total = state.queue.length;
  const { correct: rc, wrong: rw } = state.session;
  el.innerHTML = `
    <div class="quiz-header">
      <div class="quiz-topbar">
        <button class="quiz-exit-btn" id="quiz-exit-btn">✕ Exit</button>
        <div class="quiz-score-live"><span class="qs-correct">✓${rc}</span> <span class="qs-wrong">✗${rw}</span></div>
      </div>
      <div class="session-progress">
        <div class="session-progress-bar" style="width:${Math.round(((state.index + 1) / total) * 100)}%"></div>
      </div>
      <div class="progress-label">Passage ${state.index + 1} / ${total} — Q${qIndex + 1}/${passage.questions.length}</div>
    </div>
    <div id="reading-container"></div>
  `;
  document.getElementById("quiz-exit-btn").onclick = () => { state.view = "home"; render(); };
  renderReadingPassage(
    document.getElementById("reading-container"),
    passage,
    qIndex,
    (id, deck, knewIt) => {
      Progress.record(id, deck, knewIt);
      if (knewIt) state.session.correct++;
      else state.session.wrong++;
    },
    () => { state.readingQIndex += 1; render(); },
    () => nextCard()
  );
}

function renderSummary() {
  const nav = document.getElementById("nav");
  const controls = document.getElementById("controls");
  const el = document.getElementById("card-area");
  nav.innerHTML = "";
  controls.innerHTML = "";

  const { correct, wrong, wrongItems } = state.session;
  const total = correct + wrong;
  const pct = total ? Math.round((correct / total) * 100) : 0;
  const deckLabel = state.deck === "mix" ? "Mix All"
    : state.deck === "grammar" ? "Grammar"
    : state.deck === "reading" ? "Reading"
    : state.deck === "kanji" ? "Kanji" : "Vocabulary";

  let emoji = pct >= 80 ? "🎉" : pct >= 60 ? "💪" : "📖";
  let message = pct >= 80 ? "Great work!" : pct >= 60 ? "Keep it up!" : "Keep studying!";

  el.innerHTML = `
    <div class="summary-card">
      <div class="summary-emoji">${emoji}</div>
      <div class="summary-title">${message}</div>
      <div class="summary-deck-label">${deckLabel} · ${state.sessionSize === 0 ? "All" : state.sessionSize} cards</div>
      <div class="score-display">
        <span class="score-correct">${correct}</span>
        <span class="score-sep"> / ${total}</span>
      </div>
      <div class="score-pct">${pct}% correct</div>
      <div class="score-breakdown">
        <span class="score-right-chip">✓ ${correct} right</span>
        <span class="score-wrong-chip">✗ ${wrong} wrong</span>
      </div>
      ${wrongItems && wrongItems.length ? `
        <div class="wrong-items-section">
          <div class="wrong-items-label">Missed items</div>
          <ul class="wrong-items-list">
            ${wrongItems.slice(0, 8).map(item => {
              const label = item.pattern || item.kanji || item.kana || item.fullSentence || "";
              const hint = item.meaning || item.translation || "";
              return `<li>${label}${hint ? ` — <span class="wi-hint">${hint}</span>` : ""}</li>`;
            }).join("")}
          </ul>
        </div>
      ` : ""}
      <div class="summary-actions">
        <button class="start-btn" id="summary-again-btn">Study again</button>
        ${wrongItems && wrongItems.length ? `<button class="start-btn drill-btn" id="summary-drill-btn">🔁 Drill missed (${wrongItems.length})</button>` : ""}
        <button class="btn-secondary" id="summary-menu-btn">← Back to menu</button>
        <button class="dash-link" id="summary-dash-btn">📊 Dashboard</button>
      </div>
    </div>
  `;

  document.getElementById("summary-again-btn").onclick = () => startSession();
  document.getElementById("summary-menu-btn").onclick = () => { state.view = "home"; render(); };
  document.getElementById("summary-dash-btn").onclick = () => { state.view = "dashboard"; render(); };
  const drillBtn = document.getElementById("summary-drill-btn");
  if (drillBtn) {
    drillBtn.onclick = () => {
      // Drill only the missed items
      state.queue = shuffle(wrongItems.slice());
      state.index = 0;
      state.readingQIndex = 0;
      state.session = { correct: 0, wrong: 0, wrongItems: [] };
      const firstItem = state.queue[0];
      const itemDeck = firstItem._deck || state.deck;
      state.currentMode = pickMode(itemDeck === "grammar" ? "grammar" : itemDeck);
      state.view = "quiz";
      render();
    };
  }
}

function renderDashboard() {
  const nav = document.getElementById("nav");
  const controls = document.getElementById("controls");
  const el = document.getElementById("card-area");
  nav.innerHTML = "";
  controls.innerHTML = "";

  const streak = Progress.streak();
  let html = `<div class="dashboard">`;
  html += `<button class="btn-secondary" id="dash-back-btn" style="margin-bottom:16px">← Back to menu</button>`;
  html += `<div class="streak-banner">🔥 ${streak} day streak</div>`;

  Object.entries(DECKS).forEach(([deckKey, deckInfo]) => {
    const allIds = deckInfo.data.map(i => cardId(deckKey, i));
    const stats = Progress.statsForDeck(deckKey, allIds);
    const pct = stats.total ? Math.round((stats.known / stats.total) * 100) : 0;
    html += `
      <div class="dash-deck">
        <div class="dash-deck-title">${deckInfo.label} — ${stats.known}/${stats.total} known (${pct}%)</div>
        <div class="bar-bg"><div class="bar-fill" style="width:${pct}%"></div></div>
      </div>
    `;
  });

  html += `<div class="weak-section"><h3>Weakest items</h3>`;
  let anyWeak = false;
  Object.entries(DECKS).forEach(([deckKey, deckInfo]) => {
    const allIds = deckInfo.data.map(i => cardId(deckKey, i));
    const weakIds = Progress.weakest(deckKey, allIds, 5);
    if (weakIds.length) {
      anyWeak = true;
      html += `<div class="weak-deck-label">${deckInfo.label}</div><ul class="weak-list">`;
      weakIds.forEach(wid => {
        const rawId = wid.slice(deckKey.length + 1);
        const item = deckInfo.data.find(i => i.id === rawId);
        if (!item) return;
        const label = item.pattern || item.fullSentence || item.prompt || item.kanji || item.kana || rawId;
        const meaning = item.meaning || item.translation || "";
        html += `<li>${label}${meaning ? " — " + meaning : ""}</li>`;
      });
      html += `</ul>`;
    }
  });
  if (!anyWeak) html += `<div class="empty-hint">No weak items yet — keep studying!</div>`;
  html += `</div>`;
  html += `<button class="btn-secondary" id="reset-progress" style="margin-top:24px;width:100%">Reset all progress</button>`;
  html += `</div>`;

  el.innerHTML = html;

  document.getElementById("dash-back-btn").onclick = () => { state.view = "home"; render(); };
  document.getElementById("reset-progress").onclick = () => {
    if (confirm("Reset all progress? This cannot be undone.")) {
      Progress.reset();
      render();
    }
  };
}

function render() {
  const modeTabs = document.getElementById("mode-tabs");
  if (modeTabs) modeTabs.innerHTML = "";

  if (state.view === "home")      renderHome();
  else if (state.view === "quiz") renderQuizView();
  else if (state.view === "summary") renderSummary();
  else if (state.view === "dashboard") renderDashboard();
}

document.addEventListener("DOMContentLoaded", () => render());
