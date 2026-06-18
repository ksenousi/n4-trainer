// Lightweight progress tracking stored in localStorage.
// Schema: { cards: { [cardId]: { deck, status, correct, wrong, lastSeen } }, studyDays: [ "YYYY-MM-DD", ... ] }
const STORAGE_KEY = "n4trainer_progress_v1";

const Progress = {
  _data: null,

  load() {
    if (this._data) return this._data;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      this._data = raw ? JSON.parse(raw) : { cards: {}, studyDays: [] };
    } catch (e) {
      this._data = { cards: {}, studyDays: [] };
    }
    if (!this._data.cards) this._data.cards = {};
    if (!this._data.studyDays) this._data.studyDays = [];
    return this._data;
  },

  save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this._data));
  },

  today() {
    return new Date().toISOString().slice(0, 10);
  },

  markStudiedToday() {
    const d = this.load();
    const t = this.today();
    if (!d.studyDays.includes(t)) {
      d.studyDays.push(t);
      this.save();
    }
  },

  // status: "known" | "learning" | "unknown"
  record(cardId, deck, knewIt) {
    const d = this.load();
    if (!d.cards[cardId]) {
      d.cards[cardId] = { deck, status: "learning", correct: 0, wrong: 0, lastSeen: null };
    }
    const c = d.cards[cardId];
    c.deck = deck;
    c.lastSeen = Date.now();
    if (knewIt) {
      c.correct += 1;
      // Promote to "known" after 2 consecutive-ish correct (simple heuristic using ratio)
      if (c.correct >= 2 && c.correct >= c.wrong) {
        c.status = "known";
      } else {
        c.status = "learning";
      }
    } else {
      c.wrong += 1;
      c.status = "learning";
    }
    this.markStudiedToday();
    this.save();
  },

  getCard(cardId) {
    return this.load().cards[cardId] || null;
  },

  statsForDeck(deck, allIds) {
    const d = this.load();
    let known = 0, learning = 0, untouched = 0;
    allIds.forEach((id) => {
      const c = d.cards[id];
      if (!c) { untouched++; return; }
      if (c.status === "known") known++;
      else learning++;
    });
    return { total: allIds.length, known, learning, untouched };
  },

  weakest(deck, allIds, limit = 10) {
    const d = this.load();
    const withStats = allIds
      .map((id) => ({ id, c: d.cards[id] }))
      .filter((x) => x.c && x.c.wrong > 0)
      .sort((a, b) => (b.c.wrong - b.c.correct) - (a.c.wrong - a.c.correct));
    return withStats.slice(0, limit).map((x) => x.id);
  },

  unknownIds(deck, allIds) {
    const d = this.load();
    return allIds.filter((id) => {
      const c = d.cards[id];
      return !c || c.status !== "known";
    });
  },

  streak() {
    const d = this.load();
    if (!d.studyDays.length) return 0;
    const days = new Set(d.studyDays);
    // Start from most recent study day (not today), so a day off doesn't break the streak
    const sorted = d.studyDays.slice().sort();
    let cursor = new Date(sorted[sorted.length - 1] + "T12:00:00Z");
    let streak = 0;
    while (true) {
      const key = cursor.toISOString().slice(0, 10);
      if (days.has(key)) {
        streak++;
        cursor.setUTCDate(cursor.getUTCDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  },

  reset() {
    this._data = { cards: {}, studyDays: [] };
    this.save();
  },
};
