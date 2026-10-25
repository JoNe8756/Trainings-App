// === BADGE HELPERS ===
/* Metrics reuse existing data/helpers: workouts (app.js), xpData + XP_RULES + getLevelInfo (app.js),
   trainingJourneys (localStorage, same key library.js persists). */
function _bdgWorkouts() { return (typeof workouts !== 'undefined' && Array.isArray(workouts)) ? workouts : []; }
function _bdgXP() {
  if (typeof xpData !== 'undefined' && xpData) return xpData;
  try { return JSON.parse(localStorage.getItem('xpData')) || {}; } catch (e) { return {}; }
}
function _bdgJourneys() {
  try { return JSON.parse(localStorage.getItem('trainingJourneys') || '[]'); } catch (e) { return []; }
}
/* PRs ever awarded: findNewPRs() only looks at the latest workout, so total = PR XP earned / XP per PR. */
function _bdgPRCount() {
  const x = _bdgXP();
  const xp = Number(x.xpBySource && x.xpBySource.pr) || 0;
  return Math.round(xp / (XP_RULES.pr || 15));
}
function _bdgJourneySessions() { return _bdgJourneys().reduce((n, j) => n + (j.completedSessions || []).length, 0); }
function _bdgJourneysComplete() {
  return _bdgJourneys().filter(j => {
    const total = _journeyTotalSessions(j);
    return total > 0 && (j.completedSessions || []).length >= total;
  }).length;
}
function _bdgKillerSets() { return _bdgWorkouts().filter(w => (w.exercises || []).some(ex => ex.killer)).length; }

// === BADGE METRICS ===
/* Workout-derived metrics. Set filters/volume rule mirror the post-workout summary in workouts.js. */
function _bdgIsTB(ex, st) { return !!(st && st.tb) || !!(typeof getExMeta === 'function' && getExMeta(ex.name).tb); }
function _bdgAllSets() {
  const out = [];
  _bdgWorkouts().forEach(w => (w.exercises || []).forEach(ex => (ex.sets || []).forEach(st => out.push({ ex, st }))));
  return out;
}
function _bdgSets() { return _bdgAllSets().filter(({ st }) => (parseFloat(st.reps) || 0) > 0 || (parseFloat(st.kg) || 0) > 0).length; }
function _bdgReps() { return Math.round(_bdgAllSets().reduce((n, { ex, st }) => n + (_bdgIsTB(ex, st) ? 0 : (parseFloat(st.reps) || 0)), 0)); }
function _bdgVolume() {
  return Math.round(_bdgAllSets().reduce((n, { st }) => {
    const kg = parseFloat(st.kg), r = parseFloat(st.reps) || 0;
    return (isFinite(kg) && kg > 0 && r > 0) ? n + kg * r : n;
  }, 0));
}
function _bdgHours() { return Math.floor(_bdgWorkouts().reduce((n, w) => n + (Number(w.duration) || 0), 0) / 3600); }
function _bdgDistinctExercises() { return new Set(_bdgAllSets().map(({ ex }) => String(ex.name || '').trim().toLowerCase()).filter(Boolean)).size; }
function _bdgBestReps(names) {
  let best = 0;
  _bdgAllSets().forEach(({ ex, st }) => {
    if (names.includes(String(ex.name || '').trim().toLowerCase()) && !_bdgIsTB(ex, st)) best = Math.max(best, parseFloat(st.reps) || 0);
  });
  return best;
}
function _bdgBestHold() {
  let best = 0;
  _bdgAllSets().forEach(({ ex, st }) => { if (_bdgIsTB(ex, st)) best = Math.max(best, parseFloat(st.reps) || 0); });
  return best;
}
function _bdgWarmups() { return _bdgWorkouts().filter(w => w.warmup).length; }
function _bdgWeeklyGoals() {
  const x = _bdgXP();
  return Math.round((Number(x.xpBySource && x.xpBySource.weekly_goal) || 0) / (XP_RULES.weeklyGoal || 50));
}
/* Special badges: workout start = finish timestamp minus duration. */
function _bdgStarts() { return _bdgWorkouts().map(w => new Date(new Date(w.date).getTime() - (Number(w.duration) || 0) * 1000)).filter(d => !isNaN(d.getTime())); }
function _bdgEarlyBird() { return _bdgStarts().some(d => d.getHours() < 7) ? 1 : 0; }
function _bdgNightOwl()  { return _bdgStarts().some(d => d.getHours() >= 21) ? 1 : 0; }
function _bdgWeekendWarrior() {
  const wk = {};
  _bdgStarts().forEach(d => { const k = _xpWeekKey(d); (wk[k] = wk[k] || new Set()).add(d.getDay()); });
  return Object.values(wk).some(set => set.has(6) && set.has(0)) ? 1 : 0;
}
function _bdgDoubleDay() {
  const seen = {};
  return _bdgStarts().some(d => { const k = d.toDateString(); seen[k] = (seen[k] || 0) + 1; return seen[k] >= 2; }) ? 1 : 0;
}
function _bdgComeback() {
  const t = _bdgStarts().map(d => d.getTime()).sort((a, b) => a - b);
  for (let i = 1; i < t.length; i++) if (t[i] - t[i - 1] >= 14 * 86400000) return 1;
  return 0;
}

