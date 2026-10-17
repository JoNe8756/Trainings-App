/* Extracted from index.html — History tab, Workout Detail, Exercise trend modal,
   workout deletion, monthly grouping/folding. */

  function deleteWorkout(id) {
    closeWorkoutDetail();
    _wConfirm({
      title: 'Delete Workout?',
      msg: 'This cannot be undone.',
      okLabel: 'Delete', okColor: 'red',
      onOk: () => {
        const card = document.querySelector(`[data-workout-id="${id}"]`);
        _animateRemove(card, () => {
          workouts = workouts.filter(x => x.id !== id);
          persist();
          const homeActive     = document.getElementById('home-screen').classList.contains('active');
          const historyActive  = document.getElementById('history-screen').classList.contains('active');
          const progressActive = document.getElementById('progress-screen')?.classList.contains('active');
          if (homeActive)     { renderRecent(); renderFreqGoal(); renderHighlights(); renderActiveJourneys(); }
          if (historyActive)  renderHistory();
          if (progressActive) renderProgress();
        });
      }
    });
  }

  function _histMonthKey(w) {
    const d = new Date(w.date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  function _histMonthLabel(key) {
    const [y, m] = key.split('-');
    return new Date(+y, +m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  function toggleHistMonth(key) {
    const state = _getHistFolderState();
    state[key] = !_isHistMonthOpen(key, state);
    _setHistFolderState(state);
    const body = document.getElementById('hist-body-' + key);
    const chev = document.getElementById('hist-chev-' + key);
    if (!body) return;
    if (state[key]) {
      body.style.height = body.scrollHeight + 'px';
      setTimeout(() => { if (state[key]) body.style.height = 'auto'; }, 260);
    } else {
      body.style.height = body.scrollHeight + 'px';
      requestAnimationFrame(() => { body.style.height = '0'; });
    }
    if (chev) chev.classList.toggle('open', !!state[key]);
  }

  function renderHistory() {
    const el = document.getElementById('history-list');
    if (!workouts.length) {
      el.innerHTML = emptyState('📋', 'No History Yet', 'Completed workouts will appear here.');
      return;
    }
    /* group by month key, newest first */
    const groups = {};
    workouts.forEach(w => {
      const k = _histMonthKey(w);
      if (!groups[k]) groups[k] = [];
      groups[k].push(w);
    });
    const keys = Object.keys(groups).sort().reverse();
    const state = _getHistFolderState();
    el.innerHTML = keys.map(key => {
      const open  = _isHistMonthOpen(key, state);
      const cards = groups[key].map(w => workoutCard(w)).join('');
      const count = groups[key].length;
      return `
        <div class="hist-month-header" onclick="toggleHistMonth('${key}')">
          <span class="hist-month-title">${_histMonthLabel(key)}</span>
          <span class="hist-month-meta">
            ${count} workout${count !== 1 ? 's' : ''}
            <span class="hist-month-chevron${open ? ' open' : ''}" id="hist-chev-${key}">▸</span>
          </span>
        </div>
        <div class="hist-month-body" id="hist-body-${key}" style="height:${open ? 'auto' : '0'}">
          ${cards}
          <div style="height:.25rem"></div>
        </div>`;
    }).join('');
  }

  function openWorkoutDetail(workoutId) {
    const w = workouts.find(x => x.id === workoutId);
    if (!w) return;

    const d       = new Date(w.date);
    const dateStr = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const mins    = Math.floor((w.duration || 0) / 60);
    const secs    = (w.duration || 0) % 60;
    const durStr  = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

    // Totals across all non-killer exercises
    let totalIntensity = 0, totalReps = 0, totalVol = 0;
    (w.exercises || []).forEach(ex => {
      if (ex.killer) return;  // killer handled separately below
      (ex.sets || []).forEach(s => {
        const r = parseFloat(s.reps) || 0;
        const k = parseFloat(s.kg)   || 0;
        totalReps += r;
        totalVol  += r * k;
        totalIntensity += calcSetIntensity(ex.name, r, k);
      });
    });
    // Also count killer exercises in totals
    (w.exercises || []).filter(ex => ex.killer).forEach(ex => {
      (ex.sets || []).forEach(s => {
        const r = parseFloat(s.reps) || 0;
        totalReps += r;
        totalIntensity += calcSetIntensity(ex.name, r, 0);
      });
    });

    const killerExercises = (w.exercises || []).filter(ex => ex.killer);
    const regularExercises = (w.exercises || []).filter(ex => !ex.killer);

    // ── Warmup card
    const warmupHTML = (() => {
      if (!w.warmup) return '';
      const elapsed = w.warmup.elapsed;
      const fmtT   = s => (Math.floor(s/60)>0 ? Math.floor(s/60)+'m ' : '') + (s%60)+'s';
      const summary = elapsed != null ? fmtT(elapsed) + ' strength' : 'general only';
      const uid = 'wd-wu-' + w.id;
      const steps = (w.warmup.routine || []).map(step =>
        `<div class="wd-wsc-row">
          <span class="wd-wsc-name">${step.name}</span>
          <span class="wd-wsc-val" style="color:var(--tertiary);font-size:.8125rem">${step.reps != null ? step.reps + ' target' : ''}</span>
        </div>`).join('');
      return `<div class="wd-wsc-card" id="${uid}">
        <div class="wd-wsc-header" onclick="this.closest('.wd-wsc-card').classList.toggle('open')">
          <span class="wsc-badge warmup">🔥 Warmup</span>
          <span class="wsc-summary-text">${summary}</span>
          <span class="wd-wsc-chevron">›</span>
        </div>
        <div class="wd-wsc-body">${steps}</div>
      </div>`;
    })();

    // ── Killer Set card
    const killerHTML = (() => {
      if (!killerExercises.length) return '';
      const total = killerExercises.reduce((s, ex) => s + (parseFloat(ex.sets[0]?.reps) || 0), 0);
      const uid = 'wd-ks-' + w.id;
      const rows = killerExercises.map(ex => {
        const val   = parseFloat(ex.sets[0]?.reps) || 0;
        const label = !!getExMeta(ex.name).tb ? 'secs' : 'reps';
        return `<div class="wd-wsc-row">
          <span class="wd-wsc-name">${ex.name}</span>
          <span class="wd-wsc-val">${val > 0 ? val : '—'}</span>
          <span class="wd-wsc-unit">${val > 0 ? label : ''}</span>
        </div>`;
      }).join('');
      return `<div class="wd-wsc-card" id="${uid}">
        <div class="wd-wsc-header" onclick="this.closest('.wd-wsc-card').classList.toggle('open')">
          <span class="wsc-badge killer">💣 Killer Set</span>
          <span class="wsc-summary-text">${total} total reps</span>
          <span class="wd-wsc-chevron">›</span>
        </div>
        <div class="wd-wsc-body">${rows}</div>
      </div>`;
    })();

    // ── Regular exercise sections
    const exercisesHTML = regularExercises.map(ex => {
      const tb       = !!ex.sets[0]?.tb || !!getExMeta(ex.name).tb;
      const kgLabel  = 'kg';
      const repLabel = tb ? 'Secs' : 'Reps';
      const intLabel = '⚡';

      let exIntTotal = 0;
      let totalExReps = 0;
      const setRows = (ex.sets || []).map((s, i) => {
        const r = parseFloat(s.reps) || 0;
        const k = parseFloat(s.kg)   || 0;
        const intensity = calcSetIntensity(ex.name, r, k);
        exIntTotal += intensity;
        totalExReps += r;
        const kgCell   = k > 0 ? k + 'kg' : '—';
        const repsCell = r > 0 ? r + (tb ? 's' : '') : '—';
        const intCell  = intensity > 0 ? fmtInt(intensity) : '—';
        return `<div class="wd-set-row">
          <span class="wd-set-num">${i + 1}</span>
          <span class="wd-set-val">${kgCell}</span>
          <span class="wd-set-val">${repsCell}</span>
          <span class="wd-set-int">${intCell}</span>
        </div>`;
      }).join('');

      const footerParts = [];
      if (totalExReps > 0) footerParts.push(`${totalExReps} ${tb ? 'secs' : 'reps'}`);
      if (exIntTotal > 0)  footerParts.push(`⚡ ${fmtInt(exIntTotal)}`);

      return `<div class="wd-ex-section">
        <div class="wd-ex-name">${ex.name}</div>
        <div class="wd-sets-head">
          <span>#</span><span>${kgLabel}</span><span>${repLabel}</span><span>${intLabel}</span>
        </div>
        ${setRows}
        ${footerParts.length ? `<div class="wd-ex-total">${footerParts.join(' · ')}</div>` : ''}
      </div>`;
    }).join('');

    // ── Totals chips (row 1)
    const volRounded = Math.round(totalVol);
    const volStr  = volRounded >= 1 ? (volRounded >= 1000 ? (volRounded/1000).toFixed(1)+'t' : volRounded+'kg') : null;
    const chips = [
      { label: 'Intensity', val: totalIntensity > 0 ? fmtInt(totalIntensity) + ' ⚡' : '—' },
      { label: 'Total Reps', val: totalReps > 0 ? String(totalReps) : '—' },
      ...(volStr ? [{ label: 'Volume', val: volStr }] : []),
    ];

    // ── Extra stats (row 2)
    let totalSets = 0, restSum = 0, restCount = 0;
    let bestSetReps = 0, bestSetName = '';
    (w.exercises || []).forEach(ex => {
      if (ex.killer) return;
      (ex.sets || []).forEach(s => {
        const r = parseFloat(s.reps) || 0;
        totalSets++;
        if (r > bestSetReps) { bestSetReps = r; bestSetName = ex.name; }
        if (s.restSecs != null && s.restSecs > 0) { restSum += s.restSecs; restCount++; }
      });
    });
    const avgRepsPerSet = totalSets > 0 ? Math.round((totalReps / totalSets) * 10) / 10 : 0;
    const avgRestSecs   = restCount > 0 ? Math.round(restSum / restCount) : null;
    const avgRestStr    = avgRestSecs != null ? (avgRestSecs >= 60 ? `${Math.floor(avgRestSecs/60)}m ${avgRestSecs%60}s` : `${avgRestSecs}s`) : '—';
    const bestSetStr    = bestSetName ? `${bestSetName} (${bestSetReps})` : '—';
    const chips2 = [
      { label: 'Avg Reps/Set', val: avgRepsPerSet > 0 ? String(avgRepsPerSet) : '—' },
      { label: 'Best Set',     val: bestSetStr, small: true },
      { label: 'Avg Rest',     val: avgRestStr },
    ];

    // ── Intensity ranking
    const exRanked = (w.exercises || []).filter(ex => !ex.killer).map(ex => {
      const exInt = (ex.sets || []).reduce((s, st) => s + calcSetIntensity(ex.name, parseFloat(st.reps)||0, parseFloat(st.kg)||0), 0);
      return { name: ex.name, intensity: exInt };
    }).filter(x => x.intensity > 0).sort((a, b) => b.intensity - a.intensity);

    const rankingHTML = exRanked.length > 1 ? `
      <div class="wd-section-hdr">Intensity Ranking</div>
      <div class="wd-rank-list">
        ${exRanked.map((ex, i) => `
          <div class="wd-rank-row${i > 0 ? ' wd-rank-sep' : ''}">
            <span class="wd-rank-pos">#${i+1}</span>
            <span class="wd-rank-name">${ex.name}</span>
            <span class="wd-rank-val">⚡ ${fmtInt(ex.intensity)}</span>
          </div>`).join('')}
      </div>` : '';

    // ── Exercise sections with tappable names
    const exercisesHTMLv2 = regularExercises.map(ex => {
      const tb       = !!ex.sets[0]?.tb || !!getExMeta(ex.name).tb;
      const repLabel = tb ? 'Secs' : 'Reps';

      let exIntTotal = 0, totalExReps = 0;
      const setRows = (ex.sets || []).map((s, i) => {
        const r = parseFloat(s.reps) || 0;
        const k = parseFloat(s.kg)   || 0;
        const intensity = calcSetIntensity(ex.name, r, k);
        exIntTotal += intensity;
        totalExReps += r;
        const kgCell   = k > 0 ? k + 'kg' : '—';
        const repsCell = r > 0 ? r + (tb ? 's' : '') : '—';
        const intCell  = intensity > 0 ? fmtInt(intensity) : '—';
        return `<div class="wd-set-row">
          <span class="wd-set-num">${i + 1}</span>
          <span class="wd-set-val">${kgCell}</span>
          <span class="wd-set-val">${repsCell}</span>
          <span class="wd-set-int">${intCell}</span>
        </div>`;
      }).join('');

      const footerParts = [];
      if (totalExReps > 0) footerParts.push(`${totalExReps} ${tb ? 'secs' : 'reps'}`);
      if (exIntTotal > 0)  footerParts.push(`⚡ ${fmtInt(exIntTotal)}`);

      return `<div class="wd-ex-section workout-detail-exercise-card" data-exercise-name="${ex.name.replace(/"/g,'&quot;')}" style="cursor:pointer;-webkit-tap-highlight-color:rgba(0,122,255,0.15)">
        <div class="wd-ex-name wd-ex-name-btn">${ex.name}<svg style="margin-left:.375rem;flex-shrink:0;vertical-align:middle" width="6" height="10" viewBox="0 0 6 10" fill="none" stroke="#8E8E93" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="1,1 5,5 1,9"/></svg></div>
        <div class="wd-sets-head">
          <span>#</span><span>kg</span><span>${repLabel}</span><span>⚡</span>
        </div>
        ${setRows}
        ${footerParts.length ? `<div class="wd-ex-total">${footerParts.join(' · ')}</div>` : ''}
      </div>`;
    }).join('');

    const body = `
      <div class="wd-header">
        ${w.planName ? `<div class="wd-plan-name">📋 ${w.planName}</div>` : ''}
        <div class="wd-date">${dateStr}</div>
        <div class="wd-meta">
          <span class="wd-meta-item">${timeStr}</span>
          <span class="wd-meta-item">⏱ ${durStr}</span>
        </div>
      </div>
      <div class="wd-totals">
        ${chips.map(c => `<div class="wd-total-chip">
          <div class="wd-total-label">${c.label}</div>
          <div class="wd-total-val">${c.val}</div>
        </div>`).join('')}
      </div>
      <div class="wd-totals" style="border-top:none;padding-top:0">
        ${chips2.map(c => `<div class="wd-total-chip">
          <div class="wd-total-label">${c.label}</div>
          <div class="wd-total-val" style="${c.small ? 'font-size:.75rem;line-height:1.3;word-break:break-word' : ''}">${c.val}</div>
        </div>`).join('')}
      </div>
      ${rankingHTML}
      ${warmupHTML}
      ${killerHTML}
      ${exercisesHTMLv2}
      <div style="height:.5rem"></div>`;

    document.getElementById('wd-scroll').innerHTML = body;
    document.querySelectorAll('.workout-detail-exercise-card').forEach(function(card) {
      var name = card.getAttribute('data-exercise-name');
      card.addEventListener('click', function() {
        window.currentTrendExercise = name;
        document.getElementById('exTrendModal').style.display = 'block';
        window.renderExerciseTrendModal();
      });
    });
    document.getElementById('workout-detail').classList.add('open');
  }

  function closeWorkoutDetail() {
    document.getElementById('workout-detail').classList.remove('open');
  }

  function workoutCard(w) {
    const d       = new Date(w.date);
    const dateStr = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const mins    = Math.floor(w.duration / 60);
    const secs    = w.duration % 60;
    const durStr  = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    const exRows  = _whWarmupRow(w) + _whBuildRows(w.exercises);

    const trashSVG = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="2,4 14,4"/>
      <path d="M5 4V2.5A.5.5 0 0 1 5.5 2h5a.5.5 0 0 1 .5.5V4"/>
      <path d="M3 4l.8 9.2A1 1 0 0 0 4.8 14h6.4a1 1 0 0 0 1-.8L13 4"/>
      <line x1="6.5" y1="7" x2="6.5" y2="11"/>
      <line x1="9.5" y1="7" x2="9.5" y2="11"/>
    </svg>`;

    return `
      <div class="workout-history-card" data-workout-id="${w.id}" onclick="openWorkoutDetail(${w.id})" style="cursor:pointer">
        <div class="workout-history-head">
          <div class="workout-history-info">
            ${w.planName ? `<div class="workout-history-plan">📋 ${w.planName}</div>` : ''}
            <div class="workout-history-date">${dateStr}</div>
            <div class="workout-history-dur-inline">Duration: ${durStr}</div>
            <div class="workout-history-time">${timeStr}</div>
          </div>
          <div class="workout-history-meta">
            <button class="btn-delete-workout" onclick="event.stopPropagation();deleteWorkout(${w.id})" title="Delete workout">
              ${trashSVG}
            </button>
          </div>
        </div>
        <div class="workout-history-body">${exRows}</div>
      </div>`;
  }

/* ── Exercise performance trend modal ── */
window.currentTrendExercise = '';
window.currentTrendHorizon = '3M';

window.renderExerciseTrendModal = function() {
  var name = window.currentTrendExercise;
  var horizon = window.currentTrendHorizon || '3M';
  var inner = document.getElementById('exTrendInner');
  if (!inner) return;

  // --- Collect sessions (all history; horizon only sets the visible window) ---
  var sessions = [];
  var _allWorkouts = JSON.parse(localStorage.getItem('workouts') || '[]');
  _allWorkouts.forEach(function(w) {
    var ex = (w.exercises || []).find(function(e) { return e.name === name; });
    if (!ex) return;
    var totalReps = 0, totalInt = 0;
    (ex.sets || []).forEach(function(s) {
      var r = parseFloat(s.reps) || 0, k = parseFloat(s.kg) || 0;
      if (r > 0) {
        totalReps += r;
        totalInt += (typeof calcSetIntensity === 'function' ? calcSetIntensity(name, r, k) : r * (k || 1));
      }
    });
    sessions.push({ date: w.date, totalReps: totalReps, totalInt: totalInt, sets: ex.sets || [] });
  });
  sessions.reverse();

  // --- Segment control ---
  var horizons = ['1M','3M','6M','1Y','2Y'];
  var segHTML = '<div style="display:flex;background:#1C1C1E;border-radius:10px;padding:3px;gap:2px;height:36px;box-sizing:border-box;margin:16px 0 0;">';
  horizons.forEach(function(h) {
    var active = h === horizon;
    segHTML += '<button onclick="window.currentTrendHorizon=\'' + h + '\';window.renderExerciseTrendModal();" style="flex:1;height:100%;padding:0;border:none;border-radius:8px;font-size:14px;font-weight:' + (active?'700':'600') + ';font-family:inherit;cursor:pointer;background:' + (active?'#007AFF':'transparent') + ';color:' + (active?'#fff':'#8E8E93') + ';">' + h + '</button>';
  });
  segHTML += '</div>';

  // --- Last 3 sessions breakdown ---
  var last3 = sessions.slice(-3).reverse();
  var breakdownHTML = '';
  last3.forEach(function(sess, si) {
    var dStr = new Date(sess.date).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
    var uid = 'etb-' + si + '-' + Date.now();
    var rowsHTML = '';
    (sess.sets || []).forEach(function(s, idx) {
      var r = parseFloat(s.reps)||0, k = parseFloat(s.kg)||0;
      var inten = typeof calcSetIntensity === 'function' ? calcSetIntensity(name,r,k) : r*(k||1);
      var intStr = inten > 0 ? ('⚡ ' + (typeof fmtInt==='function' ? fmtInt(inten) : Math.round(inten).toLocaleString())) : '';
      rowsHTML += '<div style="display:flex;align-items:center;gap:12px;padding:8px 0;' + (idx>0?'border-top:.5px solid #2C2C2E;':'') + '">' +
        '<span style="font-size:12px;color:#8E8E93;min-width:28px;">S'+(idx+1)+'</span>' +
        '<span style="flex:1;font-size:14px;color:#fff;">'+(r>0?r+' reps':'—')+(k>0?' · '+k+'kg':'')+'</span>' +
        '<span style="font-size:12px;color:#8E8E93;">'+intStr+'</span>' +
        '</div>';
    });
    breakdownHTML += '<div style="background:#1C1C1E;border-radius:12px;margin-bottom:10px;overflow:hidden;">' +
      '<button onclick="var el=document.getElementById(\'' + uid + '\');el.style.display=el.style.display===\'none\'?\'block\':\'none\';" style="width:100%;display:flex;align-items:center;justify-content:space-between;background:none;border:none;padding:14px 16px;font-family:inherit;cursor:pointer;">' +
      '<span style="font-size:15px;font-weight:600;color:#fff;">'+dStr+'</span>' +
      '<span style="font-size:13px;color:#8E8E93;">'+sess.totalReps+' reps</span>' +
      '</button>' +
      '<div id="'+uid+'" style="display:none;padding:0 16px 8px;">'+rowsHTML+'</div>' +
      '</div>';
  });
  if (!last3.length) breakdownHTML = '<div style="font-size:14px;color:#8E8E93;padding:8px 0;">No sessions in this range</div>';

  // --- Render HTML ---
  inner.innerHTML =
    '<div style="font-size:28px;font-weight:700;color:#fff;letter-spacing:-.4px;margin-top:4px;">'+name+'</div>' +
    '<div style="font-size:13px;color:#8E8E93;">Performance Over Time</div>' +
    segHTML +
    '<div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:#8E8E93;margin:20px 0 8px;">REPS</div>' +
    '<div style="background:#1C1C1E;border-radius:12px;padding:16px;margin-bottom:12px;">' +
    '<canvas id="trendRepsCanvas" style="display:block;width:100%;height:180px;"></canvas>' +
    '</div>' +
    '<div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:#8E8E93;margin:20px 0 8px;">INTENSITY ⚡</div>' +
    '<div style="background:#1C1C1E;border-radius:12px;padding:16px;margin-bottom:12px;">' +
    '<canvas id="trendIntensityCanvas" style="display:block;width:100%;height:180px;"></canvas>' +
    '</div>' +
    '<div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:#8E8E93;margin:20px 0 10px;">LAST 3 SESSIONS</div>' +
    breakdownHTML;

  // --- Draw charts after paint ---
  requestAnimationFrame(function() {
    _drawTrendChart(document.getElementById('trendRepsCanvas'), sessions, function(s){return s.totalReps;}, 180, horizon);
    _drawTrendChart(document.getElementById('trendIntensityCanvas'), sessions, function(s){return s.totalInt;}, 180, horizon);
  });
};

function _drawTrendChart(canvas, sessions, valFn, height, rangeKey) {
  if (!canvas) return;
  var dpr = window.devicePixelRatio || 1;
  var parent = canvas.parentElement;
  /* visible content width of the scroll container (minus its own padding) */
  var _cs = parent ? getComputedStyle(parent) : null;
  var _padX = _cs ? ((parseFloat(_cs.paddingLeft) || 0) + (parseFloat(_cs.paddingRight) || 0)) : 0;
  var containerW = (parent ? parent.clientWidth - _padX : 0) || 303;
  var H = height || 180;

  /* Aggregate (week/month per horizon) → proportional X + horizontal scroll. */
  var agg = _aggregateChart(sessions.map(function(s){ return s.date; }), sessions.map(valFn), rangeKey || '1M');
  var vals = agg.values, times = agg.times, labels = agg.labels;
  var n = vals.length;

  var PAD = {top:14, right:18, bottom:26, left:40};
  var scale = _chartXScale(times, _horizonDaysFor(rangeKey || '1M', times), PAD, containerW);
  var W = scale.canvasW;
  if (parent) parent.classList.add('chart-scroll');

  canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  canvas.width = W * dpr; canvas.height = H * dpr;
  var ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  if (n < 2) {
    ctx.fillStyle = '#8E8E93';
    ctx.font = '13px system-ui,-apple-system,sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('Not enough data yet', W/2, H/2);
    return;
  }

  var cW = W - PAD.left - PAD.right, cH = H - PAD.top - PAD.bottom;
  var minV = Math.min.apply(null,vals), maxV = Math.max.apply(null,vals);
  var rng = maxV - minV || 1;
  var xOf = scale.xOf;
  var yOf = function(v){return PAD.top + cH - ((v-minV)/rng)*cH;};

  /* horizontal grid lines + y value labels */
  for (var g=0; g<=3; g++) {
    var gy = PAD.top + (g/3)*cH;
    ctx.beginPath(); ctx.strokeStyle='#2C2C2E'; ctx.lineWidth=1;
    ctx.moveTo(PAD.left,gy); ctx.lineTo(PAD.left+cW,gy); ctx.stroke();
    ctx.fillStyle='#8E8E93'; ctx.font='11px system-ui,-apple-system,sans-serif';
    ctx.textAlign='right'; ctx.textBaseline='middle';
    ctx.fillText(Math.round(maxV-(g/3)*rng), PAD.left-8, gy);
  }

  /* trend line (dashed grey) */
  var sx=0,sy=0,sxy=0,sx2=0;
  for (var j=0;j<n;j++){sx+=j;sy+=vals[j];sxy+=j*vals[j];sx2+=j*j;}
  var den=n*sx2-sx*sx, slope=den?(n*sxy-sx*sy)/den:0, icept=(sy-slope*sx)/n;
  ctx.beginPath(); ctx.strokeStyle='#8E8E93'; ctx.lineWidth=1.5; ctx.setLineDash([4,4]);
  ctx.moveTo(xOf(0),yOf(icept)); ctx.lineTo(xOf(n-1),yOf(icept+slope*(n-1)));
  ctx.stroke(); ctx.setLineDash([]);

  /* data line (blue) */
  ctx.beginPath(); ctx.strokeStyle='#007AFF'; ctx.lineWidth=2; ctx.lineJoin='round';
  for (var i=0;i<n;i++){i===0?ctx.moveTo(xOf(i),yOf(vals[i])):ctx.lineTo(xOf(i),yOf(vals[i]));}
  ctx.stroke();

  /* personal best = highest value */
  var bestIdx = vals.indexOf(maxV);

  /* dots — hollow blue (white fill, blue border); PR dot red filled */
  for (var dd=0;dd<n;dd++){
    if (dd === bestIdx) continue;
    ctx.beginPath();
    ctx.arc(xOf(dd),yOf(vals[dd]),4,0,Math.PI*2);
    ctx.fillStyle='#fff'; ctx.fill();
    ctx.strokeStyle='#007AFF'; ctx.lineWidth=2; ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(xOf(bestIdx),yOf(maxV),5,0,Math.PI*2);
  ctx.fillStyle='#FF3B30'; ctx.fill();

  /* x axis labels — skip overlapping ones (min 50px gap), always first + last */
  ctx.fillStyle='#8E8E93'; ctx.font='11px system-ui,-apple-system,sans-serif'; ctx.textBaseline='top';
  var _xs = labels.map(function(l, i){ return xOf(i); });
  var _lblIdxs = _pickXLabelIdxs(_xs, 50);
  for (var li=0; li<n; li++){
    if (!_lblIdxs.has(li)) continue;
    ctx.textAlign = li===0 ? 'left' : (li===n-1 ? 'right' : 'center');
    ctx.fillText(labels[li], xOf(li), H-PAD.bottom+8);
  }

  /* dot tooltips */
  var _dots = [];
  for (var di=0; di<n; di++) _dots.push({ x: xOf(di), y: yOf(vals[di]), label: labels[di], value: String(Math.round(vals[di])) });
  _attachDotTooltip(canvas, _dots);

  if (parent) parent.scrollLeft = parent.scrollWidth;
}
