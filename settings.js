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
    /* shared sliding pill supplies the highlight — buttons only change text colour */
    swBtn.classList.toggle('active', mode === 'stopwatch');
    cdBtn.classList.toggle('active', mode === 'countdown');
    swBtn.style.color = mode === 'stopwatch' ? '#fff' : 'var(--tertiary)';
    cdBtn.style.color = mode === 'countdown' ? '#fff' : 'var(--tertiary)';
    const seg = document.getElementById('break-mode-seg');
    if (seg) {
      const idx  = mode === 'stopwatch' ? 0 : 1;
      const pill = seg.querySelector('.segment-pill');
      const firstTime = !(pill && pill.style.width);
      if (firstTime) initSegmentedPill(seg); else moveSegmentedPill(seg, idx, 2);
      if (pill) pill.style.width = 'calc((100% - 8px) / 2)';
    }
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
  /* Transient keys never belong in a backup: in-progress workout state,
     active timer timestamps, and the last-shown motivational message index. */
  const _TRANSIENT_KEYS = new Set([
    'activeWorkout',
    'activeWorkoutExerciseIndex',
    'activeRest',
    'pwLastMsgIdx',
    'lastBackupAt',
    'lastBackupTrainingCount',
    'backupBannerSnoozeUntil',
    'storagePersisted',
  ]);
  /* supabase-js auth session keys start with "sb-": never exported, imported over, or wiped */
  function isTransientKey(key) { return _TRANSIENT_KEYS.has(key) || (typeof key === 'string' && key.startsWith('sb-')); }

  // === EXPORT CATEGORIES ===
  /* Export/import are category-based. Every new localStorage key must be added to a category here;
     unmapped keys default to "settings" so they are never lost. */
  const EXPORT_CATEGORIES = [
    { id: 'history',  label: 'Training history',    keys: ['workouts', 'killerSetHistory', 'warmupStrengthTimes'], prefixes: ['restPerf:'] },
    { id: 'plans',    label: 'Training plans',      keys: ['plans'], prefixes: [] },
    { id: 'library',  label: 'Exercise library',    keys: ['exLib', 'customExMeta'], prefixes: [] },
    { id: 'journeys', label: 'Journeys & progress', keys: ['trainingJourneys'], prefixes: [] },
    { id: 'xp',       label: 'XP & badges',         keys: ['xpData', 'badgeData'], prefixes: [] },
    { id: 'settings', label: 'Settings & goals',    keys: ['freqGoal', 'volumeGoal', 'exerciseGoal', 'userBW', 'userHeight', 'warmupGeneralRoutine', 'warmupStrengthRoutine',
      'warmupGeneralEnabled', 'warmupStrengthEnabled', 'startWithWarmup', 'killerSetRoutine', 'restTimerEnabled', 'breakTimerMode', 'ghostMode',
      'exLibExpand1', 'histFolderState', 'progCatCollapsed', 'progressRange', 'chartTapHintDone'], prefixes: [] },
  ];

  /* Category id for a key, or null for transient keys and geminiApiKey. */
  function getCategoryForKey(key) {
    if (!key || isTransientKey(key) || key === 'geminiApiKey') return null;
    const c = EXPORT_CATEGORIES.find(c => c.keys.includes(key) || c.prefixes.some(p => key.startsWith(p)));
    return c ? c.id : 'settings';
  }

  // === BACKUP STATUS ===
  /* Backup tracking keys are in _TRANSIENT_KEYS, so they are never exported and import leaves them untouched.
     Trainings are counted from the global `workouts` array (localStorage key "workouts"). */
  function _backupStatus() {
    const at = Number(localStorage.getItem('lastBackupAt')) || 0;
    const base = Number(localStorage.getItem('lastBackupTrainingCount')) || 0;
    const total = (typeof workouts !== 'undefined' && Array.isArray(workouts)) ? workouts.length : 0;
    const days = at ? Math.floor((Date.now() - at) / 86400000) : null;
    return { at, total, since: at ? Math.max(0, total - base) : total, days };
  }

  function _backupAgoText(days) {
    if (days === null) return 'Never';
    if (days <= 0) return 'today';
    return days === 1 ? 'yesterday' : days + ' days ago';
  }

  function _recordBackup(partial) {
    if (partial) { _renderBackupRows(); return; }   /* partial export: leave tracking untouched */
    localStorage.setItem('lastBackupAt', String(Date.now()));
    localStorage.setItem('lastBackupTrainingCount', String((typeof workouts !== 'undefined' && Array.isArray(workouts)) ? workouts.length : 0));
    localStorage.removeItem('backupBannerSnoozeUntil');
    _renderBackupRows();
    if (typeof renderBackupBanner === 'function') renderBackupBanner();
  }

  // === EXPORT CARD STATE ===
  /* Selection is not persisted: reset to all categories ticked, Gemini key unticked, each time the screen opens. */
  let _expSel = new Set(EXPORT_CATEGORIES.map(c => c.id));
  let _expGemini = false;

  function _expCount(id) {
    const n = (v, one, many) => v + ' ' + (v === 1 ? one : many);
    try {
      if (id === 'history' && typeof workouts !== 'undefined') return n(workouts.length, 'training', 'trainings');
      if (id === 'plans' && typeof plans !== 'undefined') return n(plans.length, 'plan', 'plans');
      if (id === 'journeys' && typeof _journeys !== 'undefined') return n(_journeys.length, 'journey', 'journeys');
    } catch (e) {}
    return '';
  }

  function _renderExportCard() {
    const host = document.getElementById('exp-cats');
    if (!host) return;
    const tick = on => `<span class="exp-tick${on ? ' on' : ''}"><svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="2.5,6.5 5,9 9.5,3.5"/></svg></span>`;
    host.innerHTML = EXPORT_CATEGORIES.map(c => `<div class="exp-row" data-cat="${c.id}">${tick(_expSel.has(c.id))}<span class="exp-lbl"></span><span class="exp-cnt"></span></div>`).join('') +
      `<div class="exp-sep"></div><div class="exp-row" data-gemini="1">${tick(_expGemini)}<span class="exp-lbl">Include Gemini API key</span></div>
       <div class="exp-note">Off by default. Leave it off if you save or send the backup anywhere you don't fully control.</div>`;
    host.querySelectorAll('.exp-row[data-cat]').forEach((row, i) => {
      row.querySelector('.exp-lbl').textContent = EXPORT_CATEGORIES[i].label;
      row.querySelector('.exp-cnt').textContent = _expCount(EXPORT_CATEGORIES[i].id);
      row.addEventListener('click', () => {
        const id = row.dataset.cat;
        if (_expSel.has(id)) _expSel.delete(id); else _expSel.add(id);
        _renderExportCard();
      });
    });
    host.querySelector('.exp-row[data-gemini]').addEventListener('click', () => { _expGemini = !_expGemini; _renderExportCard(); });
    const btn = document.getElementById('exp-btn');
    if (btn) { btn.disabled = _expSel.size === 0; btn.classList.toggle('disabled', _expSel.size === 0); }
  }

  function exportData() {
    if (!_expSel.size) return;
    const cats = EXPORT_CATEGORIES.map(c => c.id).filter(id => _expSel.has(id));
    const data = {}, counts = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || isTransientKey(key)) continue;
      if (key === 'geminiApiKey') { if (_expGemini) data[key] = localStorage.getItem(key); continue; }
      const cat = getCategoryForKey(key);
      if (!_expSel.has(cat)) continue;
      data[key] = localStorage.getItem(key);   /* raw string value, restored verbatim */
      counts[cat] = (counts[cat] || 0) + 1;
    }
    const includesGeminiKey = 'geminiApiKey' in data;
    const allSix = cats.length === EXPORT_CATEGORIES.length;
    const payload = {
      exportVersion: 3,
      exportedAt:    new Date().toISOString(),
      categories:    cats,
      includesGeminiKey,
      counts,
      data,
    };
    const date = new Date().toISOString().slice(0, 10);
    const text = JSON.stringify(payload, null, 2);
    const fileName = `trainings-app-backup-${date}.json`;
    const download = () => {
      const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
      const a   = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      _recordBackup(!allSix);
      showToast('Data exported ✓');
    };
    let file = null;
    try { file = new File([text], fileName, { type: 'application/json' }); } catch (e) {}
    /* share must be called synchronously inside the tap handler to keep the user gesture */
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: 'Trainings App backup' })
        .then(() => { _recordBackup(!allSix); showToast('Data exported ✓'); })
        .catch(err => { if (err && err.name === 'AbortError') return; download(); });
    } else {
      download();
    }
  }

  // === DATA MANAGEMENT ROWS ===
  /* Last backup + storage protection rows, injected into the Data Management screen (refreshed on open and after each export). */
  function _renderBackupRows() {
    const body = document.querySelector('#settings-data .settings-body');
    if (!body) return;
    let box = document.getElementById('dm-backup-status');
    if (!box) {
      box = document.createElement('div');
      box.id = 'dm-backup-status';
      body.insertBefore(box, body.firstChild);
    }
    const st = _backupStatus();
    const persisted = localStorage.getItem('storagePersisted') === 'true';
    box.innerHTML = `<div class="settings-section-header">Backup status</div>
      <div class="settings-card">
        <div class="settings-row dm-status-row"><span class="dm-status-lbl">Last backup</span>
          <span class="dm-status-val"><span id="dm-last-backup"></span><span class="dm-status-sub" id="dm-since"></span></span></div>
        <div class="settings-row dm-status-row"><span class="dm-status-lbl">Storage protection</span>
          <span class="dm-status-val dm-status-muted" id="dm-persist"></span></div>
      </div>
      <div class="dm-status-note">Backups are the only safe copy of your data.</div>`;
    document.getElementById('dm-last-backup').textContent = st.at ? _backupAgoText(st.days) : 'Never';
    const since = document.getElementById('dm-since');
    since.textContent = st.since + (st.since === 1 ? ' training since' : ' trainings since');
    document.getElementById('dm-persist').textContent = persisted ? 'On' : 'Not guaranteed';
  }

  (function _initBackupRows() {
    if (typeof settingsPush === 'function' && !settingsPush._dmWrapped) {
      const _orig = settingsPush;
      settingsPush = function (id) {
        if (id === 'settings-data') {
          _expSel = new Set(EXPORT_CATEGORIES.map(c => c.id)); _expGemini = false;
          _renderBackupRows();
          _renderExportCard();
        }
        return _orig.apply(this, arguments);
      };
      settingsPush._dmWrapped = true;
    }
  })();

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

      let restored = 0;

      if (payload && payload.exportVersion >= 3) {
        // === IMPORT V3 REPLACE ===
        /* (a) validate and build pairs in memory, (b) confirm, (c) only then replace the categories listed in the file */
        if (!payload.data || typeof payload.data !== 'object' || Array.isArray(payload.data)) { showToast('Invalid backup file'); return; }
        const allIds = EXPORT_CATEGORIES.map(c => c.id);
        let fileCats = allIds;
        if (payload.categories !== undefined) {
          if (!Array.isArray(payload.categories) || payload.categories.some(c => !allIds.includes(c))) { showToast('Invalid backup file'); return; }
          fileCats = payload.categories;
        }
        const pairs = [];
        for (const key of Object.keys(payload.data)) {
          if (isTransientKey(key)) continue;
          const val = payload.data[key];
          if (val === undefined || val === null) continue;
          if (typeof val !== 'string') { showToast('Invalid backup file'); return; }
          if (key !== 'geminiApiKey' && !fileCats.includes(getCategoryForKey(key))) continue;
          pairs.push([key, val]);
        }
        if (!pairs.length) { showToast('No data in file'); return; }
        let nW = 0;
        try { const w = JSON.parse(payload.data.workouts || '[]'); nW = Array.isArray(w) ? w.length : 0; } catch (err) { showToast('Invalid backup file'); return; }
        const when = payload.exportedAt ? new Date(payload.exportedAt).toLocaleString() : 'unknown date';
        const names = EXPORT_CATEGORIES.filter(c => fileCats.includes(c.id)).map(c => c.label).join(', ');
        if (!confirm(`This replaces: ${names}. Everything else on this device stays as it is.\n\nBackup from ${when}\n${pairs.length} items, ${nW} training${nW === 1 ? '' : 's'}.\n\nProceed?`)) return;
        Object.keys(localStorage).forEach(k => { if (!isTransientKey(k) && fileCats.includes(getCategoryForKey(k))) localStorage.removeItem(k); });
        pairs.forEach(([k, v]) => { localStorage.setItem(k, v); restored++; });
      } else if (payload.exportVersion >= 2 && payload.data && typeof payload.data === 'object') {
        /* v2: map of raw string values — restore every key present, skip absent ones */
        if (!confirm('Import this backup?\n\nThis merges the backup into your current data. Keys in the file overwrite existing data; keys not in the file stay untouched.\n\nProceed?')) return;
        Object.keys(payload.data).forEach(key => {
          if (isTransientKey(key)) return;
          const val = payload.data[key];
          if (val === undefined || val === null) return;   /* skip absent */
          localStorage.setItem(key, val);
          restored++;
        });
      } else {
        /* exportVersion missing → treat as v1: legacy top-level keys */
        const has = (k) => payload[k] !== undefined;
        const legacyPresent = ['workouts','plans','exLib','customExMeta','freqGoal','volumeGoal','exerciseGoal','userBW','userHeight'].some(has);
        if (!legacyPresent) { showToast('No recognisable data in file'); return; }
        if (!confirm('Import this backup?\n\nThis merges the backup into your current data. Keys in the file overwrite existing data; keys not in the file stay untouched.\n\nProceed?')) return;
        const putJSON = (k) => { if (has(k)) { localStorage.setItem(k, JSON.stringify(payload[k])); restored++; } };
        const putRaw  = (k) => { if (has(k)) { localStorage.setItem(k, payload[k] ?? ''); restored++; } };
        putJSON('workouts'); putJSON('plans'); putJSON('exLib'); putJSON('customExMeta');
        putJSON('freqGoal'); putJSON('volumeGoal'); putJSON('exerciseGoal');
        putRaw('userBW'); putRaw('userHeight');
      }

      if (!restored) { showToast('No data imported'); return; }

      /* Reload the whole app so every tab reflects the restored data immediately */
      showToast(`Imported ${restored} item(s) ✓`);
      setTimeout(() => location.reload(), 600);
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


  // === ACCOUNT & SYNC ===
  const _ACCT_CHEVRON = '<svg class="settings-chevron" width="7" height="12" viewBox="0 0 7 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1,1 6,6 1,11"/></svg>';
  let _acctUser = null;
  let _acctBusy = false;
  let _acctMsg = '';
  let _acctMsgColor = '#FF3B30';

  function _acctSubtitle() { return _acctUser ? _acctUser.email : 'Not logged in'; }

  function _acctUpdateRowSubtitle() {
    const el = document.getElementById('acct-row-sub');
    if (el) el.textContent = _acctSubtitle();
  }

  function renderAccountScreen() {
    const body = document.getElementById('acct-body');
    if (!body) return;
    const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');
    const inputCss = 'width:100%;box-sizing:border-box;background:var(--card-inner,#2C2C2E);color:#fff;border:none;border-radius:10px;padding:.75rem .875rem;font-size:1rem;margin-bottom:.625rem;outline:none';
    const btnCss = 'width:100%;border:none;border-radius:12px;padding:.8rem;font-size:1rem;font-weight:600;cursor:pointer;margin-top:.5rem';
    const dis = _acctBusy ? ' disabled style="opacity:.5"' : '';
    let html;
    if (!syncClient) {
      html = '<div class="settings-card" style="padding:1rem"><div style="color:var(--tertiary,#8E8E93)">Sync unavailable right now</div></div>';
    } else if (_acctUser) {
      html = `<div class="settings-card" style="padding:1rem">
          <div style="font-size:1rem">${esc(_acctUser.email)}</div>
          <div style="color:var(--tertiary,#8E8E93);font-size:.8125rem;margin-top:.25rem">Logged in</div>
        </div>
        <div style="margin:1rem var(--gutter,1rem) 0">
          <button id="acct-logout" style="${btnCss};background:#1C1C1E;color:#FF3B30"${_acctBusy ? ' disabled' : ''}>${_acctBusy ? 'Please wait…' : 'Log out'}</button>
          <div id="acct-err" style="color:#FF3B30;font-size:.8125rem;margin-top:.5rem;min-height:1em">${esc(_acctMsg)}</div>
        </div>`;
    } else {
      html = `<div class="settings-card" style="padding:1rem">
          <input id="acct-email" type="email" autocomplete="email" autocapitalize="none" placeholder="Email" style="${inputCss}">
          <input id="acct-pass" type="password" autocomplete="current-password" minlength="8" placeholder="Password (min 8 characters)" style="${inputCss};margin-bottom:0">
        </div>
        <div style="margin:1rem var(--gutter,1rem) 0">
          <div id="acct-err" style="color:${_acctMsgColor};font-size:.8125rem;margin-bottom:.5rem;min-height:1em">${esc(_acctMsg)}</div>
          <button id="acct-login" style="${btnCss};background:#007AFF;color:#fff"${_acctBusy ? ' disabled' : ''}>${_acctBusy ? 'Please wait…' : 'Log in'}</button>
          <button id="acct-signup" style="${btnCss};background:#1C1C1E;color:#007AFF"${_acctBusy ? ' disabled' : ''}>Create account</button>
          <div style="color:var(--tertiary,#8E8E93);font-size:.75rem;margin-top:1rem;line-height:1.4">Your data stays on this device until you log in. Sync comes in the next update.</div>
        </div>`;
    }
    body.innerHTML = html;
    const emailEl = document.getElementById('acct-email');
    const passEl = document.getElementById('acct-pass');
    const run = async (fn) => {
      if (_acctBusy) return;
      const email = (emailEl.value || '').trim();
      const pass = passEl.value || '';
      if (!email || !email.includes('@')) { _acctMsg = 'Enter a valid email'; _acctMsgColor = '#FF3B30'; return renderAccountScreen(); }
      if (pass.length < 8) { _acctMsg = 'Password too short'; _acctMsgColor = '#FF3B30'; return renderAccountScreen(); }
      _acctBusy = true; _acctMsg = ''; renderAccountScreen();
      const res = await fn(email, pass);
      _acctBusy = false;
      if (res.ok) {
        _acctUser = await getSyncUser();
        _acctMsg = res.message || '';
        _acctMsgColor = '#8E8E93';
        _acctUpdateRowSubtitle();
      } else { _acctMsg = res.error; _acctMsgColor = '#FF3B30'; }
      renderAccountScreen();
    };
    document.getElementById('acct-login')?.addEventListener('click', () => run(signInWithEmail));
    document.getElementById('acct-signup')?.addEventListener('click', () => run(signUpWithEmail));
    document.getElementById('acct-logout')?.addEventListener('click', async () => {
      if (_acctBusy || !confirm('Log out? Your data stays on this device.')) return;
      _acctBusy = true; _acctMsg = ''; renderAccountScreen();
      const res = await signOutUser();
      _acctBusy = false;
      if (res.ok) { _acctUser = null; _acctUpdateRowSubtitle(); } else { _acctMsg = res.error; _acctMsgColor = '#FF3B30'; }
      renderAccountScreen();
    });
  }

  function _acctInit() {
    const root = document.getElementById('settings-root');
    if (!root || document.getElementById('settings-account')) return;
    /* Row at the top of the Settings folder list */
    const card = root.querySelector('.settings-card');
    const row = document.createElement('div');
    row.className = 'settings-row settings-row-tappable';
    row.innerHTML = '<div class="settings-row-icon icon-blue">☁️</div>' +
      '<div class="settings-row-label" style="flex:1">Account &amp; Sync<div id="acct-row-sub" style="font-size:.75rem;color:var(--tertiary);margin-top:.1rem">Not logged in</div></div>' + _ACCT_CHEVRON;
    row.addEventListener('click', () => { _acctMsg = ''; settingsPush('settings-account'); renderAccountScreen(); });
    if (card) card.insertBefore(row, card.firstChild);
    /* Sub-screen with the same header style as the other Settings screens */
    const panel = document.createElement('div');
    panel.id = 'settings-account';
    panel.className = 'settings-panel sub';
    panel.innerHTML = '<div class="settings-nav"><button class="settings-back-btn" id="acct-back">' +
      '<svg width="11" height="18" viewBox="0 0 9 15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="8,1 1,7.5 8,14"/></svg></button>' +
      '<div class="settings-nav-title">Account &amp; Sync</div></div><div class="settings-body" id="acct-body"></div>';
    root.parentNode.insertBefore(panel, root.nextSibling);
    document.getElementById('acct-back').addEventListener('click', () => settingsPop());
    /* Swipe-back: the shared handler only knows its fixed panel list, so handle this panel first */
    let sx = null, sy = null;
    document.addEventListener('touchstart', e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { capture: true, passive: true });
    document.addEventListener('touchend', e => {
      if (sx === null || !panel.classList.contains('open')) { sx = null; return; }
      const dx = e.changedTouches[0].clientX - sx, dy = Math.abs(e.changedTouches[0].clientY - sy);
      const edge = sx <= 20; sx = null;
      if (edge && dx >= 60 && dy <= 40) { e.stopImmediatePropagation(); settingsPop(); }
    }, { capture: true });
    getSyncUser().then(u => { _acctUser = u; _acctUpdateRowSubtitle(); });
    onSyncAuthChange(u => { _acctUser = u; _acctUpdateRowSubtitle(); if (panel.classList.contains('open') && !_acctBusy) renderAccountScreen(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _acctInit); else _acctInit();