// === BADGE SERIES ===
/* Each series expands into one badge per tier (id `${series.id}_${target}`). */
const _bdgStreak = () => Number(_bdgXP().streakWeeks) || 0;
const BADGE_SERIES = [
  { id: 'trainings', category: 'Consistency', name: 'Trainings', emoji: '👟', getProgress: () => _bdgWorkouts().length, tiers: [1, 5, 10, 25, 50, 100, 200, 365], desc: t => `Log ${t} training${t > 1 ? 's' : ''}.` },
  { id: 'streak', category: 'Consistency', name: 'Weekly Streak', emoji: '🔥', getProgress: _bdgStreak, tiers: [2, 4, 8, 12, 26, 52], desc: t => `Keep a ${t}-week streak.` },
  { id: 'weeklygoals', category: 'Consistency', name: 'Weekly Goals', emoji: '🎯', getProgress: _bdgWeeklyGoals, tiers: [1, 4, 12, 26, 52], desc: t => `Reach your weekly goal ${t} time${t > 1 ? 's' : ''}.` },
  { id: 'level', category: 'Progression', name: 'Level', emoji: '⭐', getProgress: () => getLevelInfo().level, tiers: [3, 5, 10, 15, 20, 30, 40, 50], desc: t => `Reach level ${t}.` },
  { id: 'xp', category: 'Progression', name: 'Total XP', emoji: '✨', getProgress: () => Number(_bdgXP().totalXP) || 0, tiers: [500, 1000, 2500, 5000, 10000, 25000], desc: t => `Earn ${t} XP.` },
  { id: 'pr', category: 'Progression', name: 'Personal Records', emoji: '🏆', getProgress: _bdgPRCount, tiers: [1, 5, 10, 25, 50, 100, 250], desc: t => `Set ${t} personal record${t > 1 ? 's' : ''}.` },
  { id: 'exercises', category: 'Progression', name: 'Exercises Tried', emoji: '🧪', getProgress: _bdgDistinctExercises, tiers: [10, 25, 50, 100, 200], desc: t => `Try ${t} different exercises.` },
  { id: 'sets', category: 'Volume', name: 'Total Sets', emoji: '📋', getProgress: _bdgSets, tiers: [50, 250, 1000, 2500, 5000, 10000], desc: t => `Complete ${t} sets.` },
  { id: 'reps', category: 'Volume', name: 'Total Reps', emoji: '🔁', getProgress: _bdgReps, tiers: [500, 2500, 10000, 25000, 50000, 100000], desc: t => `Complete ${t} reps.` },
  { id: 'volume', category: 'Volume', name: 'Total Volume', emoji: '🏋️', getProgress: _bdgVolume, tiers: [1000, 10000, 50000, 100000, 500000], desc: t => `Lift ${t} kg in total.` },
  { id: 'hours', category: 'Volume', name: 'Training Time', emoji: '⏱️', getProgress: _bdgHours, tiers: [1, 5, 10, 25, 50, 100], desc: t => `Train for ${t} hour${t > 1 ? 's' : ''} in total.` },
  { id: 'pullup', category: 'Skills', name: 'Pull-ups', emoji: '🧗', getProgress: () => _bdgBestReps(['pull-ups', 'pull-up']), tiers: [1, 5, 10, 15, 20, 30], desc: t => `Do ${t} pull-up${t > 1 ? 's' : ''} in a single set.` },
  { id: 'pushup', category: 'Skills', name: 'Push-ups', emoji: '🤸', getProgress: () => _bdgBestReps(['push-ups', 'push-up']), tiers: [10, 25, 50, 75, 100], desc: t => `Do ${t} push-ups in a single set.` },
  { id: 'hold', category: 'Skills', name: 'Longest Hold', emoji: '🧘', getProgress: _bdgBestHold, tiers: [10, 30, 60, 120], desc: t => `Hold a position for ${t} seconds.` },
  { id: 'jsessions', category: 'Journeys & Routines', name: 'Journey Sessions', emoji: '🧭', getProgress: _bdgJourneySessions, tiers: [1, 5, 10, 25, 50, 100], desc: t => `Complete ${t} journey session${t > 1 ? 's' : ''}.` },
  { id: 'jdone', category: 'Journeys & Routines', name: 'Journeys Completed', emoji: '🏁', getProgress: _bdgJourneysComplete, tiers: [1, 2, 3, 5, 10], desc: t => `Fully complete ${t} journey${t > 1 ? 's' : ''}.` },
  { id: 'killer', category: 'Journeys & Routines', name: 'Killer Sets', emoji: '💀', getProgress: _bdgKillerSets, tiers: [1, 5, 10, 25, 50], desc: t => `Complete ${t} Killer Set${t > 1 ? 's' : ''}.` },
  { id: 'warmup', category: 'Journeys & Routines', name: 'Warmups', emoji: '🌡️', getProgress: _bdgWarmups, tiers: [5, 25, 50, 100], desc: t => `Complete ${t} warmups.` },
  { id: 'earlybird', category: 'Special', name: 'Early Bird', emoji: '🌅', getProgress: _bdgEarlyBird, tiers: [1], desc: () => 'Start a training before 7:00.' },
  { id: 'nightowl', category: 'Special', name: 'Night Owl', emoji: '🦉', getProgress: _bdgNightOwl, tiers: [1], desc: () => 'Start a training after 21:00.' },
  { id: 'weekend', category: 'Special', name: 'Weekend Warrior', emoji: '🗓️', getProgress: _bdgWeekendWarrior, tiers: [1], desc: () => 'Train on both Saturday and Sunday of the same week.' },
  { id: 'doubleday', category: 'Special', name: 'Double Day', emoji: '✌️', getProgress: _bdgDoubleDay, tiers: [1], desc: () => 'Train twice on the same day.' },
  { id: 'comeback', category: 'Special', name: 'Comeback', emoji: '🔄', getProgress: _bdgComeback, tiers: [1], desc: () => 'Train again after a break of 14+ days.' },
];
const _BADGE_TIER_COLOR = { bronze: '#CD7F32', silver: '#C0C0C8', gold: '#FFD60A' };
const _BDG_ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

