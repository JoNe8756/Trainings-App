#!/usr/bin/env node
/* Repeatable safety checks for the Trainings App (no packages, run: node .claude/checks/run-checks.js).
   1. every JS file parses            4. XP levels, ranks and XP-loss rules behave
   2. index.html loads every JS file  5. story / notes / journal content has the right shape
   3. every localStorage key is mapped for export/sync (or transient) 6. journey import validation works
   Exit code 1 when a check FAILS; warnings (e.g. unmapped keys that fall back to "settings") do not fail. */
const fs = require('fs'), path = require('path'), cp = require('child_process');
const root = path.resolve(__dirname, '..', '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const fails = [], warns = [];
const ok = (cond, msg) => { if (!cond) fails.push(msg); };
const section = (name) => console.log('\n== ' + name);

const jsFiles = fs.readdirSync(root).filter(f => f.endsWith('.js'));

/* 1. syntax */
section('1. JS syntax');
jsFiles.forEach(f => {
  const r = cp.spawnSync(process.execPath, ['--check', path.join(root, f)], { encoding: 'utf8' });
  ok(r.status === 0, 'Syntax error in ' + f + ': ' + (r.stderr || '').split('\n')[0]);
});
console.log(jsFiles.length + ' files checked');

/* 2. index.html loads every JS file, and every script tag points at a file */
section('2. Script tags');
const html = read('index.html');
const tags = [...html.matchAll(/<script[^>]+src="([^"?]+)[^"]*"/g)].map(m => m[1]).filter(s => !/^https?:/.test(s));
tags.forEach(t => ok(fs.existsSync(path.join(root, t)), 'index.html loads missing file ' + t));
jsFiles.filter(f => f !== 'sw.js' && !tags.includes(f)).forEach(f => warns.push(f + ' is not loaded by index.html (ok only if it is a worker or test file)'));
console.log(tags.length + ' script tags');

