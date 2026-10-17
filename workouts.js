/* Extracted from index.html — Workout logging screen, exercise cards & sets,
   intensity calc, ghost mode, rest timer/stopwatch, break timer, Killer Set,
   warmup (general+strength), post-workout summary, journey-session integration,
   add-exercise flow. Loaded early (after app.js) because restore-on-load, _pickVoice()
   and init-time renderers reference these at page load. */

  // === INTENSITY INDEX ===
  function calcSetIntensity(name, reps, kg) {
    const meta = getExMeta(name);
    const rawReps = parseFloat(reps);
    const rawKg   = parseFloat(kg);
    const raw  = (isFinite(rawReps) && rawReps > 0) ? rawReps : 0;
    const w    = (isFinite(rawKg)   && rawKg   > 0) ? rawKg   : 0;
    const diff = (isFinite(meta.diff) && meta.diff > 0) ? meta.diff : 1;
    if (!raw) return 0;
    const r    = meta.tb ? raw / 6 : raw;
    const bw   = Math.max(getUserBW() || 0, 1);  // never divide by zero
    const base = meta.type === 'w'
      ? diff * r * (w || 1)
      : diff * r * (1 + w / bw);
    const result = Math.round(base * heightLeverFactor(name));
    return isFinite(result) ? result : 0;
  }

  function calcSessionIntensity(name, sets) {
    return sets.reduce((s, st) =>
      s + calcSetIntensity(name, parseFloat(st.reps) || 0, parseFloat(st.kg) || 0), 0);
  }

  function fmtInt(n) {
    return n >= 10000 ? Math.round(n/1000) + 'k'
         : n >= 1000  ? (n/1000).toFixed(1).replace(/\.0$/, '') + 'k'
         : String(n);
  }

  // === WORKOUT INITIALIZATION ===
  function showWorkoutScreen(targetIdx) {
    ['home', 'progress', 'history', 'exercises'].forEach(t => {
      document.getElementById(t + '-screen').classList.remove('active');
      document.getElementById('tab-' + t).classList.remove('active');
    });
    document.getElementById('workout-screen').classList.add('active');
    const fab = document.getElementById('home-fab-wrap');
    if (fab) fab.style.display = 'none';
    const tabBar = document.querySelector('.tab-bar');
    if (tabBar) tabBar.style.display = 'none';
    updateResumeBanner();
    _showWarmupWorkoutCard();
    _updateRestToggleBtn();
    const cards = _exGetCards();
    if (targetIdx !== undefined && targetIdx !== null) {
      _exCurrentIdx = Math.max(0, Math.min(targetIdx, cards.length - 1));
    } else {
      _exCurrentIdx = Math.max(0, cards.length - 1);
    }
    _exNavUpdate();
  }

  function resumeWorkout() {
    const saved = parseInt(localStorage.getItem('activeWorkoutExerciseIndex'), 10);
    const targetIdx = isFinite(saved) ? saved : null;

    const ws = document.getElementById('workout-screen');
    /* Reset any stale positioning before showing */
    ws.style.transform = 'none';
    ws.style.top = '';
    ws.style.margin = '';

    /* Start with opacity 0, switch screen, then fade in */
    ws.style.opacity = '0';
    ws.style.transition = '';
    showWorkoutScreen(targetIdx);

    /* Reset scroll position */
    const scrollEl = document.getElementById('workout-scroll');
    if (scrollEl) scrollEl.scrollTop = 0;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        ws.style.transition = 'opacity 250ms ease-out';
        ws.style.opacity = '1';
        ws.addEventListener('transitionend', () => {
          ws.style.transition = '';
          ws.style.opacity = '';
        }, { once: true });
      });
    });
  }

  function minimiseWorkout() {
    localStorage.setItem('activeWorkoutExerciseIndex', String(_exCurrentIdx));

    const ws = document.getElementById('workout-screen');
    ws.style.transition = 'opacity 250ms ease-in';
    ws.style.opacity = '0';
    ws.style.pointerEvents = 'none';

    setTimeout(() => {
      ws.style.transition = '';
      ws.style.opacity = '';
      ws.style.pointerEvents = '';
      const tabBar = document.querySelector('.tab-bar');
      if (tabBar) tabBar.style.display = '';
      showTab('home');
      /* Banner land pulse */
      const banner = document.getElementById('resume-banner');
      if (banner && banner.classList.contains('visible')) {
        banner.classList.remove('banner-land');
        void banner.offsetWidth;
        banner.classList.add('banner-land');
        banner.addEventListener('animationend', () => banner.classList.remove('banner-land'), { once: true });
      }
    }, 250);
  }

  function updateResumeBanner() {
    const banner = document.getElementById('resume-banner');
    if (!banner) return;
    const workoutVisible = document.getElementById('workout-screen').classList.contains('active');
    if (_workoutActive && !workoutVisible) {
      banner.classList.add('visible');
    } else {
      banner.classList.remove('visible');
    }
  }

  function _calcElapsedSeconds() {
    const pausedAt = _workoutPausedAt || (_workoutPaused ? Date.now() : 0);
    const extraPaused = pausedAt ? (Date.now() - pausedAt) : 0;
    return Math.floor((Date.now() - _workoutStartTs - _workoutPausedMs - extraPaused) / 1000);
  }

  function startTimer(fromSeconds) {
    _workoutPaused   = false;
    _workoutPausedAt = 0;
    /* back-calculate startTs so elapsed equals fromSeconds right now */
    _workoutStartTs  = Date.now() - (fromSeconds || 0) * 1000;
    _workoutPausedMs = 0;
    document.getElementById('pause-overlay')?.classList.remove('open');
    const btn = document.getElementById('btn-pause');
    if (btn) btn.textContent = '⏸';
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      _tickTimer();
      if (timerSeconds % 5 === 0) persistActiveWorkout();
    }, 1000);
    _tickTimer();
  }

  function _tickTimer() {
    timerSeconds = _calcElapsedSeconds();
    const m   = String(Math.floor(timerSeconds / 60)).padStart(2, '0');
    const s   = String(timerSeconds % 60).padStart(2, '0');
    const txt = m + ':' + s;
    const timerEl = document.getElementById('timer');
    if (timerEl) timerEl.textContent = txt;
    const bannerTimer = document.getElementById('resume-banner-timer');
    if (bannerTimer) bannerTimer.textContent = txt;
  }

  function togglePauseWorkout() {
    _workoutPaused ? _resumeWorkoutTimer() : _pauseWorkoutTimer();
  }

  function _pauseWorkoutTimer() {
    _workoutPaused   = true;
    _workoutPausedAt = Date.now();
    clearInterval(timerInterval);
    timerInterval = null;
    document.getElementById('pause-overlay').classList.add('open');
    const btn = document.getElementById('btn-pause');
    if (btn) btn.textContent = '▶';
  }

  function _resumeWorkoutTimer() {
    if (_workoutPausedAt) {
      _workoutPausedMs += Date.now() - _workoutPausedAt;
      _workoutPausedAt = 0;
    }
    _workoutPaused = false;
    document.getElementById('pause-overlay').classList.remove('open');
    const btn = document.getElementById('btn-pause');
    if (btn) btn.textContent = '⏸';
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      _tickTimer();
      if (timerSeconds % 5 === 0) persistActiveWorkout();
    }, 1000);
    _tickTimer();
  }

  function startWorkout() {
    _renderStartChoice();
    document.getElementById('start-choice').classList.add('open');
  }

  function _getWarmupPref()      { return localStorage.getItem('startWithWarmup') !== 'false'; }

  function _setWarmupPref(val)   { localStorage.setItem('startWithWarmup', val ? 'true' : 'false'); }

  function _startWorkoutMaybeWarmup(planId /* null = blank */) {
    const warmup = document.getElementById('sc-warmup-toggle')?.checked ?? _getWarmupPref();
    if (warmup) {
      startWithWarmup(planId);   /* startWithWarmup calls closeStartChoice internally */
    } else {
      closeStartChoice();
      if (planId !== null) startWorkoutFromPlan(planId);
      else startBlankWorkout();
    }
  }

  function _warmupRowSummary() {
    const genOn = _getWarmupGeneralEnabled() && WARMUP_GENERAL_LIVE.length > 0;
    const strOn = _getWarmupStrengthEnabled();
    if (!genOn && !strOn) return null;
    if (genOn && strOn) {
      const totalSecs = WARMUP_GENERAL_LIVE.reduce((s, x) => s + (parseInt(x.secs) || 0), 0);
      const mins = Math.round(totalSecs / 60);
      return `${mins} min general · strength sequence`;
    }
    if (genOn) {
      const totalSecs = WARMUP_GENERAL_LIVE.reduce((s, x) => s + (parseInt(x.secs) || 0), 0);
      const mins = Math.round(totalSecs / 60);
      return `${mins} min general`;
    }
    return 'strength sequence only';
  }

  function _renderStartChoice() {
    const el = document.getElementById('start-choice-content');
    const warmupOn = _getWarmupPref();
    const sectionLabel = txt =>
      `<div style="font-size:.625rem;font-weight:700;letter-spacing:.08em;color:var(--tertiary);
                   text-transform:uppercase;margin:.875rem 0 .375rem;padding-left:.125rem">${txt}</div>`;

    const warmupSummary = _warmupRowSummary();
    const warmupRowHTML = warmupSummary === null ? '' : `
      <div style="display:flex;align-items:center;justify-content:space-between;
                  background:var(--card);border-radius:.75rem;padding:.625rem .875rem;
                  margin-bottom:.25rem">
        <div>
          <div style="font-size:.9375rem;font-weight:600;color:var(--label)">🔥 Include Warmup</div>
          <div style="font-size:.75rem;color:var(--tertiary);margin-top:.125rem">${warmupSummary}</div>
        </div>
        <label class="settings-toggle" style="flex-shrink:0;margin-left:.75rem">
          <input type="checkbox" id="sc-warmup-toggle" ${warmupOn ? 'checked' : ''}
            onchange="_setWarmupPref(this.checked)">
          <div class="settings-toggle-track"></div>
        </label>
      </div>`;

    el.innerHTML = `
      <div class="wizard-step-q" style="margin-bottom:.875rem">Start Workout</div>

      ${warmupRowHTML}

      ${sectionLabel('Freeform')}
      <div class="wizard-choices"${plans.length ? ' style="margin-bottom:.25rem"' : ''}>
        <button class="wizard-choice" onclick="_startWorkoutMaybeWarmup(null)">
          🏃 Blank Workout<small>Choose exercises as you go</small>
        </button>
      </div>

      ${plans.length ? `
        ${sectionLabel('Training Plans')}
        <div class="wizard-choices">
          ${plans.map(p => {
            const sub = p.exercises.slice(0, 3).map(e => _normPlanEx(e).name).join(', ') + (p.exercises.length > 3 ? '…' : '');
            return `<button class="wizard-choice" onclick="_startWorkoutMaybeWarmup(${p.id})">
              📋 ${p.name}<small>${sub || `${p.exercises.length} exercise${p.exercises.length !== 1 ? 's' : ''}`}</small>
            </button>`;
          }).join('')}
        </div>
      ` : `<div style="font-size:.8125rem;color:var(--tertiary);text-align:center;padding:.5rem 0 .25rem">Create plans in the Library tab</div>`}

      <div class="wizard-footer" style="margin-top:.875rem">
        <button class="wizard-btn-back" onclick="closeStartChoice()">Cancel</button>
      </div>`;
  }

  function closeStartChoice() {
    document.getElementById('start-choice').classList.remove('open');
  }

  async function startBlankWorkout() {
    closeStartChoice();
    _activeJourneyRef = null;
    _workoutJourneyAdds = [];
    exerciseCount  = 0;
    activePlanData = null;
    _workoutActive = true;
    _sessionRestEnabled = null;
    _killerRoutine = [];
    _killerResults = [];
    _killerStep    = 0;
    _wscHideAll();
    document.getElementById('exercise-list').innerHTML = '';
    document.getElementById('timer').textContent = '00:00';
    document.getElementById('plan-banner').style.display = 'none';
    startTimer();
    persistActiveWorkout();
    showWorkoutScreen();
    await addExercise();
  }

  function startFromPlanChoice(planId) {
    closeStartChoice();
    startWorkoutFromPlan(planId);
  }

  function repeatLastWorkout() {
    if (!workouts.length) return;
    const last = workouts[0];
    const names = (last.exercises || []).map(e => e.name).filter(Boolean);
    if (!names.length) return;

    exerciseCount  = 0;
    activePlanData = null;
    _workoutActive = true;
    _killerRoutine = [];
    _killerResults = [];
    _killerStep    = 0;
    _wscHideAll();
    document.getElementById('exercise-list').innerHTML = '';
    document.getElementById('timer').textContent = '00:00';
    document.getElementById('plan-banner').style.display = 'none';
    startTimer();

    names.forEach(name => createExCard(name));

    persistActiveWorkout();
    showWorkoutScreen();
  }

  function updateRepeatBtn() {
    const btn = document.getElementById('btn-repeat');
    if (btn) btn.style.display = workouts.length ? 'flex' : 'none';
  }

  async function addExercise() {
    const name = await openExPicker();
    if (!name) return;
    createExCard(name);
  }

  // === EXERCISE CARDS ===
  function createExCard(name, isKiller = false, numSets = 1, opts = {}) {
    exerciseCount++;
    const id  = 'ex-' + Date.now() + '-' + (++_exCardSeq);
    const tb  = !!getExMeta(name).tb;  /* time-based hold exercise? */
    const div = document.createElement('div');
    div.className = 'exercise-card';
    div.id = id;
    if (tb)           div.dataset.tb      = '1';
    if (isKiller)     div.dataset.killer  = '1';
    if (activePlanData && numSets >= 1) div.dataset.planSets = String(numSets);
    if (opts.journeyKey) {
      div.dataset.journeyKey   = opts.journeyKey;
      div.dataset.plannedSets  = String(opts.plannedSets || numSets || 1);
      div.dataset.plannedReps  = String(opts.plannedReps || 0);
    }
    div.innerHTML = `
      ${isKiller ? '<div class="ex-killer-tag">💀 Killer Set</div>' : ''}
      <div class="exercise-head">
        <input type="text" placeholder="Exercise name" value="${name.replace(/"/g, '&quot;')}"
          oninput="updateExIntensity('${id}'); updateGhostHint('${id}')" />
        <button class="btn-delete-ex" onclick="removeExercise('${id}')" title="Remove exercise">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm3.03 9.47a.75.75 0 0 1-1.06 1.06L8 9.06l-1.97 1.97a.75.75 0 0 1-1.06-1.06L6.94 8 4.97 6.03a.75.75 0 0 1 1.06-1.06L8 6.94l1.97-1.97a.75.75 0 0 1 1.06 1.06L9.06 8l1.97 1.97z"/>
          </svg>
        </button>
      </div>
      ${opts.journeyTag ? `<div class="ex-journey-tag">📍 ${_esc(opts.journeyTag)}</div>` : ''}
      <div class="ex-rest-rec"></div>
      <div class="sets-table">
        <div class="sets-col-header">
          <span>Set</span><span>kg</span><span>${tb ? 'Secs' : 'Reps'}</span><span>⚡</span><span></span><span></span>
        </div>
        <div class="sets-body"></div>
        <div class="ghost-hint" id="ghost-${id}"></div>
        <div class="ex-intensity-total"></div>
        <button class="btn-add-set" onclick="addSet('${id}')">
          <span class="btn-add-set-icon">+</span> Add Set
        </button>
      </div>`;
    document.getElementById('exercise-list').appendChild(div);
    const setsToAdd = Math.max(1, numSets);
    for (let i = 0; i < setsToAdd; i++) addSet(id);
    _syncAddSetBtn(id);
    _updateRestRec(id);
    persistActiveWorkout();
    _exCurrentIdx = _exGetCards().length - 1;
    _exNavUpdate();
  }

  function removeExercise(id) {
    const card = document.getElementById(id);
    const name = card?.querySelector('.exercise-head input')?.value || 'this exercise';
    _wConfirm({
      title: 'Remove Exercise?',
      msg: `"${name}" and all its sets will be removed.`,
      okLabel: 'Remove', okColor: 'red',
      onOk: () => {
        _animateRemove(document.getElementById(id), () => {
          document.getElementById(id)?.remove();
          persistActiveWorkout();
          _exCurrentIdx = Math.max(0, _exCurrentIdx - 1);
          _exNavUpdate();
        });
      }
    });
  }

  function _exGetCards() {
    return Array.from(document.querySelectorAll('#exercise-list > .exercise-card'));
  }

  function _exNavUpdate() {
    const cards = _exGetCards();
    const total = cards.length;
    if (!total) return;
    _exCurrentIdx = Math.max(0, Math.min(_exCurrentIdx, total - 1));
    const viewport = document.getElementById('ex-viewport');
    const cardW = viewport ? viewport.offsetWidth : 0;
    document.getElementById('exercise-list').style.transform =
      `translateX(${-_exCurrentIdx * cardW}px)`;

    /* progress label: "2 / 5" */
    const lbl = document.getElementById('ex-progress-label');
    if (lbl) lbl.textContent = `${_exCurrentIdx + 1} / ${total}`;

    /* progress name: current exercise name */
    const nameEl = document.getElementById('ex-progress-name');
    if (nameEl) {
      const nameInput = cards[_exCurrentIdx]?.querySelector('.exercise-head input');
      nameEl.textContent = nameInput?.value || '';
    }

    /* progress fill */
    const fill = document.getElementById('ex-progress-fill');
    if (fill) fill.style.width = `${((_exCurrentIdx + 1) / total) * 100}%`;

    const prevBtn = document.getElementById('btn-ex-prev');
    if (prevBtn) { prevBtn.style.opacity = _exCurrentIdx === 0 ? '0' : ''; prevBtn.style.pointerEvents = _exCurrentIdx === 0 ? 'none' : ''; }

    const rightBtn = document.getElementById('btn-ex-right');
    const hasNextCard = _exCurrentIdx < total - 1;
    if (rightBtn) { rightBtn.style.opacity = hasNextCard ? '' : '0'; rightBtn.style.pointerEvents = hasNextCard ? '' : 'none'; }
  }

  function _exArrowPulse(btnId) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.classList.remove('ex-arrow-pulse');
    void btn.offsetWidth; /* reflow to restart animation */
    btn.classList.add('ex-arrow-pulse');
    btn.addEventListener('animationend', () => btn.classList.remove('ex-arrow-pulse'), { once: true });
  }

  function _exNavNext(fromSwipe) {
    const cards = _exGetCards();
    if (_exCurrentIdx >= cards.length - 1) return;
    if (!fromSwipe) _exArrowPulse('btn-ex-right');
    if (_sw) _swStop();
    _exCurrentIdx++;
    _exNavUpdate();
    _exScrollReset();
  }

  function _exNavPrev(fromSwipe) {
    if (_exCurrentIdx <= 0) return;
    if (!fromSwipe) _exArrowPulse('btn-ex-prev');
    if (_sw) _swStop();
    _exCurrentIdx--;
    _exNavUpdate();
    _exScrollReset();
  }

  function _exScrollReset() {
    const s = document.getElementById('workout-scroll');
    if (s) s.scrollTop = 0;
  }

  function _exNavGoTo(idx) { _exCurrentIdx = idx; _exNavUpdate(); _exScrollReset(); }

  // === SET LOGGING ===
  function _getLastSessionSets(exName) {
    const norm = exName.trim().toLowerCase();
    for (const w of workouts) {
      const ex = (w.exercises || []).find(e => (e.name || '').trim().toLowerCase() === norm);
      if (ex && ex.sets && ex.sets.length) return ex.sets;
    }
    return null;
  }

  function _prefillSetRow(row, setIndex, exName) {
    /* Journey exercises: pre-fill reps with the planned journey target (not PB). */
    const jcard = row.closest('.exercise-card');
    if (jcard && jcard.dataset.journeyKey && jcard.dataset.plannedReps) {
      const jin = row.querySelectorAll('.set-input');
      const planned = parseFloat(jcard.dataset.plannedReps) || 0;
      if (jin.length && planned > 0) {
        jin[1].value = planned;                 /* reps — editable */
        jin[1].dataset.prefilled = '1';
        jin[1].classList.add('set-input-prefill');
      }
      return;                                    /* kg stays empty; skip personal-best prefill */
    }
    const sets = _getLastSessionSets(exName);
    if (!sets || setIndex >= sets.length) return;
    const s = sets[setIndex];
    const inputs = row.querySelectorAll('.set-input');
    if (!inputs.length) return;
    if (s.kg && parseFloat(s.kg) > 0) {
      inputs[0].value = s.kg;
      inputs[0].dataset.prefilled = '1';
      inputs[0].classList.add('set-input-prefill');
    }
    if (s.reps && parseFloat(s.reps) > 0) {
      inputs[1].value = s.reps;
      inputs[1].dataset.prefilled = '1';
      inputs[1].classList.add('set-input-prefill');
    }
  }

  function _applySetStates(exId) {
    const rows = Array.from(document.querySelectorAll('#' + exId + ' .sets-body .set-row'));
    const exName = document.querySelector('#' + exId + ' .exercise-head input')?.value || '';
    let activeAssigned = false;
    rows.forEach((row, idx) => {
      if (row.classList.contains('set-done')) return;
      if (!activeAssigned) {
        activeAssigned = true;
        const wasFuture = row.classList.contains('set-future');
        row.classList.remove('set-future', 'set-upcoming');
        row.classList.add('set-active');
        row.querySelectorAll('.set-input').forEach(i => { i.disabled = false; });
        row.querySelector('.btn-log-set').style.pointerEvents = '';
        /* prefill when transitioning from future → active */
        if (wasFuture) {
          const inputs = row.querySelectorAll('.set-input');
          const isEmpty = Array.from(inputs).every(i => !i.value.trim());
          if (isEmpty) _prefillSetRow(row, idx, exName);
        }
      } else {
        row.classList.remove('set-active', 'set-upcoming');
        row.classList.add('set-future');
        row.querySelectorAll('.set-input').forEach(i => {
          i.disabled = true;
          i.value = '';
          i.classList.remove('set-input-prefill');
          delete i.dataset.prefilled;
        });
        const badge = row.querySelector('.set-intensity-badge');
        if (badge) badge.textContent = '';
      }
    });
  }

  function _syncAddSetBtn(exId) {
    const card = document.getElementById(exId);
    if (!card) return;
    const btn = card.querySelector('.btn-add-set');
    if (!btn) return;
    if (!card.dataset.planSets) { btn.style.display = ''; return; } /* no plan — always show */
    /* plan exercise: show only when every existing row is confirmed */
    const totalRows = card.querySelectorAll('.sets-body .set-row').length;
    const doneCount = card.querySelectorAll('.sets-body .set-row.set-done').length;
    btn.style.display = (totalRows > 0 && doneCount >= totalRows) ? '' : 'none';
  }

  function addSet(exId) {
    const body   = document.querySelector('#' + exId + ' .sets-body');
    const setNum = body.children.length + 1;
    const sid    = 'set-' + Date.now() + '-' + setNum;
    const row    = document.createElement('div');
    row.className = 'set-row';
    row.id = sid;
    row.innerHTML = `
      <div class="set-badge">${setNum}</div>
      <input class="set-input" type="number" placeholder="—" min="0" step="0.5" inputmode="decimal" />
      <input class="set-input" type="number" placeholder="—" min="0" step="1"   inputmode="decimal" />
      <span class="set-intensity-badge"></span>
      <button class="btn-log-set" onclick="logSet('${exId}','${sid}',this)" title="Log set">✓</button>
      <button class="btn-delete-set" onclick="removeSet('${sid}','${exId}')" title="Remove set">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
          <path d="M7 .5a6.5 6.5 0 1 0 0 13A6.5 6.5 0 0 0 7 .5zm2.78 8.72a.75.75 0 0 1-1.06 1.06L7 8.56l-1.72 1.72a.75.75 0 0 1-1.06-1.06L5.94 7.5 4.22 5.78a.75.75 0 0 1 1.06-1.06L7 6.44l1.72-1.72a.75.75 0 0 1 1.06 1.06L8.06 7.5l1.72 1.72z"/>
        </svg>
      </button>`;
    body.appendChild(row);

    // only prefill set 1 at load time; future sets are prefilled when they activate
    if (setNum === 1) {
      const exName = document.querySelector('#' + exId + ' .exercise-head input')?.value || '';
      _prefillSetRow(row, 0, exName);
    }

    // wire up real-time intensity + persistence on each input
    row.querySelectorAll('.set-input').forEach(inp => {
      inp.addEventListener('focus', () => {
        if (inp.dataset.prefilled) inp.select();
      });
      inp.addEventListener('input', () => {
        inp.classList.remove('set-input-prefill');
        delete inp.dataset.prefilled;
        updateExIntensity(exId); updateGhostHint(exId); persistActiveWorkout(); _applySetStates(exId);
      });
    });
    renumberSets(exId);
    updateExIntensity(exId);
    updateGhostHint(exId);
    persistActiveWorkout();
    _applySetStates(exId);
    _syncAddSetBtn(exId);
  }

  function removeSet(sid, exId) {
    document.getElementById(sid)?.remove();
    renumberSets(exId);
    updateExIntensity(exId);
    updateGhostHint(exId);
    persistActiveWorkout();
    _applySetStates(exId);
    _syncAddSetBtn(exId);
  }

  function renumberSets(exId) {
    document.querySelectorAll('#' + exId + ' .sets-body .set-row')
      .forEach((r, i) => r.querySelector('.set-badge').textContent = i + 1);
  }

  function _refreshSetStates(exId) {
    const rows = document.querySelectorAll('#' + exId + ' .sets-body .set-row');
    let anyDone = false;
    rows.forEach(row => { if (row.classList.contains('set-done')) anyDone = true; });
    rows.forEach(row => {
      if (row.classList.contains('set-done')) return;
      const inputs = row.querySelectorAll('.set-input');
      const hasData = Array.from(inputs).some(inp => inp.value.trim() !== '');
      if (hasData) {
        row.classList.add('set-active');
        row.classList.remove('set-upcoming');
      } else if (anyDone) {
        row.classList.add('set-upcoming');
        row.classList.remove('set-active');
      } else {
        row.classList.remove('set-active', 'set-upcoming');
      }
    });
  }

  // === REST TIMER / STOPWATCH ===
  function _getBreakTimerMode() { return localStorage.getItem('breakTimerMode') || 'stopwatch'; }

  function _setBreakTimerMode(m) {
    localStorage.setItem('breakTimerMode', m);
    _syncBreakModeUI();
  }

  function _getRestPerfData(name) {
    try { return JSON.parse(localStorage.getItem('restPerf:' + name) || '[]'); } catch(e) { return []; }
  }

  function _saveRestPerfPoint(name, restSecs, reps, weight) {
    const arr = _getRestPerfData(name);
    arr.push({ rest: restSecs, reps, weight: weight || 0 });
    localStorage.setItem('restPerf:' + name, JSON.stringify(arr));
  }

  function _calcOptimalRest(name) {
    const data = _getRestPerfData(name);
    if (data.length < 6) return null;
    const hasWeight = data.some(d => d.weight > 0);
    const buckets = {};
    for (const d of data) {
      const b = Math.floor(d.rest / 30) * 30;
      if (!buckets[b]) buckets[b] = [];
      buckets[b].push(hasWeight && d.weight > 0 ? d.reps * d.weight : d.reps);
    }
    const avgOf = arr => arr.reduce((a, v) => a + v, 0) / arr.length;
    const bucketAvgs = Object.entries(buckets).map(([b, vals]) => ({ b: +b, avg: avgOf(vals) }));
    const best = Math.max(...bucketAvgs.map(x => x.avg));
    const threshold = best * 0.9;
    const qualifying = bucketAvgs.filter(x => x.avg >= threshold).sort((a, b) => a.b - b.b);
    if (!qualifying.length) return null;
    return Math.round(qualifying[0].b / 15) * 15;
  }

  function _calcOptimalRestRec(name) {
    /* Harvest from full workout history (covers stopwatch-recorded rests) */
    const points = [];
    for (const w of workouts) {
      for (const ex of (w.exercises || [])) {
        if (ex.name !== name) continue;
        for (const s of (ex.sets || [])) {
          const rest = s.restSecs != null ? s.restSecs : null;
          const reps = parseFloat(s.reps) || 0;
          const kg   = parseFloat(s.kg)   || 0;
          if (rest == null || rest < 5 || rest > 900 || reps <= 0) continue;
          points.push({ rest, perf: kg > 0 ? reps * kg : reps });
        }
      }
    }
    /* Also include live restPerf points (from countdown mid-session saves) */
    for (const d of _getRestPerfData(name)) {
      if (d.rest >= 5 && d.rest <= 900 && d.reps > 0)
        points.push({ rest: d.rest, perf: d.weight > 0 ? d.reps * d.weight : d.reps });
    }
    if (points.length < 2) return null;

    const avgOf = arr => arr.reduce((a, v) => a + v, 0) / arr.length;
    let best = null;
    for (const bk of _REST_BUCKETS) {
      const vals = points.filter(p => p.rest >= bk.min && p.rest < bk.max).map(p => p.perf);
      if (vals.length === 0) continue;
      const efficiency = avgOf(vals) / bk.mid;
      if (best === null || efficiency > best.efficiency) best = { mid: bk.mid, efficiency };
    }
    return best ? best.mid : null;
  }

  function _fmtRestRec(secs) {
    if (secs < 60) return `~${secs}s`;
    const m = Math.floor(secs / 60), s = secs % 60;
    return s > 0 ? `~${m}m ${s}s` : `~${m}m`;
  }

  function _updateRestRec(exId) {
    const card = document.getElementById(exId);
    if (!card) return;
    const el = card.querySelector('.ex-rest-rec');
    if (!el) return;
    const name = card.querySelector('.exercise-head input')?.value?.trim() || '';
    if (!name) { el.textContent = ''; return; }
    const secs = _calcOptimalRestRec(name);
    el.textContent = secs != null ? `💤 Optimal rest: ${_fmtRestRec(secs)}` : '';
  }

  function _restStatsPoints(name) {
    const pts = [];
    for (const w of workouts) {
      for (const ex of (w.exercises || [])) {
        if (ex.name !== name) continue;
        for (const s of (ex.sets || [])) {
          const rest = s.restSecs != null ? s.restSecs : null;
          const reps = parseFloat(s.reps) || 0;
          const kg   = parseFloat(s.kg)   || 0;
          if (rest == null || rest < 5 || rest > 900 || reps <= 0) continue;
          pts.push({ rest, perf: kg > 0 ? reps * kg : reps, reps, kg });
        }
      }
    }
    for (const d of _getRestPerfData(name)) {
      if (d.rest >= 5 && d.rest <= 900 && d.reps > 0)
        pts.push({ rest: d.rest, perf: d.weight > 0 ? d.reps * d.weight : d.reps, reps: d.reps, kg: d.weight });
    }
    return pts;
  }

  function _restStatsOpen(name) {
    const pts = _restStatsPoints(name);
    if (pts.length < 2) return;

    const optMid = _calcOptimalRestRec(name);
    const avgOf  = arr => arr.reduce((a, v) => a + v, 0) / arr.length;

    /* ── Summary stats ── */
    const rests = pts.map(p => p.rest);
    const avg   = Math.round(avgOf(rests));
    const min   = Math.min(...rests);
    const max   = Math.max(...rests);

    /* ── Bucket data ── */
    const bucketData = [];
    for (const bk of _REST_BUCKETS) {
      const bPts = pts.filter(p => p.rest >= bk.min && p.rest < bk.max);
      if (!bPts.length) continue;
      const avgPerf = avgOf(bPts.map(p => p.perf));
      const avgReps = avgOf(bPts.map(p => p.reps));
      const eff     = avgPerf / bk.mid;
      const isOpt   = bk.mid === optMid;
      bucketData.push({ bk, count: bPts.length, avgReps: Math.round(avgReps * 10) / 10, eff, isOpt });
    }

    /* ── Build label for bucket ── */
    const bkLabel = bk => bk.max === Infinity ? `${bk.min}s+` : `${bk.min}-${bk.max}s`;

    /* ── Render ── */
    document.getElementById('rest-stats-subtitle').textContent = name;

    const maxCount = Math.max(...bucketData.map(b => b.count));

    /* summary stat column */
    const statCol = (label, val) =>
      `<div style="flex:1;text-align:center">
        <div style="font-size:.6875rem;color:#8E8E93;text-transform:uppercase;letter-spacing:.5px;margin-bottom:.375rem">${label}</div>
        <div style="font-size:1.75rem;font-weight:700;color:#fff;letter-spacing:-.5px;line-height:1">${_fmtRestRec(val).replace('~','')}</div>
      </div>`;
    const sep = `<div style="width:.5px;background:#2C2C2E;align-self:stretch"></div>`;

    /* efficiency list rows */
    const effRows = bucketData.map((b, i) =>
      `<div style="display:flex;align-items:center;padding:.875rem 0;${i > 0 ? 'border-top:.5px solid #2C2C2E;' : ''}">
        <div style="flex:1;font-size:.9375rem;color:#fff">${bkLabel(b.bk)}</div>
        <div style="font-size:.8125rem;color:#8E8E93;margin-right:1rem">${b.avgReps} reps</div>
        <div style="font-size:.9375rem;font-weight:${b.isOpt ? '700' : '400'};color:${b.isOpt ? '#007AFF' : '#8E8E93'}">${b.eff.toFixed(3)}<span style="font-size:.6875rem;font-weight:400;color:#8E8E93"> r/s</span></div>
      </div>`).join('');

    document.getElementById('rest-stats-body').innerHTML = `
      <div style="display:flex;align-items:center;padding:.75rem 0 1.5rem;border-bottom:.5px solid #2C2C2E">
        ${statCol('Avg', avg)}${sep}${statCol('Min', min)}${sep}${statCol('Max', max)}
      </div>
      <div style="font-size:.6875rem;font-weight:600;text-transform:uppercase;letter-spacing:.6px;color:#8E8E93;margin-top:1.25rem;margin-bottom:.625rem">Distribution</div>
      <canvas id="rest-stats-canvas" style="width:100%;display:block;margin-bottom:1.5rem"></canvas>
      <div style="font-size:.6875rem;font-weight:600;text-transform:uppercase;letter-spacing:.6px;color:#8E8E93;margin-bottom:.25rem">Efficiency by Rest Duration</div>
      <div>${effRows}</div>`;

    /* ── Draw canvas histogram ── */
    requestAnimationFrame(() => {
      const canvas = document.getElementById('rest-stats-canvas');
      if (!canvas) return;
      const dpr  = window.devicePixelRatio || 1;
      const W    = canvas.parentElement.clientWidth;
      const LBL_H = 22;
      const H    = 150 + LBL_H;
      canvas.style.width  = W + 'px';
      canvas.style.height = H + 'px';
      canvas.width  = W * dpr;
      canvas.height = H * dpr;
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);

      const PAD = { top: 8, right: 0, bottom: LBL_H, left: 0 };
      const cW  = W - PAD.left - PAD.right;
      const cH  = H - PAD.top  - PAD.bottom;
      const n   = bucketData.length;
      const gap   = cW / n;
      const barW  = Math.max(4, gap * 0.60);

      /* subtle grid lines only */
      const ticks = 3;
      for (let i = 1; i <= ticks; i++) {
        const y = PAD.top + cH - (i / ticks) * cH;
        ctx.beginPath();
        ctx.strokeStyle = '#2C2C2E';
        ctx.lineWidth = 1;
        ctx.moveTo(PAD.left, y); ctx.lineTo(PAD.left + cW, y);
        ctx.stroke();
      }

      /* bars */
      bucketData.forEach((b, i) => {
        const x    = PAD.left + i * gap + (gap - barW) / 2;
        const barH = maxCount > 0 ? Math.max(4, (b.count / maxCount) * cH) : 4;
        const y    = PAD.top + cH - barH;
        ctx.fillStyle = b.isOpt ? '#007AFF' : '#2C2C2E';
        const r = Math.min(5, barW / 2);
        ctx.beginPath();
        ctx.roundRect(x, y, barW, barH, [r, r, 0, 0]);
        ctx.fill();

        /* x label horizontal */
        ctx.fillStyle = b.isOpt ? '#007AFF' : '#8E8E93';
        ctx.font = `${11}px -apple-system,sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(bkLabel(b.bk), x + barW / 2, PAD.top + cH + LBL_H - 5);
      });
    });

    const bd = document.getElementById('rest-stats-backdrop');
    bd.style.display = 'flex';
    requestAnimationFrame(() => { bd.style.opacity = '1'; });
  }

  function _restStatsClose() {
    const bd = document.getElementById('rest-stats-backdrop');
    bd.style.display = 'none';
  }

  function _restBeep() {
    try {
      const ac  = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ac.createOscillator();
      const g   = ac.createGain();
      osc.connect(g); g.connect(ac.destination);
      osc.frequency.value = 880;
      g.gain.setValueAtTime(0.35, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.4);
      osc.start(ac.currentTime);
      osc.stop(ac.currentTime + 0.4);
    } catch(e) {}
  }

  function _fmtSecs(s) { return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`; }

  function _restRemainingSecs() {
    if (!_rest) return 0;
    return Math.max(0, Math.round((_rest.endsAt - Date.now()) / 1000));
  }

  function _restUpdateLabel() {
    if (!_rest) return;
    const secs = _restRemainingSecs();
    const cd = document.getElementById('rest-card-countdown');
    if (cd) cd.textContent = _fmtSecs(secs);
    const barEl = document.getElementById('rest-card-bar');
    if (barEl && _rest.totalSecs) barEl.style.width = (secs / _rest.totalSecs * 100) + '%';
  }

  function _restComplete() {
    if (!_rest) return;
    _restBeep();
    try { navigator.vibrate?.(300); } catch(e) {}
    _lastCompletedRest = { exId: _rest.exId, secs: _rest.totalSecs };
    clearInterval(_rest.interval);
    if (_rest.btn) _rest.btn.classList.remove('logged');
    _rest = null;
    localStorage.removeItem('activeRest');
    const card = document.getElementById('rest-card');
    if (card) {
      card.classList.remove('active');
      setTimeout(() => { const c = document.getElementById('rest-card'); if (c) c.remove(); }, 300);
    }
  }

  function _restAdjust(delta) {
    if (!_rest) return;
    const remaining = _restRemainingSecs();
    const newSecs = Math.max(15, remaining + delta);
    _rest.endsAt = Date.now() + newSecs * 1000;
    if (delta > 0) _rest.totalSecs += delta;
    localStorage.setItem('activeRest', JSON.stringify({ endsAt: _rest.endsAt, totalSecs: _rest.totalSecs, exId: _rest.exId, exName: _rest.exName }));
    _restUpdateLabel();
  }

  function _restRestore() {
    if (_rest || !_workoutActive) return;
    let data;
    try { data = JSON.parse(localStorage.getItem('activeRest') || 'null'); } catch(e) {}
    if (!data) return;
    if (data.mode === 'stopwatch') { _swRestore(); return; }
    const { endsAt, totalSecs, exId, exName } = data;
    if (Date.now() >= endsAt) { localStorage.removeItem('activeRest'); return; }
    /* recreate the rest card */
    const existing = document.getElementById('rest-card');
    if (existing) existing.remove();
    const rc = document.createElement('div');
    rc.id = 'rest-card';
    rc.innerHTML = `<div class="rest-card-top">
      <span class="rest-card-lbl">Rest</span>
      <span id="rest-card-countdown">0:00</span>
      <button class="rest-card-skip" onclick="_restClear()">Skip</button>
    </div>
    <div class="rest-card-bar-wrap"><div id="rest-card-bar"></div></div>
    <div class="rest-card-adj">
      <button class="rest-adj-pill" onclick="_restAdjust(-15)">−15s</button>
      <button class="rest-adj-pill" onclick="_restAdjust(15)">+15s</button>
    </div>`;
    /* insert after the exercise card, or at the top of the scroll area */
    const exCard = document.getElementById(exId);
    if (exCard) exCard.after(rc);
    else {
      const scroll = document.getElementById('workout-scroll');
      if (scroll) scroll.prepend(rc);
    }
    _rest = { interval: null, endsAt, totalSecs, exId: exId || '', exName: exName || '', btn: null };
    _restUpdateLabel();
    requestAnimationFrame(() => requestAnimationFrame(() => rc.classList.add('active')));
    _rest.interval = setInterval(() => {
      if (!_rest) return;
      if (Date.now() >= _rest.endsAt) { _restComplete(); return; }
      _restUpdateLabel();
    }, 250);
  }

  function _restClear() {
    if (!_rest) return;
    const elapsed = _rest.totalSecs - _restRemainingSecs();
    _lastCompletedRest = { exId: _rest.exId, secs: Math.max(0, elapsed) };
    clearInterval(_rest.interval);
    if (_rest.btn) _rest.btn.classList.remove('logged');
    _rest = null;
    localStorage.removeItem('activeRest');
    const card = document.getElementById('rest-card');
    if (card) {
      card.classList.remove('active');
      setTimeout(() => { const c = document.getElementById('rest-card'); if (c) c.remove(); }, 300);
    }
  }

  function _swElapsedSecs() {
    if (!_sw) return 0;
    return Math.round((Date.now() - _sw.startedAt) / 1000);
  }

  function _swUpdateLabel() {
    if (!_sw) return;
    const el = document.getElementById('rest-card-countdown');
    if (el) el.textContent = _fmtSecs(_swElapsedSecs());
  }

  function _swStop() {
    if (!_sw) return;
    const secs = _swElapsedSecs();
    if (_sw.setRow) _sw.setRow.dataset.restSecs = String(secs);
    if (_sw.btn) _sw.btn.classList.remove('logged');
    clearInterval(_sw.interval);
    _sw = null;
    localStorage.removeItem('activeRest');
    const card = document.getElementById('rest-card');
    if (card) {
      card.classList.remove('active');
      setTimeout(() => { const c = document.getElementById('rest-card'); if (c) c.remove(); }, 300);
    }
  }

  function _swStart(exId, exName, setRow, btn) {
    _swStop();
    _restClear();
    const existing = document.getElementById('rest-card');
    if (existing) existing.remove();

    const startedAt = Date.now();
    localStorage.setItem('activeRest', JSON.stringify({ mode: 'stopwatch', startedAt, exId, exName }));

    const rc = document.createElement('div');
    rc.id = 'rest-card';
    rc.innerHTML = `<div class="rest-card-top">
      <span class="rest-card-lbl">Rest</span>
      <span id="rest-card-countdown">0:00</span>
      <button class="rest-card-skip" onclick="_swStop()">Stop</button>
    </div>`;

    if (setRow) setRow.after(rc);
    else {
      const exCard = document.getElementById(exId);
      if (exCard) exCard.querySelector('.sets-list')?.append(rc);
      else document.getElementById('workout-scroll')?.prepend(rc);
    }

    _sw = { interval: null, startedAt, exId: exId || '', exName: exName || '', setRow: setRow || null, btn: btn || null };
    _swUpdateLabel();
    requestAnimationFrame(() => requestAnimationFrame(() => rc.classList.add('active')));
    _sw.interval = setInterval(() => { if (!_sw) return; _swUpdateLabel(); }, 250);
  }

  function _swRestore() {
    if (_sw || _rest || !_workoutActive) return;
    let data;
    try { data = JSON.parse(localStorage.getItem('activeRest') || 'null'); } catch(e) {}
    if (!data || data.mode !== 'stopwatch') return;
    const { startedAt, exId, exName } = data;
    const existing = document.getElementById('rest-card');
    if (existing) existing.remove();

    const rc = document.createElement('div');
    rc.id = 'rest-card';
    rc.innerHTML = `<div class="rest-card-top">
      <span class="rest-card-lbl">Rest</span>
      <span id="rest-card-countdown">0:00</span>
      <button class="rest-card-skip" onclick="_swStop()">Stop</button>
    </div>`;
    const exCard = document.getElementById(exId);
    if (exCard) exCard.after(rc);
    else document.getElementById('workout-scroll')?.prepend(rc);

    _sw = { interval: null, startedAt, exId: exId || '', exName: exName || '', setRow: null, btn: null };
    _swUpdateLabel();
    requestAnimationFrame(() => requestAnimationFrame(() => rc.classList.add('active')));
    _sw.interval = setInterval(() => { if (!_sw) return; _swUpdateLabel(); }, 250);
  }

  function logSet(exId, sid, btn) {
    /* Dismiss keyboard first so the tap isn't intercepted by the keyboard overlay */
    if (document.activeElement && document.activeElement !== document.body) {
      document.activeElement.blur();
    }
    /* ── Record perf data for previous countdown rest ──────── */
    const exCard = document.getElementById(exId);
    const exName = exCard?.querySelector('.exercise-head input')?.value || '';
    let restTaken = null;
    if (_rest && _rest.exId === exId) {
      restTaken = _rest.totalSecs - _restRemainingSecs();
    } else if (_lastCompletedRest && _lastCompletedRest.exId === exId) {
      restTaken = _lastCompletedRest.secs;
    }
    /* stop any running stopwatch for this exercise and record its time */
    if (_sw && _sw.exId === exId) { restTaken = _swElapsedSecs(); _swStop(); }
    _lastCompletedRest = null;
    if (restTaken !== null && restTaken >= 20 && restTaken <= 600) {
      const row = btn?.closest('.set-row');
      const inputs = row?.querySelectorAll('.set-input');
      if (inputs && inputs.length >= 2) {
        const weight = parseFloat(inputs[0].value) || 0;
        const reps   = parseFloat(inputs[1].value) || 0;
        if (reps > 0) _saveRestPerfPoint(exName, restTaken, reps, weight);
      }
    }

    /* ── Confirm the set ────────────────────────────────────── */
    _restClear();
    if (btn) btn.classList.add('logged');
    const _loggedRow = btn?.closest('.set-row');
    if (_loggedRow) {
      /* accept any prefilled values as confirmed */
      const _cIns = _loggedRow.querySelectorAll('.set-input');
      _cIns.forEach(i => { i.classList.remove('set-input-prefill'); delete i.dataset.prefilled; });
      /* snapshot confirmed values so intensity reads are stable after DOM state changes */
      _loggedRow.dataset.confirmedKg   = _cIns[0]?.value || '';
      _loggedRow.dataset.confirmedReps = _cIns[1]?.value || '';
      _loggedRow.classList.add('set-done');
      _loggedRow.classList.remove('set-active', 'set-future', 'set-upcoming');
    }
    _applySetStates(exId);
    updateExIntensity(exId);
    _syncAddSetBtn(exId);

    /* auto-add next set only for non-plan exercises (plan exercises use "Add Set" button) */
    if (_loggedRow && !document.getElementById(exId)?.dataset.planSets) {
      const allRows = Array.from(document.querySelectorAll('#' + exId + ' .sets-body .set-row'));
      const isLastRow = allRows[allRows.length - 1] === _loggedRow;
      if (isLastRow) addSet(exId);
    }

    if (!_getRestTimerEnabled()) return;

    /* ── Start break timer (stopwatch or countdown) ─────────── */
    const mode = _getBreakTimerMode();
    const setRow = btn?.closest('.set-row');
    if (mode === 'stopwatch') {
      _swStart(exId, exName, setRow, btn);
      return;
    }

    /* countdown mode */
    const optimal = _calcOptimalRest(exName);
    const dur = optimal !== null ? optimal : REST_DEFAULT_SECS;
    const hasSuggestion = optimal !== null;

    const existing = document.getElementById('rest-card');
    if (existing) existing.remove();

    const rc = document.createElement('div');
    rc.id = 'rest-card';
    rc.innerHTML = `<div class="rest-card-top">
      <span class="rest-card-lbl">Rest</span>
      <span id="rest-card-countdown">0:00</span>
      <button class="rest-card-skip" onclick="_restClear()">Skip</button>
    </div>
    <div class="rest-card-bar-wrap"><div id="rest-card-bar"></div></div>
    <div class="rest-card-adj">
      <button class="rest-adj-pill" onclick="_restAdjust(-15)">−15s</button>
      <button class="rest-adj-pill" onclick="_restAdjust(15)">+15s</button>
    </div>
    ${hasSuggestion ? `<div class="rest-card-hint">Suggested: ${_fmtSecs(optimal)} — based on your performance</div>` : ''}`;

    if (setRow) setRow.after(rc);
    else exCard?.querySelector('.sets-list')?.append(rc);

    const endsAt = Date.now() + dur * 1000;
    localStorage.setItem('activeRest', JSON.stringify({ endsAt, totalSecs: dur, exId, exName }));
    _rest = { interval: null, endsAt, totalSecs: dur, exId, exName, btn: btn || null };
    _restUpdateLabel();
    requestAnimationFrame(() => requestAnimationFrame(() => rc.classList.add('active')));

    _rest.interval = setInterval(() => {
      if (!_rest) return;
      if (Date.now() >= _rest.endsAt) { _restComplete(); return; }
      _restUpdateLabel();
    }, 250);
  }

  function _openWorkoutSheet() {
    document.getElementById('workout-sheet-main').style.display = '';
    document.getElementById('workout-sheet-finish').style.display = 'none';
    document.getElementById('workout-sheet-discard').style.display = 'none';
    document.getElementById('workout-sheet-backdrop').classList.add('open');
  }

  function _closeWorkoutSheet() {
    document.getElementById('workout-sheet-backdrop').classList.remove('open');
  }

  function _wsBack() {
    document.getElementById('workout-sheet-main').style.display = '';
    document.getElementById('workout-sheet-finish').style.display = 'none';
    document.getElementById('workout-sheet-discard').style.display = 'none';
  }

  function _wsFinish() {
    document.getElementById('workout-sheet-main').style.display = 'none';
    document.getElementById('workout-sheet-finish').style.display = '';
  }

  function _wsDiscard() {
    document.getElementById('workout-sheet-main').style.display = 'none';
    document.getElementById('workout-sheet-discard').style.display = '';
  }

  function finishWorkout() { _openWorkoutSheet(); _wsFinish(); }

  function discardWorkout() { _openWorkoutSheet(); _wsDiscard(); }

  function _doFinishWorkout() {
    document.getElementById('workout-sheet-backdrop').classList.remove('open');
    _workoutPaused   = false;
    document.getElementById('pause-overlay')?.classList.remove('open');
    clearInterval(timerInterval);
    /* stop any running stopwatch and record elapsed time on its set row */
    if (_sw) _swStop();
    const exercises = [];

    // Regular exercises (killer set is no longer in #exercise-list)
    document.querySelectorAll('#exercise-list .exercise-card').forEach(card => {
      const name      = card.querySelector('.exercise-head input').value.trim() || 'Unnamed';
      const timeBased = !!card.dataset.tb;
      const sets      = [];
      card.querySelectorAll('.sets-body .set-row').forEach(row => {
        const inputs   = row.querySelectorAll('input');
        const isDone   = row.classList.contains('set-done');
        const isFuture = row.classList.contains('set-future');
        let kg, reps;
        if (isDone) {
          /* always use the snapshot captured at confirmation — immune to any DOM state */
          kg   = row.dataset.confirmedKg   || '';
          reps = row.dataset.confirmedReps || '';
        } else {
          kg   = (isFuture || inputs[0].dataset.prefilled) ? '' : (inputs[0].value || '0');
          reps = (isFuture || inputs[1].dataset.prefilled) ? '' : (inputs[1].value || '0');
        }
        const restSecs = row.dataset.restSecs ? parseInt(row.dataset.restSecs, 10) : undefined;
        sets.push({ kg, reps, tb: timeBased || undefined, restSecs });
      });
      exercises.push({ name, sets });
    });

    // Killer Set: read from compact workout card if present
    const killerCard = document.getElementById('workout-killer-card');
    if (killerCard && killerCard.style.display !== 'none' && _killerRoutine.length) {
      // Sync any in-progress edits from the DOM inputs
      killerCard.querySelectorAll('.wsc-ex-input').forEach((inp, i) => {
        _killerResults[i] = inp.value;
      });
      _killerRoutine.forEach((name, i) => {
        const val = parseFloat(_killerResults[i]) || 0;
        if (val > 0) {
          const tb = !!getExMeta(name).tb;
          exercises.push({ name, sets: [{ kg: '0', reps: String(val), ...(tb && { tb: true }) }], killer: true });
        }
      });
    }

    const finalSeconds = _workoutStartTs ? _calcElapsedSeconds() : timerSeconds;
    const workout = { id: Date.now(), date: new Date().toISOString(), duration: finalSeconds, exercises,
      ...(activePlanData?.planName && { planName: activePlanData.planName }),
      ...(_completedWarmup && { warmup: _completedWarmup }) };
    _completedWarmup = null;
    workouts.unshift(workout);
    persist();

    /* mark journey session complete if this workout was started from one */
    if (_activeJourneyRef) { _markJourneySessionComplete(_activeJourneyRef); _activeJourneyRef = null; }

    /* check journey sessions added mid-workout (strict: all planned sets/reps confirmed) */
    _checkJourneySessionsOnFinish();

    /* clear workout state */
    _workoutActive   = false;
    activePlanData   = null;
    exerciseCount    = 0;
    _killerRoutine   = [];
    _killerResults   = [];
    _killerStep      = 0;
    clearActiveWorkout();
    document.getElementById('plan-banner').style.display = 'none';
    document.getElementById('plan-prestart')?.classList.remove('open');
    _wscHideAll();

    renderFreqGoal();
    _showPostWorkout(workout);
  }

  // === POST-WORKOUT SUMMARY ===
  function _showPostWorkout(w) {
    const mins = Math.floor(w.duration / 60), secs = w.duration % 60;
    const durStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    const exCount  = (w.exercises || []).filter(e => !e.killer).length;
    const setCount = (w.exercises || []).reduce((s, ex) =>
      s + (ex.sets || []).filter(st => (parseFloat(st.reps) || 0) > 0 || (parseFloat(st.kg) || 0) > 0).length, 0);
    const totalInt = (w.exercises || []).reduce((s, ex) =>
      s + (ex.sets || []).reduce((ss, st) =>
        ss + calcSetIntensity(ex.name, parseFloat(st.reps) || 0, parseFloat(st.kg) || 0), 0), 0);
    const intStr = totalInt > 0 ? fmtInt(totalInt) : '—';

    /* total volume: kg × reps, only for sets where kg was explicitly entered */
    const totalVol = Math.round((w.exercises || []).reduce((s, ex) =>
      s + (ex.sets || []).reduce((ss, st) => {
        const kg = parseFloat(st.kg);
        const r  = parseFloat(st.reps) || 0;
        if (!(isFinite(kg) && kg > 0) || r <= 0) return ss;
        return ss + kg * r;
      }, 0), 0));
    const volStr = totalVol > 0 ? `${totalVol} kg` : '—';

    /* stat rows */
    const stat = (icon, label, val) =>
      `<div style="background:#1C1C1E;border-radius:12px;padding:16px 20px;display:flex;align-items:center;justify-content:space-between;">
        <div style="display:flex;align-items:center;gap:.625rem;">
          <span style="font-size:1.125rem;line-height:1">${icon}</span>
          <span style="font-size:.875rem;color:#8E8E93;text-transform:uppercase;letter-spacing:.5px;font-weight:500">${label}</span>
        </div>
        <div style="font-size:1.5rem;font-weight:700;color:#fff;letter-spacing:-.3px">${val}</div>
      </div>`;
    document.getElementById('pw-stats').innerHTML =
      stat('🕐', 'Duration',     durStr) +
      stat('⚡', 'Intensity',    intStr) +
      stat('🏋️', 'Exercises',   exCount) +
      stat('📋', 'Sets',         setCount) +
      stat('⚖️', 'Total Volume', volStr);

    /* highlights */
    const prs     = findNewPRs ? findNewPRs()              : [];
    const firsts  = findFirstTimeExercises ? findFirstTimeExercises() : [];
    const hlParts = [];
    if (prs.length)    hlParts.push(`🏆 ${prs.length} new PR${prs.length > 1 ? 's' : ''}: ${prs.map(p => p.name).join(', ')}`);
    if (firsts.length) hlParts.push(`✦ First time: ${firsts.join(', ')}`);
    const hlEl = document.getElementById('pw-highlights');
    hlEl.innerHTML = hlParts.length
      ? hlParts.map(h => `<div style="background:#1C1C1E;border-radius:12px;padding:14px 20px;font-size:.875rem;color:#fff;">${h}</div>`).join('<div style="height:10px"></div>')
      : '';

    /* motivational message */
    const lastIdx = parseInt(localStorage.getItem('pwLastMsgIdx') || '-1', 10);
    let idx;
    do { idx = Math.floor(Math.random() * _PW_MSGS.length); } while (idx === lastIdx && _PW_MSGS.length > 1);
    localStorage.setItem('pwLastMsgIdx', String(idx));
    const msg = _PW_MSGS[idx]
      .replace(/\{\{duration\}\}/g, durStr)
      .replace(/\{\{exercises\}\}/g, exCount)
      .replace(/\{\{sets\}\}/g, setCount)
      .replace(/\{\{intensity\}\}/g, intStr);
    document.getElementById('pw-message').textContent = `"${msg}"`;

    /* show screen */
    const tabBar = document.querySelector('.tab-bar');
    if (tabBar) tabBar.style.display = 'none';
    const el = document.getElementById('post-workout-screen');
    el.scrollTop = 0;
    el.style.display = 'block';
  }

  function _closePostWorkout() {
    document.getElementById('post-workout-screen').style.display = 'none';
    const tabBar = document.querySelector('.tab-bar');
    if (tabBar) tabBar.style.display = '';
    showTab('home');
  }

  function _doDiscardWorkout() {
    document.getElementById('workout-sheet-backdrop').classList.remove('open');
    _workoutPaused   = false;
    _workoutStartTs  = 0;
    _workoutPausedMs = 0;
    _workoutPausedAt = 0;
    document.getElementById('pause-overlay')?.classList.remove('open');
    clearInterval(timerInterval);
    _workoutActive = false;
    _restClear();
    activePlanData = null;
    exerciseCount  = 0;
    _completedWarmup = null;
    _killerRoutine   = [];
    _killerResults   = [];
    clearActiveWorkout();
    document.getElementById('exercise-list').innerHTML = '';
    document.getElementById('plan-banner').style.display = 'none';
    document.getElementById('plan-prestart')?.classList.remove('open');
    _wscHideAll();
    showTab('home');
  }

  function persist() {
    localStorage.setItem('workouts', JSON.stringify(workouts));
  }

  function persistActiveWorkout() {
    if (!_workoutActive) return;
    const exercises = [];
    document.querySelectorAll('#exercise-list .exercise-card').forEach(card => {
      const nameInput = card.querySelector('.exercise-head input');
      const name   = nameInput ? nameInput.value.trim() || '' : '';
      const tb     = !!card.dataset.tb;
      const killer = !!card.dataset.killer;
      const sets   = [];
      card.querySelectorAll('.sets-body .set-row').forEach(row => {
        const inputs = row.querySelectorAll('input');
        const isDone = row.classList.contains('set-done');
        const restSecs = row.dataset.restSecs ? parseInt(row.dataset.restSecs, 10) : undefined;
        sets.push({
          kg:   inputs[0]?.value || '',
          reps: inputs[1]?.value || '',
          done: isDone || undefined,
          confirmedKg:   isDone ? (row.dataset.confirmedKg   || '') : undefined,
          confirmedReps: isDone ? (row.dataset.confirmedReps || '') : undefined,
          restSecs,
        });
      });
      exercises.push({ name, tb, sets, ...(killer && { killer: true }) });
    });
    const killerCard = document.getElementById('workout-killer-card');
    const killerVisible = killerCard && killerCard.style.display !== 'none' && _killerRoutine.length > 0;
    if (killerVisible) {
      // sync DOM edits before persisting
      killerCard.querySelectorAll('.wsc-ex-input').forEach((inp, i) => { _killerResults[i] = inp.value; });
    }
    const snap = {
      timerSeconds,
      workoutStartTs:  _workoutStartTs,
      workoutPausedMs: _workoutPausedMs,
      workoutPausedAt: _workoutPausedAt,
      exercises,
      activePlanData:  activePlanData ? JSON.parse(JSON.stringify(activePlanData)) : null,
      killerRoutine:   killerVisible ? [..._killerRoutine]  : null,
      killerResults:   killerVisible ? [..._killerResults]  : null,
      warmup:          _completedWarmup || null,
    };
    localStorage.setItem('activeWorkout', JSON.stringify(snap));
  }

  function clearActiveWorkout() {
    localStorage.removeItem('activeWorkout');
    localStorage.removeItem('activeWorkoutExerciseIndex');
    document.getElementById('resume-banner').classList.remove('visible');
  }

  function restoreActiveWorkout() {
    const raw = localStorage.getItem('activeWorkout');
    if (!raw) return;
    let snap;
    try { snap = JSON.parse(raw); } catch (e) { localStorage.removeItem('activeWorkout'); return; }

    /* Rebuild state */
    _workoutActive = true;
    activePlanData = snap.activePlanData || null;
    exerciseCount  = 0;
    document.getElementById('exercise-list').innerHTML = '';

    snap.exercises.forEach((ex, exIdx) => {
      if (ex.killer) return;  // killer set is now shown as a compact card, not individual cards
      exerciseCount++;
      const id  = 'ex-' + Date.now() + '-' + exerciseCount;
      const tb  = !!ex.tb;
      const div = document.createElement('div');
      div.className = 'exercise-card';
      div.id = id;
      if (tb)       div.dataset.tb     = '1';
      /* restore plan set count so auto-add limit still applies after page refresh */
      if (activePlanData) {
        const planEx = activePlanData.exercises[exIdx];
        const ps = planEx ? (planEx.sets || 1) : ex.sets?.length;
        if (ps >= 1) div.dataset.planSets = String(ps);
      }
      div.innerHTML = `
        <div class="exercise-head">
          <input type="text" placeholder="Exercise name" value="${(ex.name || '').replace(/"/g, '&quot;')}"
            oninput="updateExIntensity('${id}'); persistActiveWorkout();" />
          <button class="btn-delete-ex" onclick="removeExercise('${id}')" title="Remove exercise">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm3.03 9.47a.75.75 0 0 1-1.06 1.06L8 9.06l-1.97 1.97a.75.75 0 0 1-1.06-1.06L6.94 8 4.97 6.03a.75.75 0 0 1 1.06-1.06L8 6.94l1.97-1.97a.75.75 0 0 1 1.06 1.06L9.06 8l1.97 1.97z"/>
            </svg>
          </button>
        </div>
        <div class="ex-rest-rec"></div>
        <div class="sets-table">
          <div class="sets-col-header">
            <span>Set</span><span>kg</span><span>${tb ? 'Secs' : 'Reps'}</span><span>⚡</span><span></span><span></span>
          </div>
          <div class="sets-body"></div>
          <div class="ghost-hint" id="ghost-${id}"></div>
          <div class="ex-intensity-total"></div>
          <button class="btn-add-set" onclick="addSet('${id}')">
            <span class="btn-add-set-icon">+</span> Add Set
          </button>
        </div>`;
      document.getElementById('exercise-list').appendChild(div);

      /* Restore sets */
      const body = div.querySelector('.sets-body');
      ex.sets.forEach((setData, idx) => {
        const sid = 'set-' + Date.now() + '-' + idx;
        const row = document.createElement('div');
        row.className = 'set-row';
        row.id = sid;
        row.innerHTML = `
          <div class="set-badge">${idx + 1}</div>
          <input class="set-input" type="number" placeholder="—" min="0" step="0.5" inputmode="decimal" value="${setData.kg || ''}" />
          <input class="set-input" type="number" placeholder="—" min="0" step="1" inputmode="decimal" value="${setData.reps || ''}" />
          <span class="set-intensity-badge"></span>
          <button class="btn-log-set" onclick="logSet('${id}','${sid}',this)" title="Log set">✓</button>
          <button class="btn-delete-set" onclick="removeSet('${sid}','${id}')" title="Remove set">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <path d="M7 .5a6.5 6.5 0 1 0 0 13A6.5 6.5 0 0 0 7 .5zm2.78 8.72a.75.75 0 0 1-1.06 1.06L7 8.56l-1.72 1.72a.75.75 0 0 1-1.06-1.06L5.94 7.5 4.22 5.78a.75.75 0 0 1 1.06-1.06L7 6.44l1.72-1.72a.75.75 0 0 1 1.06 1.06L8.06 7.5l1.72 1.72z"/>
            </svg>
          </button>`;
        body.appendChild(row);
        /* restore confirmed state so _applySetStates doesn't wipe done rows */
        if (setData.done) {
          row.classList.add('set-done');
          row.dataset.confirmedKg   = setData.confirmedKg   ?? setData.kg   ?? '';
          row.dataset.confirmedReps = setData.confirmedReps ?? setData.reps ?? '';
          if (setData.restSecs != null) row.dataset.restSecs = String(setData.restSecs);
        }
        row.querySelectorAll('.set-input').forEach(inp => {
          inp.addEventListener('input', () => { updateExIntensity(id); updateGhostHint(id); persistActiveWorkout(); _applySetStates(id); });
        });
      });
      updateExIntensity(id);
      updateGhostHint(id);
      _applySetStates(id);
      _syncAddSetBtn(id);
      _updateRestRec(id);
    });

    /* Restore Killer Set compact card */
    if (snap.killerRoutine && snap.killerRoutine.length) {
      _killerRoutine = snap.killerRoutine;
      _killerResults = snap.killerResults || [];
      _showKillerWorkoutCard();
    }

    /* Restore warmup compact card */
    if (snap.warmup) {
      _completedWarmup = snap.warmup;
      _showWarmupWorkoutCard();
    }

    /* Restore plan UI */
    if (activePlanData) { updatePlanBanner(); }
    document.getElementById('plan-prestart')?.classList.remove('open');

    /* Resume timer — use saved timestamps if available, fall back to timerSeconds */
    if (snap.workoutStartTs) {
      _workoutStartTs  = snap.workoutStartTs;
      _workoutPausedMs = snap.workoutPausedMs || 0;
      _workoutPausedAt = snap.workoutPausedAt || 0;
      _workoutPaused   = false;
      document.getElementById('pause-overlay')?.classList.remove('open');
      const btn = document.getElementById('btn-pause');
      if (btn) btn.textContent = '⏸';
      clearInterval(timerInterval);
      timerInterval = setInterval(() => {
        _tickTimer();
        if (timerSeconds % 5 === 0) persistActiveWorkout();
      }, 1000);
      _tickTimer();
    } else {
      startTimer(snap.timerSeconds || 0);
    }

    /* Don't auto-navigate to workout — show the banner on whatever tab is active */
    updateResumeBanner();
    _exCurrentIdx = Math.max(0, _exGetCards().length - 1);
    _exNavUpdate();
    /* Restore rest timer if one was active when the app closed */
    _restRestore();
  }

  function updateExIntensity(exId) {
    const card = document.getElementById(exId);
    if (!card) return;
    const name = (card.querySelector('.exercise-head input[type="text"]')?.value || '').trim();
    let total  = 0;
    card.querySelectorAll('.sets-body .set-row').forEach(row => {
      const ins    = row.querySelectorAll('.set-input');
      const isDone = row.classList.contains('set-done');
      /* use snapshot values for confirmed sets so live DOM state never corrupts them */
      const kg   = isDone ? (parseFloat(row.dataset.confirmedKg)   || 0)
                          : (parseFloat(ins[0]?.value)             || 0);
      const reps = isDone ? (parseFloat(row.dataset.confirmedReps) || 0)
                          : (parseFloat(ins[1]?.value)             || 0);
      const v = calcSetIntensity(name, reps, kg);
      if (isDone) total += v;   /* only confirmed sets count toward the exercise total */
      const badge = row.querySelector('.set-intensity-badge');
      if (badge) badge.textContent = v > 0 ? fmtInt(v) : '';
    });
    const el = card.querySelector('.ex-intensity-total');
    if (el) el.textContent = total > 0 ? `⚡ ${fmtInt(total)}` : '';
  }

  // === KILLER SET ===
  function getKillerRoutine() {
    try {
      const s = localStorage.getItem('killerSetRoutine');
      if (s) { const a = JSON.parse(s); if (Array.isArray(a) && a.length) return a; }
    } catch(e) {}
    return [...KILLER_SET_DEFAULT_NAMES];
  }

  function _killerLabel(name) {
    return !!getExMeta(name).tb ? 'secs' : 'reps';
  }

  function openKillerSet() {
    _killerRoutine = getKillerRoutine();
    _killerResults = new Array(_killerRoutine.length).fill('');
    _killerStep    = 0;
    /* Lock overlay height to current full-screen height (before keyboard opens)
       so iOS keyboard collapse can't shrink the flex container */
    const overlay = document.getElementById('killer-overlay');
    overlay.style.height = document.documentElement.clientHeight + 'px';
    overlay.classList.add('open');
    _renderKillerStep();
  }

  function closeKillerSet() {
    const overlay = document.getElementById('killer-overlay');
    overlay.classList.remove('open');
    overlay.style.height = ''; /* reset for next open */
  }

  function _renderKillerStep(skipFocus) {
    const name   = _killerRoutine[_killerStep];
    const label  = _killerLabel(name);
    const total  = _killerRoutine.length;
    const isLast = _killerStep === total - 1;

    // update nav
    document.getElementById('killer-prog').textContent = `${_killerStep + 1} / ${total}`;
    document.querySelector('.killer-back-btn').style.visibility = _killerStep === 0 ? 'hidden' : 'visible';

    // render done list (all exercises before current step)
    _renderKillerDoneList();

    // update active section
    document.getElementById('killer-ex-name').textContent = name;
    document.getElementById('killer-ex-sub').textContent  = label === 'secs' ? 'Max hold · no rest' : 'Max reps · no rest';
    document.getElementById('killer-input-label').textContent = label;
    const inp = document.getElementById('killer-input');
    inp.value = _killerResults[_killerStep] ?? '';

    const btn = document.getElementById('killer-btn-action');
    btn.textContent = isLast ? '✓ Finish' : 'Next →';
    btn.className   = isLast ? 'killer-btn-done' : 'killer-btn-next';

    // scroll done list to bottom so latest item is visible
    const dl = document.getElementById('killer-done-list');
    if (dl) dl.scrollTop = dl.scrollHeight;

    if (!skipFocus) {
      setTimeout(() => { try { inp.focus(); } catch(e) {} }, 320);
    }
  }

  function _renderKillerDoneList() {
    const dl = document.getElementById('killer-done-list');
    if (!dl) return;
    if (_killerStep === 0) { dl.innerHTML = ''; return; }
    dl.innerHTML = _killerRoutine.slice(0, _killerStep).map((name, i) => {
      const label = _killerLabel(name);
      const val   = _killerResults[i];
      const num   = parseFloat(val) || 0;
      return `<div class="killer-done-row">
        <span class="kd-idx">${i + 1}.</span>
        <span class="kd-name">${name}</span>
        <input class="kd-val" type="number" inputmode="numeric" min="0"
          value="${num > 0 ? num : ''}" placeholder="—"
          onchange="_killerSaveDone(${i}, this.value)"
          onkeydown="if(event.key==='Enter')this.blur()" />
        <span class="kd-unit">${label}</span>
      </div>`;
    }).join('');
  }

  function _killerSaveDone(idx, val) {
    _killerResults[idx] = val;
  }

  function killerSetNext() {
    _killerResults[_killerStep] = document.getElementById('killer-input').value;
    if (_killerStep < _killerRoutine.length - 1) {
      _killerStep++;
      _renderKillerStep();
    } else {
      _killerSetFinish();
    }
  }

  function killerSetSkip() {
    _killerResults[_killerStep] = '';
    if (_killerStep < _killerRoutine.length - 1) {
      _killerStep++;
      _renderKillerStep();
    } else {
      _killerSetFinish();
    }
  }

  function killerSetBack() {
    if (_killerStep === 0) { closeKillerSet(); return; }
    _killerResults[_killerStep] = document.getElementById('killer-input').value;
    _killerStep--;
    _renderKillerStep();
  }

  function _killerSetFinish() {
    // Keep the killer-overlay open — the summary (z-index 1001) slides on top of it
    // (z-index 1000) so the workout screen never shows through during the transition.
    // Both overlays are closed together when the user acts on the summary.
    _showKillerSummary();
  }

  function _showKillerSummary() {
    const history = _getKillerHistory();
    const prev    = history.length > 0 ? history[0] : null;
    const total   = _killerRoutine.reduce((s, _, i) => s + (parseFloat(_killerResults[i]) || 0), 0);

    const rows = _killerRoutine.map((name, i) => {
      const val     = parseFloat(_killerResults[i]) || 0;
      const label   = _killerLabel(name);
      const skipped = val <= 0;
      return `
        <div class="killer-sum-row">
          <span class="killer-sum-ex-name">${name}</span>
          ${skipped
            ? '<span class="killer-sum-ex-skip">—</span>'
            : `<span><span class="killer-sum-ex-val">${val}</span><span class="killer-sum-ex-unit"> ${label}</span></span>`}
        </div>`;
    }).join('');

    let deltaHTML = '';
    if (prev !== null) {
      const diff = total - prev.total;
      if (diff > 0)      deltaHTML = `<div class="killer-sum-delta up">▲ ${diff} reps vs last time</div>`;
      else if (diff < 0) deltaHTML = `<div class="killer-sum-delta down">▼ ${Math.abs(diff)} reps vs last time</div>`;
      else               deltaHTML = `<div class="killer-sum-delta same">= Same total as last time</div>`;
    }

    document.getElementById('killer-sum-body').innerHTML = `
      <div>${rows}</div>
      <div class="killer-sum-total" style="margin-top:.75rem">
        <div class="killer-sum-total-label">Total reps</div>
        <div class="killer-sum-total-num">${total}</div>
      </div>
      ${deltaHTML}
      <div style="height:.75rem"></div>`;

    document.getElementById('killer-summary').classList.add('open');
  }

  function _killerSummaryAdd() {
    const total   = _killerRoutine.reduce((s, _, i) => s + (parseFloat(_killerResults[i]) || 0), 0);
    const entry   = {
      date:      new Date().toISOString(),
      exercises: _killerRoutine.map((name, i) => ({ name, val: parseFloat(_killerResults[i]) || 0 })),
      total
    };
    const history = _getKillerHistory();
    history.unshift(entry);
    localStorage.setItem('killerSetHistory', JSON.stringify(history.slice(0, 20)));

    document.getElementById('killer-summary').classList.remove('open');
    closeKillerSet();  // removes open + resets height
    showTab('workout');

    // Show as single compact card above exercises (no individual cards)
    _showKillerWorkoutCard();
    persistActiveWorkout();
    showToast('Killer Set added! 💣');
  }

  function _killerSummaryDiscard() {
    if (!confirm('Discard this Killer Set? Results will not be saved to your workout.')) return;
    document.getElementById('killer-summary').classList.remove('open');
    closeKillerSet();  // removes open + resets height
    showTab('workout');
  }

  function _wscToggle(type) {
    const card = document.getElementById('workout-' + type + '-card');
    if (!card) return;
    const body = card.querySelector('.wsc-body');
    const open = card.classList.toggle('open');
    if (body) body.style.display = open ? 'block' : 'none';
  }

  function _showKillerWorkoutCard() {
    const card = document.getElementById('workout-killer-card');
    if (!card || !_killerRoutine.length) return;
    _wscKillerRefresh();
    card.style.display = '';
  }

  function _wscKillerRefresh() {
    const total   = _killerRoutine.reduce((s, _, i) => s + (parseFloat(_killerResults[i]) || 0), 0);
    const summary = document.getElementById('wsc-killer-summary');
    const body    = document.getElementById('wsc-killer-body');
    if (summary) summary.textContent = total + ' total reps';
    if (body) {
      body.innerHTML = _killerRoutine.map((name, i) => {
        const label = _killerLabel(name);
        const val   = parseFloat(_killerResults[i]) || 0;
        return `<div class="wsc-ex-row">
          <span class="wsc-ex-name">${name}</span>
          <input class="wsc-ex-input" type="number" inputmode="numeric" min="0"
            value="${val > 0 ? val : ''}" placeholder="—"
            onchange="_wscKillerSave(${i}, this.value)"
            onkeydown="if(event.key==='Enter')this.blur()" />
          <span class="wsc-ex-unit">${label}</span>
        </div>`;
      }).join('');
    }
  }

  function _wscKillerSave(idx, val) {
    _killerResults[idx] = val;
    const total   = _killerRoutine.reduce((s, _, i) => s + (parseFloat(_killerResults[i]) || 0), 0);
    const summary = document.getElementById('wsc-killer-summary');
    if (summary) summary.textContent = total + ' total reps';
    persistActiveWorkout();
  }

  function _showWarmupWorkoutCard() {
    if (!_completedWarmup) return;
    const card = document.getElementById('workout-warmup-card');
    if (!card) return;
    const fmtT   = s => (Math.floor(s / 60) > 0 ? Math.floor(s / 60) + 'm ' : '') + (s % 60) + 's';
    const elapsed = _completedWarmup.elapsed;
    const summary = document.getElementById('wsc-warmup-summary');
    const body    = document.getElementById('wsc-warmup-body');
    if (summary) summary.textContent = elapsed != null ? fmtT(elapsed) + ' strength' : 'general only';
    if (body && _completedWarmup.routine) {
      body.innerHTML = _completedWarmup.routine.map(step =>
        `<div class="wsc-ex-row">
          <span class="wsc-ex-name">${step.name}</span>
          <span class="wsc-ex-val" style="color:var(--tertiary);font-size:.8125rem">${step.reps != null ? step.reps + ' target' : ''}</span>
        </div>`
      ).join('');
    }
    card.style.display = '';
  }

  function _wscHideAll() {
    ['workout-warmup-card', 'workout-killer-card'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.style.display = 'none'; el.classList.remove('open'); }
      const body = el && el.querySelector('.wsc-body');
      if (body) body.style.display = 'none';
    });
  }

  function _getKillerHistory() {
    try {
      const s = localStorage.getItem('killerSetHistory');
      if (s) { const a = JSON.parse(s); if (Array.isArray(a)) return a; }
    } catch(e) {}
    return [];
  }

  function _ksEditDraw() {
    const list = document.getElementById('ks-edit-list');
    if (!list) return;
    /* touch-action:none at element level beats -webkit-overflow-scrolling:touch */
    list.style.touchAction = 'none';
    const n = _ksEditNames.length;
    list.innerHTML = _ksEditNames.map((name, idx) => `
      <div class="ks-edit-row" data-idx="${idx}"
           style="display:flex;align-items:center;gap:.5rem;padding:.625rem 1rem;
                  border-bottom:${idx<n-1?'0.5px solid var(--separator)':'none'}">
        <span class="ks-drag-handle"
              style="color:var(--tertiary);font-size:1.25rem;cursor:grab;line-height:1;
                     padding:.375rem .25rem;flex-shrink:0;touch-action:none;
                     user-select:none;-webkit-user-select:none">≡</span>
        <input id="ks-name-${idx}" value="${name.replace(/"/g,'&quot;')}"
          style="flex:1;background:var(--fill);border:none;border-radius:.5rem;
                 padding:.5rem .75rem;font-size:.9375rem;color:var(--label);font-family:inherit"
          oninput="_ksEditNames[${idx}]=this.value" />
        <button onclick="ksEditDelete(${idx})"
          style="background:none;border:none;color:var(--red);font-size:1.25rem;
                 cursor:pointer;padding:.25rem .375rem;line-height:1" title="Remove">✕</button>
      </div>
    `).join('');
    _ksInitDrag(list);
  }

  function _ksFlushDOM() {
    _ksEditNames.forEach((_, i) => {
      const el = document.getElementById('ks-name-' + i);
      if (el) _ksEditNames[i] = el.value;
    });
  }

  function _ksInitDrag(list) {
    list.addEventListener('pointerdown', function(e) {
      if (!e.isPrimary) return;
      const handle = e.target.closest('.ks-drag-handle');
      if (!handle) return;
      const dragRow = handle.closest('.ks-edit-row');
      if (!dragRow) return;

      /* Capture — all future pointer events route here regardless of position */
      list.setPointerCapture(e.pointerId);
      e.preventDefault();

      let dragIdx = parseInt(dragRow.dataset.idx, 10);
      let lastY   = e.clientY;

      /* Floating ghost */
      const rect  = dragRow.getBoundingClientRect();
      const ghost = dragRow.cloneNode(true);
      Object.assign(ghost.style, {
        position: 'fixed', left: rect.left + 'px', top: rect.top + 'px',
        width: rect.width + 'px', margin: '0', zIndex: '9999',
        opacity: '0.92', boxShadow: '0 8px 28px rgba(0,0,0,.30)',
        background: 'var(--card)', borderRadius: 'var(--radius-card)',
        pointerEvents: 'none',
      });
      document.body.appendChild(ghost);
      dragRow.style.opacity = '0.3';

      function onMove(e) {
        if (!e.isPrimary) return;
        ghost.style.top = (parseFloat(ghost.style.top) + (e.clientY - lastY)) + 'px';
        lastY = e.clientY;

        for (const row of list.querySelectorAll('.ks-edit-row')) {
          if (row === dragRow) continue;
          const r      = row.getBoundingClientRect();
          const mid    = r.top + r.height / 2;
          const rowIdx = parseInt(row.dataset.idx, 10);
          const shouldSwap = (rowIdx > dragIdx && e.clientY > mid) ||
                             (rowIdx < dragIdx && e.clientY < mid);
          if (!shouldSwap) continue;

          _ksFlushDOM();
          [_ksEditNames[dragIdx], _ksEditNames[rowIdx]] =
            [_ksEditNames[rowIdx], _ksEditNames[dragIdx]];
          dragIdx = rowIdx;

          const n = _ksEditNames.length;
          list.querySelectorAll('.ks-edit-row').forEach((r, i) => {
            r.dataset.idx = i;
            r.style.borderBottom = i < n-1 ? '0.5px solid var(--separator)' : 'none';
            const inp = r.querySelector('input');
            if (inp) { inp.id = 'ks-name-'+i; inp.value = _ksEditNames[i];
                       inp.setAttribute('oninput', `_ksEditNames[${i}]=this.value`); }
            const del = r.querySelector('button');
            if (del) del.setAttribute('onclick', `ksEditDelete(${i})`);
            r.style.opacity = i === dragIdx ? '0.3' : '1';
          });
          break;
        }
      }

      function onEnd(e) {
        if (!e.isPrimary) return;
        /* Reset ALL rows — the in-place swap loop dims rows by DOM position
           (not by dragRow reference), so any row may have been left at 0.3. */
        list.querySelectorAll('.ks-edit-row').forEach(r => r.style.opacity = '1');
        ghost.remove();
        list.removeEventListener('pointermove',   onMove);
        list.removeEventListener('pointerup',     onEnd);
        list.removeEventListener('pointercancel', onEnd);
      }

      list.addEventListener('pointermove',   onMove);
      list.addEventListener('pointerup',     onEnd);
      list.addEventListener('pointercancel', onEnd);
    });
  }

  // === GHOST MODE ===
  function getGhostMode() { return localStorage.getItem('ghostMode') !== '0'; }

  function setGhostMode(on) {
    localStorage.setItem('ghostMode', on ? '1' : '0');
    // refresh all visible ghost hints
    document.querySelectorAll('#exercise-list .exercise-card').forEach(card => updateGhostHint(card.id));
  }

  function _getRestTimerEnabled() {
    return _sessionRestEnabled !== null ? _sessionRestEnabled : localStorage.getItem('restTimerEnabled') !== '0';
  }

  function _setRestTimerEnabled(on) { localStorage.setItem('restTimerEnabled', on ? '1' : '0'); _syncBreakModeUI(); }

  function _updateRestToggleBtn() {
    const toggle = document.getElementById('btn-rest-toggle');
    if (!toggle) return;
    toggle.classList.toggle('rest-on', _getRestTimerEnabled());
  }

  function _toggleSessionRest() {
    _sessionRestEnabled = !_getRestTimerEnabled();
    if (!_sessionRestEnabled) _restClear();
    _updateRestToggleBtn();
  }

  function getExPR(name, tb) {
    let best = null;
    workouts.forEach(w => {
      (w.exercises || []).forEach(ex => {
        if (ex.name !== name) return;
        (ex.sets || []).forEach(s => {
          const rep = parseFloat(s.reps) || 0;
          const kg  = parseFloat(s.kg)   || 0;
          if (rep <= 0) return;
          const vol = rep * Math.max(1, kg);
          if (!best || vol > best.vol) best = { rep, kg, vol };
        });
      });
    });
    return best;
  }

  function updateGhostHint(exId) {
    const hint = document.getElementById('ghost-' + exId);
    if (!hint) return;
    const card = document.getElementById(exId);
    if (!card) return;

    if (!getGhostMode()) { hint.className = 'ghost-hint'; return; }

    const name = (card.querySelector('.exercise-head input[type="text"]')?.value || '').trim();
    if (!name) { hint.className = 'ghost-hint'; return; }
    const tb = !!card.dataset.tb;

    // Best set currently typed in this session
    let curBest = null;
    card.querySelectorAll('.sets-body .set-row').forEach(row => {
      const ins = row.querySelectorAll('.set-input');
      const kg  = parseFloat(ins[0]?.value) || 0;
      const rep = parseFloat(ins[1]?.value) || 0;
      if (rep <= 0) return;
      const vol = rep * Math.max(1, kg);
      if (!curBest || vol > curBest.vol) curBest = { rep, kg, vol };
    });

    if (!curBest) { hint.className = 'ghost-hint'; return; }

    const pr = getExPR(name, tb);

    if (!pr) {
      hint.className = 'ghost-hint show pr';
      hint.textContent = '👻 No previous best — go for a PR!';
      return;
    }

    if (tb) {
      // time-based: compare seconds
      if (curBest.rep >= pr.rep) {
        hint.className = 'ghost-hint show pr';
        hint.textContent = `👻 New PR! 🔥  (best was ${pr.rep} s)`;
      } else {
        hint.className = 'ghost-hint show';
        hint.textContent = `👻 Best: ${pr.rep} s — now: ${curBest.rep} s`;
      }
    } else {
      const prLabel  = pr.kg > 0  ? `${pr.rep} reps @ ${pr.kg} kg`      : `${pr.rep} reps`;
      const curLabel = curBest.kg > 0 ? `${curBest.rep} reps @ ${curBest.kg} kg` : `${curBest.rep} reps`;
      if (curBest.vol >= pr.vol) {
        hint.className = 'ghost-hint show pr';
        hint.textContent = `👻 New PR! 🔥  (beat ${prLabel})`;
      } else {
        hint.className = 'ghost-hint show';
        hint.textContent = `👻 Best: ${prLabel} — now: ${curLabel}`;
      }
    }
  }

  // === JOURNEY SESSION INTEGRATION ===
  function _checkJourneySessionsOnFinish() {
    if (!_workoutJourneyAdds.length) return;
    const cards = Array.from(document.querySelectorAll('#exercise-list .exercise-card'));
    let anyComplete = false, incompleteUnfinished = 0;
    _workoutJourneyAdds.forEach(rec => {
      let unfinished = 0;
      rec.exercises.forEach(pe => {
        const matching = cards.filter(c => c.dataset.journeyKey === rec.key &&
          (c.querySelector('.exercise-head input')?.value.trim() === pe.name));
        let good = 0;
        matching.forEach(c => c.querySelectorAll('.sets-body .set-row.set-done').forEach(row => {
          const reps = parseFloat(row.dataset.confirmedReps) || 0;
          if (reps >= pe.plannedReps) good++;
        }));
        if (good < pe.plannedSets) unfinished++;
      });
      if (unfinished === 0) {
        const j = _journeys.find(x => x.id === rec.journeyId);
        if (j) {
          j.completedSessions = j.completedSessions || [];
          const token = rec.wi + '-' + rec.si;
          if (!j.completedSessions.includes(token)) j.completedSessions.push(token);
          j.completedDates = j.completedDates || {};
          j.completedDates[token] = new Date().toISOString();
          anyComplete = true;
        }
      } else {
        incompleteUnfinished += unfinished;
      }
    });
    _persistJourneys();
    _workoutJourneyAdds = [];
    if (incompleteUnfinished > 0) {
      showToast('⚠️ Journey session incomplete — ' + incompleteUnfinished + ' exercise' + (incompleteUnfinished !== 1 ? 's' : '') + ' not finished');
    } else if (anyComplete) {
      showToast('✅ Journey session completed!');
    }
  }

  function _beginJourneyWorkout(journeyId, wi, si, planName, normEx) {
    _activeJourneyRef = { id: journeyId, w: wi, s: si };
    _closeJourneySession();
    _closeJourneyDetail();
    _startWorkoutFromExercises(planName, normEx);
  }

  function _startWorkoutFromExercises(planName, normEx) {
    _workoutJourneyAdds = [];
    exerciseCount  = 0;
    _workoutActive = true;
    _sessionRestEnabled = null;
    _killerRoutine = [];
    _killerResults = [];
    _killerStep    = 0;
    _wscHideAll();
    document.getElementById('exercise-list').innerHTML = '';
    document.getElementById('timer').textContent = '00:00';
    startTimer();
    showWorkoutScreen();
    activePlanData = { planName, exercises: normEx, nextIndex: normEx.length };
    normEx.forEach(ex => createExCard(ex.name, false, ex.sets));
    updatePlanBanner();
    persistActiveWorkout();
  }

  function _markJourneySessionComplete(ref) {
    const j = _journeys.find(x => x.id === ref.id);
    if (!j) return;
    j.completedSessions = j.completedSessions || [];
    const token = ref.w + '-' + ref.s;
    if (!j.completedSessions.includes(token)) { j.completedSessions.push(token); _persistJourneys(); }
  }

  function startWorkoutFromPlan(planId) {
    const plan = plans.find(p => p.id === planId);
    if (!plan || !plan.exercises.length) return;

    _activeJourneyRef = null;
    _workoutJourneyAdds = [];
    exerciseCount  = 0;
    _workoutActive = true;
    _sessionRestEnabled = null;
    _killerRoutine = [];
    _killerResults = [];
    _killerStep    = 0;
    _wscHideAll();
    document.getElementById('exercise-list').innerHTML = '';
    document.getElementById('timer').textContent = '00:00';
    startTimer();

    showWorkoutScreen();

    const normEx = plan.exercises.map(_normPlanEx);
    activePlanData = { planName: plan.name, exercises: normEx, nextIndex: normEx.length };
    normEx.forEach(ex => createExCard(ex.name, false, ex.sets));
    updatePlanBanner();
    _showPlanPrestart(plan);
    persistActiveWorkout();
  }

  function updatePlanBanner() {
    const banner = document.getElementById('plan-banner');
    if (!banner) return;
    if (!activePlanData) { banner.style.display = 'none'; return; }
    const done  = activePlanData.nextIndex;
    const total = activePlanData.exercises.length;
    banner.textContent = `📋 ${activePlanData.planName} · ${done}/${total}`;
    banner.style.display = '';
  }

  function _showPlanPrestart(plan) {
    const el = document.getElementById('plan-prestart');
    if (!el) return;

    const fmtDur = s => { const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m` : '<1m'; };
    const fmtInt = n => n >= 10000 ? `${Math.round(n / 1000)}k` : n.toLocaleString();
    const fmtDate = iso => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    const last = workouts.find(w => w.planName === plan.name);

    /* Last session stats */
    let lastSessionHtml = '';
    if (last) {
      const totalIntensity = (last.exercises || []).reduce((sum, ex) =>
        sum + (ex.sets || []).reduce((s2, set) => {
          const v = calcSetIntensity(ex.name, set.reps, set.kg);
          return s2 + (isFinite(v) ? v : 0);
        }, 0), 0);
      lastSessionHtml = `
        <div class="pps-section-label">Last Session</div>
        <div class="pps-card">
          <div class="pps-stat-row"><span class="pps-stat-label">Last trained</span><span class="pps-stat-val">${fmtDate(last.date)}</span></div>
          <div class="pps-stat-row"><span class="pps-stat-label">Duration</span><span class="pps-stat-val">${fmtDur(last.duration || 0)}</span></div>
          <div class="pps-stat-row"><span class="pps-stat-label">Intensity ⚡</span><span class="pps-stat-val">${totalIntensity > 0 ? fmtInt(totalIntensity) : '—'}</span></div>
        </div>`;
    } else {
      lastSessionHtml = `
        <div class="pps-card"><div class="pps-first-time">First time with this plan — let's go! 💪</div></div>`;
    }

    /* Plan exercise list (from plan definition, not last session) */
    const normEx = plan.exercises.map(_normPlanEx);
    const exRows = normEx.map(ex =>
      `<div class="pps-ex-row">
        <span class="pps-ex-name">${ex.name}</span>
        <span class="pps-ex-sets">${ex.sets} set${ex.sets !== 1 ? 's' : ''}</span>
      </div>`
    ).join('');

    el.innerHTML = `
      <div class="pps-scroll">
        <div class="pps-header">
          <div class="pps-header-text">
            <div class="pps-plan-name">${plan.name}</div>
            <div class="pps-subtitle">Training Plan</div>
          </div>
        </div>
        ${lastSessionHtml}
        <div class="pps-section-label">Exercises</div>
        <div class="pps-card">
          <div class="pps-ex-list">${exRows}</div>
        </div>
      </div>
      <div class="pps-footer">
        <button class="pps-cancel-btn" onclick="_cancelPlanPrestart()">Cancel</button>
        <button class="pps-start-btn" onclick="_dismissPlanPrestart()">Start</button>
      </div>`;

    el.classList.add('open');
    const bar = document.getElementById('workout-bottom-bar');
    if (bar) bar.style.setProperty('display', 'none', 'important');
  }

  function _dismissPlanPrestart() {
    const el = document.getElementById('plan-prestart');
    if (el) el.classList.remove('open');
    const bar = document.getElementById('workout-bottom-bar');
    if (bar) bar.style.removeProperty('display');
    _exCurrentIdx = 0;
    _exNavUpdate();
  }

  function _cancelPlanPrestart() {
    document.getElementById('plan-prestart')?.classList.remove('open');
    const bar = document.getElementById('workout-bottom-bar');
    if (bar) bar.style.removeProperty('display');
    _doDiscardWorkout();
  }

  function _getStrengthTimes() {
    try { return JSON.parse(localStorage.getItem('warmupStrengthTimes') || '[]'); }
    catch { return []; }
  }

  function _saveStrengthTime(secs) {
    const arr = _getStrengthTimes();
    arr.push({ date: new Date().toISOString(), secs });
    localStorage.setItem('warmupStrengthTimes', JSON.stringify(arr.slice(-16)));
  }

  function _getLinkedStrengthTimes() {
    return workouts
      .filter(w => w && w.warmup && typeof w.warmup.elapsed === 'number' && w.warmup.elapsed > 0)
      .map(w => ({ date: w.date, secs: w.warmup.elapsed }))
      .reverse();
  }

  // === WARMUP ===
  function startWithWarmup(planId) {
    closeStartChoice();
    _warmupPostPlanId = planId;
    _warmupStrStart = null;

    const genOn = _getWarmupGeneralEnabled() && WARMUP_GENERAL_LIVE.length > 0;
    const strOn = _getWarmupStrengthEnabled();

    /* Both phases disabled — skip warmup entirely */
    if (!genOn && !strOn) {
      if (planId !== null) startWorkoutFromPlan(planId);
      else startBlankWorkout();
      return;
    }

    document.getElementById('warmup-overlay').classList.add('open');

    if (genOn) {
      _warmupPhase = 'general';
      _warmupIdx   = 0;
      document.getElementById('warmup-nav-title').textContent = 'General Warm-up';
      _warmupRenderGeneral();
    } else {
      /* General disabled — jump straight to strength */
      _warmupPhase = 'strength';
      _warmupIdx   = 0;
      document.getElementById('warmup-nav-title').textContent = 'Strength Warm-up';
      _warmupRenderStrengthIntro();
    }
  }

  function warmupSkip() {
    _warmupCleanup();
    _warmupShowPostChoice();
  }

  function _warmupCleanup() {
    clearInterval(_warmupTimer);
    _warmupTimer = null;
    window.speechSynthesis?.cancel();
  }

  function _warmupShowPostChoice() {
    document.getElementById('warmup-overlay').classList.remove('open');
    if (_warmupPostPlanId !== null) {
      startWorkoutFromPlan(_warmupPostPlanId);
    } else {
      startBlankWorkout();
    }
  }

  function _warmupRenderGeneral() {
    const strOn = _getWarmupStrengthEnabled();
    if (_warmupIdx >= WARMUP_GENERAL_LIVE.length) {
      if (strOn) {
        _warmupPhase = 'strength';
        _warmupIdx   = 0;
        document.getElementById('warmup-nav-title').textContent = 'Strength Warm-up';
        document.getElementById('warmup-body').innerHTML =
          `<div class="warmup-move-name" style="margin-top:2.5rem">🎉 General warmup done!</div>
           <div class="warmup-move-sub" style="margin-top:.625rem">Preparing strength sequence…</div>`;
        _warmupSpeak("General warmup done — amazing work! Now let's hit the strength sequence!");
        setTimeout(_warmupRenderStrengthIntro, 3500);
      } else {
        /* Strength disabled — finish after general */
        _warmupCleanup();
        _warmupShowPostChoice();
      }
      return;
    }

    const step = WARMUP_GENERAL_LIVE[_warmupIdx];
    const totalSteps = WARMUP_GENERAL_LIVE.length;
    const dotsHTML = WARMUP_GENERAL_LIVE.map((_, i) =>
      `<div class="warmup-dot ${i < _warmupIdx ? 'done' : i === _warmupIdx ? 'active' : ''}"></div>`
    ).join('');

    document.getElementById('warmup-body').innerHTML = `
      <div class="warmup-phase-label">General Warm-up — Step ${_warmupIdx + 1} of ${totalSteps}</div>
      <div class="warmup-move-name">${step.name}</div>
      <div class="warmup-move-sub">${step.hint}</div>
      <div class="warmup-ring-wrap">
        <svg viewBox="0 0 120 120" width="144" height="144">
          <circle class="warmup-ring-track" cx="60" cy="60" r="${RING_R}"/>
          <circle class="warmup-ring-fill" id="wu-ring" cx="60" cy="60" r="${RING_R}"
            stroke-dasharray="${RING_C}" stroke-dashoffset="0"/>
        </svg>
        <div class="warmup-ring-time" id="wu-secs">${step.secs}</div>
      </div>
      <div class="warmup-dots">${dotsHTML}</div>
      <button class="warmup-next-btn" onclick="_warmupAdvanceGeneral()">Next →</button>`;

    _warmupSpeak(step.cue);
    _warmupStartCountdown(step.secs, () => _warmupAdvanceGeneral());
  }

  function _warmupStartCountdown(secs, onDone) {
    clearInterval(_warmupTimer);
    _warmupSecsLeft = secs;
    _warmupUpdateRing(secs, secs);
    _warmupTimer = setInterval(() => {
      _warmupSecsLeft--;
      _warmupUpdateRing(_warmupSecsLeft, secs);
      const el = document.getElementById('wu-secs');
      if (el) el.textContent = _warmupSecsLeft;
      if (_warmupSecsLeft <= 0) {
        clearInterval(_warmupTimer);
        _warmupTimer = null;
        onDone();
      }
    }, 1000);
  }

  function _warmupUpdateRing(remaining, total) {
    const ring = document.getElementById('wu-ring');
    if (!ring) return;
    ring.style.strokeDashoffset = RING_C * (1 - remaining / total);
  }

  function _warmupAdvanceGeneral() {
    // Disable the button immediately to block any second tap or countdown race
    const btn = document.querySelector('#warmup-body .warmup-next-btn');
    if (btn) btn.disabled = true;
    _warmupCleanup();
    _warmupIdx++;
    _warmupRenderGeneral();
  }

  function _warmupRenderStrengthIntro() {
    const seqHTML = WARMUP_STRENGTH.map(s =>
      `<span style="font-size:.875rem;color:var(--label)">${s.reps} ${s.name}</span>`
    ).join('<span style="color:var(--tertiary);margin:0 .25rem">→</span>');

    document.getElementById('warmup-body').innerHTML = `
      <div class="warmup-phase-label">Strength Warm-up</div>
      <div class="warmup-move-name" style="margin-bottom:.75rem">Ready?</div>
      <div style="font-size:.875rem;color:var(--tertiary);margin-bottom:1.25rem;line-height:1.5;text-align:center">
        Complete the full sequence back-to-back.<br>No rest between exercises.<br>Press Start when you're set.
      </div>
      <div style="background:var(--card);border-radius:var(--radius-card);box-shadow:var(--shadow);padding:.875rem 1rem;width:100%;margin-bottom:1.5rem;display:flex;flex-wrap:wrap;gap:.375rem;justify-content:center">
        ${seqHTML}
      </div>
      <button class="warmup-next-btn" onclick="_warmupStrengthStart()">Start →</button>
      <button onclick="_warmupSkipStrength()"
        style="margin-top:.75rem;background:none;border:none;color:var(--tertiary);
               font-size:.875rem;cursor:pointer;font-family:inherit;padding:.375rem .5rem">
        Skip strength warmup
      </button>`;
  }

  function _warmupSkipStrength() {
    _warmupCleanup();
    _completedWarmup = { elapsed: null, routine: [], generalOnly: true };
    _warmupShowPostChoice();
  }

  function _warmupStrengthStart() {
    _warmupStrStart = Date.now();
    _warmupSpeak("Here we go — full sequence, no stopping! Let's crush it!");
    _warmupRenderStrengthRunning();
  }

  function _warmupRenderStrengthRunning() {
    const seqHTML = WARMUP_STRENGTH.map((s, i) => {
      const cls = i % 2 === 0 ? 'color:var(--blue)' : 'color:var(--label)';
      return `<div style="font-size:.9375rem;${cls};padding:.25rem 0">${s.reps}× ${s.name}</div>`;
    }).join('');

    document.getElementById('warmup-body').innerHTML = `
      <div class="warmup-phase-label">Go! Back-to-back, no rest</div>
      <div style="background:var(--card);border-radius:var(--radius-card);box-shadow:var(--shadow);padding:.875rem 1rem;width:100%;margin-bottom:1.5rem;text-align:left">
        ${seqHTML}
      </div>
      <div style="font-size:.8125rem;color:var(--tertiary);margin-bottom:1.5rem">Timer running…</div>
      <button class="warmup-next-btn green" onclick="_warmupStrengthFinish()">✓ Finished!</button>`;
  }

  function _warmupStrengthFinish() {
    const elapsed = Math.round((Date.now() - _warmupStrStart) / 1000);
    _saveStrengthTime(elapsed);
    _completedWarmup = {
      elapsed,
      routine: WARMUP_STRENGTH.map(s => ({ name: s.name, reps: s.reps })),
    };
    _warmupRenderComplete(elapsed);
    _warmupSpeak("Incredible — strength warmup done! You are absolutely ready to train!");
  }

  function _warmupRenderComplete(elapsedSecs) {
    /* Only compare against warmups from workouts still in History. The current
       workout hasn't been saved yet, so these are purely past sessions. */
    const past   = _getLinkedStrengthTimes().slice(-15).filter(t => t.secs > 0); /* last 15, exclude zero-duration entries */
    let compareHTML = '';
    if (past.length >= 1) {
      const avg   = Math.round(past.reduce((a, t) => a + t.secs, 0) / past.length);
      const diff  = avg - elapsedSecs;
      const fmtT  = s => `${Math.floor(s/60) > 0 ? Math.floor(s/60) + 'm ' : ''}${s%60}s`;
      if (diff > 0) {
        compareHTML = `<div class="warmup-move-sub" style="color:var(--green)">⚡ ${diff}s faster than your average of ${fmtT(avg)}!</div>`;
      } else if (diff < 0) {
        compareHTML = `<div class="warmup-move-sub">Your average is ${fmtT(avg)} — ${Math.abs(diff)}s off today, you'll get it!</div>`;
      } else {
        compareHTML = `<div class="warmup-move-sub">Right on your average of ${fmtT(avg)} — consistent!</div>`;
      }
    } else {
      compareHTML = `<div class="warmup-move-sub" style="color:var(--tertiary)">First time recorded — this is your benchmark!</div>`;
    }

    const fmtElapsed = elapsedSecs != null
      ? `<div class="warmup-rep-count" style="font-size:2.5rem;margin-bottom:.25rem">${Math.floor(elapsedSecs/60) > 0 ? Math.floor(elapsedSecs/60)+'m ' : ''}${elapsedSecs%60}s</div>
         <div class="warmup-rep-label" style="margin-bottom:.5rem">Strength sequence time</div>
         ${compareHTML}`
      : '';

    document.getElementById('warmup-body').innerHTML = `
      <div class="warmup-phase-label">All done 🎉</div>
      <div class="warmup-move-name" style="margin-bottom:.5rem">Warm-up Complete!</div>
      ${fmtElapsed}
      <button class="warmup-next-btn green" onclick="_warmupShowPostChoice()" style="margin-top:1.5rem">
        Start Workout →
      </button>`;
  }

  function _pickVoice() {
    if (_duckVoice) return _duckVoice;
    const voices = window.speechSynthesis?.getVoices() || [];
    const en = voices.filter(v => v.lang && v.lang.startsWith('en'));
    const byPriority = [
      en.find(v => /Natural|Enhanced/i.test(v.name)),
      en.find(v => v.name === 'Samantha (Enhanced)'),
      en.find(v => v.lang === 'en-US' && !v.localService),
      en.find(v => v.lang === 'en-US'),
      en[0],
    ].filter(Boolean);
    _duckVoice = byPriority[0] || null;
    return _duckVoice;
  }

  function _warmupSpeak(text) {
    if (!window.speechSynthesis) return;

    /* Cancel any in-flight fade-up and close previous context */
    clearTimeout(_duckFadeUpTid);
    if (_duckCtx && _duckCtx.state !== 'closed') {
      try { _duckCtx.close(); } catch(e) {}
    }
    _duckCtx  = null;
    _duckGain = null;

    const FADE_DOWN = 0.6;   /* seconds */
    const FADE_UP   = 0.8;   /* seconds */
    const PRE_DELAY = 300;   /* ms before fade starts */

    setTimeout(() => {
      window.speechSynthesis.cancel();

      /* --- duck setup --- */
      try {
        if (navigator.audioSession) navigator.audioSession.type = 'ambient';

        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) {
          const ctx  = new AC();
          const gain = ctx.createGain();
          gain.gain.setValueAtTime(1.0, ctx.currentTime);
          gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + FADE_DOWN);
          gain.connect(ctx.destination);

          /* 1-frame silent loop — claims the session */
          const buf = ctx.createBuffer(1, 1, ctx.sampleRate);
          const src = ctx.createBufferSource();
          src.buffer = buf;
          src.loop   = true;
          src.connect(gain);
          src.start(0);

          _duckCtx  = ctx;
          _duckGain = gain;
        }
      } catch(e) { /* non-fatal */ }

      /* Wait for fade-down to complete, then speak */
      setTimeout(() => {
        const utt    = new SpeechSynthesisUtterance(text);
        const voice  = _pickVoice();
        if (voice) utt.voice = voice;
        utt.rate   = 0.88;
        utt.pitch  = 1.0;
        utt.volume = 1.0;

        utt.onend = () => {
          /* Fade back up then release the audio session */
          if (_duckGain && _duckCtx && _duckCtx.state !== 'closed') {
            try {
              const now = _duckCtx.currentTime;
              _duckGain.gain.cancelScheduledValues(now);
              _duckGain.gain.setValueAtTime(_duckGain.gain.value, now);
              _duckGain.gain.linearRampToValueAtTime(1.0, now + FADE_UP);
            } catch(e) {}
          }
          _duckFadeUpTid = setTimeout(() => {
            if (_duckCtx && _duckCtx.state !== 'closed') {
              try { _duckCtx.close(); } catch(e) {}
            }
            _duckCtx  = null;
            _duckGain = null;
          }, FADE_UP * 1000);
        };

        window.speechSynthesis.speak(utt);
      }, FADE_DOWN * 1000);
    }, PRE_DELAY);
  }

  function wuStrToggleChanged(checked) {
    _setWarmupStrengthEnabled(checked);
  }