// === BADGE EXPANSION ===
/* First third of tiers bronze, middle third silver, last third gold; 1-2 tiers: first bronze, last gold (singles gold). */
function _bdgTierColor(i, n) {
  if (n === 1) return 'gold';
  if (n === 2) return i === 0 ? 'bronze' : 'gold';
  return i < n / 3 ? 'bronze' : (i < 2 * n / 3 ? 'silver' : 'gold');
}
const BADGES = [];
BADGE_SERIES.forEach(se => se.tiers.forEach((target, i) => {
  BADGES.push({ id: `${se.id}_${target}`, seriesId: se.id, category: se.category, emoji: se.emoji, target,
    name: se.tiers.length === 1 ? se.name : `${se.name} ${_BDG_ROMAN[i]}`,
    tier: _bdgTierColor(i, se.tiers.length), description: se.desc(target), single: se.tiers.length === 1, getProgress: se.getProgress });
}));

// === BADGE STATE ===
/* localStorage "badgeData": { earned: { [badgeId]: timestamp (0 = earned before badges existed) }, seeded: boolean } */
function _loadBadgeData() {
  let d = null;
  try { d = JSON.parse(localStorage.getItem('badgeData')); } catch (e) {}
  if (!d || typeof d !== 'object' || !d.earned || typeof d.earned !== 'object') d = { earned: {}, seeded: false };
  const ids = new Set(BADGES.map(b => b.id));
  if (Object.keys(d.earned).some(k => !ids.has(k))) { d = { earned: {}, seeded: false }; _saveBadgeData(d); }   /* old id format: reset */
  d.seeded = !!d.seeded;
  return d;
}
function _saveBadgeData(d) { localStorage.setItem('badgeData', JSON.stringify(d)); }
function _badgeProgress(b) { try { return Math.max(0, Number(b.getProgress()) || 0); } catch (e) { return 0; } }

