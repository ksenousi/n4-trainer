// Main app logic: deck selection, multiple-choice quiz rendering,
// filtering, dashboard.

const READING_QUESTIONS = READING_DATA.flatMap((p) =>
  p.questions.map((q) => ({ ...q, passageId: p.id }))
);

const DECKS = {
  vocab: { data: VOCAB_DATA, label: "Vocabulary", idPrefix: "vocab" },
  kanji: { data: KANJI_DATA, label: "Kanji", idPrefix: "kanji" },
  grammar: { data: GRAMMAR_DATA, label: "Grammar", idPrefix: "grammar" },
  sentencecomp: { data: SENTENCE_COMP_DATA, label: "Sentence Building", idPrefix: "sentencecomp" },
  reading: { data: READING_QUESTIONS, label: "Reading", idPrefix: "reading" },
};

// Quiz styles randomly mixed per card within each deck.
const DECK_QUIZ_TYPES = {
  vocab:     ["quiz-kana2kanji", "quiz-fillblank", "quiz-meaning"],
  kanji:     ["quiz-kana2kanji", "quiz-fillblank", "quiz-meaning"],
  grammar:   ["quiz-cloze", "sentencecomp"],
  reading:   ["reading-quiz"],
  dashboard: [],
};

const state = {
  deck: "vocab", // vocab | kanji | grammar | reading | dashboard
  currentMode: "quiz-kana2kanji", // picked randomly per card
  queue: [],     // shuffled array of items currently being studied
  index: 0,
  readingQIndex: 0,
  filterMode: "all", // all | unknown | weak
  tagFilter: "all",
};

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

// Resolves which item pool / progress-deck-name / category key to use for the
// current state.deck + state.currentMode combination.
function poolAndTagKeyForMode() {
  const { deck, currentMode } = state;
  if (currentMode === "sentencecomp") {
    return { items: SENTENCE_COMP_DATA, progressDeck: "sentencecomp", tagKey: "tag", isReading: false };
  }
  if (currentMode === "reading-quiz") {
    return { items: READING_DATA, progressDeck: "reading", tagKey: null, isReading: true };
  }
  const tagKey = deck === "vocab" ? "pos" : deck === "grammar" ? "tag" : null;
  return { items: DECKS[deck].data, progressDeck: deck, tagKey, isReading: false };
}

function getTags() {
  const { items, tagKey } = poolAndTagKeyForMode();
  if (!tagKey) return [];
  return Array.from(new Set(items.map((i) => i[tagKey]))).sort();
}

function buildQueue() {
  if (state.deck === "dashboard") return;
  // Use a representative mode for the deck to resolve the pool.
  // For grammar, sentencecomp shares same items as quiz-cloze from the grammar deck's perspective
  // so we need to pick the base mode for pool resolution when building the queue.
  const baseModes = { grammar: "quiz-cloze", vocab: "quiz-kana2kanji", kanji: "quiz-kana2kanji", reading: "reading-quiz" };
  state.currentMode = baseModes[state.deck] || DECK_QUIZ_TYPES[state.deck][0];
  state.readingQIndex = 0;

  const { items: pool, progressDeck, tagKey, isReading } = poolAndTagKeyForMode();

  if (isReading) {
    state.queue = shuffle(pool);
    state.index = 0;
    return;
  }

  let items = pool;
  if (tagKey && state.tagFilter !== "all") {
    items = items.filter((i) => i[tagKey] === state.tagFilter);
  }

  const allIds = items.map((i) => `${progressDeck}:${i.id}`);
  if (state.filterMode === "unknown") {
    const unknownSet = new Set(Progress.unknownIds(progressDeck, allIds));
    items = items.filter((i) => unknownSet.has(`${progressDeck}:${i.id}`));
  } else if (state.filterMode === "weak") {
    const weakSet = new Set(Progress.weakest(progressDeck, allIds, 9999));
    items = items.filter((i) => weakSet.has(`${progressDeck}:${i.id}`));
  }

  state.queue = shuffle(items);
  state.index = 0;
  // Pick a random mode for the first card
  state.currentMode = pickMode(state.deck);
}

function currentItem() {
  return state.queue[state.index];
}

function renderNav() {
  const nav = document.getElementById("nav");
  nav.innerHTML = "";
  const tabs = [
    { id: "vocab", label: "📚 Vocabulary" },
    { id: "kanji", label: "字 Kanji" },
    { id: "grammar", label: "🔤 Grammar" },
    { id: "reading", label: "📖 Reading" },
    { id: "dashboard", label: "📊 Dashboard" },
  ];
  tabs.forEach((t) => {
    const btn = document.createElement("button");
    btn.className = "nav-btn" + (state.deck === t.id ? " active" : "");
    btn.textContent = t.label;
    btn.onclick = () => {
      state.deck = t.id;
      state.filterMode = "all";
      state.tagFilter = "all";
      if (t.id !== "dashboard") buildQueue();
      render();
    };
    nav.appendChild(btn);
  });
}

