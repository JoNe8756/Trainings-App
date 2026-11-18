// === JOURNEY AI EXCHANGE ===
/* Additional way to create a journey without Gemini:
   1) "Export guide": builds a complete guide (goal + settings from the creator, your performance and
      recent training, your exercise library, the coaching rules and the exact JSON format) that you
      can upload or paste into Claude or any other AI.
   2) "Import journey": paste or upload the AI's answer, it is checked and fixed where possible, then
      saved as a normal journey (same data shape as a generated one).
   Reuses from library.js: _journeyInputs, _jWeeks/_jDays/_jDuration, _buildJourneyPrompt, getExLib,
   getExMeta, EX_CATS, _ensureGoalExercise, _journeys, _persistJourneys, renderLibJourneys,
   _closeJourneyCreator. Stores nothing new: an imported journey is added to "trainingJourneys". */

const JX_LIMITS = { maxWeeks: 52, maxSessionsPerWeek: 7, maxExercisesPerSession: 15, maxSets: 10 };

/* ── Creator buttons ──────────────────────────────────────── */
function jxRenderCreatorButtons() {
  const host = document.getElementById('jc-ai-exchange');
  if (!host) return;
  host.innerHTML = `
    <div class="journey-sec-label" style="margin-top:28px">Or use another AI</div>
    <div style="font-size:13px;color:#8E8E93;line-height:1.4;margin-bottom:10px">Export a guide with everything an AI needs, upload it to Claude or any other AI, then import its answer here.</div>
    <button id="jx-export-btn" class="journey-chip" style="width:100%;padding:12px;margin-bottom:8px">📤 Export guide for another AI</button>
    <button id="jx-import-btn" class="journey-chip" style="width:100%;padding:12px">📥 Import journey from AI</button>`;
  document.getElementById('jx-export-btn').addEventListener('click', jxOpenExport);
  document.getElementById('jx-import-btn').addEventListener('click', jxOpenImport);
  jxUpdateExportBtn();
}

function jxUpdateExportBtn() {
  const btn = document.getElementById('jx-export-btn');
  if (!btn) return;
  const ok = !!(_journeyInputs.goal || '').trim();
  btn.style.opacity = ok ? '1' : '.45';
}

/* ── Guide text ───────────────────────────────────────────── */
function jxFullLibraryText() {
  const lib = getExLib();
  const lines = [];
  EX_CATS.forEach(cat => (lib[cat] || []).forEach(n => {
    const m = getExMeta(n);
    lines.push(`- ${n} (${cat}, difficulty ${m.diff}/10${m.tb ? ', timed hold: reps = seconds' : ''})`);
  }));
  return lines.slice(0, 400).join('\n') || '(empty)';
}