/* Evaluate all badges; returns newly earned definitions. First run seeds silently. */
function checkBadges() {
  const d = _loadBadgeData();
  const fresh = [];
  BADGES.forEach(b => {
    if (d.earned[b.id] !== undefined || _badgeProgress(b) < b.target) return;
    d.earned[b.id] = d.seeded ? Date.now() : 0;
    if (d.seeded) fresh.push(b);
  });
  d.seeded = true;
  _saveBadgeData(d);
  return fresh;
}

/* Read-only view: before the first checkBadges() run, qualified badges show as earned (timestamp 0). */
function _badgeView() {
  const d = _loadBadgeData();
  const rows = BADGES.map(b => {
    const cur = _badgeProgress(b);
    let ts = d.earned[b.id];
    if (ts === undefined && !d.seeded && cur >= b.target) ts = 0;
    return { b, cur, earned: ts !== undefined, ts };
  });
  return { rows, earned: rows.filter(r => r.earned).length };
}
function badgesSummaryText() { return `${_badgeView().earned} earned`; }

// === BADGES SCREEN ===
function _badgesPanel() {
  let panel = document.getElementById('badges-screen');
  if (panel) return panel;
  panel = document.createElement('div');
  panel.id = 'badges-screen';
  panel.className = 'settings-panel sub';
  panel.innerHTML =
    `<div class="settings-nav">
      <button class="settings-back-btn" id="badges-back" aria-label="Back">
        <svg width="11" height="18" viewBox="0 0 9 15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="8,1 1,7.5 8,14"/></svg>
      </button>
      <div class="settings-nav-title">Badges</div>
    </div>
    <div class="settings-body" id="badges-body"></div>`;
  document.body.appendChild(panel);
  panel.querySelector('#badges-back').addEventListener('click', badgesBack);
  return panel;
}

// === BADGES NAVIGATION STATE ===
let badgeNavLevel = 'home';   /* 'home' | 'category' */
let _bdgHomeScroll = 0;
const _BDG_CAT_EMOJI = { 'Consistency': '📅', 'Progression': '📈', 'Volume': '🏋️', 'Skills': '🤸', 'Journeys & Routines': '🧭', 'Special': '✨' };

// === BADGE TILE RENDER ===
/* One shared tile renderer (earned + locked) for Next up, Recently earned and category strips. */
function _bdgTileHTML(r) {
  const pct = Math.min(100, r.cur / r.b.target * 100);
  const hint = r.b.single ? `<span class="bdg-prog bdg-hint">${r.b.description}</span>` : `<span class="bdg-bar"><span style="width:${pct}%"></span></span><span class="bdg-prog">${Math.min(r.cur, r.b.target)} / ${r.b.target}</span>`;
  return `<button class="bdg-tile${r.earned ? '' : ' locked'}" data-id="${r.b.id}">
    <span class="bdg-ring" style="--tc:${_BADGE_TIER_COLOR[r.b.tier]}"><span class="bdg-emoji">${r.b.emoji}</span></span>
    <span class="bdg-name">${r.b.name}</span>${r.earned ? '' : hint}</button>`;
}
function _bdgBindTiles(root) { root.querySelectorAll('.bdg-tile').forEach(t => t.addEventListener('click', () => _openBadgeSheet(t.dataset.id))); }
function _bdgCategories() { const c = []; BADGE_SERIES.forEach(se => { if (!c.includes(se.category)) c.push(se.category); }); return c; }
function _bdgSetTitle(t) { const el = document.querySelector('#badges-screen .settings-nav-title'); if (el) el.textContent = t; }

// === BADGES HOME ===
function _renderBadgesHome() {
  const body = document.getElementById('badges-body');
  const v = _badgeView();
  badgeNavLevel = 'home';
  _bdgSetTitle('Badges');
  /* Next up: one locked badge per series (lowest unearned tier), ranked by progress ratio */
  const nextUp = BADGE_SERIES.map(se => v.rows.filter(r => r.b.seriesId === se.id).find(r => !r.earned)).filter(Boolean)
    .sort((x, y) => (y.cur / y.b.target) - (x.cur / x.b.target)).slice(0, 5);
  const recent = v.rows.filter(r => r.earned && r.ts > 0).sort((x, y) => y.ts - x.ts).slice(0, 6);
  const cats = _bdgCategories().map(c => {
    const n = v.rows.filter(r => r.b.category === c && r.earned).length;
    return `<button class="bdg-cat" data-cat="${c}"><span class="bdg-cat-ic">${_BDG_CAT_EMOJI[c] || '🏅'}</span><span class="bdg-cat-txt"><span class="bdg-cat-name">${c}</span><span class="bdg-cat-n">${n} earned</span></span><span class="bdg-cat-chev">›</span></button>`;
  }).join('');
  body.innerHTML = `<div class="bdg-summary">${v.earned} earned</div>` +
    (nextUp.length ? `<div class="bdg-title">Next up</div><div class="bdg-strip">${nextUp.map(_bdgTileHTML).join('')}</div>` : '') +
    (recent.length ? `<div class="bdg-title">Recently earned</div><div class="bdg-strip">${recent.map(_bdgTileHTML).join('')}</div>` : '') +
    `<div class="bdg-title">Categories</div><div class="bdg-cats">${cats}</div>`;
  _bdgBindTiles(body);
  body.querySelectorAll('.bdg-cat').forEach(c => c.addEventListener('click', () => openBadgeCategory(c.dataset.cat)));
}

