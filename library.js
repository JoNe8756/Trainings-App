/* Extracted from index.html — Library tab: exercises list/search, exercise detail,
   creation wizard, training plans, plan intensity chart, journeys (list/detail/creator/
   generation), unknown-exercise handling. */

  // === EXERCISE DETAIL ===
  function showExDetail(name) {
    const d    = EXERCISE_DETAIL[name];
    const meta = getExMeta(name);
    const diff = meta.diff;
    const diffColor = diff <= 3 ? 'var(--green)' : diff <= 6 ? '#FF9500' : 'var(--red)';
    /* find category from library */
    const lib = getExLib();
    let cat = '';
    for (const c of EX_CATS) { if ((lib[c] || []).includes(name)) { cat = c; break; } }

    const howHTML = d ? d.how.map((step, i) => `
      <div class="detail-step">
        <div class="detail-step-num">${i + 1}</div>
        <div>${step}</div>
      </div>`).join('') : '';

    const cuesHTML = d ? d.cues.map(cue => `
      <div class="detail-cue">
        <div class="detail-cue-dot">✓</div>
        <div>${cue}</div>
      </div>`).join('') : '';

    document.getElementById('lib-detail-content').innerHTML = `
      <button class="detail-back" onclick="closeExDetail()">
        <svg width="11" height="18" viewBox="0 0 9 15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="8,1 1,7.5 8,14"/></svg>
      </button>
      <div class="detail-hero">
        <div class="detail-name">${name}</div>
        <div class="detail-meta">
          <span class="detail-cat-tag">${cat || 'Exercise'}</span>
          ${meta.tb ? '<span class="detail-cat-tag" style="color:var(--blue)">⏱ Hold</span>' : ''}
          <span class="diff-badge" style="background:${diffColor};margin-left:.125rem;cursor:pointer" onclick="_openExDiffEditor(${qs(name)})">${meta.verified === false ? '~' : ''}${diff}/10</span>
          <span onclick="_openExDiffEditor(${qs(name)})" style="color:#007AFF;font-size:13px;font-weight:600;cursor:pointer;-webkit-tap-highlight-color:transparent">Edit</span>
        </div>
      </div>
      ${meta.verified === false ? `<div onclick="_openExDiffEditor(${qs(name)})" style="margin:0 var(--gutter) .875rem;background:rgba(255,149,0,.12);border-radius:10px;padding:.625rem .75rem;font-size:.8125rem;color:#FF9500;cursor:pointer;-webkit-tap-highlight-color:transparent">⚠️ Estimated difficulty — tap to adjust</div>` : ''}
      <div id="ex-diff-editor" style="display:none;margin:0 var(--gutter) .875rem;background:#1C1C1E;border-radius:12px;padding:16px">
        <div style="font-size:.6875rem;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#8E8E93;text-align:center">Difficulty</div>
        <div id="ex-diff-value" style="font-size:48px;font-weight:700;color:#fff;text-align:center;line-height:1.1;margin:6px 0 12px">${diff}</div>
        <div style="display:flex;align-items:center;justify-content:center;gap:16px;margin-bottom:14px">
          <button onclick="_exDiffStep(-0.5)" style="width:44px;height:44px;background:#2C2C2E;border:none;border-radius:8px;color:#fff;font-size:24px;line-height:1;cursor:pointer;-webkit-tap-highlight-color:transparent">−</button>
          <button onclick="_exDiffStep(0.5)" style="width:44px;height:44px;background:#2C2C2E;border:none;border-radius:8px;color:#fff;font-size:24px;line-height:1;cursor:pointer;-webkit-tap-highlight-color:transparent">+</button>
        </div>
        <button onclick="_exDiffSave(${qs(name)})" style="width:100%;background:#007AFF;color:#fff;border:none;border-radius:999px;padding:13px 0;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;-webkit-tap-highlight-color:transparent">Save</button>
        <button onclick="_exDiffCancel()" style="width:100%;background:none;border:none;color:#8E8E93;font-family:inherit;font-size:14px;font-weight:600;padding:10px 0 0;cursor:pointer;-webkit-tap-highlight-color:transparent">Cancel</button>
      </div>
      ${(() => { const rec = _calcOptimalRestRec(name); return rec != null ? `<div class="detail-card" style="margin-bottom:.875rem"><button onclick="_restStatsOpen(${qs(name)})" style="width:100%;background:none;border:none;cursor:pointer;font-family:inherit;display:flex;justify-content:space-between;align-items:center;padding:.75rem 0;-webkit-tap-highlight-color:transparent"><span style="font-size:.875rem;color:#8E8E93">💤 Optimal Rest</span><div style="display:flex;align-items:center;gap:.375rem"><span style="font-size:.875rem;color:#fff;font-weight:600">${_fmtRestRec(rec)}</span><svg width="7" height="12" viewBox="0 0 7 12" fill="none" stroke="#8E8E93" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="1,1 6,6 1,11"/></svg></div></button></div>` : ''; })()}
      ${howHTML ? `<div style="font-size:.6875rem;font-weight:700;text-transform:uppercase;letter-spacing:.65px;color:var(--tertiary);padding:0 var(--gutter) .375rem">How to Perform</div>
      <div class="detail-card">${howHTML}<div style="height:.5rem"></div></div>` : ''}
      ${cuesHTML ? `<div style="font-size:.6875rem;font-weight:700;text-transform:uppercase;letter-spacing:.65px;color:var(--tertiary);padding:.25rem var(--gutter) .375rem">Key Form Cues</div>
      <div class="detail-card">${cuesHTML}<div style="height:.5rem"></div></div>` : ''}
      <div style="height:1.5rem"></div>`;

    document.querySelector('.lib-seg-wrap').style.display          = 'none';
    document.getElementById('lib-exercises-content').style.display = 'none';
    document.getElementById('lib-plans-content').style.display     = 'none';
    document.getElementById('lib-detail-content').style.display    = '';
    /* scroll back to top of the scroll area */
    document.querySelector('#exercises-screen .scroll-area').scrollTop = 0;
  }

  function closeExDetail() {
    document.getElementById('lib-detail-content').style.display = 'none';
    document.querySelector('.lib-seg-wrap').style.display = '';
    showLibSeg(_libSeg);
  }

  function _openExDiffEditor(name) {
    _exDiffEditVal = getExMeta(name).diff;
    const ed = document.getElementById('ex-diff-editor');
    const val = document.getElementById('ex-diff-value');
    if (val) val.textContent = _exDiffEditVal;
    if (ed) { ed.style.display = ''; ed.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
  }

  function _exDiffStep(delta) {
    _exDiffEditVal = Math.min(10, Math.max(1, Math.round((_exDiffEditVal + delta) * 2) / 2));
    const val = document.getElementById('ex-diff-value');
    if (val) val.textContent = _exDiffEditVal;
  }

  function _exDiffCancel() {
    const ed = document.getElementById('ex-diff-editor');
    if (ed) ed.style.display = 'none';
  }

  function _exDiffSave(name) {
    const meta = getCustomMeta();
    meta[name] = Object.assign({}, meta[name], { diff: _exDiffEditVal, verified: true });
    setCustomMeta(meta);
    showExDetail(name);   /* re-render: updated badge, no "~", no estimate banner */
  }

  function openExPicker() {
    document.getElementById('ex-search').value = '';
    renderExList('');
    document.getElementById('exercise-picker').classList.add('open');
    setTimeout(() => document.getElementById('ex-search').focus(), 320);
    return new Promise(r => { _pickerResolve = r; });
  }

  function closeExPicker() {
    document.getElementById('exercise-picker').classList.remove('open');
    if (_pickerResolve) { _pickerResolve(null); _pickerResolve = null; }
  }

  function pickExercise(name) {
    document.getElementById('exercise-picker').classList.remove('open');
    if (_pickerResolve) { _pickerResolve(name); _pickerResolve = null; }
  }

  function handlePickerBgClick(e) {
    if (e.target.id === 'exercise-picker') closeExPicker();
  }

  function renderExList(q) {
    const lib   = getExLib();
    const query = q.trim().toLowerCase();
    const list  = document.getElementById('ex-picker-list');
    list.innerHTML = '';
    let any = false;

    EX_CATS.forEach(cat => {
      const items = lib[cat].filter(n => !query || n.toLowerCase().includes(query));
      if (!items.length && query) return;
      any = true;

      const section = document.createElement('div');

      const lbl = document.createElement('div');
      lbl.className = 'ex-cat-label';
      lbl.textContent = cat;
      section.appendChild(lbl);

      items.forEach(name => {
        const row = document.createElement('div');
        row.className = 'ex-item';
        row.innerHTML = `
          <button class="ex-item-btn" onclick="pickExercise(${qs(name)})">${name}</button>
          <button class="ex-item-del" onclick="delFromLib(${qs(cat)},${qs(name)})" title="Remove">
            <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm3.03 9.47a.75.75 0 0 1-1.06 1.06L8 9.06l-1.97 1.97a.75.75 0 0 1-1.06-1.06L6.94 8 4.97 6.03a.75.75 0 0 1 1.06-1.06L8 6.94l1.97-1.97a.75.75 0 0 1 1.06 1.06L9.06 8l1.97 1.97z"/>
            </svg>
          </button>`;
        section.appendChild(row);
      });

      if (!query) {
        const addRow = document.createElement('div');
        addRow.className = 'ex-add-custom-row';
        addRow.id = `ex-cr-${cat}`;
        addRow.innerHTML = `
          <button class="ex-add-custom-btn" onclick="showCustomInput(${qs(cat)})">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm.75 4.25v2.5h2.5a.75.75 0 0 1 0 1.5h-2.5v2.5a.75.75 0 0 1-1.5 0v-2.5h-2.5a.75.75 0 0 1 0-1.5h2.5v-2.5a.75.75 0 0 1 1.5 0z"/>
            </svg>
            Add to ${cat}…
          </button>`;
        section.appendChild(addRow);
      }

      list.appendChild(section);
    });

    if (!any) {
      const noRes = document.createElement('div');
      noRes.className = 'ex-no-results';
      const name = q.trim();
      noRes.innerHTML = `
        <p>No results for "<strong>${name}</strong>"</p>
        <p style="font-size:.8125rem">Add it to:</p>
        <div class="ex-no-results-cats">
          ${EX_CATS.map(c =>
            `<button class="ex-no-results-cat-btn" onclick="addAndPick(${qs(name)},${qs(c)})">${c}</button>`
          ).join('')}
        </div>`;
      list.appendChild(noRes);
    }
  }

  function showCustomInput(cat) {
    const row = document.getElementById(`ex-cr-${cat}`);
    if (!row) return;
    row.className = 'ex-add-input-row';
    row.innerHTML = `
      <input class="ex-add-input" id="ex-ci-${cat}" type="text" placeholder="Exercise name…"
        onkeydown="if(event.key==='Enter')confirmCustom(${qs(cat)})" />
      <button class="ex-add-confirm" onclick="confirmCustom(${qs(cat)})">Add</button>`;
    document.getElementById(`ex-ci-${cat}`).focus();
  }

  function confirmCustom(cat) {
    const inp = document.getElementById(`ex-ci-${cat}`);
    const name = inp ? inp.value.trim() : '';
    if (!name) return;
    const lib = getExLib();
    if ((lib[cat] || []).includes(name)) { pickExercise(name); return; }
    openWizard(name, cat, 'picker');
  }

  function addAndPick(name, cat) {
    const lib = getExLib();
    if ((lib[cat] || []).includes(name)) { pickExercise(name); return; }
    openWizard(name, cat, 'picker');
  }

  function delFromLib(cat, name) {
    _wConfirm({
      title: 'Remove Exercise?',
      msg: `"${name}" will be removed from the library.`,
      okLabel: 'Remove', okColor: 'red',
      onOk: () => {
        const lib = getExLib();
        lib[cat] = lib[cat].filter(n => n !== name);
        setExLib(lib);
        if (document.getElementById('exercise-picker').classList.contains('open')) {
          renderExList(document.getElementById('ex-search').value);
        }
        if (document.getElementById('exercises-screen').classList.contains('active')) {
          renderExScreen();
        }
      }
    });
  }

  // === EXERCISE CREATOR ===
  function openWizard(name, cat, ctx) {
    _wiz = { name, cat, ctx, type: null, step: 0, answers: {} };
    _renderWizStep();
    document.getElementById('ex-wizard').classList.add('open');
  }

  function closeWizard() {
    document.getElementById('ex-wizard').classList.remove('open');
  }

  function _renderWizStep() {
    const el = document.getElementById('wizard-content');
    const { step, type, name } = _wiz;

    const nameHTML = `<div class="wizard-ex-name">"${name}"</div>`;
    const backBtn  = step > (type ? 1 : 0)
      ? `<button class="wizard-btn-back" onclick="_wizBack()">← Back</button>` : '';

    if (step === 0) {
      el.innerHTML = `${nameHTML}
        <div class="wizard-step-q">What type of exercise?</div>
        <div class="wizard-choices">
          <button class="wizard-choice" onclick="_wizType('bw')">
            🤸 Bodyweight / Calisthenics
            <small>Push-ups, pull-ups, planks…</small>
          </button>
          <button class="wizard-choice" onclick="_wizType('w')">
            🏋️ Weighted / Gym
            <small>Barbells, dumbbells, machines…</small>
          </button>
        </div>
        <div class="wizard-footer">
          <button class="wizard-btn-back" onclick="closeWizard()">Cancel</button>
        </div>`;
      return;
    }

    if (type === 'w') {
      el.innerHTML = `${nameHTML}
        <div class="wizard-step-q">Movement type?</div>
        <div class="wizard-choices">
          <button class="wizard-choice" onclick="_wizWAnswer('compound')">
            ⚙️ Compound (multi-joint)
            <small>e.g. bench press, squat, row</small>
          </button>
          <button class="wizard-choice" onclick="_wizWAnswer('isolation')">
            🎯 Isolation (single-joint)
            <small>e.g. bicep curl, leg extension</small>
          </button>
        </div>
        <div class="wizard-footer">
          <button class="wizard-btn-back" onclick="_wizBack()">← Back</button>
        </div>`;
      return;
    }

    /* bodyweight questionnaire */
    const bwSteps = [
      { q: 'Does this exercise use one limb or both?',
        hint: 'One-limb movements are significantly harder — your full bodyweight loads a single arm or leg.',
        opts: [{ l: '🦾 One at a time (e.g. pistol squat, one-arm push-up)', v: 'single' },
               { l: '💪 Both together (e.g. push-ups, squats, pull-ups)', v: 'double' }] },
      { q: 'Balance or stability required?',
        hint: 'Does the movement require active balance (e.g. freestanding handstand vs wall handstand)?',
        opts: [{ l: '⚖️ Yes — active balance', v: 'yes' }, { l: '🧱 No — stable position', v: 'no' }] },
      { q: 'Movement type?',
        hint: 'Isometric holds require sustained max-effort tension, adding difficulty.',
        opts: [{ l: '🧊 Isometric hold (static)', v: 'iso' }, { l: '🔄 Dynamic (moving)', v: 'dyn' }] },
      { q: 'Body angle to vertical?',
        hint: 'Horizontal and inverted positions demand far greater strength and body control.',
        opts: [
          { l: '🧍 Upright — vertical or close', v: 'up' },
          { l: '↗️ Diagonal — roughly 45°', v: '45' },
          { l: '➡️ Horizontal — parallel to ground', v: 'h' },
          { l: '🙃 Inverted — upside down', v: 'inv' },
        ] },
      { q: 'Technical & strength prerequisites?',
        hint: 'How much dedicated training does this movement typically require before it can be performed?',
        opts: [
          { l: '🟢 Low — beginner accessible', v: 'low' },
          { l: '🟡 Moderate — requires consistent training', v: 'mod' },
          { l: '🔴 High — advanced prerequisites needed', v: 'high' },
        ] },
    ];
    const qi = step - 1;
    if (qi < bwSteps.length) {
      const s = bwSteps[qi];
      el.innerHTML = `${nameHTML}
        <div class="wizard-step-hint">Step ${step}/5</div>
        <div class="wizard-step-q">${s.q}</div>
        <div class="wizard-step-hint">${s.hint}</div>
        <div class="wizard-choices">
          ${s.opts.map(o => `<button class="wizard-choice" onclick="_wizBWAnswer(${qs(o.v)})">${o.l}</button>`).join('')}
        </div>
        <div class="wizard-footer">
          ${backBtn}
        </div>`;
    } else {
      _showWizResult(_calcBWDiff(_wiz.answers));
    }
  }

  function _wizType(t) { _wiz.type = t; _wiz.step = 1; _renderWizStep(); }

  function _wizBWAnswer(v) {
    const keys = ['limbs','balance','movement','angle','tech'];
    _wiz.answers[keys[_wiz.step - 1]] = v;
    _wiz.step++;
    _renderWizStep();
  }

  function _wizWAnswer(v) {
    _showWizResult(v === 'compound' ? 5 : 3);
  }

  function _wizBack() { _wiz.step = Math.max(0, _wiz.step - 1); _renderWizStep(); }

  function _calcBWDiff(a) {
    // Base score
    let d = 1;
    // Unilateral limb demand
    if (a.limbs    === 'single') d += 2;
    // Active balance requirement
    if (a.balance  === 'yes')    d += 1;
    // Isometric vs dynamic
    if (a.movement === 'iso')    d += 1;
    // Body angle (positional strength demand)
    if (a.angle    === '45')     d += 1;
    if (a.angle    === 'h')      d += 2;
    if (a.angle    === 'inv')    d += 2;
    // Technical & strength prerequisites (largest driver)
    if (a.tech     === 'mod')    d += 3;
    if (a.tech     === 'high')   d += 5;
    return Math.min(10, Math.max(1, Math.round(d)));
  }

  function _showWizResult(diff) {
    _wiz.diff = diff;
    const pct   = diff * 10;
    const color = diff <= 3 ? 'var(--green)' : diff <= 6 ? '#FF9500' : 'var(--red)';
    const tier  = diff <= 2 ? 'Beginner' : diff <= 4 ? 'Novice'
                : diff <= 6 ? 'Intermediate' : diff <= 8 ? 'Advanced' : 'Elite';
    const typeLabel = _wiz.type === 'w' ? 'Weighted' : 'Bodyweight';
    document.getElementById('wizard-content').innerHTML = `
      <div class="wizard-ex-name">"${_wiz.name}"</div>
      <div class="wizard-step-q" style="margin-bottom:.25rem">Difficulty Score</div>
      <div class="wizard-diff-center">
        <div class="wizard-diff-num">${diff}<sup>/10</sup></div>
        <div class="wizard-diff-track">
          <div class="wizard-diff-fill" style="width:${pct}%;background:${color}"></div>
        </div>
        <div class="wizard-diff-tier">${tier} · ${typeLabel}</div>
      </div>
      <div class="wizard-footer">
        <button class="wizard-btn-back" onclick="closeWizard()">Cancel</button>
        <button class="wizard-btn-confirm" onclick="_wizConfirm(${diff})">Add Exercise</button>
      </div>`;
  }

  function _wizConfirm(diff) {
    const { name, cat, type, ctx, answers } = _wiz;
    const lib = getExLib();
    if (!lib[cat]) lib[cat] = [];
    if (!lib[cat].includes(name)) lib[cat].push(name);
    setExLib(lib);
    const meta = getCustomMeta();
    const m = { type, diff };
    if (answers && answers.movement === 'iso') m.tb = 1;  /* time-based hold */
    meta[name] = m;
    setCustomMeta(meta);
    closeWizard();
    if (ctx === 'picker') pickExercise(name);
    else renderExScreen();
  }

  // === EXERCISE LIST ===
  function renderExScreen() {
    const container = document.getElementById('ex-screen-list');
    container.innerHTML = '';
    const lib = getExLib();

    EX_CATS.forEach(cat => {
      const card = document.createElement('div');
      card.className = 'ex-screen-card';

      const head = document.createElement('div');
      head.className = 'ex-screen-cat-head';
      head.textContent = cat;
      card.appendChild(head);

      const body = document.createElement('div');

      lib[cat].forEach(name => {
        const meta  = getExMeta(name);
        const diff  = meta.diff;
        const bkgd  = diff <= 3 ? '#34C759' : diff <= 6 ? '#FF9500' : '#FF3B30';
        const diffLabel = meta.verified === false ? '~' + diff : diff;
        const row   = document.createElement('div');
        row.className = 'ex-screen-item';
        row.innerHTML = `
          <div style="flex:1;min-width:0">
            <button class="ex-screen-item-btn" onclick="showExDetail(${qs(name)})">${name}</button>
          </div>
          <button class="diff-badge" style="background:${bkgd}" title="${meta.verified === false ? 'Estimated difficulty — tap to adjust' : 'Edit difficulty'}" onclick="editExDiff(${qs(name)})">${diffLabel}</button>
          <button class="ex-item-del"
            onclick="delFromLib(${qs(cat)},${qs(name)})"
            title="Remove">
            <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm3.03 9.47a.75.75 0 0 1-1.06 1.06L8 9.06l-1.97 1.97a.75.75 0 0 1-1.06-1.06L6.94 8 4.97 6.03a.75.75 0 0 1 1.06-1.06L8 6.94l1.97-1.97a.75.75 0 0 1 1.06 1.06L9.06 8l1.97 1.97z"/>
            </svg>
          </button>`;
        body.appendChild(row);
      });

      const addRow = document.createElement('div');
      addRow.className = 'ex-screen-add-row';
      addRow.id = `exs-add-${cat}`;
      addRow.innerHTML = `
        <button class="ex-add-custom-btn" onclick="showExScreenInput(${qs(cat)})">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm.75 4.25v2.5h2.5a.75.75 0 0 1 0 1.5h-2.5v2.5a.75.75 0 0 1-1.5 0v-2.5h-2.5a.75.75 0 0 1 0-1.5h2.5v-2.5a.75.75 0 0 1 1.5 0z"/>
          </svg>
          Add to ${cat}…
        </button>`;
      body.appendChild(addRow);

      card.appendChild(body);
      container.appendChild(card);
    });
  }

  function editExDiff(name) {
    _diffEditName = name;
    const current = getExMeta(name).diff;
    document.getElementById('diff-editor-name').textContent = name;
    const grid = document.getElementById('diff-editor-grid');
    grid.innerHTML = '';
    for (let i = 1; i <= 10; i++) {
      const color = i <= 3 ? '#34C759' : i <= 6 ? '#FF9500' : '#FF3B30';
      const btn   = document.createElement('button');
      btn.className = 'diff-editor-btn' + (i === current ? ' selected' : '');
      btn.style.background = color;
      btn.textContent = i;
      btn.onclick = () => _setExDiff(name, i);
      grid.appendChild(btn);
    }
    document.getElementById('diff-editor').classList.add('open');
  }

  function _setExDiff(name, diff) {
    const meta = getCustomMeta();
    // Preserve existing custom meta (type, tb) and update only diff
    const existing = meta[name] || {};
    const base = EXERCISE_META[name] || {};
    meta[name] = Object.assign({}, base, existing, { diff });
    setCustomMeta(meta);
    closeDiffEditor();
    renderExScreen();
  }

  function closeDiffEditor() {
    document.getElementById('diff-editor').classList.remove('open');
    _diffEditName = null;
  }

  function _diffEditorBgClick(e) {
    if (e.target === document.getElementById('diff-editor')) closeDiffEditor();
  }

  function showExScreenInput(cat) {
    const row = document.getElementById(`exs-add-${cat}`);
    if (!row) return;
    row.className = 'ex-screen-add-input-row';
    row.innerHTML = `
      <input class="ex-add-input" id="exs-ci-${cat}" type="text" placeholder="Exercise name…"
        onkeydown="if(event.key==='Enter')confirmExScreenInput(${qs(cat)})" />
      <button class="ex-add-confirm" onclick="confirmExScreenInput(${qs(cat)})">Add</button>`;
    document.getElementById(`exs-ci-${cat}`).focus();
  }

  function confirmExScreenInput(cat) {
    const inp = document.getElementById(`exs-ci-${cat}`);
    const name = inp ? inp.value.trim() : '';
    if (!name) return;
    const lib = getExLib();
    if ((lib[cat] || []).includes(name)) { renderExScreen(); return; }
    openWizard(name, cat, 'screen');
  }


  // === JOURNEYS LIST ===
  function renderLibJourneys() {
    const el = document.getElementById('lib-journeys-inner');
    if (!el) return;
    el.classList.add('plans-list-mode');
    let html = '<div class="journey-beta-banner">🧪 Journeys is in beta — results may vary</div>';
    if (!_journeys.length && _journeyGenState !== 'loading' && _journeyGenState !== 'error') {
      html += `<div class="empty-state" style="padding-top:1.5rem">
        <span class="empty-state-emoji">🧭</span>
        <div class="empty-state-title">No Journeys Yet</div>
        Generate a personalised multi-week training journey.
      </div>`;
    } else {
      _journeys.forEach((j, ji) => {
        const total = _journeyTotalSessions(j);
        const done  = (j.completedSessions || []).length;
        const start = j.createdAt ? new Date(j.createdAt).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) : '';
        html += `<div class="plan-swipe-wrap" data-journey-id="${j.id}">
          <button class="plan-swipe-delete" onclick="_deleteJourney(${j.id})">Delete</button>
          <div class="plan-card journey-list-card" data-journey-id="${j.id}">
            <div class="plan-card-main">
              <div class="plan-card-name" style="padding-right:48px">${_esc(j.name)}</div>
              <div class="journey-card-goal">${_esc(j.goal)}</div>
              <div style="margin-top:10px">
                <span class="journey-pill">${(j.weeks || []).length} weeks</span>
                <span class="journey-pill">${_journeyDaysPerWeek(j)} days/wk</span>
              </div>
              <div style="font-size:11px;color:#8E8E93;text-align:right;margin-top:8px">${done}/${total} sessions</div>
              <div style="height:4px;background:#2C2C2E;border-radius:999px;overflow:hidden"><div style="height:100%;width:${total ? (done / total * 100) : 0}%;background:#007AFF;border-radius:999px"></div></div>
              ${start ? `<div class="plan-card-last">Started: ${start}</div>` : ''}
            </div>
            <span class="journey-ai-pill">✦ AI</span>
          </div>
        </div>`;
        /* brief success flash below the newly added (first) journey card */
        if (ji === 0 && _journeySuccessFlash) {
          html += `<div style="margin:0 var(--gutter) 10px;color:#34C759;font-size:13px;font-weight:600;text-align:center">✅ Journey ready!</div>`;
        }
      });
    }
    if (_journeyGenState === 'loading') {
      /* generating card replaces the New Journey button */
      html += `<div class="journey-gen-card">
        <span class="journey-banner-spinner"></span>
        <span style="font-size:15px;color:#fff">Journey generation in progress...</span>
      </div>`;
    } else {
      if (_journeyGenState === 'error') {
        html += `<div onclick="_retryJourneyGeneration()" style="margin:0 var(--gutter) 10px;background:#1C1C1E;border-radius:12px;padding:16px;cursor:pointer;-webkit-tap-highlight-color:transparent">
          <div style="font-size:15px;color:#fff">❌ Generation failed</div>
          <div style="font-size:13px;color:#007AFF;margin-top:4px">Tap to retry</div>
        </div>`;
      }
      html += `<button class="btn-plan-create" onclick="_openJourneyCreator()">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm.75 4.25v2.5h2.5a.75.75 0 0 1 0 1.5h-2.5v2.5a.75.75 0 0 1-1.5 0v-2.5h-2.5a.75.75 0 0 1 0-1.5h2.5v-2.5a.75.75 0 0 1 1.5 0z"/>
        </svg>
        New Journey
      </button>`;
    }
    el.innerHTML = html;
    _initJourneySwipe(el);
  }

  function _startNextJourneySession(journeyId) {
    const j = _journeys.find(x => x.id === journeyId);
    if (!j) return;
    const next = _journeyNextSession(j);
    if (!next) return;
    /* Navigate to Library → Journeys → Journey Detail with the next
       session's week expanded; the user starts it from there. */
    showTab('exercises');
    showLibSeg('journeys');
    _openJourneyDetail(journeyId, next.wi);
  }

  function _openJourneySessionPicker() {
    _renderJourneySessionPicker();
    document.getElementById('jsp-overlay').style.display = 'flex';
  }

  function _closeJourneySessionPicker() { document.getElementById('jsp-overlay').style.display = 'none'; }

  function _renderJourneySessionPicker() {
    const modal = document.getElementById('jsp-modal');
    if (!modal) return;
    const rows = [];
    _journeys.forEach(j => {
      const next = _journeyNextSession(j);
      if (!next) return;
      const exCount = (next.s.exercises || []).length;
      rows.push(`<div class="jsp-card">
        <div style="display:flex;align-items:center;gap:12px">
          <div style="flex:1;min-width:0">
            <div style="font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#8E8E93">${_esc(j.name)}</div>
            <div style="font-size:17px;font-weight:700;color:#fff;margin-top:2px">${_esc(next.s.planName || ('Session ' + (next.si+1)))}</div>
            <div style="font-size:13px;color:#8E8E93;margin-top:2px">${_esc(next.s.day || ('Session ' + (next.si+1)))} · Week ${next.week}</div>
            <div style="font-size:13px;color:#8E8E93">${exCount} exercise${exCount!==1?'s':''}</div>
          </div>
          <button onclick="_addJourneySessionToWorkout(${j.id},${next.wi},${next.si})" style="flex-shrink:0;background:#007AFF;color:#fff;border:none;border-radius:999px;padding:10px 16px;font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;-webkit-tap-highlight-color:transparent">➕ Add</button>
        </div>
      </div>`);
    });
    modal.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px">
        <div style="font-size:20px;font-weight:700;color:#fff">Add Journey Session</div>
        <button onclick="_closeJourneySessionPicker()" style="background:none;border:none;color:#8E8E93;font-size:20px;line-height:1;cursor:pointer;-webkit-tap-highlight-color:transparent">✕</button>
      </div>
      ${rows.length ? rows.join('') : '<div style="font-size:14px;color:#8E8E93;padding:8px 0 16px">No journey sessions available</div>'}
      <button onclick="_closeJourneySessionPicker()" style="width:100%;background:none;border:none;color:#8E8E93;font-family:inherit;font-size:15px;font-weight:600;padding:12px 0 0;cursor:pointer;-webkit-tap-highlight-color:transparent">Cancel</button>`;
  }

  function _addJourneySessionToWorkout(journeyId, wi, si) {
    const j = _journeys.find(x => x.id === journeyId);
    if (!j) return;
    const session = ((j.weeks || [])[wi] || {}).sessions?.[si];
    if (!session) return;
    const key = journeyId + '-' + wi + '-' + si;
    _workoutJourneyAdds.push({
      journeyId, wi, si, journeyName: j.name, key,
      exercises: (session.exercises || []).map(e => ({
        name: e.name,
        plannedSets: Math.max(1, parseInt(e.sets) || 1),
        plannedReps: parseFloat(e.reps) || 0
      }))
    });
    (session.exercises || []).forEach(e => {
      const sets = Math.max(1, parseInt(e.sets) || 1);
      createExCard(e.name, false, sets, { journeyTag: j.name, journeyKey: key, plannedSets: sets, plannedReps: parseFloat(e.reps) || 0 });
    });
    _closeJourneySessionPicker();
  }

  function _resetJourney(id) {
    _wConfirm({
      title: 'Reset journey?',
      msg: "All progress will be lost and you'll start from session 1.",
      okLabel: 'Reset', okColor: 'red',
      onOk: () => {
        const j = _journeys.find(x => x.id === id);
        if (!j) return;
        j.completedSessions = [];
        _persistJourneys();
        _renderJourneyDetail();
      }
    });
  }

  function _journeyEffectivePlanName(j, wi, s) { return s.planName || (j.name + ' · Week ' + (wi + 1)); }

  function _journeySessionDoneDate(j, wi, si) {
    if (!(j.completedSessions || []).includes(wi + '-' + si)) return null;
    /* explicit completion date (sessions completed via "add to workout") takes priority */
    const explicit = j.completedDates && j.completedDates[wi + '-' + si];
    if (explicit) return new Date(explicit).getTime();
    const s = ((j.weeks || [])[wi] || {}).sessions?.[si];
    if (!s) return null;
    const pn = _journeyEffectivePlanName(j, wi, s);
    let latest = null;
    workouts.forEach(w => { if (w.planName === pn) { const t = new Date(w.date).getTime(); if (latest === null || t > latest) latest = t; } });
    return latest;
  }

  function _fmtJDate(ms, withYear) { return ms == null ? '' : new Date(ms).toLocaleDateString('en-US', withYear ? { month:'short', day:'numeric', year:'numeric' } : { month:'short', day:'numeric' }); }

  function _initJourneySwipe(container) {
    const OPEN = 88, THRESH = 44;
    container.querySelectorAll('.journey-list-card').forEach(card => {
      let startX = 0, startY = 0, dx = 0, dragging = false, decided = false, horizontal = false;
      const isOpen = () => card.classList.contains('swiped');
      card.addEventListener('pointerdown', e => {
        startX = e.clientX; startY = e.clientY; dx = 0;
        dragging = true; decided = false; horizontal = false;
        card.style.transition = 'none';
      });
      card.addEventListener('pointermove', e => {
        if (!dragging) return;
        const mx = e.clientX - startX, my = e.clientY - startY;
        if (!decided) {
          if (Math.abs(mx) > 8 || Math.abs(my) > 8) { decided = true; horizontal = Math.abs(mx) > Math.abs(my); if (horizontal) card.setPointerCapture(e.pointerId); }
          else return;
        }
        if (!horizontal) return;
        if (e.cancelable) e.preventDefault();
        const base = isOpen() ? -OPEN : 0;
        dx = Math.max(-OPEN, Math.min(0, base + mx));
        card.style.transform = `translateX(${dx}px)`;
      });
      const end = () => { if (!dragging) return; dragging = false; card.style.transition = 'transform 0.25s ease'; if (horizontal) { card.classList.toggle('swiped', dx <= -THRESH); card.style.transform = ''; } };
      card.addEventListener('pointerup', end);
      card.addEventListener('pointercancel', end);
      card.addEventListener('click', () => {
        if (decided && horizontal) return;
        if (isOpen()) { card.classList.remove('swiped'); card.style.transform = ''; return; }
        _openJourneyDetail(Number(card.getAttribute('data-journey-id')));
      });
    });
  }

  function _deleteJourney(id) {
    _wConfirm({
      title: 'Delete this journey?',
      msg: 'All progress will be lost.',
      okLabel: 'Delete', okColor: 'red',
      onOk: () => {
        const item = document.querySelector(`[data-journey-id="${id}"]`);
        _animateRemove(item, () => { _journeys = _journeys.filter(x => x.id !== id); _persistJourneys(); renderLibJourneys(); });
      }
    });
  }

  function _deleteJourneyFromDetail(id) {
    _wConfirm({
      title: 'Delete this journey?',
      msg: 'All progress will be lost.',
      okLabel: 'Delete', okColor: 'red',
      onOk: () => {
        _journeys = _journeys.filter(x => x.id !== id);
        _persistJourneys();
        _closeJourneyDetail();
        showTab('exercises');
        showLibSeg('journeys');
      }
    });
  }

  // === JOURNEY CREATOR ===
  function _openJourneyCreator() {
    _journeyInputs = { goal: '', weeks: 8, weeksCustom: '', days: 3, daysCustom: '', duration: 60, durationCustom: '', level: 'Intermediate' };
    _renderJourneyCreator();
    document.getElementById('journey-creator').style.display = '';
  }

  function _jWeeks() { const c = parseInt(_journeyInputs.weeksCustom, 10); return (c > 0) ? c : _journeyInputs.weeks; }

  function _jDays()  { const c = parseInt(_journeyInputs.daysCustom, 10);  return (c > 0) ? c : _journeyInputs.days; }

  function _jDuration() { const c = parseInt(_journeyInputs.durationCustom, 10); return (c > 0) ? c : _journeyInputs.duration; }

  function _closeJourneyCreator() { document.getElementById('journey-creator').style.display = 'none'; }

  function _renderJourneyCreator(loading) {
    const el = document.getElementById('journey-creator-inner');
    if (!el) return;
    if (loading) {
      el.innerHTML = `<div style="text-align:center;padding:4rem 0">
        <div class="journey-spinner"></div>
        <div id="jc-loading-text" style="color:#8E8E93;font-size:15px">Generating your journey... (attempt 1/3)</div>
      </div>`;
      return;
    }
    const wk = [4,6,8,10,12], dy = [2,3,4,5], dur = [30,45,60,75,90], lv = ['Beginner','Intermediate','Advanced'];
    const wkCustom = !!_journeyInputs.weeksCustom, dyCustom = !!_journeyInputs.daysCustom, durCustom = !!_journeyInputs.durationCustom;
    el.innerHTML = `
      <div class="journey-sec-label" style="margin-top:4px">Goal</div>
      <textarea id="jc-goal" class="journey-card-input" rows="3" placeholder="What do you want to achieve?  e.g. Run 5km without stopping, First muscle-up, Increase my squat to 100kg, Lose weight and get fitter" oninput="_journeyInputs.goal=this.value;_updateJourneyGenBtn()">${_esc(_journeyInputs.goal)}</textarea>

      <div class="journey-sec-label">Timeframe</div>
      <div class="journey-chip-row" id="jc-weeks">
        ${wk.map(w => `<button class="journey-chip${(!wkCustom && _journeyInputs.weeks===w)?' active':''}" onclick="_jcPickWeeks(${w})">${w}w</button>`).join('')}
      </div>
      <input id="jc-weeks-custom" type="text" inputmode="numeric" class="journey-card-input" style="margin-top:8px;padding:12px" placeholder="Or enter custom weeks" value="${_esc(_journeyInputs.weeksCustom)}" oninput="_jcCustom('weeks',this)">

      <div class="journey-sec-label">Days per week</div>
      <div class="journey-chip-row" id="jc-days">
        ${dy.map(d => `<button class="journey-chip${(!dyCustom && _journeyInputs.days===d)?' active':''}" onclick="_jcPickDays(${d})">${d}</button>`).join('')}
      </div>
      <input id="jc-days-custom" type="text" inputmode="numeric" class="journey-card-input" style="margin-top:8px;padding:12px" placeholder="Or enter custom days" value="${_esc(_journeyInputs.daysCustom)}" oninput="_jcCustom('days',this)">

      <div class="journey-sec-label">Session Duration</div>
      <div class="journey-chip-row" id="jc-duration">
        ${dur.map(d => `<button class="journey-chip${(!durCustom && _journeyInputs.duration===d)?' active':''}" onclick="_jcPickDuration(${d})">${d}min</button>`).join('')}
      </div>
      <input id="jc-duration-custom" type="text" inputmode="numeric" class="journey-card-input" style="margin-top:8px;padding:12px" placeholder="Or enter custom minutes" value="${_esc(_journeyInputs.durationCustom)}" oninput="_jcCustom('duration',this)">

      <div class="journey-sec-label">Current level</div>
      <div class="journey-chip-row segmented-control" id="jc-level" style="position:relative;overflow:hidden;transform:translateZ(0);background:#1C1C1E;border-radius:10px;padding:4px;gap:0;box-sizing:border-box;">
        <div class="segment-pill"></div>
        ${lv.map(l => `<button class="journey-chip${_journeyInputs.level===l?' active':''}" onclick="_jcPickLevel('${l}')" style="background:none;position:relative;z-index:1;">${l}</button>`).join('')}
      </div>

      <div style="margin-top:24px">
        <button id="jc-generate" class="journey-btn-primary" onclick="_generateJourney()">✨ Generate Journey</button>
        <div id="jc-apikey-error" style="margin-top:12px"></div>
      </div>`;
    _updateJourneyGenBtn();
    requestAnimationFrame(() => {
      const seg = document.getElementById('jc-level');
      if (seg) {
        initSegmentedPill(seg);
        const p = seg.querySelector('.segment-pill');
        if (p) p.style.width = 'calc((100% - 8px) / 3)';
      }
    });
  }

  function _jcPickWeeks(w) { _journeyInputs.weeks = w; _journeyInputs.weeksCustom = ''; const el = document.getElementById('jc-weeks-custom'); if (el) el.value = ''; _syncJourneyChips('jc-weeks', w); _updateJourneyGenBtn(); }

  function _jcPickDays(d)  { _journeyInputs.days = d;  _journeyInputs.daysCustom = '';  const el = document.getElementById('jc-days-custom');  if (el) el.value = ''; _syncJourneyChips('jc-days', d);  _updateJourneyGenBtn(); }

  function _jcPickDuration(d) { _journeyInputs.duration = d; _journeyInputs.durationCustom = ''; const el = document.getElementById('jc-duration-custom'); if (el) el.value = ''; _syncJourneyChips('jc-duration', d); _updateJourneyGenBtn(); }

  function _jcPickLevel(l) {
    _journeyInputs.level = l;
    _syncJourneyChips('jc-level', l);
    const seg = document.getElementById('jc-level');
    const idx = ['Beginner','Intermediate','Advanced'].indexOf(l);
    moveSegmentedPill(seg, idx < 0 ? 0 : idx, 3);
    const p = seg && seg.querySelector('.segment-pill');
    if (p) p.style.width = 'calc((100% - 8px) / 3)';
    _updateJourneyGenBtn();
  }

  function _jcCustom(which, inp) {
    const digits = inp.value.replace(/[^0-9]/g, '');
    inp.value = digits;
    const grpId = which === 'weeks' ? 'jc-weeks' : which === 'days' ? 'jc-days' : 'jc-duration';
    if (which === 'weeks') _journeyInputs.weeksCustom = digits;
    else if (which === 'days') _journeyInputs.daysCustom = digits;
    else _journeyInputs.durationCustom = digits;
    const grp = document.getElementById(grpId);
    if (grp) {
      if (digits) grp.querySelectorAll('.journey-chip').forEach(b => b.classList.remove('active'));
      else _syncJourneyChips(grpId, which === 'weeks' ? _journeyInputs.weeks : which === 'days' ? _journeyInputs.days : _journeyInputs.duration);
    }
    _updateJourneyGenBtn();
  }

  function _updateJourneyGenBtn() {
    const btn = document.getElementById('jc-generate');
    if (!btn) return;
    const ok = !!(_journeyInputs.goal || '').trim() && _jWeeks() > 0 && _jDays() > 0 && _jDuration() > 0 && !!_journeyInputs.level;
    btn.disabled = !ok;
    btn.style.background = ok ? '#007AFF' : '#3A3A3C';
    btn.style.color = ok ? '#fff' : '#8E8E93';
    btn.style.cursor = ok ? 'pointer' : 'default';
  }

  function _showJourneyApiKeyError() {
    const c = document.getElementById('jc-apikey-error');
    if (!c) return;
    c.innerHTML = `<div style="color:#FF453A;font-size:13px;margin-bottom:6px">A Gemini API key is required to generate journeys.</div>
      <div style="color:#007AFF;font-size:14px;font-weight:600;cursor:pointer;-webkit-tap-highlight-color:transparent" onclick="_journeyGoToApiKeySettings()">Add API key in Settings →</div>`;
  }

  function _journeyGoToApiKeySettings() {
    _closeJourneyCreator();
    openSettings();
    settingsPush('settings-data');
  }

  function _syncJourneyChips(groupId, val) {
    const grp = document.getElementById(groupId);
    if (!grp) return;
    grp.querySelectorAll('.journey-chip').forEach(btn => {
      const num = btn.textContent.replace('min', '').replace('w', '');
      btn.classList.toggle('active', num == String(val) || btn.textContent == String(val));
    });
  }

  function _journeyExerciseLibText() {
    const lib = getExLib();
    const goal = (_journeyInputs.goal || '').toLowerCase();
    const inLib = name => EX_CATS.some(c => (lib[c] || []).includes(name));
    const catOf = name => { for (const c of EX_CATS) { if ((lib[c] || []).includes(name)) return c; } return 'Exercise'; };

    /* usage stats across history */
    const freq = {}, recent = new Set(), prSet = new Set();
    const recentCut = Date.now() - 28 * 86400000;   /* 4 weeks */
    workouts.forEach(w => {
      const isRecent = new Date(w.date).getTime() >= recentCut;
      (w.exercises || []).forEach(ex => {
        freq[ex.name] = (freq[ex.name] || 0) + 1;
        if (isRecent) recent.add(ex.name);
        (ex.sets || []).forEach(s => { if ((parseFloat(s.reps) || 0) > 0) prSet.add(ex.name); });
      });
    });

    /* goal keyword → relevant categories */
    const KW = {
      Pull: ['pull-up', 'muscle-up', 'pull', 'back', 'lever', 'row'],
      Push: ['push', 'handstand', 'dip', 'press', 'chest'],
      Core: ['core', 'abs', 'planche', 'lever', 'flag'],
      Legs: ['squat', 'jump', 'run', 'leg', 'pistol'],
      'Weighted/Gym': ['bench', 'deadlift', 'squat', 'barbell', 'strength', 'gym'],
      Cardio: ['run', 'cardio', 'endurance', 'cycling', 'swim'],
    };
    const cats = Object.keys(KW).filter(cat => KW[cat].some(k => goal.includes(k)));

    /* ordered, de-duplicated selection, capped at 50 */
    const ordered = [];
    const add = n => { if (inLib(n) && !ordered.includes(n)) ordered.push(n); };
    /* 1. always include exercises with a PR or trained in the last 4 weeks */
    prSet.forEach(add);
    recent.forEach(add);
    if (cats.length) {
      /* 2. logged exercises in matching categories */
      cats.forEach(cat => (lib[cat] || []).forEach(n => { if (freq[n]) add(n); }));
      /* 3. fill remaining slots from matching categories */
      cats.forEach(cat => (lib[cat] || []).forEach(add));
    } else {
      /* no keyword match → top most-frequently-used */
      Object.keys(freq).sort((a, b) => freq[b] - freq[a]).forEach(add);
    }
    const lines = ordered.slice(0, 50).map(n => `- ${n} (${catOf(n)}, difficulty ${getExMeta(n).diff}/10)`);
    return lines.join('\n') || '(none)';
  }

  function _journeyPRText() {
    const freq = {}, pr = {};
    const cutoff = Date.now() - 56 * 86400000;   /* 8 weeks */
    workouts.forEach(w => {
      if (new Date(w.date).getTime() < cutoff) return;
      (w.exercises || []).forEach(ex => {
        freq[ex.name] = (freq[ex.name] || 0) + 1;
        (ex.sets || []).forEach(s => {
          const reps = parseFloat(s.reps) || 0, kg = parseFloat(s.kg) || 0;
          const cur = pr[ex.name];
          if (!cur || kg > cur.kg || (kg === cur.kg && reps > cur.reps)) pr[ex.name] = { reps, kg };
        });
      });
    });
    const top = Object.keys(freq).sort((a, b) => freq[b] - freq[a]).slice(0, 10);
    const lines = top.map(n => {
      const p = pr[n];
      let perf = '—';
      if (p) {
        const tb = (typeof getExMeta === 'function') && !!getExMeta(n).tb;
        perf = tb ? (p.reps + 's hold') : (p.reps + ' reps' + (p.kg > 0 ? ' @ ' + p.kg + 'kg' : ''));
      }
      return `- ${n}: ${perf} (${freq[n]} sessions)`;
    });
    return lines.join('\n') || '(no recent training)';
  }

  function _journeyRecentText() {
    const cutoff = Date.now() - 14 * 86400000;   /* 2 weeks */
    const lines = [];
    workouts.forEach(w => {
      if (new Date(w.date).getTime() < cutoff) return;
      const d = new Date(w.date).toLocaleDateString('en-US', { month:'short', day:'numeric' });
      let intensity = 0;
      const exStr = (w.exercises || []).map(ex => {
        const sets = (ex.sets || []).length;
        const reps = (ex.sets || []).map(s => parseFloat(s.reps) || 0).filter(r => r > 0);
        (ex.sets || []).forEach(s => {
          const r = parseFloat(s.reps) || 0, k = parseFloat(s.kg) || 0;
          if (r > 0) intensity += (typeof calcSetIntensity === 'function' ? calcSetIntensity(ex.name, r, k) : r * (k || 1));
        });
        return `${ex.name} ${sets}x(${reps.length ? reps.join('/') : '—'} reps)`;
      }).join('; ');
      lines.push(`- ${d}${w.planName ? ' [' + w.planName + ']' : ''}: ${exStr} (intensity ${Math.round(intensity)})`);
    });
    return lines.join('\n') || '(no sessions in last 4 weeks)';
  }

  // === GEMINI API ===
  function _buildJourneyPrompt() {
    const i = _journeyInputs;
    const weeks = _jWeeks(), days = _jDays(), duration = _jDuration();
    return `You are an elite personal trainer and strength coach with deep expertise in calisthenics, weightlifting, and athletic development. You create highly specific, science-based training journeys tailored to the individual.

USER PROFILE:
- Goal: ${i.goal}
- Timeframe: ${weeks} weeks
- Training days per week: ${days} days
- Session duration: ${duration} minutes
- Current level: ${i.level}

USER'S CURRENT PERFORMANCE (personal records):
${_journeyPRText()}

USER'S RECENT TRAINING (last 4 weeks):
${_journeyRecentText()}

USER'S EXERCISE LIBRARY:
${_journeyExerciseLibText()}

COACHING INSTRUCTIONS:
1. Analyse the user's current performance data carefully before designing the journey — start from their actual level, not a generic baseline
2. Design progressive overload week by week — each week must be harder than the last in a specific, measurable way (more reps, more sets, harder variation, less rest)
3. Every session must have a clear focus and purpose — no generic 'full body' sessions without specific targets
4. Include specific coaching notes for each exercise explaining exactly what to focus on, common mistakes to avoid, and what good form feels like
5. Balance volume and recovery — do not programme the same muscle groups on consecutive days
6. Prioritise exercises from the user's library — only suggest exercises outside the library if essential for the goal
7. For calisthenics goals: include skill progressions, not just volume work — e.g. for muscle-up goal include transition drills, false grip work, straight arm strength
8. For strength goals: include periodisation — not every week at max intensity, include deload weeks
9. Session duration must be respected — calculate realistic sets, reps and rest periods that fit within ${duration} minutes
10. Week 1 must be achievable at the user's current level — do not start too hard

RESPONSE FORMAT:
Respond ONLY with a valid JSON object, no markdown, no backticks, no explanation text before or after. Use this exact structure:
{
  "name": "Specific descriptive journey name",
  "goal": "Detailed goal description",
  "weeks": [
    {
      "week": 1,
      "focus": "Specific week focus with measurable target",
      "sessions": [
        {
          "day": "Monday",
          "planName": "Specific session name describing the focus",
          "duration": ${duration},
          "exercises": [
            {
              "name": "Exercise name from library",
              "sets": 4,
              "reps": 6,
              "rest": 90,
              "notes": "Specific coaching cue: what to focus on, what good form feels like, common mistake to avoid"
            }
          ]
        }
      ]
    }
  ]
}`;
  }

  function _generateJourney() {
    const goal = (_journeyInputs.goal || '').trim();
    if (!goal) return;
    const errC = document.getElementById('jc-apikey-error');
    if (errC) errC.innerHTML = '';
    const key = localStorage.getItem('geminiApiKey');
    if (!key) { _openApiKeyGuide(); return; }

    _journeyGenPrompt = _buildJourneyPrompt();
    _closeJourneyCreator();        /* free the UI immediately */
    _runJourneyGeneration();       /* fire-and-forget background process */
  }

  function _retryJourneyGeneration() {
    if (_journeyGenPrompt == null) _journeyGenPrompt = _buildJourneyPrompt();
    _runJourneyGeneration();
  }

  function _setJourneyHeaderSpinner(on) {
    const s = document.getElementById('journey-header-spinner');
    if (s) s.style.display = on ? 'block' : 'none';
  }

  async function _runJourneyGeneration() {
    const key = localStorage.getItem('geminiApiKey');
    if (!key) { _journeyGenState = 'error'; renderLibJourneys(); return; }
    _journeyGenState = 'loading';
    _journeySuccessFlash = false;
    _setJourneyHeaderSpinner(true);
    renderLibJourneys();
    const geminiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=' + key;
    const prompt = _journeyGenPrompt;
    const MAX_ATTEMPTS = 3, TIMEOUT_MS = 60000, RETRY_DELAY_MS = 5000;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      try {
        const response = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [ { parts: [ { text: prompt } ] } ] }),
          signal: controller.signal
        });
        clearTimeout(timer);

        const responseData = await response.json();
        console.log('Gemini response status:', response.status);
        console.log('Gemini response:', JSON.stringify(responseData).substring(0, 200));

        if (!response.ok) {
          /* Retry only on 503 (service unavailable); fail immediately otherwise */
          if (response.status === 503 && attempt < MAX_ATTEMPTS) {
            await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
            continue;
          }
          throw new Error('API returned ' + response.status + ': ' + JSON.stringify(responseData));
        }

        const rawText = responseData.candidates[0].content.parts[0].text;
        console.log('Raw Gemini response:', rawText.substring(0, 500));

        // Clean the response
        let cleanText = rawText
          .replace(/```json/g, '')
          .replace(/```/g, '')
          .trim();

        // Extract JSON object
        const firstBrace = cleanText.indexOf('{');
        const lastBrace = cleanText.lastIndexOf('}');
        if (firstBrace === -1 || lastBrace === -1) {
          throw new Error('No JSON object found in response');
        }
        cleanText = cleanText.substring(firstBrace, lastBrace + 1);

        const journey = JSON.parse(cleanText);
        if (!journey || !Array.isArray(journey.weeks) || !journey.weeks.length) throw new Error('Could not parse journey from response');
        /* save the generated journey so it appears in the list automatically */
        _journeys.unshift({
          id: Date.now(),
          name: journey.name || 'My Journey',
          goal: journey.goal || _journeyInputs.goal,
          weeks: journey.weeks || [],
          createdAt: new Date().toISOString(),
          completedSessions: []
        });
        _persistJourneys();
        _journeyGenState = null;
        _journeySuccessFlash = true;
        _setJourneyHeaderSpinner(false);
        renderLibJourneys();
        clearTimeout(_journeyFlashTimer);
        _journeyFlashTimer = setTimeout(() => { _journeySuccessFlash = false; renderLibJourneys(); }, 3000);
        return;
      } catch (err) {
        clearTimeout(timer);
        const msg = (err && err.name === 'AbortError') ? 'Request timed out after 60s' : (err && err.message ? err.message : 'unknown error');
        console.log('Gemini attempt ' + attempt + ' failed:', msg);
        _journeyGenState = 'error';
        _setJourneyHeaderSpinner(false);
        renderLibJourneys();
        return;
      }
    }
          sessionDuration: _jDuration(),
  }

  function _parseJourneyJSON(text) {
    if (!text) return null;
    let t = text.trim().replace(/^```(json)?/i, '').replace(/```$/, '').trim();
    const a = t.indexOf('{'), b = t.lastIndexOf('}');
    if (a >= 0 && b > a) t = t.slice(a, b + 1);
    try { return JSON.parse(t); } catch(e) { return null; }
  }

  function _openJourneyPreview() {
    _journeyWeekOpen = {};
    _renderJourneyPreview();
    document.getElementById('journey-preview').style.display = '';
  }

  function _closeJourneyPreview() { document.getElementById('journey-preview').style.display = 'none'; }

  function _journeyWeeksHTML(journey, keyPrefix, mode) {
    const completed = journey.completedSessions || [];
    return (journey.weeks || []).map((w, wi) => {
      const open = !!_journeyWeekOpen[keyPrefix + wi];
      const sess = (w.sessions || []);
      let body;
      if (mode === 'detail') {
        const next = _journeyNextSession(journey);
        body = sess.map((s, si) => {
          const exCount = (s.exercises || []).length;
          const done = completed.includes(wi + '-' + si);
          const isCurrent = !!next && next.wi === wi && next.si === si;
          const locked = !done && !isCurrent;
          const doneDate = done ? _fmtJDate(_journeySessionDoneDate(journey, wi, si), true) : '';
          const cardStyle = (isCurrent ? 'background:#1A3A5C;' : '') + (locked ? 'opacity:.5;cursor:default;' : '');
          const tap = locked ? '' : `onclick="_openJourneySession(${journey.id},${wi},${si})"`;
          let bottom = '';
          if (done) {
            bottom = `<div style="font-size:12px;color:#34C759;margin-top:2px">✓ Done${doneDate ? ' · ' + doneDate : ''}</div>
              <div style="display:flex;justify-content:flex-end;margin-top:8px"><button class="journey-start-btn" onclick="event.stopPropagation();_startJourneySession(${journey.id},${wi},${si})">▶ Repeat Session</button></div>`;
          } else if (isCurrent) {
            bottom = `<div style="display:flex;justify-content:flex-end;margin-top:8px"><button class="journey-start-btn" onclick="event.stopPropagation();_startJourneySession(${journey.id},${wi},${si})">▶ Start Session</button></div>`;
          }
          return `<div class="journey-session-card" style="${cardStyle}" ${tap}>
            <div style="display:flex;align-items:center;gap:8px">
              ${done ? '<span style="color:#34C759;font-weight:700">✓</span>' : ''}
              <span style="flex:1;font-size:14px;font-weight:700;color:${done ? '#8E8E93' : '#fff'}">${_esc(s.day || ('Session ' + (si+1)))} · ${_esc(s.planName || '')}</span>
            </div>
            <div style="font-size:12px;color:#8E8E93;margin-top:2px">${exCount} exercise${exCount!==1?'s':''}${durTxt}</div>
            ${bottom}
          </div>`;
        }).join('');
      } else {
        body = sess.map((s, si) =>
          `<div style="padding:10px 0;font-size:14px;color:#fff;${si > 0 ? 'border-top:.5px solid #2C2C2E' : ''}">${_esc(s.day || ('Session ' + (si+1)))} · ${_esc(s.planName || '')}</div>`
        ).join('');
      }
      const doneCount = sess.filter((_, si) => completed.includes(wi + '-' + si)).length;
      const rightStatus = mode === 'detail'
        ? `<span style="font-size:13px;color:#8E8E93;margin-right:8px">${doneCount}/${sess.length}</span>`
          const actualSecs = done ? ((journey.completedDurations || {})[wi + '-' + si] || 0) : 0;
          const durTxt = actualSecs > 0 ? ' · ' + Math.max(1, Math.round(actualSecs / 60)) + ' min'
            : (!done && journey.sessionDuration > 0 ? ' · ~' + journey.sessionDuration + ' min' : '');
        : '';
      let weekStatus = '';
      if (mode === 'detail' && doneCount > 0) {
        if (doneCount === sess.length) {
          weekStatus = `<span style="display:block;font-size:12px;color:#34C759;margin-top:2px">✓ Complete</span>`;
        } else {
          let last = null;
          sess.forEach((_, si) => { const d = _journeySessionDoneDate(journey, wi, si); if (d != null && (last == null || d > last)) last = d; });
          if (last != null) weekStatus = `<span style="display:block;font-size:12px;color:#8E8E93;margin-top:2px">Last done: ${_fmtJDate(last, false)}</span>`;
        }
      }
      return `<div class="journey-week${open ? ' open' : ''}" id="${keyPrefix}${wi}">
        <button class="journey-week-head" onclick="_toggleJourneyWeek('${keyPrefix}',${wi})">
          <span style="text-align:left;flex:1;min-width:0">
            <span style="font-size:17px;font-weight:700;color:#fff">Week ${w.week || (wi+1)}</span>
            <span style="display:block;font-size:13px;color:#8E8E93;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${_esc(w.focus || '')}</span>
            ${weekStatus}
          </span>
          <span style="display:flex;align-items:center;flex-shrink:0">${rightStatus}<span class="journey-week-chev"><svg width="9" height="14" viewBox="0 0 8 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1,1 7,7 1,13"/></svg></span></span>
        </button>
        <div class="journey-week-body">${body}</div>
      </div>`;
    }).join('');
  }

  function _toggleJourneyWeek(prefix, wi) {
    _journeyWeekOpen[prefix + wi] = !_journeyWeekOpen[prefix + wi];
    const card = document.getElementById(prefix + wi);
    if (card) card.classList.toggle('open');
  }

  function _renderJourneyPreview() {
    const el = document.getElementById('journey-preview-inner');
    if (!el || !_journeyPreview) return;
    const j = _journeyPreview;
    el.innerHTML = `
      <div style="font-size:24px;font-weight:700;color:#fff;letter-spacing:-.4px">${_esc(j.name)}</div>
      <div class="journey-ai-badge" style="margin-top:4px">✨ AI Generated</div>
      <div style="font-size:14px;color:#8E8E93;margin-top:4px;margin-bottom:8px">${_esc(j.goal)}</div>
      <div style="margin-bottom:8px">
        <span class="journey-pill">${(j.weeks||[]).length} weeks</span>
        <span class="journey-pill">${_journeyDaysPerWeek(j)} days/wk</span>
      </div>
      <div class="journey-sec-label">Plan</div>
      ${_journeyWeeksHTML(j, 'pvw', 'preview')}
      <div class="journey-preview-bar">
        <button class="jpb-regen" onclick="_regenerateJourney()">Regenerate</button>
        <button class="jpb-save" onclick="_saveJourney()">Save Journey</button>
      </div>`;
  }

  async function _regenerateJourney() {
    _closeJourneyPreview();
    document.getElementById('journey-creator').style.display = '';
    await _generateJourney();
  }

  function _saveJourney() {
    if (!_journeyPreview) return;
    const j = {
      id: Date.now(),
      name: _journeyPreview.name || 'My Journey',
      goal: _journeyPreview.goal || _journeyInputs.goal,
      weeks: _journeyPreview.weeks || [],
      createdAt: new Date().toISOString(),
      completedSessions: []
    };
    _journeys.unshift(j);
    _persistJourneys();
    _journeyPreview = null;
    _closeJourneyPreview();
    renderLibJourneys();
  }

  // === JOURNEY DETAIL ===
  function _openJourneyDetail(id, expandWeekIdx) {
    _journeyDetailId = id;
    _journeyWeekOpen = {};
    if (expandWeekIdx != null) _journeyWeekOpen['dtw' + expandWeekIdx] = true;
    _renderJourneyDetail();
    document.getElementById('journey-detail').style.display = '';
  }

  function _closeJourneyDetail() { document.getElementById('journey-detail').style.display = 'none'; }

  function _renderJourneyDetail() {
    const el = document.getElementById('journey-detail-inner');
    const j = _journeys.find(x => x.id === _journeyDetailId);
    if (!el || !j) return;
    const total = _journeyTotalSessions(j), done = (j.completedSessions || []).length;
    const pct = total ? Math.round(done / total * 100) : 0;
    el.innerHTML = `
      sessionDuration: _jDuration(),
      <div style="font-size:24px;font-weight:700;color:#fff;letter-spacing:-.4px">${_esc(j.name)}</div>
      <div class="journey-ai-badge" style="margin-top:4px">✨ AI Generated</div>
      <div style="font-size:14px;color:#8E8E93;margin-top:4px">${_esc(j.goal)}</div>
      <div style="margin-top:12px;background:#1C1C1E;border-radius:12px;padding:16px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <span style="font-size:13px;color:#8E8E93">${done} / ${total} sessions completed</span>
          <span style="font-size:13px;color:#fff;font-weight:600">${pct}%</span>
        </div>
        <div style="height:8px;background:#2C2C2E;border-radius:4px;overflow:hidden"><div style="height:100%;width:${pct}%;background:#007AFF"></div></div>
      </div>
      <div class="journey-sec-label">Weeks</div>
      ${_journeyWeeksHTML(j, 'dtw', 'detail')}
      <button onclick="_resetJourney(${j.id})" style="display:block;width:100%;background:none;border:none;color:#FF3B30;font-family:inherit;font-size:15px;font-weight:600;text-align:center;padding:20px 0 8px;cursor:pointer;-webkit-tap-highlight-color:transparent">Reset Journey</button>
      <button onclick="_deleteJourneyFromDetail(${j.id})" style="display:block;width:100%;background:none;border:none;color:#FF3B30;font-family:inherit;font-size:15px;font-weight:600;text-align:center;padding:8px 0 4px;cursor:pointer;-webkit-tap-highlight-color:transparent">Delete Journey</button>`;
  }

  function _openJourneySession(journeyId, wi, si) {
    _journeySessionRef = { id: journeyId, w: wi, s: si };
    _renderJourneySession();
    document.getElementById('journey-session').style.display = '';
  }

  function _closeJourneySession() { document.getElementById('journey-session').style.display = 'none'; }

  function _renderJourneySession() {
    const r = _journeySessionRef;
    const j = _journeys.find(x => x.id === (r && r.id));
    if (!j) return;
    const w = (j.weeks || [])[r.w] || {};
    const s = (w.sessions || [])[r.s];
    if (!s) return;
    const titleEl = document.getElementById('journey-session-title');
    if (titleEl) titleEl.textContent = s.planName || (s.day || 'Session');
    const exHTML = (s.exercises || []).map(ex => `
      <div style="background:#1C1C1E;border-radius:12px;padding:16px;margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;gap:10px;align-items:baseline">
          <span style="font-size:16px;font-weight:700;color:#fff">${_esc(ex.name)}</span>
          <span style="font-size:14px;color:#007AFF;white-space:nowrap">${ex.sets || 3} × ${ex.reps != null ? ex.reps : '—'}</span>
        </div>
        ${ex.notes ? `<div style="font-size:13px;font-style:italic;color:#8E8E93;margin-top:6px">${_esc(ex.notes)}</div>` : ''}
      </div>`).join('');
    const doneMs = _journeySessionDoneDate(j, r.w, r.s);
    const isDone = doneMs != null || (j.completedSessions || []).includes(r.w + '-' + r.s);
    const el = document.getElementById('journey-session-inner');
    el.innerHTML = `
      <div style="font-size:13px;color:#8E8E93;margin-bottom:12px">Week ${w.week || (r.w+1)} · ${_esc(s.day || ('Session ' + (r.s+1)))}</div>
      ${isDone ? `<div style="font-size:13px;color:#34C759;margin-bottom:12px">✓ Completed${doneMs != null ? ' on ' + _fmtJDate(doneMs, true) : ''}</div>` : ''}
      ${exHTML}
      <div class="journey-sticky">
        <button class="journey-btn-primary" style="flex:1" onclick="_startJourneySession(${j.id},${r.w},${r.s})">▶ ${isDone ? 'Repeat' : 'Start'} Session</button>
      </div>`;
  }

  function _exInLibrary(name) {
    const lib = getExLib();
    return EX_CATS.some(c => (lib[c] || []).includes(name));
  }

  function _startJourneySession(journeyId, wi, si) {
    const j = _journeys.find(x => x.id === journeyId);
    if (!j) return;
    const session = ((j.weeks || [])[wi] || {}).sessions?.[si];
    if (!session) return;
    const normEx = (session.exercises || []).map(e => ({ name: e.name, sets: Math.max(1, parseInt(e.sets) || 3) }));
    if (!normEx.length) return;
    const planName = session.planName || (j.name + ' · Week ' + (wi+1));
    /* Check every exercise against the library before starting */
    if (normEx.some(e => !_exInLibrary(e.name))) {
      _journeyStartCtx = { journeyId, wi, si, planName, exercises: normEx.map(e => ({ name: e.name, sets: e.sets })), addName: null, addDiff: 5 };
      _renderUnknownExModal();
      document.getElementById('journey-unknown-modal').style.display = '';
      return;
    }
    _beginJourneyWorkout(journeyId, wi, si, planName, normEx);
  }

  function _guessCategory(name) {
    const n = (name || '').toLowerCase();
    if (/stretch|pose|splits|circle|foam|cat cow|dislocate|\bbridge\b|down dog|up dog|mobility|deep squat hold/.test(n)) return 'Mobility';
    if (/run|sprint|cycl|rowing|row machine|\berg\b|jump rope|burpee|assault bike|elliptical|walk|hik|hiit|tabata|stair|jumping jack|battle rope|mountain climber|high knee/.test(n)) return 'Cardio';
    if (/squat|lunge|\bleg\b|calf|glute|hip thrust|pistol|deadlift|hamstring|quad|step-up|box jump|nordic|bound|wall sit/.test(n)) return 'Legs';
    if (/pull|\brow\b|rows|chin|lever|muscle-up|lat pulldown|skin the cat|german hang/.test(n)) return 'Pull';
    if (/plank|\babs?\b|hollow|l-sit|v-sit|dragon|sit-up|leg raise|toes to bar|flag|hanging|pallof|windshield/.test(n)) return 'Core';
    if (/bench|barbell|dumbbell|cable|kettlebell|machine|weighted|preacher|skull crusher/.test(n)) return 'Weighted/Gym';
    if (/press|push|dip|handstand|planche|tricep|chest|\bfly\b|delt/.test(n)) return 'Push';
    return 'Push';
  }

  function _renderUnknownExModal() {
    const ctx = _journeyStartCtx;
    const el = document.getElementById('journey-unknown-inner');
    if (!ctx || !el) return;
    const unknown = ctx.exercises.filter(e => !_exInLibrary(e.name));
    const cards = unknown.map(e => {
      const adding = ctx.addName === e.name;
      const stepper = adding ? `
        <div style="display:flex;align-items:center;gap:12px;margin-top:10px">
          <button class="journey-chip" style="flex:0 0 44px;padding:8px 0" onclick="_journeyAddStep(-1)">−</button>
          <span style="font-size:16px;font-weight:700;color:#fff;min-width:36px;text-align:center">~${ctx.addDiff}</span>
          <button class="journey-chip" style="flex:0 0 44px;padding:8px 0" onclick="_journeyAddStep(1)">+</button>
          <button class="journey-btn-primary" style="flex:1;padding:9px 0;font-size:13px" onclick="_journeyAddConfirm(${qs(e.name)})">Add at ~${ctx.addDiff}</button>
        </div>` : `
        <div style="display:flex;gap:10px;margin-top:10px">
          <button class="journey-chip" style="flex:1;color:#fff" onclick="_journeyAddStart(${qs(e.name)})">➕ Add to Library</button>
          <button class="journey-chip" style="flex:1;color:#fff" onclick="_journeyReplace(${qs(e.name)})">🔄 Replace</button>
        </div>`;
      return `<div style="background:#1C1C1E;border-radius:12px;padding:16px;margin-bottom:10px">
        <div style="font-size:16px;font-weight:700;color:#fff">${_esc(e.name)}</div>
        ${stepper}
      </div>`;
    }).join('');
    const canContinue = unknown.length === 0;
    el.innerHTML = `
      <div style="font-size:20px;font-weight:700;color:#fff">Unknown Exercises</div>
      <div style="font-size:13px;color:#8E8E93;margin-top:4px;margin-bottom:16px">These exercises aren't in your library yet</div>
      ${cards || '<div style="font-size:14px;color:#34C759;margin-bottom:12px">✓ All exercises resolved</div>'}
      <div class="journey-sticky">
        <button class="journey-btn-ghost" style="flex:1" onclick="_journeyStartCancel()">Cancel</button>
        <button class="journey-btn-primary" style="flex:2;${canContinue ? '' : 'background:#3A3A3C;color:#8E8E93'}" ${canContinue ? '' : 'disabled'} onclick="_journeyStartContinue()">Continue</button>
      </div>`;
  }

  function _journeyAddStart(name) { _journeyStartCtx.addName = name; _journeyStartCtx.addDiff = 5; _renderUnknownExModal(); }

  function _journeyAddStep(delta) { _journeyStartCtx.addDiff = Math.min(10, Math.max(1, _journeyStartCtx.addDiff + delta)); _renderUnknownExModal(); }

  function _journeyAddConfirm(name) {
    const cat = _guessCategory(name);
    const type = cat === 'Weighted/Gym' ? 'w' : 'bw';
    const lib = getExLib();
    if (!lib[cat]) lib[cat] = [];
    if (!lib[cat].includes(name)) lib[cat].push(name);
    setExLib(lib);
    const meta = getCustomMeta();
    meta[name] = { type, diff: _journeyStartCtx.addDiff, verified: false };
    setCustomMeta(meta);
    _journeyStartCtx.addName = null;
    _renderUnknownExModal();
  }

  async function _journeyReplace(name) {
    const picked = await openExPicker();
    if (!picked) return;
    _journeyStartCtx.exercises = _journeyStartCtx.exercises.map(e => e.name === name ? { name: picked, sets: e.sets } : e);
    _renderUnknownExModal();
  }

  function _journeyStartCancel() { document.getElementById('journey-unknown-modal').style.display = 'none'; }

  function _journeyStartContinue() {
    const ctx = _journeyStartCtx;
    if (!ctx) return;
    if (ctx.exercises.some(e => !_exInLibrary(e.name))) return;
    document.getElementById('journey-unknown-modal').style.display = 'none';
    _beginJourneyWorkout(ctx.journeyId, ctx.wi, ctx.si, ctx.planName, ctx.exercises.map(e => ({ name: e.name, sets: e.sets })));
  }

  function showLibSeg(seg) {
    _libSeg = seg;
    const exBtn   = document.getElementById('lib-seg-exercises');
    const plBtn   = document.getElementById('lib-seg-plans');
    const jnBtn   = document.getElementById('lib-seg-journeys');
    exBtn?.classList.toggle('active', seg === 'exercises');
    plBtn?.classList.toggle('active', seg === 'plans');
    jnBtn?.classList.toggle('active', seg === 'journeys');
    /* shared sliding-pill highlight */
    const _segIdx = seg === 'exercises' ? 0 : seg === 'plans' ? 1 : 2;
    moveSegmentedPill(document.getElementById('lib-seg'), _segIdx, 3);
    document.getElementById('lib-exercises-content').style.display = seg === 'exercises' ? '' : 'none';
    document.getElementById('lib-plans-content').style.display     = seg === 'plans'     ? '' : 'none';
    document.getElementById('lib-journeys-content').style.display  = seg === 'journeys'  ? '' : 'none';
    if (seg === 'exercises') renderExScreen();
    if (seg === 'plans')     renderLibPlans();
    if (seg === 'journeys')  renderLibJourneys();
  }

  // === TRAINING PLANS ===
  function renderLibPlans() {
    const el = document.getElementById('lib-plans-inner');
    if (!el) return;
    const nav = document.querySelector('.tab-bar');
    if (_plansMode === 'editor') {
      if (nav) nav.style.display = 'none';          /* hide bottom nav on plan detail/config */
      el.classList.remove('plans-list-mode');
      _renderPlanEditor(el);
    } else {
      if (nav) nav.style.display = '';              /* restore bottom nav back on the list */
      _plansMode = 'list';
      el.classList.add('plans-list-mode');
      _renderPlanList(el);
    }
  }

  function _renderPlanList(el) {
    let html = '';
    if (!plans.length) {
      html += `<div class="empty-state" style="padding-top:1.5rem">
        <span class="empty-state-emoji">📋</span>
        <div class="empty-state-title">No Plans Yet</div>
        Create a training plan to structure your workouts.
      </div>`;
    } else {
      plans.forEach(plan => {
        const subs = plan.exercises.map(e => _normPlanEx(e).name).join(' · ');
        const last = _planLastTrained(plan.name);
        const lastStr = last
          ? 'Last trained: ' + new Date(last).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          : 'Never trained';
        html += `<div class="plan-swipe-wrap" data-plan-id="${plan.id}">
          <button class="plan-swipe-delete" onclick="deletePlan(${plan.id})">Delete</button>
          <div class="plan-card" data-plan-id="${plan.id}">
            <div class="plan-card-main">
              <div class="plan-card-name">${plan.name}</div>
              <div class="plan-card-subs">${subs || 'No exercises'}</div>
              <div class="plan-card-last">${lastStr}</div>
            </div>
          </div>
        </div>`;
      });
    }
    html += `<button class="btn-plan-create" onclick="openPlanEditor()">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm.75 4.25v2.5h2.5a.75.75 0 0 1 0 1.5h-2.5v2.5a.75.75 0 0 1-1.5 0v-2.5h-2.5a.75.75 0 0 1 0-1.5h2.5v-2.5a.75.75 0 0 1 1.5 0z"/>
      </svg>
      New Plan
    </button>`;
    el.innerHTML = html;
    _initPlanSwipe(el);
  }

  function _planLastTrained(planName) {
    let latest = null;
    workouts.forEach(w => {
      if (w.planName !== planName) return;
      const t = new Date(w.date).getTime();
      if (latest === null || t > latest) latest = t;
    });
    return latest;
  }

  function _initPlanSwipe(container) {
    const OPEN = 88, THRESH = 44;
    container.querySelectorAll('.plan-card').forEach(card => {
      let startX = 0, startY = 0, dx = 0, dragging = false, decided = false, horizontal = false;
      const isOpen = () => card.classList.contains('swiped');

      card.addEventListener('pointerdown', e => {
        if (e.target.closest('.plan-card-edit')) return;
        startX = e.clientX; startY = e.clientY; dx = 0;
        dragging = true; decided = false; horizontal = false;
        card.style.transition = 'none';
      });
      card.addEventListener('pointermove', e => {
        if (!dragging) return;
        const mx = e.clientX - startX, my = e.clientY - startY;
        if (!decided) {
          if (Math.abs(mx) > 8 || Math.abs(my) > 8) {
            decided = true;
            horizontal = Math.abs(mx) > Math.abs(my);
            if (horizontal) card.setPointerCapture(e.pointerId);
          } else return;
        }
        if (!horizontal) return;
        if (e.cancelable) e.preventDefault();
        const base = isOpen() ? -OPEN : 0;
        dx = Math.max(-OPEN, Math.min(0, base + mx));
        card.style.transform = `translateX(${dx}px)`;
      });
      const end = () => {
        if (!dragging) return;
        dragging = false;
        card.style.transition = 'transform 0.25s ease';
        if (horizontal) {
          card.classList.toggle('swiped', dx <= -THRESH);
          card.style.transform = '';
        }
      };
      card.addEventListener('pointerup', end);
      card.addEventListener('pointercancel', end);

      card.addEventListener('click', e => {
        if (e.target.closest('.plan-card-edit')) return;
        if (decided && horizontal) return;         /* was a swipe, not a tap */
        if (isOpen()) { card.classList.remove('swiped'); card.style.transform = ''; return; }
        openPlanEditorForId(Number(card.getAttribute('data-plan-id')));
      });
    });
  }

  function _normPlanEx(e) {
    return (typeof e === 'string') ? { name: e, sets: 3 } : { name: e.name, sets: e.sets || 3 };
  }

  // === PLAN CONFIG ===
  function _renderPlanEditor(el) {
    const exItems = (_planDraft.exercises || []).map((raw, i) => {
      const ex = _normPlanEx(raw);
      return `
      <div class="plan-ex-item" data-idx="${i}">
        <span class="plan-ex-handle" title="Drag to reorder">≡</span>
        <span class="plan-ex-num">${i + 1}</span>
        <span class="plan-ex-name-lbl">${ex.name}</span>
        <div class="plan-ex-stepper">
          <button class="plan-ex-stepper-btn" onclick="planEditorStepSets(${i},-1)">−</button>
          <span class="plan-ex-stepper-val" id="plan-ex-sets-${i}">${ex.sets}</span>
          <button class="plan-ex-stepper-btn" onclick="planEditorStepSets(${i},+1)">+</button>
        </div>
        <button class="plan-ex-del" onclick="planEditorRemoveEx(${i})" title="Remove">×</button>
      </div>`;
    }).join('');

    const chevSVG = '<span class="plan-collapse-chev"><svg width="9" height="14" viewBox="0 0 8 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1,1 7,7 1,13"/></svg></span>';

    /* 1. Plan name — always visible, editable inline */
    const nameCard = `
      <div class="plan-collapse-card">
        <input id="plan-name-input" type="text"
          placeholder="Plan name"
          value="${(_planDraft.name || '').replace(/"/g, '&quot;')}"
          oninput="_planDraft.name = this.value"
          style="width:100%;background:none;border:none;outline:none;color:#fff;font-family:inherit;font-size:24px;font-weight:700;letter-spacing:-.4px;padding:0;box-sizing:border-box;" />
        <div style="font-size:12px;color:#8E8E93;margin-top:4px;">Plan Name</div>
      </div>`;

    /* 2. Intensity trend — always visible. Shared sliding-pill selector. */
    const horizons = ['1M','3M','6M','1Y','2Y'];
    let segHTML = '<div id="plan-int-seg" class="segmented-control" style="display:flex;position:relative;overflow:hidden;transform:translateZ(0);background:#1C1C1E;border-radius:10px;padding:3px 4px;height:36px;box-sizing:border-box;margin-bottom:12px;">';
    segHTML += '<div class="segment-pill"></div>';
    horizons.forEach(h => {
      const active = h === _planIntHorizon;
      segHTML += `<button class="${active ? 'active' : ''}" onclick="_planSetIntHorizon('${h}')" style="flex:1;min-width:0;position:relative;z-index:1;height:100%;padding:0;border:none;border-radius:8px;font-size:14px;font-weight:${active?'700':'600'};font-family:inherit;cursor:pointer;background:none;color:${active?'#fff':'#8E8E93'};">${h}</button>`;
    });
    segHTML += '</div>';

    const intensitySection = `
      <div class="plan-collapse-card">
        <div class="plan-collapse-title" style="margin-bottom:12px;">Intensity Trend</div>
        ${segHTML}
        <div class="chart-scroll"><canvas id="plan-int-canvas" style="display:block;width:100%;height:200px;"></canvas></div>
      </div>`;

    /* 3. Edit plan — collapsible, collapsed by default */
    const editSection = `
      <div class="plan-collapse-card${_planEditExpanded ? ' open' : ''}" id="plan-edit-card">
        <button class="plan-collapse-head" onclick="_planToggleSection('edit')">
          <span class="plan-collapse-title">Edit Plan</span>
          ${chevSVG}
        </button>
        <div class="plan-collapse-body"><div class="plan-collapse-inner">
          <div class="plan-ex-list" id="plan-ex-list">${exItems}</div>
          <button class="btn-plan-add-ex" onclick="planEditorAddEx()">
            <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm.75 4.25v2.5h2.5a.75.75 0 0 1 0 1.5h-2.5v2.5a.75.75 0 0 1-1.5 0v-2.5h-2.5a.75.75 0 0 1 0-1.5h2.5v-2.5a.75.75 0 0 1 1.5 0z"/>
            </svg>
            Add Exercise
          </button>
        </div></div>
      </div>`;

    /* 4. Sticky bottom bar */
    const stickyBar = `
      <div class="plan-sticky-bar">
        <button class="plan-sticky-cancel" onclick="_plansMode='list';_planDraft=null;renderLibPlans()">Cancel</button>
        <button class="plan-sticky-save" onclick="savePlan()">Save Changes</button>
      </div>`;

    el.innerHTML = `<div class="plan-editor plan-editor-with-bar">
      ${nameCard}
      ${intensitySection}
      ${editSection}
    </div>${stickyBar}`;
    /* Wire drag-and-drop after DOM is written */
    const planList = document.getElementById('plan-ex-list');
    if (planList) _planInitDrag(planList);
    /* Draw the intensity trend chart */
    requestAnimationFrame(() => {
      const canvas = document.getElementById('plan-int-canvas');
      if (canvas && typeof _drawTrendChart === 'function') {
        _drawTrendChart(canvas, _planIntSessions(), function(x){ return x.totalInt; }, 200, _planIntHorizon);
      }
      const seg = document.getElementById('plan-int-seg');
      if (seg) {
        initSegmentedPill(seg);
        const p = seg.querySelector('.segment-pill');
        if (p) p.style.width = 'calc((100% - 8px) / ' + horizons.length + ')';
      }
    });
  }

  function _planToggleSection(which) {
    if (which === 'int') _planIntExpanded = !_planIntExpanded;
    else                 _planEditExpanded = !_planEditExpanded;
    const card = document.getElementById(which === 'int' ? 'plan-int-card' : 'plan-edit-card');
    if (card) card.classList.toggle('open');
  }

  function _planSetIntHorizon(h) {
    _planIntHorizon = h;
    renderLibPlans();
  }

  function _planIntSessions() {
    const planName = (_planDraft && _planDraft.name) || '';
    const out = [];
    workouts.forEach(w => {
      if (!w.planName || w.planName !== planName) return;
      let totalInt = 0;
      (w.exercises || []).forEach(ex => {
        (ex.sets || []).forEach(s => {
          const r = parseFloat(s.reps) || 0, k = parseFloat(s.kg) || 0;
          if (r > 0) totalInt += (typeof calcSetIntensity === 'function' ? calcSetIntensity(ex.name, r, k) : r * (k || 1));
        });
      });
      out.push({ date: w.date, totalInt });
    });
    return out.reverse();
  }

  function openPlanEditor() {
    _plansMode = 'editor';
    _planDraft = { name: '', exercises: [] };
    _planIntExpanded = false;      /* no history for a new plan */
    _planEditExpanded = true;      /* new plan needs the editor to add exercises */
    _planIntHorizon = '3M';
    renderLibPlans();
  }

  function openPlanEditorForId(id) {
    const plan = plans.find(p => p.id === id);
    if (!plan) return;
    _plansMode = 'editor';
    _planDraft = { id: plan.id, name: plan.name, exercises: plan.exercises.map(_normPlanEx) };
    _planIntExpanded = false;      /* both sections collapsed by default */
    _planEditExpanded = false;
    _planIntHorizon = '3M';
    renderLibPlans();
  }

  async function planEditorAddEx() {
    const name = await openExPicker();
    if (!name) return;
    _planDraft.exercises.push({ name, sets: 3 });
    renderLibPlans();
  }

  function planEditorRemoveEx(idx) {
    const ex = _planDraft.exercises[idx];
    const name = ex ? _normPlanEx(ex).name : 'this exercise';
    _wConfirm({
      title: 'Remove Exercise?',
      msg: `"${name}" will be removed from the plan.`,
      okLabel: 'Remove', okColor: 'red',
      onOk: () => {
        const row = document.querySelector(`#plan-ex-list [data-idx="${idx}"]`);
        _animateRemove(row, () => {
          _planDraft.exercises.splice(idx, 1);
          renderLibPlans();
        });
      }
    });
  }

  function planEditorStepSets(idx, delta) {
    const ex = _planDraft.exercises[idx];
    if (!ex) return;
    const norm = _normPlanEx(ex);
    norm.sets = Math.min(10, Math.max(1, norm.sets + delta));
    _planDraft.exercises[idx] = norm;
    /* update just the value span without re-rendering the whole editor */
    const span = document.getElementById('plan-ex-sets-' + idx);
    if (span) span.textContent = norm.sets;
  }

  function _planInitDrag(list) {
    list.style.touchAction = 'none';

    list.addEventListener('pointerdown', function(e) {
      if (!e.isPrimary) return;
      const handle = e.target.closest('.plan-ex-handle');
      if (!handle) return;
      const dragRow = handle.closest('.plan-ex-item');
      if (!dragRow) return;

      list.setPointerCapture(e.pointerId);
      e.preventDefault();

      let dragIdx = parseInt(dragRow.dataset.idx, 10);
      let lastY   = e.clientY;

      /* Ghost: fixed-position clone that follows the finger */
      const rect  = dragRow.getBoundingClientRect();
      const ghost = dragRow.cloneNode(true);
      Object.assign(ghost.style, {
        position: 'fixed', left: rect.left + 'px', top: rect.top + 'px',
        width: rect.width + 'px', margin: '0', zIndex: '9999',
        opacity: '0.95', pointerEvents: 'none',
        background: 'var(--card)',
        boxShadow: '0 6px 24px rgba(0,0,0,.28)',
        borderRadius: '0.5rem',
      });
      document.body.appendChild(ghost);
      dragRow.classList.add('dragging');

      function _refreshRows() {
        list.querySelectorAll('.plan-ex-item').forEach((r, i) => {
          r.dataset.idx = i;
          const num = r.querySelector('.plan-ex-num');
          if (num) num.textContent = i + 1;
          const del = r.querySelector('.plan-ex-del');
          if (del) del.setAttribute('onclick', `planEditorRemoveEx(${i})`);
          r.classList.toggle('dragging', i === dragIdx);
        });
      }

      function onMove(e) {
        if (!e.isPrimary) return;
        ghost.style.top = (parseFloat(ghost.style.top) + (e.clientY - lastY)) + 'px';
        lastY = e.clientY;

        for (const row of list.querySelectorAll('.plan-ex-item')) {
          if (row === dragRow) continue;
          const r      = row.getBoundingClientRect();
          const mid    = r.top + r.height / 2;
          const rowIdx = parseInt(row.dataset.idx, 10);
          const shouldSwap = (rowIdx > dragIdx && e.clientY > mid) ||
                             (rowIdx < dragIdx && e.clientY < mid);
          if (!shouldSwap) continue;

          /* Swap in data array and reinsert DOM node */
          [_planDraft.exercises[dragIdx], _planDraft.exercises[rowIdx]] =
            [_planDraft.exercises[rowIdx], _planDraft.exercises[dragIdx]];

          /* Move DOM: insert dragRow before or after the target row */
          if (rowIdx < dragIdx) {
            list.insertBefore(dragRow, row);
          } else {
            list.insertBefore(dragRow, row.nextSibling);
          }
          dragIdx = rowIdx;
          _refreshRows();
          break;
        }
      }

      function onEnd(e) {
        if (!e.isPrimary) return;
        ghost.remove();
        list.querySelectorAll('.plan-ex-item').forEach(r => r.classList.remove('dragging'));
        list.removeEventListener('pointermove',   onMove);
        list.removeEventListener('pointerup',     onEnd);
        list.removeEventListener('pointercancel', onEnd);
        /* Persist the reordered exercises immediately */
        localStorage.setItem('plans', JSON.stringify(plans));
      }

      list.addEventListener('pointermove',   onMove);
      list.addEventListener('pointerup',     onEnd);
      list.addEventListener('pointercancel', onEnd);
    });
  }

  function savePlan() {
    const name = (document.getElementById('plan-name-input')?.value || _planDraft.name || '').trim();
    if (!name) { showToast('Enter a plan name first'); return; }
    if (!_planDraft.exercises.length) { showToast('Add at least one exercise'); return; }
    const normExercises = _planDraft.exercises.map(_normPlanEx);
    if (_planDraft.id) {
      const idx = plans.findIndex(p => p.id === _planDraft.id);
      if (idx !== -1) plans[idx] = { id: _planDraft.id, name, exercises: normExercises };
    } else {
      plans.push({ id: Date.now(), name, exercises: normExercises });
    }
    persistPlans();
    _plansMode = 'list';
    _planDraft = null;
    renderLibPlans();
    showToast('Plan saved ✓');
  }

  function deletePlan(id) {
    const plan = plans.find(p => p.id === id);
    const name = plan ? plan.name : 'this plan';
    _wConfirm({
      title: 'Delete Plan?',
      msg: `"${name}" will be permanently deleted.`,
      okLabel: 'Delete', okColor: 'red',
      onOk: () => {
        const item = document.querySelector(`[data-plan-id="${id}"]`);
        _animateRemove(item, () => {
          plans = plans.filter(p => p.id !== id);
          persistPlans();
          renderLibPlans();
        });
      }
    });
  }