function jxBuildGuide() {
  const i = _journeyInputs;
  const weeks = _jWeeks(), days = _jDays(), duration = _jDuration();
  const today = new Date().toISOString().slice(0, 10);
  return `# Journey creation guide (exported from my Trainings App on ${today})

## What I need from you
I track my training in a personal web app. Please design ONE personalised training journey for me, using everything below, and reply with a single JSON object in exactly the format described at the end. I will import your JSON into the app, where it behaves like any other journey (sessions I can start, log and complete).

## How to answer (important)
- Reply with ONLY the JSON object. A single code block is fine. No introduction, no explanation after it.
- Ask me no questions: everything you need is in this document. If something is unclear, make a sensible choice.
- Use exercise names exactly as written in my exercise lists below whenever possible. Only use an exercise that is not in my lists if it is essential for the goal.
- Exactly ${weeks} weeks, each with exactly ${days} sessions, each session fitting about ${duration} minutes.

---

## PART 1: Coaching brief (the same brief the app gives its built-in AI)

${_buildJourneyPrompt()}

---

## PART 2: Everything I have in my exercise library (use these exact names)
${jxFullLibraryText()}

---

## PART 3: Rules for the JSON (the app rejects it if these are broken)
- Valid JSON only: double quotes, no comments, no trailing commas, no text inside the JSON besides the values.
- Top level: "name" (string), "goal" (string), "goalExercise" (string), "feasibility" (object, see below) and "weeks" (array of ${weeks} week objects).
- "feasibility" is your honest assessment of whether my goal can be reached with ${weeks} weeks, ${days} days per week, about ${duration} minutes per session and my current level and performance (see above). It has "rating" (exactly one of "realistic", "ambitious" or "unlikely"), "message" (one to three plain sentences: can it be reached and why or why not) and "suggestion" (if not realistic: what to change, such as more weeks, more days or a smaller first goal; otherwise an empty string). Still build the best possible journey even if the rating is not "realistic".
- Each week: "week" (number, 1 to ${weeks} in order), "focus" (string) and "sessions" (array of exactly ${days} session objects).
- Each session: "day" (string, a weekday name, different days within a week), "planName" (string), "duration" (number of minutes, about ${duration}), "isTest" (true or false) and "exercises" (array of 4 to 8 exercise objects).
- Each exercise: "name" (string), "sets" (whole number 1 to 10), "reps" (ONE number, no ranges and no text; for exercises marked as timed hold in my list, reps means seconds), "rest" (number of seconds between sets) and "notes" (short coaching cue, at most 200 characters).
- The goal exercise (goalExercise) appears in every session, except that test sessions (isTest true) start with it as max-effort attempts.
- Test sessions: one in every 3rd week and one in the final week, replacing a normal training day of that week.

## Example of the exact shape (shortened, do NOT copy its content)
{
  "name": "8-week first muscle-up",
  "goal": "Do my first strict muscle-up",
  "goalExercise": "Muscle-ups",
  "feasibility": { "rating": "ambitious", "message": "A first strict muscle-up in 8 weeks is possible but needs steady training; you currently do 5 pull-ups.", "suggestion": "Add a few more weeks or a 4th training day to make it comfortably realistic." },
  "weeks": [
    {
      "week": 1,
      "focus": "Build pulling strength: 5 clean pull-ups x 5 sets",
      "sessions": [
        {
          "day": "Monday",
          "planName": "Explosive pulling",
          "duration": ${duration},
          "isTest": false,
          "exercises": [
            { "name": "Pull-ups", "sets": 4, "reps": 6, "rest": 90, "notes": "Pull to the chest, no kipping, control the way down" },
            { "name": "Dead hang", "sets": 3, "reps": 30, "rest": 60, "notes": "Shoulders active, ribs down" }
          ]
        }
      ]
    }
  ]
}

## Checklist before you answer
1. Is it valid JSON that starts with { and ends with }?
2. Are there exactly ${weeks} weeks with ${days} sessions each, and numbers (not text) for sets, reps, rest and duration?
3. Does every normal session contain the goal exercise, and does each test session start with it?
4. Did you honestly judge in "feasibility" whether the goal can be reached with these factors?
5. Does it start at my real level (see my performance above) and get harder every week?
6. Are the exercise names exactly as in my lists?

My goal once more: ${i.goal}
`;
}

/* ── Export (share sheet, file download, copy) ────────────── */
function jxOpenExport() {
  if (!(_journeyInputs.goal || '').trim()) { showToast('Set your goal first'); return; }
  const text = jxBuildGuide();
  const fileName = 'journey-guide-' + new Date().toISOString().slice(0, 10) + '.md';
  let el = document.getElementById('jx-export-backdrop');
  if (el) el.remove();
  el = document.createElement('div');
  el.id = 'jx-export-backdrop';
  el.className = 'sds-backdrop';
  el.innerHTML = `<div class="sds-sheet">
    <div class="sds-title">Guide ready</div>
    <div style="font-size:.875rem;color:#8E8E93;line-height:1.45;margin:.5rem 0 1rem">It contains your goal and settings, your performance, recent training, your exercise library, the coaching rules and the exact answer format (about ${Math.round(text.length / 1000)}k characters).<br><br><b style="color:#fff">Next:</b> upload the file (or paste the text) into Claude or another AI. Then copy its answer and use <b style="color:#fff">Import journey from AI</b> here.</div>
    <button class="sds-apply" id="jx-share">Share or save file</button>
    <button class="sds-later" id="jx-copy">Copy text</button>
    <button class="sds-later" id="jx-close">Close</button>
  </div>`;
  document.body.appendChild(el);
  const close = () => { el.classList.remove('open'); setTimeout(() => el.remove(), 320); };
  el.addEventListener('click', e => { if (e.target === el) close(); });
  el.querySelector('#jx-close').addEventListener('click', close);

  el.querySelector('#jx-copy').addEventListener('click', () => {
    const done = () => showToast('Guide copied ✓');
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done).catch(() => jxCopyFallback(text, done));
    else jxCopyFallback(text, done);
  });

  el.querySelector('#jx-share').addEventListener('click', () => {
    const download = () => {
      const url = URL.createObjectURL(new Blob([text], { type: 'text/markdown' }));
      const a = document.createElement('a');
      a.href = url; a.download = fileName; a.click();
      URL.revokeObjectURL(url);
      showToast('Guide saved ✓');
    };
    let file = null;
    try { file = new File([text], fileName, { type: 'text/markdown' }); } catch (e) {}
    /* share must be called synchronously inside the tap handler to keep the user gesture */
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: 'Journey creation guide' })
        .then(() => showToast('Guide shared ✓'))
        .catch(err => { if (err && err.name === 'AbortError') return; download(); });
    } else download();
  });
  requestAnimationFrame(() => el.classList.add('open'));
}

