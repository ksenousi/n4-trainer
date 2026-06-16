// Main app logic: deck/mode selection, flashcard rendering, quiz rendering,
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

const DECK_MODES = {
  vocab: [
    { id: "flashcards", label: "Flashcards" },
    { id: "quiz-kana2kanji", label: "Kana→Kanji" },
    { id: "quiz-fillblank", label: "Fill-in-blank" },
    { id: "quiz-meaning", label: "Meaning match" },
  ],
  kanji: [
    { id: "flashcards", label: "Flashcards" },
    { id: "quiz-kana2kanji", label: "Reading→Kanji" },
    { id: "quiz-fillblank", label: "Fill-in-blank" },
    { id: "quiz-meaning", label: "Meaning match" },
  ],
  grammar: [
    { id: "flashcards", label: "Flashcards" },
    { id: "quiz-cloze", label: "Fill-in-blank quiz" },
    { id: "sentencecomp", label: "Sentence building" },
  ],
  reading: [{ id: "reading-quiz", label: "Reading" }],
  dashboard: [],
};

const state = {
  deck: "vocab", // vocab | kanji | grammar | reading | dashboard
  mode: "flashcards",
  queue: [],     // shuffled array of items currently being studied
  index: 0,
  readingQIndex: 0,
  flipped: false,
  filterMode: "all", // all | unknown | weak
  tagFilter: "all",
};

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
// CURRENT state.deck + state.mode combination. Flashcards and the vocab/kanji/
// grammar quiz drills all share the same underlying pool + card ids as their
// deck's flashcards (so progress merges). Sentence-comp and reading are their
// own pseudo-decks with their own pools.
function poolAndTagKeyForMode() {
  const { deck, mode } = state;
  if (mode === "sentencecomp") {
    return { items: SENTENCE_COMP_DATA, progressDeck: "sentencecomp", tagKey: "tag", isReading: false };
  }
  if (mode === "reading-quiz") {
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
  const { items: pool, progressDeck, tagKey, isReading } = poolAndTagKeyForMode();
  state.readingQIndex = 0;

  if (isReading) {
    state.queue = shuffle(pool);
    state.index = 0;
    state.flipped = false;
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
  state.flipped = false;
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
      state.mode = (DECK_MODES[t.id] && DECK_MODES[t.id][0] && DECK_MODES[t.id][0].id) || "flashcards";
      state.filterMode = "all";
      state.tagFilter = "all";
      if (t.id !== "dashboard") buildQueue();
      render();
    };
    nav.appendChild(btn);
  });
}

function renderModeTabs() {
  const el = document.getElementById("mode-tabs");
  if (!el) return;
  const modes = DECK_MODES[state.deck] || [];
  if (modes.length <= 1) {
    el.innerHTML = "";
    return;
  }
  el.innerHTML = "";
  modes.forEach((m) => {
    const btn = document.createElement("button");
    btn.className = "mode-tab" + (state.mode === m.id ? " active" : "");
    btn.textContent = m.label;
    btn.onclick = () => {
      state.mode = m.id;
      state.filterMode = "all";
      state.tagFilter = "all";
      buildQueue();
      render();
    };
    el.appendChild(btn);
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
    state.flipped = false;
    render();
  };
  filterWrap.appendChild(shuffleBtn);

  el.appendChild(filterWrap);
}

function cardFrontBack(deck, item) {
  if (deck === "vocab") {
    return {
      front: `<div class="jp-large">${item.kanji}</div><div class="kana-sub">${item.kana}</div><div class="tag-chip">${item.pos}</div>`,
      back: `<div class="meaning-large">${item.meaning}</div><div class="example">${item.example}</div><div class="example-translation">${item.exampleTranslation}</div>`,
    };
  }
  if (deck === "kanji") {
    return {
      front: `<div class="kanji-giant">${item.kanji}</div>`,
      back: `<div class="meaning-large">${item.meaning}</div>
             <div class="readings"><b>On:</b> ${item.onyomi} &nbsp; <b>Kun:</b> ${item.kunyomi}</div>
             <div class="example">${item.example} <span class="kana-sub">(${item.exampleReading})</span></div>
             <div class="example-translation">${item.exampleMeaning}</div>`,
    };
  }
  if (deck === "grammar") {
    return {
      front: `<div class="meaning-hint">${item.meaning}</div><div class="cloze">${clozeBlank(item.cloze)}</div>`,
      back: `<div class="pattern-large">${item.pattern}</div>
             <div class="structure"><b>Structure:</b> ${item.structure}</div>
             <div class="example">${clozeReveal(item.cloze)}</div>
             <div class="example-translation">${item.translation}</div>
             <div class="tag-chip">${item.tag}</div>`,
    };
  }
  return { front: "", back: "" };
}

function emptyStateHtml() {
  return `<div class="empty-state">🎉 Nothing to study here right now!<br>Try switching the filter above, or come back after reviewing more cards.</div>`;
}

function renderCard() {
  const el = document.getElementById("card-area");
  const deck = state.deck;
  if (!state.queue.length) {
    el.innerHTML = emptyStateHtml();
    return;
  }
  const item = currentItem();
  const { front, back } = cardFrontBack(deck, item);
  const progressLabel = `${state.index + 1} / ${state.queue.length}`;

  el.innerHTML = `
    <div class="progress-label">${progressLabel}</div>
    <div class="flashcard ${state.flipped ? "flipped" : ""}" id="flashcard">
      <div class="card-face card-front">${front}</div>
      <div class="card-face card-back">${back}</div>
    </div>
    <div class="hint">${state.flipped ? "" : "Tap the card to reveal the answer"}</div>
    <div class="answer-buttons ${state.flipped ? "" : "hidden"}">
      <button class="btn-wrong" id="btn-wrong">❌ Didn't know</button>
      <button class="btn-right" id="btn-right">✅ Knew it</button>
    </div>
  `;

  document.getElementById("flashcard").onclick = () => {
    state.flipped = !state.flipped;
    render();
  };

  if (state.flipped) {
    document.getElementById("btn-wrong").onclick = (e) => {
      e.stopPropagation();
      answer(false);
    };
    document.getElementById("btn-right").onclick = (e) => {
      e.stopPropagation();
      answer(true);
    };
  }
}

function answer(knewIt) {
  const deck = state.deck;
  const item = currentItem();
  Progress.record(cardId(deck, item), deck, knewIt);
  nextCard();
}

function nextCard() {
  state.flipped = false;
  state.readingQIndex = 0;
  if (state.index < state.queue.length - 1) {
    state.index += 1;
  } else {
    // loop back to start, reshuffle
    state.queue = shuffle(state.queue);
    state.index = 0;
  }
  render();
}

function renderQuiz() {
  const el = document.getElementById("card-area");
  if (!state.queue.length) {
    el.innerHTML = emptyStateHtml();
    return;
  }
  const item = currentItem();
  const question = buildQuizQuestion(state.deck, state.mode, item);
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
  renderModeTabs();
  renderControls();
  if (state.deck === "dashboard") {
    renderDashboard();
  } else if (state.mode === "flashcards") {
    renderCard();
  } else if (state.mode === "reading-quiz") {
    renderReadingQuiz();
  } else {
    renderQuiz();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  buildQueue();
  render();
});
