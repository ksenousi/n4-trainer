// Shared quiz engine: distractor generation + multiple-choice question builders
// + the rendering of a single 4-choice question. Used by app.js for every
// non-flashcard mode (grammar cloze quiz, vocab/kanji drills, sentence
// composition, reading comprehension).

// shuffle() is defined in app.js and loaded before this file is used (quiz.js
// itself loads before app.js, but shuffle() is only called at render/build
// time, by which point app.js has already executed and defined it globally).

function pickDistractors(pool, correctItem, tagKey, n, labelFn) {
  const correctLabel = labelFn(correctItem);
  const used = new Set([correctLabel]);

  const sameTag = tagKey
    ? pool.filter((i) => i.id !== correctItem.id && i[tagKey] === correctItem[tagKey])
    : [];
  const otherTag = pool.filter(
    (i) => i.id !== correctItem.id && (!tagKey || i[tagKey] !== correctItem[tagKey])
  );

  const distractors = [];

  function tryAdd(candidates) {
    const shuffled = shuffle(candidates);
    for (const cand of shuffled) {
      if (distractors.length >= n) break;
      const label = labelFn(cand);
      if (used.has(label)) continue;
      used.add(label);
      distractors.push(cand);
    }
  }

  tryAdd(sameTag);
  if (distractors.length < n) tryAdd(otherTag);
  if (distractors.length < n) tryAdd(pool); // widen further if still short (tiny categories)

  const choices = shuffle([correctItem, ...distractors]);
  const correctIndex = choices.findIndex((c) => c.id === correctItem.id);
  return { choices, correctIndex };
}

// Data files author cloze sentences with the blanked word wrapped in literal
// "___word___" markers (so the answer is visible directly in the data, easy to
// read/maintain). At render time we either hide it (quiz prompt, flashcard
// front) or highlight it (flashcard back, after the answer is known).
function clozeBlank(cloze) {
  return cloze.replace(/___(.+?)___/g, '<span class="blank">＿＿＿＿</span>');
}
function clozeReveal(cloze) {
  return cloze.replace(/___(.+?)___/g, '<span class="blank-answer">$1</span>');
}

// ---- Question builders: each returns { promptHtml, revealHtml, choiceLabels, correctIndex, onAnswered } ----

function buildClozeQuestion(item) {
  const { choices, correctIndex } = pickDistractors(GRAMMAR_DATA, item, "tag", 3, (x) => x.pattern);
  return {
    promptHtml: `<div class="cloze">${clozeBlank(item.cloze)}</div>`,
    revealHtml: `<div class="meaning-hint">${item.meaning}</div><div class="cloze">${clozeReveal(item.cloze)}</div><div class="example-translation">${item.translation}</div>`,
    choiceLabels: choices.map((c) => c.pattern),
    correctIndex,
    deck: "grammar",
    cardId: `grammar:${item.id}`,
  };
}

function buildSentenceCompQuestion(item) {
  const correctChunkIndex = item.correctOrder[item.starSlot - 1];

  // Build the sentence with ★ replacing the missing slot; other chunks in correct order.
  const sentenceRow = item.correctOrder
    .map((chunkIdx, pos) =>
      pos === item.starSlot - 1
        ? `<span class="chunk-chip star-slot"><span class="star-marker">★</span></span>`
        : `<span class="chunk-chip">${item.chunks[chunkIdx]}</span>`
    )
    .join("");

  const choices = shuffle(item.chunks.map((text, idx) => ({ idx, text })));
  const correctIndex = choices.findIndex((c) => c.idx === correctChunkIndex);

  return {
    promptHtml: `
      <div class="chunk-row">${sentenceRow}</div>
      <div class="meaning-hint">Which chunk fills the <span class="star-marker">★</span>?</div>
    `,
    revealHtml: `<div class="example">${item.fullSentence}</div><div class="example-translation">${item.translation}</div>`,
    choiceLabels: choices.map((c) => c.text),
    correctIndex,
    deck: "sentencecomp",
    cardId: `sentencecomp:${item.id}`,
  };
}

function buildVocabKanjiQuestion(deck, mode, item) {
  const pool = deck === "vocab" ? VOCAB_DATA : KANJI_DATA;
  const tagKey = deck === "vocab" ? "pos" : null;

  if (mode === "quiz-kana2kanji") {
    const { choices, correctIndex } = pickDistractors(pool, item, tagKey, 3, (x) => x.kanji);
    const promptHtml =
      deck === "vocab"
        ? `<div class="kana-sub">${item.kana}</div><div class="meaning-hint">${item.meaning}</div>`
        : `<div class="readings"><b>On:</b> ${item.onyomi} &nbsp; <b>Kun:</b> ${item.kunyomi}</div><div class="meaning-hint">${item.meaning}</div>`;
    return {
      promptHtml: `${promptHtml}<div class="meaning-hint">Which kanji is this?</div>`,
      revealHtml: `<div class="example">${item.example}</div>`,
      choiceLabels: choices.map((c) => c.kanji),
      correctIndex,
      deck,
      cardId: `${deck}:${item.id}`,
    };
  }

  if (mode === "quiz-fillblank") {
    const target = deck === "vocab" ? item.kanji : item.kanji;
    const blanked = item.example.includes(target)
      ? item.example.replace(target, "＿＿＿")
      : item.example;
    const { choices, correctIndex } = pickDistractors(pool, item, tagKey, 3, (x) => x.kanji);
    return {
      promptHtml: `<div class="example">${blanked}</div><div class="meaning-hint">Which word fills the blank?</div>`,
      revealHtml: `<div class="example">${item.example}</div><div class="example-translation">${item.exampleTranslation || item.exampleMeaning || ""}</div>`,
      choiceLabels: choices.map((c) => c.kanji),
      correctIndex,
      deck,
      cardId: `${deck}:${item.id}`,
    };
  }

  if (mode === "quiz-meaning") {
    const { choices, correctIndex } = pickDistractors(pool, item, tagKey, 3, (x) => x.meaning);
    return {
      promptHtml: `<div class="jp-large">${item.kanji}</div><div class="kana-sub">${item.kana || item.kunyomi || ""}</div><div class="meaning-hint">What does this mean?</div>`,
      revealHtml: `<div class="example">${item.example}</div>`,
      choiceLabels: choices.map((c) => c.meaning),
      correctIndex,
      deck,
      cardId: `${deck}:${item.id}`,
    };
  }

  return null;
}