/* 3. localStorage keys mapped for export / sync */
section('3. Storage keys');
const settings = read('settings.js');
let cats = [];
try { cats = new Function('return ' + settings.match(/const EXPORT_CATEGORIES = (\[[\s\S]*?\n  \]);/)[1])(); } catch (e) { fails.push('Could not read EXPORT_CATEGORIES from settings.js'); }
let transient = new Set();
try { transient = new Set(new Function('return ' + settings.match(/const _TRANSIENT_KEYS = new Set\((\[[\s\S]*?\])\)/)[1])()); } catch (e) { fails.push('Could not read _TRANSIENT_KEYS from settings.js'); }
const mapped = k => cats.some(c => c.keys.includes(k) || c.prefixes.some(p => k.startsWith(p))) || transient.has(k) || k.startsWith('sb-') || k === 'geminiApiKey';
const used = new Set();
[...jsFiles.map(f => read(f)), html].forEach(src => {
  for (const m of src.matchAll(/localStorage\.(?:getItem|setItem|removeItem)\(\s*['"]([A-Za-z0-9_:\-]+)['"]/g)) used.add(m[1]);
});
const unmapped = [...used].filter(k => !mapped(k)).sort();
if (unmapped.length) warns.push('Keys not mapped in EXPORT_CATEGORIES or _TRANSIENT_KEYS (they fall back to the "settings" category, check each is intended): ' + unmapped.join(', '));
const required = ['plansArchive', 'journeysArchive', 'plantLog', 'plantName', 'plantType', 'xpData', 'badgeData', 'trainingJourneys', 'plans', 'workouts'];
required.forEach(k => ok(cats.some(c => c.keys.includes(k)), 'Key "' + k + '" must be listed in EXPORT_CATEGORIES'));
console.log(used.size + ' keys used, ' + unmapped.length + ' unmapped');

/* helpers to pull pieces of source into a sandbox */
const slice = (src, a, b) => { const i = src.indexOf(a), j = src.indexOf(b, i + 1); if (i < 0 || j < 0) throw new Error('marker not found: ' + a + ' / ' + b); return src.slice(i, j); };

/* 4. XP levels, ranks, XP loss */
section('4. XP levels, ranks, XP loss');
try {
  const app = read('app.js'), xp = read('xp.js');
  const code = 'const XP_LEVEL_CAP = 100;\n' +
    slice(app, '  const _XP_THRESHOLDS = (function', '  /* Running XP total per source') +
    slice(app, '  function _levelForXP(xp)', '  // === XP DECAY ===') +
    slice(app, '  const _XP_RANK_NAMES', '  const XP_DECAY_RATE') + '  const XP_DECAY_RATE = 0.10;\n' +
    slice(app, '  function _xpRankStartLevel', '  let _xpDecayStamp') +
    slice(app, '  function _xpLevelLabel', '  /* The single entry point') +
    '\nreturn { T: _XP_THRESHOLDS, L: _levelForXP, N: _XP_RANK_NAMES, S: _XP_RANK_STARTS, label: _xpLevelLabel, loss: _xpDecayLoss };';
  const m = new Function(code)();
  ok(m.T[1] === 0 && m.T[2] > 0, 'Level 1 must need 0 XP and level 2 more than 0');
  ok(m.T.slice(2).every((v, i) => v > m.T[i + 1] || i === 0), 'XP thresholds must strictly increase');
  ok(m.T.length === 101, 'Expected thresholds for levels 1-100');
  ok(Math.abs(m.T[96] - 300000) < 5000, 'Level 96 (last rank) should start near 300,000 XP, got ' + m.T[96]);
  ok(m.N.length === 20 && m.S.length === 20 && m.S[19] === 96, 'Expected 20 ranks of 5 levels (last starts at 96)');
  ok(new Set(m.N).size === 20, 'Rank names must be unique');
  ok(m.label(1) === m.N[0] && m.label(100) === m.N[19] && m.label(6) === m.N[1], 'Rank labels must follow 5-level steps');
  /* XP loss: never negative, none without idle weeks, never below the start of the current rank, grows with weeks */
  for (let lvl = 1; lvl <= 100; lvl += 3) {
    const eff = m.T[lvl] + 40;
    ok(m.loss(eff, 0) === 0, 'No idle weeks must cost nothing (level ' + lvl + ')');
    let prev = 0;
    for (const w of [1, 2, 5, 30]) {
      const l = m.loss(eff, w);
      ok(l >= prev && l >= 0, 'XP loss must not shrink with more idle weeks (level ' + lvl + ')');
      const floorXP = m.T[m.S.filter(s => s <= lvl).pop()];
      ok(eff - l >= floorXP - 1e-9, 'XP loss must not drop below the current rank start (level ' + lvl + ')');
      prev = l;
    }
  }
  /* plant growth over levels 1-40 */
  const pg = new Function('XP_LEVEL_CAP', slice(xp, '  const _XP_PLANT_STAGES', '  // === PLANT WATER ===') + '\nreturn { g: _xpPlantGrowth };')(100);
  const g = L => pg.g({ level: L, currentLevelXP: 0, xpForNextLevel: 100, isMaxLevel: L === 100 });
  ok(g(1) === 0 && g(40) === 1 && g(100) === 1, 'Plant growth must run from 0 (level 1) to 1 (level 40 and up)');
  ok([...Array(39).keys()].every(i => g(i + 2) >= g(i + 1)), 'Plant growth must never shrink with the level');
  console.log('thresholds, ranks, XP loss and plant growth OK');
} catch (e) { fails.push('XP check could not run: ' + e.message); }

/* 5. content shape */
section('5. Story and notes content');
try {
  const xp = read('xp.js');
  const arr = (name) => new Function('return ' + xp.match(new RegExp('const ' + name + ' = (\\[[\\s\\S]*?\\n  \\]);'))[1])();
  const obj = (name) => new Function('return ' + xp.match(new RegExp('const ' + name + ' = (\\{[\\s\\S]*?\\n  \\});'))[1])();
  const story = arr('_XP_PLANT_STORY'), beats = arr('_XP_PLANT_BEATS'), lvlNotes = arr('_XP_LEVEL_NOTES'), forest = arr('_XP_FOREST_NOTES');
  const trees = obj('_XP_NATURE_NOTES');
  ok(story.length === 20 && story.every(s => s.length === 2 && s[0] && s[1]), 'Story needs 20 chapters with title and text');
  ok(beats.length === 50, 'Expected 50 level beats, got ' + beats.length);
  ok(lvlNotes.length === 100 && lvlNotes.every(Boolean), 'Expected 100 level notes');
  ok(forest.length === 12, 'Expected 12 forest notes');
  ok(Object.keys(trees).length === 5 && Object.values(trees).every(a => a.length === 8 && a.every(Boolean)), 'Each of the 5 trees needs 8 chapter notes');
  const sn = new Function('return ' + xp.match(/const _XP_PLANT_SNIPPETS = (\[[\s\S]*?\n  \]);/)[1])();
  ok(sn.length === 7, 'Expected 7 snippet pools');
  const all = [...story.map(s => s[1]), ...beats, ...lvlNotes, ...forest, ...Object.values(trees).flat(), ...sn.flat()];
  all.forEach(t => ok(typeof t === 'string' && t.trim().length > 10 && t.length < 400, 'Text with odd length: ' + String(t).slice(0, 40)));
  ok(new Set(lvlNotes).size >= 95, 'Level notes should be (almost) all different');
  console.log(all.length + ' texts checked');
} catch (e) { warns.push('Content check skipped: ' + e.message); }

/* 6. journey import validation */
section('6. Journey import');
try {
  const jx = read('journey-exchange.js');
  const stubs = {
    _journeyInputs: { goal: 'Test goal' }, _jWeeks: () => 2, _jDays: () => 2, _jDuration: () => 45, _buildJourneyPrompt: () => '',
    getExLib: () => ({ Push: ['Push-ups'], Pull: ['Pull-ups'], Core: [], Legs: [], 'Weighted/Gym': [], Cardio: [], Mobility: [] }),
    getExMeta: () => ({ diff: 5 }), EX_CATS: ['Push', 'Pull', 'Core', 'Legs', 'Weighted/Gym', 'Cardio', 'Mobility'],
    _ensureGoalExercise: () => {}, showToast: () => {}, _normFeasibility: f => (f && f.rating ? { rating: f.rating, message: '', suggestion: '' } : null)
  };
  const keys = Object.keys(stubs);
  const v = new Function(...keys, jx + '\nreturn jxValidate;')(...keys.map(k => stubs[k]));
  const good = '```json\n{"name":"A","weeks":[{"sessions":[{"exercises":[{"name":"pull-ups","sets":"3","reps":"5-8","rest":60,},{"name":"Dips","sets":3,"reps":8,"rest":60}]}]}]}\n```';
  const r = v(good);
  ok(r.ok && r.stats.weeks === 1 && r.journey.weeks[0].sessions[0].exercises[0].name === 'Pull-ups', 'A valid journey with small flaws must import and match library names');
  ok(r.warnings.some(w => /not in your library/.test(w)), 'Unknown exercises must give a warning');
  ok(!v('hello').ok && !v('{"weeks":[]}').ok && !v('{"weeks":[{"sessions":[]}]}').ok, 'Broken journeys must be rejected');
  console.log('import validation OK');
} catch (e) { fails.push('Journey import check could not run: ' + e.message); }

/* 7. journey feasibility field and archive keys */
section('7. Feasibility and archives');
try {
  const lib = read('library.js'), jx = read('journey-exchange.js');
  const code = slice(lib, '  function _normFeasibility(f)', '  const _FEAS_LABEL') +
    '  const _FEAS_LABEL = {realistic:"a",ambitious:"b",unlikely:"c"}, _FEAS_COLOR = {realistic:"#1",ambitious:"#2",unlikely:"#3"}, _esc = s => String(s);\n' +
    slice(lib, '  function _feasibilityCardHTML(f)', '  /* shown right after');
  const { n, card } = new Function(code + '\nreturn { n: _normFeasibility, card: _feasibilityCardHTML };')();
  ok(n(undefined) === null && n(null) === null && n('x') === null && n({}) === null && n({ rating: 'maybe' }) === null, 'Missing or invalid feasibility must normalise to null (old journeys, bad AI output)');
  ok(n({ rating: ' Ambitious ', message: 'm', suggestion: 's' }).rating === 'ambitious', 'Feasibility rating must be case/space tolerant');
  ok(n({ realistic: false, message: 'x' }).rating === 'unlikely', 'Legacy boolean feasibility must map to a rating');
  ok(n({ rating: 'unlikely', message: 'a'.repeat(900) }).message.length === 500, 'Feasibility message must be capped');
  ok(card(undefined) === '' && card(null) === '', 'Journeys saved before feasibility existed must render without an assessment card');
  /* both AI paths must store the normalised object, and import must keep it when saving */
  ok(/saved\.feasibility = _feas/.test(lib) && /saved\.feasibility = parsed\.feasibility/.test(jx) && /feasibility: typeof _normFeasibility/.test(jx), 'Journey generation and import must both store feasibility');
  /* archives must load safely when the key is missing or corrupt, and be listed in the right category */
  ['plansArchive', 'journeysArchive'].forEach(k => {
    const m = lib.match(new RegExp("JSON\\.parse\\(localStorage\\.getItem\\('" + k + "'\\)\\); return Array\\.isArray\\(a\\) \\? a : \\[\\]; \\} catch"));
    ok(!!m, k + ' must load as an empty list when missing or corrupt');
  });
  const catOf = k => (cats.find(c => c.keys.includes(k)) || {}).id;
  ok(catOf('plansArchive') === catOf('plans') && catOf('journeysArchive') === catOf('trainingJourneys'), 'Archives must sit in the same export category as the plans / journeys they came from');
  console.log('feasibility and archive checks OK');
} catch (e) { fails.push('Feasibility/archive check could not run: ' + e.message); }

/* result */
console.log('\n' + '-'.repeat(40));
warns.forEach(w => console.log('WARN  ' + w));
fails.forEach(f => console.log('FAIL  ' + f));
console.log(fails.length ? fails.length + ' FAILED, ' + warns.length + ' warnings' : 'ALL CHECKS PASSED (' + warns.length + ' warnings)');
process.exit(fails.length ? 1 : 0);