function renderControls() {
  const el = document.getElementById("controls");
  if (state.deck === "dashboard" || state.deck === "reading") {
    el.innerHTML = "";
    return;
  }
  const tags = getTags();

  el.innerHTML = "";

  const filterWrap = document.createElement("div");
  filterWrap.className = "control-group";

  const filterSelect = document.createElement("select");
  [
    ["all", "All cards"],
    ["unknown", "Not yet known"],
    ["weak", "Weak / missed often"],
  ].forEach(([val, label]) => {
    const opt = document.createElement("option");
    opt.value = val;
    opt.textContent = label;
    if (val === state.filterMode) opt.selected = true;
    filterSelect.appendChild(opt);
  });
  filterSelect.onchange = (e) => {
    state.filterMode = e.target.value;
    buildQueue();
    render();
  };
  filterWrap.appendChild(filterSelect);

  if (tags.length) {
    const tagSelect = document.createElement("select");
    const allOpt = document.createElement("option");
    allOpt.value = "all";
    allOpt.textContent = "All categories";
    tagSelect.appendChild(allOpt);
    tags.forEach((tag) => {
      const opt = document.createElement("option");
      opt.value = tag;
      opt.textContent = tag;
      if (tag === state.tagFilter) opt.selected = true;
      tagSelect.appendChild(opt);
    });
    tagSelect.value = state.tagFilter;
    tagSelect.onchange = (e) => {
      state.tagFilter = e.target.value;
      buildQueue();
      render();
    };
    filterWrap.appendChild(tagSelect);
  }

  const shuffleBtn = document.createElement("button");
  shuffleBtn.className = "btn-secondary";
  shuffleBtn.textContent = "🔀 Shuffle";
  shuffleBtn.onclick = () => {
    state.queue = shuffle(state.queue);
    state.index = 0;
    state.currentMode = pickMode(state.deck);
    render();
  };
  filterWrap.appendChild(shuffleBtn);

  el.appendChild(filterWrap);
}

function emptyStateHtml() {
  return `<div class="empty-state">🎉 Nothing to study here right now!<br>Try switching the filter above, or come back after reviewing more cards.</div>`;
}

function nextCard() {
  state.readingQIndex = 0;
  if (state.index < state.queue.length - 1) {
    state.index += 1;
  } else {
    state.queue = shuffle(state.queue);
    state.index = 0;
  }
  // Pick a fresh random mode for the next card
  state.currentMode = pickMode(state.deck);
  render();
}

function renderQuiz() {
  const el = document.getElementById("card-area");
  if (!state.queue.length) {
    el.innerHTML = emptyStateHtml();
    return;
  }

  // sentencecomp has its own data pool separate from GRAMMAR_DATA — pick a
  // random item from it rather than using the grammar queue item.
  let quizItem, quizDeck;
  if (state.currentMode === "sentencecomp") {
    quizDeck = "sentencecomp";
    quizItem = SENTENCE_COMP_DATA[Math.floor(Math.random() * SENTENCE_COMP_DATA.length)];
  } else {
    quizItem = currentItem();
    quizDeck = state.deck;
  }

  const question = buildQuizQuestion(quizDeck, state.currentMode, quizItem);
  const progressLabel = `${state.index + 1} / ${state.queue.length}`;
  el.innerHTML = `<div class="progress-label">${progressLabel}</div><div id="quiz-container"></div>`;
  renderChoiceQuiz(
    document.getElementById("quiz-container"),
    question,
    (id, deck, knewIt) => Progress.record(id, deck, knewIt),
    () => nextCard()
  );
}

function renderReadingQuiz() {
  const el = document.getElementById("card-area");
  if (!state.queue.length) {
    el.innerHTML = emptyStateHtml();
    return;
  }
  const passage = currentItem();
  const qIndex = state.readingQIndex || 0;
  const progressLabel = `Passage ${state.index + 1} / ${state.queue.length} — Question ${qIndex + 1} / ${passage.questions.length}`;
  el.innerHTML = `<div class="progress-label">${progressLabel}</div><div id="reading-container"></div>`;
  renderReadingPassage(
    document.getElementById("reading-container"),
    passage,
    qIndex,
    (id, deck, knewIt) => Progress.record(id, deck, knewIt),
    () => {
      state.readingQIndex += 1;
      render();
    },
    () => nextCard()
  );
}

function renderDashboard() {
  const el = document.getElementById("card-area");
  const streak = Progress.streak();

  let html = `<div class="dashboard">`;
  html += `<div class="streak-banner">🔥 ${streak} day streak</div>`;

  Object.entries(DECKS).forEach(([deckKey, deckInfo]) => {
    const allIds = deckInfo.data.map((i) => cardId(deckKey, i));
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
    const allIds = deckInfo.data.map((i) => cardId(deckKey, i));
    const weakIds = Progress.weakest(deckKey, allIds, 5);
    if (weakIds.length) {
      anyWeak = true;
      html += `<div class="weak-deck-label">${deckInfo.label}</div><ul class="weak-list">`;
      weakIds.forEach((wid) => {
        const rawId = wid.slice(deckKey.length + 1);
        const item = deckInfo.data.find((i) => i.id === rawId);
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

  html += `<button class="btn-secondary" id="reset-progress">Reset all progress</button>`;
  html += `</div>`;

  el.innerHTML = html;

  document.getElementById("reset-progress").onclick = () => {
    if (confirm("Reset all progress? This cannot be undone.")) {
      Progress.reset();
      render();
    }
  };
}

function render() {
  renderNav();
  // Clear mode-tabs area (no longer used)
  const modeTabs = document.getElementById("mode-tabs");
  if (modeTabs) modeTabs.innerHTML = "";
  renderControls();
  if (state.deck === "dashboard") {
    renderDashboard();
  } else if (state.currentMode === "reading-quiz") {
    renderReadingQuiz();
  } else {
    renderQuiz();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  buildQueue();
  render();
});