function jxCopyFallback(text, done) {
  const ta = document.createElement('textarea');
  ta.value = text; ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
  document.body.appendChild(ta); ta.focus(); ta.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch (e) {}
  ta.remove();
  if (ok) done(); else showToast('Could not copy. Use "Share or save file" instead');
}

/* ── Parse and validate ───────────────────────────────────── */
function jxExtractJSON(text) {
  let t = String(text || '').replace(/[“”]/g, '"').replace(/[‘’]/g, "'").trim();
  t = t.replace(/```(?:json)?/gi, '').trim();
  const firstObj = t.indexOf('{'), firstArr = t.indexOf('[');
  let a, b;
  if (firstObj >= 0 && (firstArr < 0 || firstObj < firstArr)) { a = firstObj; b = t.lastIndexOf('}'); }
  else { a = firstArr; b = t.lastIndexOf(']'); }
  if (a < 0 || b <= a) return null;
  t = t.slice(a, b + 1);
  try { return JSON.parse(t); } catch (e) {}
  try { return JSON.parse(t.replace(/,(\s*[}\]])/g, '$1')); } catch (e) {}   /* trailing commas */
  return null;
}

/* Returns { ok, errors[], warnings[], journey, stats } */
function jxValidate(text) {
  const errors = [], warnings = [];
  let raw = jxExtractJSON(text);
  if (raw == null) return { ok: false, errors: ['No valid JSON found. Copy the AI\'s whole answer (from { to }) and try again.'], warnings, journey: null, stats: null };
  if (Array.isArray(raw)) raw = { weeks: raw };
  if (raw.journey && typeof raw.journey === 'object' && !Array.isArray(raw.weeks)) raw = raw.journey;
  if (!Array.isArray(raw.weeks) || !raw.weeks.length) return { ok: false, errors: ['The answer has no "weeks" list.'], warnings, journey: null, stats: null };
  if (raw.weeks.length > JX_LIMITS.maxWeeks) errors.push('Too many weeks (' + raw.weeks.length + ', maximum ' + JX_LIMITS.maxWeeks + ').');

  /* library name lookup (case-insensitive) so close matches use your exact names */
  const lib = getExLib(), canon = {};
  EX_CATS.forEach(c => (lib[c] || []).forEach(n => { canon[n.trim().toLowerCase()] = n; }));
  let renamed = 0;
  const unknown = new Set(), distinct = new Set();
  const fixes = { sets: 0, reps: 0, rest: 0 };

  const num = (v) => {
    if (typeof v === 'number' && isFinite(v)) return v;
    const m = String(v == null ? '' : v).match(/\d+(?:[.,]\d+)?/);
    return m ? parseFloat(m[0].replace(',', '.')) : NaN;
  };

  const weeks = raw.weeks.map((w, wi) => {
    const label = 'Week ' + (wi + 1);
    if (!w || !Array.isArray(w.sessions) || !w.sessions.length) { errors.push(label + ' has no sessions.'); return null; }
    if (w.sessions.length > JX_LIMITS.maxSessionsPerWeek) errors.push(label + ' has too many sessions (' + w.sessions.length + ').');
    const sessions = w.sessions.map((s, si) => {
      const sl = label + ', session ' + (si + 1);
      if (!s || !Array.isArray(s.exercises) || !s.exercises.length) { errors.push(sl + ' has no exercises.'); return null; }
      if (s.exercises.length > JX_LIMITS.maxExercisesPerSession) errors.push(sl + ' has too many exercises (' + s.exercises.length + ').');
      const exercises = s.exercises.map((e, ei) => {
        let name = e && typeof e.name === 'string' ? e.name.trim() : '';
        if (!name) { errors.push(sl + ', exercise ' + (ei + 1) + ' has no name.'); return null; }
        const c = canon[name.toLowerCase()];
        if (c) { if (c !== name) renamed++; name = c; } else unknown.add(name);
        distinct.add(name);
        let sets = Math.round(num(e.sets));
        if (!(sets >= 1)) { sets = 3; fixes.sets++; } else if (sets > JX_LIMITS.maxSets) { sets = JX_LIMITS.maxSets; fixes.sets++; }
        if (typeof e.sets !== 'number') fixes.sets++;
        let reps = num(e.reps);
        if (!(reps > 0)) { reps = 5; fixes.reps++; } else if (typeof e.reps !== 'number') fixes.reps++;
        let rest = num(e.rest);
        if (!(rest >= 0)) { rest = 90; fixes.rest++; }
        return { name, sets, reps, rest, notes: typeof e.notes === 'string' ? e.notes.slice(0, 300) : '' };
      });
      if (exercises.some(x => !x)) return null;
      const dur = num(s.duration);
      return {
        day: typeof s.day === 'string' && s.day.trim() ? s.day.trim() : 'Day ' + (si + 1),
        planName: typeof s.planName === 'string' && s.planName.trim() ? s.planName.trim() : 'Session ' + (si + 1),
        duration: dur > 0 ? dur : (_jDuration() || 60),
        isTest: s.isTest === true,
        exercises
      };
    });
    if (sessions.some(x => !x)) return null;
    return { week: wi + 1, focus: typeof w.focus === 'string' ? w.focus : '', sessions };
  });
  if (weeks.some(x => !x)) return { ok: false, errors: errors.length ? errors : ['The plan could not be read.'], warnings, journey: null, stats: null };

  if (renamed) warnings.push(renamed + ' exercise name' + (renamed === 1 ? ' was' : 's were') + ' matched to your library spelling.');
  const fixTotal = fixes.sets + fixes.reps + fixes.rest;
  if (fixTotal) warnings.push('Some numbers were not clean (sets, reps or rest as text or missing) and were corrected.');
  if (unknown.size) warnings.push(unknown.size + ' exercise' + (unknown.size === 1 ? ' is' : 's are') + ' not in your library: ' + Array.from(unknown).join(', ') + '. When you start a session with one, the app lets you add it or replace it, as with any journey.');

  const sessionCount = weeks.reduce((t, w) => t + w.sessions.length, 0);
  const journey = {
    name: typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim().slice(0, 80) : 'AI Journey',
    goal: typeof raw.goal === 'string' && raw.goal.trim() ? raw.goal.trim() : ((_journeyInputs.goal || '').trim() || 'Imported journey'),
    goalExercise: typeof raw.goalExercise === 'string' ? raw.goalExercise.trim() : '',
    feasibility: typeof _normFeasibility === 'function' ? _normFeasibility(raw.feasibility) : null,
    weeks
  };
  return { ok: errors.length === 0, errors, warnings, journey, stats: { weeks: weeks.length, sessions: sessionCount, exercises: distinct.size } };
}

/* ── Import screen ────────────────────────────────────────── */
function jxOpenImport() {
  let el = document.getElementById('jx-import');
  if (el) el.remove();
  el = document.createElement('div');
  el.id = 'jx-import';
  el.className = 'journey-overlay';
  el.innerHTML = `
    <div class="settings-nav" style="position:sticky;top:0;z-index:2;background:#000">
      <button class="settings-back-btn" id="jx-imp-back" aria-label="Back">
        <svg width="11" height="18" viewBox="0 0 9 15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="8,1 1,7.5 8,14"/></svg>
      </button>
      <div class="settings-nav-title">Import journey</div>
    </div>
    <div class="journey-inner">
      <div style="font-size:14px;color:#8E8E93;line-height:1.45">Paste the AI's answer below, or choose the file it created. The app checks it and shows you what it found before anything is saved.</div>
      <textarea id="jx-imp-text" class="journey-card-input" rows="9" placeholder="Paste the JSON here" style="margin-top:14px"></textarea>
      <label class="journey-chip" style="display:block;text-align:center;padding:12px;margin-top:10px;cursor:pointer">📎 Choose a file
        <input type="file" id="jx-imp-file" accept=".json,.txt,.md,application/json,text/plain" style="display:none">
      </label>
      <button id="jx-imp-check" class="journey-btn-primary" style="margin-top:14px">Check journey</button>
      <div id="jx-imp-result" style="margin-top:16px"></div>
    </div>`;
  document.body.appendChild(el);
  const ta = el.querySelector('#jx-imp-text'), out = el.querySelector('#jx-imp-result');
  el.querySelector('#jx-imp-back').addEventListener('click', () => el.remove());
  el.querySelector('#jx-imp-file').addEventListener('change', e => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => { ta.value = String(r.result || ''); out.innerHTML = ''; };
    r.readAsText(f);
  });
  el.querySelector('#jx-imp-check').addEventListener('click', () => {
    const res = jxValidate(ta.value);
    out.innerHTML = '';
    const line = (txt, color) => { const d = document.createElement('div'); d.style.cssText = 'font-size:13px;line-height:1.4;margin-top:6px;color:' + color; d.textContent = txt; return d; };
    if (res.errors.length) {
      out.append(line('This cannot be imported yet:', '#FF453A'));
      res.errors.slice(0, 8).forEach(m => out.append(line('• ' + m, '#FF453A')));
      out.append(line('Tell the AI what is wrong and ask it to send the corrected JSON.', '#8E8E93'));
      return;
    }
    const card = document.createElement('div');
    card.style.cssText = 'background:#1C1C1E;border-radius:12px;padding:14px 16px';
    const t = document.createElement('div'); t.style.cssText = 'font-size:17px;font-weight:700'; t.textContent = res.journey.name;
    const g = document.createElement('div'); g.style.cssText = 'font-size:13px;color:#8E8E93;margin-top:2px'; g.textContent = res.journey.goal;
    const s = document.createElement('div'); s.style.cssText = 'font-size:14px;margin-top:8px;color:#30D158'; s.textContent = '✓ ' + res.stats.weeks + ' weeks · ' + res.stats.sessions + ' sessions · ' + res.stats.exercises + ' different exercises';
    card.append(t, g, s);
    res.warnings.forEach(w => card.append(line('⚠ ' + w, '#FF9F0A')));
    out.append(card);
    if (res.journey.feasibility) { const fb = document.createElement('div'); fb.innerHTML = _feasibilityCardHTML(res.journey.feasibility); out.append(fb); }
    else out.append(line('The AI gave no assessment of whether the goal is reachable with these factors.', '#8E8E93'));
    const add = document.createElement('button');
    add.className = 'journey-btn-primary'; add.style.marginTop = '14px'; add.textContent = 'Add journey';
    add.addEventListener('click', () => jxSaveImported(res.journey, el));
    out.append(add);
  });
}

function jxSaveImported(parsed, overlayEl) {
  _ensureGoalExercise(parsed);   /* same goal-exercise guarantee as generated journeys */
  const firstDur = parsed.weeks[0] && parsed.weeks[0].sessions[0] ? parsed.weeks[0].sessions[0].duration : 0;
  const saved = {
    id: Date.now(),
    name: parsed.name,
    goal: parsed.goal,
    goalExercise: parsed.goalExercise || undefined,
    weeks: parsed.weeks,
    createdAt: new Date().toISOString(),
    sessionDuration: firstDur || _jDuration() || 60,
    completedSessions: [],
    importedFrom: 'ai-guide'
  };
  if (parsed.feasibility) saved.feasibility = parsed.feasibility;
  if (!saved.goalExercise) delete saved.goalExercise;
  _journeys.unshift(saved);
  _persistJourneys();
  if (overlayEl) overlayEl.remove();
  _closeJourneyCreator();
  if (typeof renderLibJourneys === 'function') renderLibJourneys();
  showToast('Journey added ✓');
  if (typeof _showFeasibilityNotice === 'function') _showFeasibilityNotice(saved);
}