function buildQuizQuestion(deck, mode, item) {
  if (mode === "quiz-cloze") return buildClozeQuestion(item);
  if (mode === "sentencecomp") return buildSentenceCompQuestion(item);
  if (mode === "quiz-kana2kanji" || mode === "quiz-fillblank" || mode === "quiz-meaning") {
    return buildVocabKanjiQuestion(deck, mode, item);
  }
  return null;
}

// Renders a single choice-question into a container element. `question` is the
// object returned by buildQuizQuestion. `onNext` is called when the user clicks
// "Next" after answering. `onRecord(cardId, deck, knewIt)` is called immediately
// on answer (so progress is saved even if the user never clicks Next).
function renderChoiceQuiz(container, question, onRecord, onNext) {
  let answered = false;

  container.innerHTML = `
    <div class="flashcard quiz-card">
      ${question.promptHtml}
      <div class="choice-grid">
        ${question.choiceLabels
          .map((label, i) => `<button class="choice-btn" data-idx="${i}">${label}</button>`)
          .join("")}
      </div>
      <div class="reveal-area" style="display:none;">${question.revealHtml}</div>
    </div>
    <div class="next-area" style="display:none;">
      <button class="btn-secondary" id="quiz-next-btn">Next →</button>
    </div>
  `;

  const buttons = container.querySelectorAll(".choice-btn");
  buttons.forEach((btn) => {
    btn.onclick = () => {
      if (answered) return;
      answered = true;
      const idx = Number(btn.dataset.idx);
      const correct = idx === question.correctIndex;
      buttons.forEach((b) => {
        const bIdx = Number(b.dataset.idx);
        if (bIdx === question.correctIndex) b.classList.add("correct");
        else if (bIdx === idx) b.classList.add("incorrect");
        b.disabled = true;
      });
      container.querySelector(".reveal-area").style.display = "block";
      container.querySelector(".next-area").style.display = "block";
      if (question.cardId) onRecord(question.cardId, question.deck, correct);
      document.getElementById("quiz-next-btn").onclick = onNext;
    };
  });
}

// Renders one question of a reading-comprehension passage. `passage` is a
// READING_DATA entry, `qIndex` is the 0-based index of the question within
// passage.questions currently being asked. After the LAST question of the
// passage is answered, the English translation is revealed and the "Next"
// button advances to the next passage instead of the next question.
function renderReadingPassage(container, passage, qIndex, onRecord, onNextQuestion, onNextPassage) {
  const question = passage.questions[qIndex];
  const isLast = qIndex === passage.questions.length - 1;
  let answered = false;

  container.innerHTML = `
    <div class="passage-card">
      <div class="passage-title">${passage.title}</div>
      <div class="passage-text">${passage.passage}</div>
    </div>
    <div class="flashcard quiz-card">
      <div class="meaning-hint">${question.prompt}</div>
      <div class="choice-grid">
        ${question.choices
          .map((c, i) => `<button class="choice-btn" data-idx="${i}">${c}</button>`)
          .join("")}
      </div>
      <div class="reveal-area" style="display:none;"></div>
    </div>
    <div class="next-area" style="display:none;">
      <button class="btn-secondary" id="reading-next-btn">${isLast ? "Next passage →" : "Next question →"}</button>
    </div>
  `;

  const buttons = container.querySelectorAll(".choice-btn");
  buttons.forEach((btn) => {
    btn.onclick = () => {
      if (answered) return;
      answered = true;
      const idx = Number(btn.dataset.idx);
      const correct = idx === question.correctIndex;
      buttons.forEach((b) => {
        const bIdx = Number(b.dataset.idx);
        if (bIdx === question.correctIndex) b.classList.add("correct");
        else if (bIdx === idx) b.classList.add("incorrect");
        b.disabled = true;
      });
      if (isLast) {
        const revealArea = container.querySelector(".reveal-area");
        revealArea.style.display = "block";
        revealArea.innerHTML = `<div class="example-translation">${passage.translation}</div>`;
      }
      container.querySelector(".next-area").style.display = "block";
      onRecord(`reading:${question.id}`, "reading", correct);
      document.getElementById("reading-next-btn").onclick = isLast ? onNextPassage : onNextQuestion;
    };
  });
}
