/* Extracted from index.html — Settings screens (main, Personal Info, Training Goals,
   Workout Setup, Preferences, Data Management, About, Gemini API key + guide). */

  // === PREFERENCES ===
  function _syncBreakModeUI() {
    const mode = _getBreakTimerMode();
    const swBtn = document.getElementById('break-mode-sw');
    const cdBtn = document.getElementById('break-mode-cd');
    const row   = document.getElementById('break-timer-mode-row');
    if (row) row.style.display = _getRestTimerEnabled() ? '' : 'none';
    if (!swBtn || !cdBtn) return;
    swBtn.style.background = mode === 'stopwatch' ? '#007AFF' : 'transparent';
    swBtn.style.color      = mode === 'stopwatch' ? '#fff'    : 'var(--tertiary)';
    cdBtn.style.background = mode === 'countdown'  ? '#007AFF' : 'transparent';
    cdBtn.style.color      = mode === 'countdown'  ? '#fff'    : 'var(--tertiary)';
  }

  function ksEditRender() {
    _ksEditNames = getKillerRoutine();
    _ksEditDraw();
  }

  function ksEditDelete(idx) {
    if (_ksEditNames.length <= 1) { alert('Must have at least one exercise.'); return; }
    _ksFlushDOM();
    _ksEditNames.splice(idx, 1);
    _ksEditDraw();
  }

  function ksEditAddRow() {
    _ksFlushDOM();
    _ksEditNames.push('');
    _ksEditDraw();
    requestAnimationFrame(() => {
      const inp = document.getElementById('ks-name-' + (_ksEditNames.length - 1));
      if (inp) { inp.focus(); inp.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
    });
  }

  function ksEditSave() {
    _ksFlushDOM();
    const names = _ksEditNames.filter(Boolean);
    if (!names.length) { alert('Add at least one exercise.'); return; }
    localStorage.setItem('killerSetRoutine', JSON.stringify(names));
    settingsPop();
  }

  function ksEditReset() {
    if (!confirm('Reset to the default 9-exercise Killer Set?')) return;
    localStorage.removeItem('killerSetRoutine');
    _ksEditNames = [...KILLER_SET_DEFAULT_NAMES];
    _ksEditDraw();
  }

  function _openApiKeyGuide(showSettingsButton = true) {
    const btn = document.getElementById('jsk-open-settings');
    if (btn) btn.style.display = showSettingsButton ? '' : 'none';
    document.getElementById('jsk-overlay').style.display = 'flex';
  }

  function _closeApiKeyGuide() { document.getElementById('jsk-overlay').style.display = 'none'; }

  function _apiKeyGuideToSettings() {
    _closeApiKeyGuide();
    _closeJourneyCreator();
    openSettings();
    settingsPush('settings-data');
  }

  // === SETTINGS MAIN ===
  function openSettings() {
    /* Ensure workout-detail is closed — it sits at z-index 1100 and would
       bleed over settings panels (z-index 800-810) if left open */
    closeWorkoutDetail();
    /* Sync live values before showing */
    const bwEl = document.getElementById('settings-bw-input');
    if (bwEl) bwEl.value = localStorage.getItem('userBW') ?? '';
    const htEl = document.getElementById('settings-height-input');
    if (htEl) htEl.value = localStorage.getItem('userHeight') ?? '';
    updateSettingsFreqDisplay();
    _settingsStack = [];
    document.getElementById('settings-root').classList.add('open');
  }

  function closeSettings() {
    /* Close root + all sub-panels without animation (instant reset) */
    document.querySelectorAll('.settings-panel.open').forEach(p => p.classList.remove('open'));
    _settingsStack = [];
  }

  function settingsPush(id) {
    const panel = document.getElementById(id);
    if (!panel) return;
    _settingsStack.push(id);
    /* small rAF delay so the push starts after the tap-active state clears */
    requestAnimationFrame(() => {
      panel.classList.add('open');
      if (id === 'settings-warmup-general') wuGenEditRender();
      if (id === 'settings-warmup-edit') {
        wuEditRender();
        const strTog = document.getElementById('wu-str-toggle');
        if (strTog) strTog.checked = _getWarmupStrengthEnabled();
      }
      if (id === 'settings-data') _refreshGeminiKeyStatus();
      if (id === 'settings-killer-edit') ksEditRender();
      if (id === 'settings-goals') _gpOpenGoalsPage();
      if (id === 'settings-goal-freq') _gpOpenFreqPage();
      if (id === 'settings-goal-vol') _gpOpenVolPage();
      if (id === 'settings-goal-ex') _gpRenderExList();
      if (id === 'settings-prefs') {
        const tog = document.getElementById('ghost-mode-toggle');
        if (tog) tog.checked = getGhostMode();
        const rtTog = document.getElementById('rest-timer-toggle');
        if (rtTog) rtTog.checked = _getRestTimerEnabled();
        _syncBreakModeUI();
      }
    });
  }

  function settingsPop() {
    const id = _settingsStack.pop();
    if (id) document.getElementById(id)?.classList.remove('open');
  }

  // === GEMINI API KEY ===
  function _refreshGeminiKeyStatus() {
    const k  = localStorage.getItem('geminiApiKey') || '';
    const el = document.getElementById('gemini-key-status');
    if (el) el.textContent = k ? (k.slice(0, 8) + '...') : 'Not set';
  }

  function _toggleGeminiKey() {
    const ed = document.getElementById('gemini-key-editor');
    if (!ed) return;
    const opening = ed.style.display === 'none';
    ed.style.display = opening ? '' : 'none';
    const inp = document.getElementById('gemini-key-input');
    if (inp) inp.value = '';          /* never prefill the full key */
    _refreshGeminiKeyStatus();
  }

  function _saveGeminiKey() {
    const inp = document.getElementById('gemini-key-input');
    const k = (inp && inp.value || '').trim();
    if (!k) return;
    localStorage.setItem('geminiApiKey', k);
    if (inp) inp.value = '';
    _refreshGeminiKeyStatus();
    const s = document.getElementById('gemini-key-saved');
    if (s) { s.style.display = ''; setTimeout(() => { s.style.display = 'none'; }, 1800); }
  }

  function _clearGeminiKey() {
    localStorage.removeItem('geminiApiKey');
    const inp = document.getElementById('gemini-key-input');
    if (inp) inp.value = '';
    _refreshGeminiKeyStatus();
  }

  // === PERSONAL INFO ===
  function settingsBWChanged(val) {
    const v = parseFloat(val);
    if (!isNaN(v) && v >= 30 && v <= 300) { setUserBW(v); return; }
    /* Invalid / empty — restore the stored value (or blank if never set) */
    const el = document.getElementById('settings-bw-input');
    if (el) el.value = localStorage.getItem('userBW') ?? '';
  }

  function updateSettingsFreqDisplay() { updateSettingsGoalsDisplay(); }

  // === DATA MANAGEMENT ===
  function exportData() {
    const incl = {
      history:  document.getElementById('exp-chk-history')?.checked  ?? true,
      plans:    document.getElementById('exp-chk-plans')?.checked    ?? true,
      exlib:    document.getElementById('exp-chk-exlib')?.checked    ?? true,
      settings: document.getElementById('exp-chk-settings')?.checked ?? true,
    };
    if (!incl.history && !incl.plans && !incl.exlib && !incl.settings) {
      showToast('Select at least one category'); return;
    }
    const payload = {
      exportedAt:  new Date().toISOString(),
      version:     1,
      categories:  Object.keys(incl).filter(k => incl[k]),
    };
    if (incl.history)  payload.workouts    = JSON.parse(localStorage.getItem('workouts')      || '[]');
    if (incl.plans)    payload.plans       = JSON.parse(localStorage.getItem('plans')         || '[]');
    if (incl.exlib) {
      payload.exLib       = JSON.parse(localStorage.getItem('exLib')       || 'null');
      payload.customExMeta= JSON.parse(localStorage.getItem('customExMeta')|| '{}');
    }
    if (incl.settings) {
      payload.freqGoal     = JSON.parse(localStorage.getItem('freqGoal')     || 'null');
      payload.volumeGoal   = JSON.parse(localStorage.getItem('volumeGoal')   || 'null');
      payload.exerciseGoal = JSON.parse(localStorage.getItem('exerciseGoal') || 'null');
      payload.userBW       = localStorage.getItem('userBW')     || null;
      payload.userHeight   = localStorage.getItem('userHeight') || null;
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    const cats = payload.categories.join('-');
    const date = new Date().toISOString().slice(0, 10);
    a.href     = url;
    a.download = `workout-backup-${cats}-${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Data exported ✓');
  }

  function triggerImport() {
    document.getElementById('import-file-input').value = '';
    document.getElementById('import-file-input').click();
  }

  function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      let payload;
      try { payload = JSON.parse(e.target.result); }
      catch { showToast('Invalid file — import failed'); return; }

      if (!payload.version) { showToast('Unrecognised format — import failed'); return; }

      /* Detect which categories are present */
      const detected = [];
      if (Array.isArray(payload.workouts))                                        detected.push('Training History');
      if (Array.isArray(payload.plans))                                           detected.push('Training Plans');
      if (payload.exLib !== undefined || payload.customExMeta !== undefined)      detected.push('Exercise Library');
      if (payload.freqGoal !== undefined || payload.volumeGoal !== undefined || payload.exerciseGoal !== undefined || payload.userBW !== undefined || payload.userHeight !== undefined) detected.push('Settings & Goals');

      if (!detected.length) { showToast('No recognisable data in file'); return; }

      const catList = detected.map(c => `  • ${c}`).join('\n');
      const msg = `Import will overwrite:\n${catList}\n\nCategories not in this file stay untouched.\n\nProceed?`;
      if (!confirm(msg)) return;

      /* Restore detected categories */
      if (Array.isArray(payload.workouts)) {
        localStorage.setItem('workouts', JSON.stringify(payload.workouts));
        workouts = payload.workouts;
      }
      if (Array.isArray(payload.plans)) {
        localStorage.setItem('plans', JSON.stringify(payload.plans));
        plans = payload.plans;
      }
      if (payload.exLib !== undefined)
        localStorage.setItem('exLib', JSON.stringify(payload.exLib));
      if (payload.customExMeta !== undefined)
        localStorage.setItem('customExMeta', JSON.stringify(payload.customExMeta));
      if (payload.freqGoal !== undefined)
        localStorage.setItem('freqGoal', JSON.stringify(payload.freqGoal));
      if (payload.volumeGoal !== undefined)
        localStorage.setItem('volumeGoal', JSON.stringify(payload.volumeGoal));
      if (payload.exerciseGoal !== undefined)
        localStorage.setItem('exerciseGoal', JSON.stringify(payload.exerciseGoal));
      if (payload.userBW !== undefined)
        localStorage.setItem('userBW',     payload.userBW     ?? '');
      if (payload.userHeight !== undefined)
        localStorage.setItem('userHeight', payload.userHeight ?? '');

      /* Refresh UI */
      closeSettings();
      renderRecent();
      renderGoalsSection();
      renderHighlights();
      renderActiveJourneys();
      showToast(`Imported: ${detected.join(', ')} ✓`);
    };
    reader.readAsText(file);
  }


  // === TRAINING GOALS ===
  function _gpSelectFreqPeriod(period, save) {
    const weekBtn  = document.getElementById('gp-freq-period-week');
    const monthBtn = document.getElementById('gp-freq-period-month');
    if (weekBtn)  weekBtn.classList.toggle('active',  period === 'week');
    if (monthBtn) monthBtn.classList.toggle('active', period === 'month');
    /* Animate sliding pill */
    requestAnimationFrame(() => {
      const pill = document.getElementById('freq-period-pill');
      const btn  = period === 'week' ? weekBtn : monthBtn;
      if (pill && btn) {
        pill.style.width     = btn.offsetWidth + 'px';
        pill.style.transform = `translateX(${period === 'week' ? 0 : (weekBtn ? weekBtn.offsetWidth : 0)}px)`;
      }
    });
    if (save) saveFreqGoal();
  }

  function _gpFreqStep(delta) {
    const inp  = document.getElementById('gp-freq-count');
    const disp = document.getElementById('gp-freq-count-display');
    let val = parseInt((inp && inp.value) || '4', 10) + delta;
    val = Math.max(1, Math.min(30, val));
    if (inp)  inp.value = val;
    if (disp) disp.textContent = val;
    saveFreqGoal();
  }

  function _gpExPickerChanged(idx) {
    const picker = document.getElementById('gp-ex-picker-' + idx);
    if (!picker) return;
    const name = picker.value;
    if (!name) return;
    const sug  = _gpExSuggestion(name);
    /* Save with suggestion value if this is a new/unnamed row */
    const goals = getExerciseGoals();
    while (goals.length <= idx) goals.push({ name: '', target: 10, enabled: true });
    const existing = goals[idx];
    const isNew = !existing || !existing.name || existing.name !== name;
    const target = isNew && sug ? sug.value : (existing && existing.target ? existing.target : (sug ? sug.value : 10));
    goals[idx] = { name, target, enabled: existing ? existing.enabled !== false : true };
    saveExerciseGoals(goals);
    /* Re-render the list so progress/target UI appears for the new selection */
    _gpRenderExList();
    renderGoalsSection();
    _gpRefreshOverview();
  }

  function _gpUpdateFreqProgress() {
    const goal = getFreqGoal();
    if (!goal) return;
    const done    = countWorkoutsInPeriod(goal.period);
    const target  = goal.count;
    const period  = goal.period === 'week' ? 'this week' : 'this month';
    const pct     = target > 0 ? Math.min(100, Math.round(done / target * 100)) : 0;
    const reached = done >= target && target > 0;
    const val  = document.getElementById('gp-freq-progress-val');
    const tgt  = document.getElementById('gp-freq-progress-target');
    const bar  = document.getElementById('gp-freq-bar-fill');
    const msg  = document.getElementById('gp-freq-msg');
    if (val) val.textContent = done;
    if (tgt) tgt.textContent = ` / ${target} ${period}`;
    if (bar) { bar.style.width = pct + '%'; bar.style.background = reached ? '#30D158' : '#007AFF'; }
    if (msg) { msg.textContent = reached ? '🎉 Goal reached — great work!' : freqGoalMsg(done, target); msg.style.color = reached ? '#30D158' : ''; }
  }

  function _gpUpdateVolProgress() {
    const goal = getVolumeGoal();
    if (!goal) return;
    const current = calcWeeklyIntensity();
    const target  = goal.target;
    const pct     = target > 0 ? Math.min(100, Math.round(current / target * 100)) : 0;
    const reached = current >= target && target > 0;
    const left    = target - current;
    const val  = document.getElementById('gp-vol-progress-val');
    const tgt  = document.getElementById('gp-vol-progress-target');
    const bar  = document.getElementById('gp-vol-bar-fill');
    const msg  = document.getElementById('gp-vol-msg');
    if (val) val.textContent = fmtInt(current);
    if (tgt) tgt.textContent = ` / ${fmtInt(target)} ⚡ this week`;
    if (bar) { bar.style.width = pct + '%'; bar.style.background = reached ? '#30D158' : '#007AFF'; }
    let msgText;
    if (reached)      msgText = '🎉 Goal reached — great work!';
    else if (current === 0) msgText = `Hit ⚡ ${fmtInt(target)} this week — let's go!`;
    else if (pct >= 80)    msgText = `So close! ⚡ ${fmtInt(left)} more to go 💪`;
    else                   msgText = `⚡ ${fmtInt(left)} more to hit your target — keep pushing!`;
    if (msg) { msg.textContent = msgText; msg.style.color = reached ? '#30D158' : ''; }
  }

  function _gpUpdateExProgress(idx) {
    const goals  = getExerciseGoals();
    const goal   = goals[idx];
    const picker = document.getElementById('gp-ex-picker-' + idx);
    const name   = (picker && picker.value) || (goal && goal.name) || '';
    if (!name) return;
    const current = getBestSetForExercise(name);
    const target  = goal && goal.name === name ? goal.target : (parseInt((document.getElementById('gp-ex-target-' + idx) || {}).value) || 10);
    const tb      = !!getExMeta(name).tb;
    const unit    = tb ? 'secs' : 'reps';
    const pct     = target > 0 ? Math.min(100, Math.round(current / target * 100)) : 0;
    const reached = current >= target && target > 0;
    const val = document.getElementById('gp-ex-progress-val-' + idx);
    const tgt = document.getElementById('gp-ex-progress-target-' + idx);
    const bar = document.getElementById('gp-ex-bar-fill-' + idx);
    const disp = document.getElementById('gp-ex-target-display-' + idx);
    if (val) val.textContent = current;
    if (tgt) tgt.textContent = ` / ${target} ${unit}`;
    if (bar) { bar.style.width = pct + '%'; bar.style.background = reached ? '#30D158' : '#007AFF'; }
    if (disp) disp.textContent = target;
  }

  function _gpFreqSuggestion() {
    const counts = [1,2,3,4].map(o => _workoutsInWeekOffset(o).length);
    const total  = counts.reduce((s,c) => s+c, 0);
    if (total === 0) return null;
    const avg = total / 4;
    let suggested;
    if (avg < 3)      suggested = 3;
    else if (avg < 5) suggested = Math.round(avg) + 1;
    else              suggested = Math.min(6, Math.round(avg) + 1);
    return { value: suggested, hint: `You averaged ${avg.toFixed(1)} sessions/week — time to step it up 💪` };
  }

  function _gpVolSuggestion() {
    const ints  = [1,2,3,4].map(o => _intensityOfWeekOffset(o));
    const total = ints.reduce((s,v) => s+v, 0);
    if (total === 0) return null;
    const avg = total / 4;
    const volGoal = getVolumeGoal();
    const recentInts = [1,2].map(o => _intensityOfWeekOffset(o));
    const hitGoalRecently = volGoal && volGoal.target > 0 &&
      recentInts.filter(v => v >= volGoal.target * 0.9).length === 2;
    const multiplier = hitGoalRecently ? 1.20 : 1.15;
    const suggested = Math.max(100, Math.round(avg * multiplier / 50) * 50);
    return { value: suggested, hint: `Your weekly average is ⚡ ${fmtInt(Math.round(avg))} — push for ⚡ ${fmtInt(suggested)} and see what you're capable of 🔥` };
  }

  function _gpExSuggestion(name) {
    if (!name) return null;
    const tb   = !!getExMeta(name).tb;
    const unit = tb ? 'secs' : 'reps';
    // Sessions containing this exercise, in chronological order
    const exSessions = workouts.filter(w => (w.exercises || []).some(ex => ex.name === name));
    if (exSessions.length === 0) return { value: 5, hint: `No data yet — set your first target and start building 💥` };
    let best = 0;
    exSessions.forEach(w => {
      (w.exercises || []).filter(ex => ex.name === name).forEach(ex => {
        (ex.sets || []).forEach(s => { const v = parseFloat(s.reps) || 0; if (v > best) best = v; });
      });
    });
    if (best === 0) return { value: 5, hint: `No data yet — set your first target and start building 💥` };
    // Find how many sessions ago the best was achieved (from the end of exSessions)
    const lastBestIdx = exSessions.slice().reverse().findIndex(w =>
      (w.exercises || []).some(ex => ex.name === name && (ex.sets || []).some(s => (parseFloat(s.reps) || 0) === best))
    );
    const sessionsAgo = lastBestIdx >= 0 ? lastBestIdx : 999;
    if (sessionsAgo > 2) {
      return { value: best + 1, hint: `You've been stuck at ${best} ${unit} — break through it 🎯` };
    } else {
      return { value: best + 2, hint: `You're on a roll — aim for ${best + 2} ${unit} and keep the momentum 🚀` };
    }
  }

  function _gpOpenGoalsPage() {
    _gpRefreshOverview();
    renderGoalSuggestions();
  }

  function _gpRefreshOverview() {
    const freqGoal = getFreqGoal();
    const volGoal  = getVolumeGoal();
    const exGoals  = getExerciseGoals();
    const freqOn   = !!(freqGoal && freqGoal.enabled !== false);
    const volOn    = !!(volGoal && volGoal.enabled !== false);
    const activeEx = exGoals.filter(g => g.enabled !== false && g.name);
    const freqEl = document.getElementById('gp-freq-overview-status');
    const volEl  = document.getElementById('gp-vol-overview-status');
    const exEl   = document.getElementById('gp-ex-overview-status');
    if (freqEl) freqEl.textContent = freqOn && freqGoal.count ? `${freqGoal.count}× / ${freqGoal.period === 'week' ? 'week' : 'month'}` : 'Off';
    if (volEl)  volEl.textContent  = volOn && volGoal.target ? `⚡ ${fmtInt(volGoal.target)} / week` : 'Off';
    if (exEl)   exEl.textContent   = activeEx.length > 0 ? `${activeEx.length} active` : 'Off';
  }

  function _gpExMasterToggleChanged(checked) {
    _setExMasterEnabled(checked);
    const body = document.getElementById('gp-ex-subpage-body');
    if (body) _animToggle(body, checked);
    renderGoalsSection();
    _gpRefreshOverview();
  }

  function _gpOpenFreqPage() {
    const freqGoal = getFreqGoal();
    const freqOn   = !!(freqGoal && freqGoal.enabled !== false);
    const tog = document.getElementById('gp-freq-toggle');
    if (tog) tog.checked = freqOn;
    const body = document.getElementById('gp-freq-subpage-body');
    if (body) body.style.display = freqOn ? '' : 'none';
    const count = (freqGoal && freqGoal.count) || 4;
    const countEl = document.getElementById('gp-freq-count');
    if (countEl) countEl.value = count;
    const dispEl = document.getElementById('gp-freq-count-display');
    if (dispEl) dispEl.textContent = count;
    _gpSelectFreqPeriod((freqGoal && freqGoal.period) || 'week');
    const hintEl = document.getElementById('gp-freq-hint');
    if (hintEl) { const sug = _gpFreqSuggestion(); hintEl.textContent = freqOn && sug ? sug.hint : ''; }
    if (freqOn) _gpUpdateFreqProgress();
  }

  function _gpOpenVolPage() {
    const volGoal = getVolumeGoal();
    const volOn   = !!(volGoal && volGoal.enabled !== false);
    const tog = document.getElementById('gp-vol-toggle');
    if (tog) tog.checked = volOn;
    const body = document.getElementById('gp-vol-subpage-body');
    if (body) body.style.display = volOn ? '' : 'none';
    const target = (volGoal && volGoal.target) || 2000;
    const inp  = document.getElementById('gp-vol-target');
    const disp = document.getElementById('gp-vol-target-display');
    if (inp)  inp.value = target;
    if (disp) disp.textContent = fmtInt(target);
    const hintEl = document.getElementById('gp-vol-hint');
    if (hintEl) { const sug = _gpVolSuggestion(); hintEl.textContent = volOn && sug ? sug.hint : ''; }
    if (volOn) _gpUpdateVolProgress();
  }

  function _gpVolStep(delta) {
    const inp  = document.getElementById('gp-vol-target');
    const disp = document.getElementById('gp-vol-target-display');
    let val = (parseInt((inp && inp.value) || '2000', 10) + delta);
    val = Math.max(100, Math.min(99900, Math.round(val / 100) * 100));
    if (inp)  inp.value = val;
    if (disp) disp.textContent = fmtInt(val);
    saveVolumeGoal();
  }

  function _gpSaveExGoalRow(idx) {
    const picker = document.getElementById('gp-ex-picker-' + idx);
    const name   = picker ? picker.value : '';
    const target = parseInt((document.getElementById('gp-ex-target-' + idx) || {}).value, 10);
    if (!name) return;
    const goals = getExerciseGoals();
    while (goals.length <= idx) goals.push({ name: '', target: 10, enabled: true });
    const enabled = goals[idx] ? goals[idx].enabled !== false : true;
    goals[idx] = { name, target: target || 10, enabled };
    saveExerciseGoals(goals);
    _gpUpdateExProgress(idx);
    const disp = document.getElementById('gp-ex-target-display-' + idx);
    if (disp) disp.textContent = target || 10;
    renderGoalsSection();
    _gpRefreshOverview();
  }

  function _gpExToggleChanged(idx, checked) {
    const goals = getExerciseGoals();
    if (goals[idx]) { goals[idx].enabled = checked; saveExerciseGoals(goals); }
    renderGoalsSection();
    _gpRefreshOverview();
  }

  function _gpDeleteExGoal(idx) {
    const goals = getExerciseGoals();
    goals.splice(idx, 1);
    saveExerciseGoals(goals);
    _gpRenderExList();
    renderGoalsSection();
  }

  function _gpAddExGoal() {
    const goals = getExerciseGoals();
    goals.push({ name: '', target: 10, enabled: true });
    saveExerciseGoals(goals);
    _gpRenderExList();
    /* Auto-scroll to the new item */
    setTimeout(() => {
      const list = document.getElementById('gp-ex-list');
      if (list) list.lastElementChild && list.lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 80);
  }

  function _gpExStep(idx, delta) {
    const inp  = document.getElementById('gp-ex-target-' + idx);
    const disp = document.getElementById('gp-ex-target-display-' + idx);
    let val = parseInt((inp && inp.value) || '10', 10) + delta;
    val = Math.max(1, Math.min(9999, val));
    if (inp)  inp.value = val;
    if (disp) disp.textContent = val;
    _gpSaveExGoalRow(idx);
  }

  function _gpRenderExList() {
    const masterEnabled = _getExMasterEnabled();
    const masterTog = document.getElementById('gp-ex-master-toggle');
    if (masterTog) masterTog.checked = masterEnabled;
    const exBody = document.getElementById('gp-ex-subpage-body');
    if (exBody) exBody.style.display = masterEnabled ? '' : 'none';
    const container = document.getElementById('gp-ex-list');
    if (!container) return;
    const goals = getExerciseGoals();
    const names = _allExerciseNames();
    const stepBtn = (icon, fn) => `<button onclick="${fn}" style="background:var(--fill);border:none;border-radius:.5rem;width:2.125rem;height:2.125rem;font-size:1.25rem;line-height:1;color:var(--label);cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;-webkit-tap-highlight-color:transparent" ontouchstart="">${icon}</button>`;
    if (goals.length === 0) { container.innerHTML = ''; return; }
    container.innerHTML = goals.map((g, idx) => {
      const enabled = g.enabled !== false;
      const selOpts = names.map(n => `<option value="${n}"${g.name === n ? ' selected' : ''}>${n}</option>`).join('');
      const tb      = g.name ? !!getExMeta(g.name).tb : false;
      const unit    = tb ? 'secs' : 'reps';
      const sug     = g.name ? _gpExSuggestion(g.name) : null;
      const current = g.name ? getBestSetForExercise(g.name) : 0;
      const target  = g.target || 10;
      const pct     = target > 0 ? Math.min(100, Math.round(current / target * 100)) : 0;
      const reached = current >= target && target > 0;
      const barColor = reached ? '#30D158' : '#007AFF';

      const topCenter = g.name
        ? `<span class="ex-goal-name">${g.name}</span>`
        : `<span class="ex-pick-prompt">Pick exercise →</span>`;

      const progressBlock = g.name && enabled ? `
        <div class="ex-goal-divider"></div>
        <div class="ex-goal-section">
          <div class="ex-goal-label">Progress</div>
          <div class="ex-goal-progress-val">
            <span id="gp-ex-progress-val-${idx}" style="font-size:2rem;font-weight:700;color:var(--label);font-variant-numeric:tabular-nums">${current}</span>
            <span style="font-size:1.2rem;color:var(--tertiary);font-weight:400" id="gp-ex-progress-target-${idx}"> / ${target} ${unit}</span>
          </div>
          <div class="ex-goal-bar-track">
            <div class="ex-goal-bar-fill" id="gp-ex-bar-fill-${idx}" style="width:${pct}%;background:${barColor}"></div>
          </div>
        </div>` : '';

      const targetBlock = g.name ? `
        <div class="ex-goal-divider"></div>
        <div class="ex-goal-section">
          <div class="ex-goal-label">Target</div>
          <div class="ex-goal-target-row">
            <span class="ex-goal-target-label">${tb ? 'Seconds' : 'Reps'}</span>
            <div style="display:flex;align-items:center;gap:.375rem">
              ${stepBtn('−', `_gpExStep(${idx},-1)`)}
              <span id="gp-ex-target-display-${idx}" style="min-width:2.5rem;text-align:center;font-size:1rem;font-weight:600;color:var(--label);font-variant-numeric:tabular-nums">${target}</span>
              <input type="number" id="gp-ex-target-${idx}" value="${target}" style="display:none" />
              ${stepBtn('+', `_gpExStep(${idx},1)`)}
            </div>
          </div>
          ${sug ? `<div class="ex-goal-hint">${sug.hint}</div>` : ''}
        </div>` : '';

      return `<div class="ex-goal-card">
        <div class="ex-goal-top">
          <label class="settings-toggle" style="flex-shrink:0">
            <input type="checkbox" ${enabled ? 'checked' : ''} onchange="_gpExToggleChanged(${idx},this.checked)" />
            <div class="settings-toggle-track"></div>
          </label>
          <div style="flex:1;min-width:0;position:relative">
            ${topCenter}
            <select id="gp-ex-picker-${idx}" onchange="_gpExPickerChanged(${idx})" style="position:absolute;inset:0;opacity:0;width:100%;height:100%;cursor:pointer">
              ${g.name ? '' : '<option value="">— pick —</option>'}
              ${selOpts}
            </select>
          </div>
          <button class="ex-goal-del" onclick="_gpDeleteExGoal(${idx})">×</button>
        </div>
        ${progressBlock}
        ${targetBlock}
      </div>`;
    }).join('');
  }

  function _getWarmupGeneralEnabled()   { return localStorage.getItem('warmupGeneralEnabled')   !== 'false'; }

  function _getWarmupStrengthEnabled()  { return localStorage.getItem('warmupStrengthEnabled')  !== 'false'; }

  function _setWarmupGeneralEnabled(v)  { localStorage.setItem('warmupGeneralEnabled',  v ? 'true' : 'false'); }

  function _setWarmupStrengthEnabled(v) { localStorage.setItem('warmupStrengthEnabled', v ? 'true' : 'false'); }

  function wuEditOpen() {
    wuEditRender();
  }

  function wuEditRender() {
    const list = document.getElementById('wu-edit-list');
    if (!list) return;
    list.innerHTML = WARMUP_STRENGTH.map((s, i) => `
      <div class="wu-edit-row">
        <span class="wu-edit-idx">${i + 1}.</span>
        <input class="wu-edit-name" type="text" value="${s.name.replace(/"/g, '&quot;')}"
          placeholder="Exercise name" data-idx="${i}" oninput="wuEditUpdate()" />
        <input class="wu-edit-reps" type="number" value="${s.reps}" min="1" max="99"
          inputmode="numeric" data-idx="${i}" oninput="wuEditUpdate()" />
        <span style="font-size:.75rem;color:var(--tertiary)">reps</span>
        <button class="wu-edit-del" onclick="wuEditDeleteRow(${i})" title="Remove">✕</button>
      </div>`).join('');
  }

  function wuEditRead() {
    const rows = document.querySelectorAll('#wu-edit-list .wu-edit-row');
    return Array.from(rows).map(row => ({
      name: row.querySelector('.wu-edit-name').value.trim() || 'Exercise',
      reps: Math.max(1, parseInt(row.querySelector('.wu-edit-reps').value, 10) || 1),
    }));
  }

  function wuEditUpdate() { /* live read — no-op; wuEditRead() is called on save */ }

  function wuEditAddRow() {
    WARMUP_STRENGTH = wuEditRead();
    WARMUP_STRENGTH.push({ name: 'Push-ups', reps: 5 });
    wuEditRender();
    /* Scroll to bottom so new row is visible */
    const list = document.getElementById('wu-edit-list');
    list?.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function wuEditDeleteRow(idx) {
    WARMUP_STRENGTH = wuEditRead();
    if (WARMUP_STRENGTH.length <= 1) { showToast('Must have at least 1 exercise'); return; }
    WARMUP_STRENGTH.splice(idx, 1);
    wuEditRender();
  }

  function wuEditSave() {
    const newRoutine = wuEditRead();
    if (!newRoutine.length) { showToast('Add at least one exercise'); return; }

    /* Check if anything actually changed */
    const oldJSON = JSON.stringify(WARMUP_STRENGTH);
    const newJSON = JSON.stringify(newRoutine);
    const changed = oldJSON !== newJSON;

    WARMUP_STRENGTH = newRoutine;
    localStorage.setItem('warmupStrengthRoutine', newJSON);

    if (changed) {
      /* Reset history — past times used a different routine */
      localStorage.removeItem('warmupStrengthTimes');
      showToast('Routine updated — average reset to fresh start');
    } else {
      showToast('Routine saved');
    }
    settingsPop();
  }

  function wuEditReset() {
    if (!confirm('Reset to the default Pull-up/Push-up sequence? Your custom routine will be lost.')) return;
    WARMUP_STRENGTH = WARMUP_STRENGTH_DEFAULT.map(x => ({...x}));
    localStorage.removeItem('warmupStrengthRoutine');
    localStorage.removeItem('warmupStrengthTimes');
    wuEditRender();
    showToast('Routine reset — average cleared');
  }

  function wuGenEditRender() {
    const tog = document.getElementById('wu-gen-toggle');
    if (tog) tog.checked = _getWarmupGeneralEnabled();
    const list = document.getElementById('wu-gen-list');
    if (!list) return;
    list.innerHTML = WARMUP_GENERAL_LIVE.map((s, i) => `
      <div class="wu-edit-row">
        <span class="wu-edit-idx">${i + 1}.</span>
        <input class="wu-edit-name" type="text" value="${s.name.replace(/"/g, '&quot;')}"
          placeholder="Exercise name" data-idx="${i}" />
        <input class="wu-edit-reps" type="number" value="${s.secs}" min="5" max="300"
          inputmode="numeric" data-idx="${i}" />
        <span style="font-size:.75rem;color:var(--tertiary)">s</span>
        <button class="wu-edit-del" onclick="wuGenEditDeleteRow(${i})" title="Remove">&#x2715;</button>
      </div>`).join('');
  }

  function wuGenEditRead() {
    const rows = document.querySelectorAll('#wu-gen-list .wu-edit-row');
    return Array.from(rows).map(row => ({
      name: row.querySelector('.wu-edit-name').value.trim() || 'Exercise',
      secs: Math.max(5, parseInt(row.querySelector('.wu-edit-reps').value, 10) || 30),
      hint: '',
      cue:  '',
    }));
  }

  function wuGenEditAddRow() {
    WARMUP_GENERAL_LIVE = wuGenEditRead();
    WARMUP_GENERAL_LIVE.push({ name: 'Exercise', secs: 30, hint: '', cue: '' });
    wuGenEditRender();
    const list = document.getElementById('wu-gen-list');
    list?.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function wuGenEditDeleteRow(idx) {
    WARMUP_GENERAL_LIVE = wuGenEditRead();
    if (WARMUP_GENERAL_LIVE.length <= 1) { showToast('Must have at least 1 exercise'); return; }
    WARMUP_GENERAL_LIVE.splice(idx, 1);
    wuGenEditRender();
  }

  function wuGenEditSave() {
    const newRoutine = wuGenEditRead();
    if (!newRoutine.length) { showToast('Add at least one exercise'); return; }
    WARMUP_GENERAL_LIVE = newRoutine;
    localStorage.setItem('warmupGeneralRoutine', JSON.stringify(newRoutine));
    showToast('General warm-up saved');
    settingsPop();
  }

  function wuGenEditReset() {
    if (!confirm('Reset to the default 8-exercise routine? Your custom routine will be lost.')) return;
    WARMUP_GENERAL_LIVE = WARMUP_GENERAL.map(x => ({...x}));
    localStorage.removeItem('warmupGeneralRoutine');
    wuGenEditRender();
    showToast('General warm-up reset');
  }

  function wuGenToggleChanged(checked) {
    _setWarmupGeneralEnabled(checked);
  }