// === BADGE CATEGORY SCREEN ===
/* Visibility: all earned tiers of a series plus the lowest unearned one; completed series show a label instead. */
function openBadgeCategory(categoryId) {
  const body = document.getElementById('badges-body');
  _bdgHomeScroll = body.scrollTop;
  const v = _badgeView();
  badgeNavLevel = 'category';
  _bdgSetTitle(categoryId);
  body.innerHTML = BADGE_SERIES.filter(se => se.category === categoryId).map(se => {
    const rows = v.rows.filter(r => r.b.seriesId === se.id);
    const next = rows.find(r => !r.earned);
    const earned = rows.filter(r => r.earned);
    const shown = earned.concat(next ? [next] : []);
    return `<div class="bdg-series"><span>${se.emoji} ${se.name}</span><span class="bdg-series-n">${next ? '' : '<span class="bdg-done">Completed</span> '}${earned.length} earned</span></div>
      <div class="bdg-strip">${shown.map(_bdgTileHTML).join('')}</div>`;
  }).join('');
  _bdgBindTiles(body);
  body.scrollTop = 0;
}

function _renderBadges() { _renderBadgesHome(); }

function openBadgesScreen() {
  const panel = _badgesPanel();
  checkBadges();   /* seeds on first open */
  _renderBadgesHome();
  requestAnimationFrame(() => { panel.classList.add('open'); document.getElementById('badges-body').scrollTop = 0; });
}

// === BADGES BACK ===
/* One back function for chevron and swipe-back: category -> home (scroll restored), home -> XP & Levels. */
function badgesBack() {
  _closeBadgeSheet();
  if (badgeNavLevel === 'category') {
    _renderBadgesHome();
    document.getElementById('badges-body').scrollTop = _bdgHomeScroll;
    return;
  }
  closeBadgesScreen();
}

/* Single back function; returns to the XP & Levels screen (still open underneath). */
function closeBadgesScreen() {
  _closeBadgeSheet();
  badgeNavLevel = 'home';
  const panel = document.getElementById('badges-screen');
  if (panel) panel.classList.remove('open');
  const row = document.getElementById('xp-badges-count');
  if (row) row.textContent = badgesSummaryText();
}

// === BADGE DETAIL SHEET ===
function _closeBadgeSheet() { const s = document.getElementById('bdg-sheet'); if (s) s.remove(); }
function _openBadgeSheet(id) {
  const r = _badgeView().rows.find(x => x.b.id === id);
  if (!r) return;
  _closeBadgeSheet();
  const b = r.b;
  const status = r.earned
    ? (r.ts ? 'Earned on ' + new Date(r.ts).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) : 'Earned before badges were introduced')
    : `${Math.min(r.cur, b.target)} / ${b.target}`;
  const ov = document.createElement('div');
  ov.id = 'bdg-sheet';
  ov.className = 'bdg-overlay';
  ov.innerHTML = `<div class="bdg-modal">
    <button class="bdg-x" aria-label="Close">✕</button>
    <span class="bdg-ring big${r.earned ? '' : ' locked'}" style="--tc:${_BADGE_TIER_COLOR[b.tier]}"><span class="bdg-emoji">${b.emoji}</span></span>
    <div class="bdg-m-name">${b.name}</div>
    <div class="bdg-m-tier" style="color:${_BADGE_TIER_COLOR[b.tier]}">${b.tier.toUpperCase()}</div>
    <div class="bdg-m-desc">${b.description}</div>
    <div class="bdg-m-status">${status}</div>
  </div>`;
  document.body.appendChild(ov);
  ov.addEventListener('click', e => { if (e.target === ov || e.target.closest('.bdg-x')) _closeBadgeSheet(); });
}
