// === JOURNEY QUICKSTART ===
/* Preview bottom sheet for a journey's next session. Opened from the Summary
   journey card (Continue) and from the + button (Journey session section).
   Reuses: _journeyNextSession, _startJourneySession, _activeJourneySessionKeys,
   resumeWorkout, _startNextJourneySession, getJourneyColor, getExMeta, _esc.
   Frame uses the shared .sds-backdrop / .sds-sheet classes (phone-width). */

function _jqsEnsure() {
  let el = document.getElementById('jqs-backdrop');
  if (el) return el;
  el = document.createElement('div');
  el.id = 'jqs-backdrop';
  el.className = 'sds-backdrop';
  el.innerHTML = '<div class="sds-sheet" id="jqs-sheet"></div>';
  /* dismissing (tap outside) from the + flow returns to the start chooser */
  el.addEventListener('click', e => {
    if (e.target !== el) return;
    closeJourneySheet();
    if (_jqsSource === 'library') startWorkout();
  });
  document.body.appendChild(el);
  return el;
}

function _jqsExLine(e) {
  const sets = Math.max(1, parseInt(e.sets) || 3);
  const reps = (e.reps == null || e.reps === '') ? '—' : e.reps;
  const hold = !!getExMeta(e.name).tb;
  return sets + ' × ' + reps + (hold && reps !== '—' ? 's' : '');
}

let _jqsSource = 'summary';

/* one shared render for both entry points; source = 'summary' | 'library' */
function openJourneySheet(journeyId, source) {
  const j = _journeys.find(x => x.id === journeyId);
  if (!j) return;
  const next = _journeyNextSession(j);
  if (!next) return;
  const { wi, si, s, week } = next;
  const color = getJourneyColor(journeyId);
  const inProg = _activeJourneySessionKeys().includes(journeyId + '-' + wi + '-' + si);
  const otherActive = _workoutActive && !inProg;
  const title = s.planName || s.day || ('Session ' + (si + 1));
  const mins = s.duration > 0 ? s.duration : (j.sessionDuration > 0 ? j.sessionDuration : 0);

  const exRows = (s.exercises || []).map(e =>
    `<div style="display:flex;justify-content:space-between;gap:.75rem;padding:.5rem 0;border-bottom:1px solid #2C2C2E">
       <span style="color:#fff;font-size:.9375rem">${_esc(e.name)}</span>
       <span style="color:#8E8E93;font-size:.9375rem;white-space:nowrap">${_esc(_jqsExLine(e))}</span>
     </div>`).join('');

  _jqsSource = source;
  _jqsEnsure();
  const sheet = document.getElementById('jqs-sheet');
  sheet.innerHTML = `
    <div style="font-size:.8125rem;font-weight:700;color:${color}">${_esc(j.name)}</div>
    <div style="font-size:.8125rem;color:#8E8E93;margin-top:.15rem">Week ${week} - Session ${si + 1}</div>
    <div class="sds-title" style="margin-top:.5rem">${_esc(title)}</div>
    <div style="display:flex;gap:.5rem;align-items:center;margin:.375rem 0 .75rem;min-height:1.25rem">
      ${s.isTest === true ? '<span style="font-size:.6875rem;font-weight:700;color:#FF9F0A;background:rgba(255,159,10,.15);padding:.15rem .5rem;border-radius:999px">Test session</span>' : ''}
      ${mins ? `<span style="font-size:.8125rem;color:#8E8E93">~${mins} min</span>` : ''}
    </div>
    <div class="sds-card" style="padding:.25rem .875rem">${exRows || '<div style="color:#8E8E93;padding:.5rem 0">No exercises</div>'}</div>
    ${otherActive ? '<div class="sds-note">Another workout is in progress. Resume or finish it before starting this session.</div>' : ''}
    <button class="sds-apply" id="jqs-primary" ${otherActive ? 'disabled' : ''}>${inProg ? 'Resume session' : 'Start session'}</button>
    ${otherActive ? '<button class="sds-later" id="jqs-resume-other">Resume current workout</button>' : ''}
    <button class="sds-later" id="jqs-view">View journey</button>`;

  document.getElementById('jqs-primary').addEventListener('click', () => {
    closeJourneySheet();
    if (inProg) resumeWorkout();
    else _startJourneySession(journeyId, wi, si);
  });
  const resumeOther = document.getElementById('jqs-resume-other');
  if (resumeOther) resumeOther.addEventListener('click', () => { closeJourneySheet(); resumeWorkout(); });
  document.getElementById('jqs-view').addEventListener('click', () => {
    closeJourneySheet();
    journeyReturnTo = source === 'summary' ? 'summary' : 'library';
    _startNextJourneySession(journeyId);
  });

  sheet.scrollTop = 0;
  /* next frame so the slide-in transition runs */
  requestAnimationFrame(() => document.getElementById('jqs-backdrop').classList.add('open'));
}

function closeJourneySheet() {
  const el = document.getElementById('jqs-backdrop');
  if (el) el.classList.remove('open');
}
