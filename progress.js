/* Extracted from index.html — Progress tab: rendering, canvas chart drawing,
   exercise performance charts, aggregation + time-horizon filtering, chart data prep. */

  function buildExerciseData() {
    const map    = {};
    const sorted = [...workouts].sort((a, b) => new Date(a.date) - new Date(b.date));
    sorted.forEach(w => {
      const _ld = new Date(w.date);
      const label = _ld.getDate() + ' ' + _ld.toLocaleDateString('en-US', { month: 'short' });
      w.exercises.forEach(ex => {
        const name = ex.name.trim() || 'Unnamed';
        if (!map[name]) map[name] = [];
        map[name].push({
          date:  w.date,
          label,
          sets:  ex.sets.map(s => ({
            reps: Math.max(0, parseInt(s.reps)  || 0),
            kg:   Math.max(0, parseFloat(s.kg)  || 0)
          }))
        });
      });
    });
    return map;
  }

  function _filterSessions(sessions, key) {
    if (key === 'all') return sessions;
    if (key === '30')  return sessions.slice(-30);
    const now = new Date();
    let cutoff;
    if (key === '3M') cutoff = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    else if (key === '6M') cutoff = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
    else if (key === '1Y') cutoff = new Date(now.getFullYear() - 1,  now.getMonth(), now.getDate());
    else if (key === '5Y') cutoff = new Date(now.getFullYear() - 5,  now.getMonth(), now.getDate());
    return sessions.filter(s => new Date(s.date) >= cutoff);
  }

  function _horizonDaysFor(rangeKey, times) {
    const map = { '1M':30, '3M':90, '6M':180, '1Y':365, '2Y':730, '5Y':1825 };
    if (map[rangeKey]) return map[rangeKey];
    if (!times || times.length <= 1) return 1;
    if (rangeKey === '30') {               /* "last 30 sessions" → span of those sessions */
      const recent = times.slice(-30);
      return Math.max(1, (recent[recent.length - 1] - recent[0]) / 86400000);
    }
    return Math.max(1, (times[times.length - 1] - times[0]) / 86400000);  /* 'all' / 'All' */
  }

  function _chartXScale(times, horizonDays, PAD, containerW) {
    const n = times.length;
    const minT = n ? Math.min.apply(null, times) : 0;
    const maxT = n ? Math.max.apply(null, times) : 0;
    const totalDays = Math.max(1, (maxT - minT) / 86400000);
    const plotVis  = Math.max(1, containerW - PAD.left - PAD.right);
    const pxPerDay = plotVis / Math.max(1, horizonDays);
    const canvasW  = Math.max(containerW, Math.ceil(PAD.left + PAD.right + totalDays * pxPerDay));
    const plotW    = canvasW - PAD.left - PAD.right;
    const span     = (maxT - minT) || 1;
    const xOf = i => n === 1 ? PAD.left + plotVis / 2 : PAD.left + ((times[i] - minT) / span) * plotW;
    return { canvasW, xOf };
  }

  function _scrollChartRight(wrap) { if (wrap) wrap.scrollLeft = wrap.scrollWidth; }

  function _bucketModeFor(rangeKey) {
    if (rangeKey === '1M' || rangeKey === '30') return 'none';
    if (rangeKey === '3M' || rangeKey === '6M') return 'week';
    return 'month';   /* 1Y, 5Y, all/All */
  }

  // === DATA AGGREGATION ===
  function _aggregateChart(dates, values, rangeKey) {
    const mode  = _bucketModeFor(rangeKey);
    const fmtDay = t => new Date(t).toLocaleDateString('en-US', { month:'short', day:'numeric' });
    const fmtMon = t => new Date(t).toLocaleDateString('en-US', { month:'short' });
    if (mode === 'none') {
      return {
        times:  dates.map(d => new Date(d).getTime()),
        values: values.slice(),
        labels: dates.map(d => fmtDay(new Date(d).getTime())),
      };
    }
    const map = new Map();
    for (let i = 0; i < dates.length; i++) {
      const dt = new Date(dates[i]);
      let startT, midT;
      if (mode === 'month') {
        startT = new Date(dt.getFullYear(), dt.getMonth(), 1).getTime();
        midT   = (startT + new Date(dt.getFullYear(), dt.getMonth() + 1, 1).getTime()) / 2;
      } else {
        const t = new Date(dt); t.setHours(0,0,0,0);
        t.setDate(t.getDate() - ((t.getDay() + 6) % 7));  /* Monday start */
        startT = t.getTime();
        midT   = startT + 3.5 * 86400000;
      }
      let b = map.get(startT);
      if (!b) { b = { start: startT, mid: midT, sum: 0 }; map.set(startT, b); }
      b.sum += values[i];
    }
    const arr = [...map.values()].sort((a, b) => a.start - b.start);
    return {
      times:  arr.map(b => b.mid),
      values: arr.map(b => b.sum),
      labels: arr.map(b => mode === 'month' ? fmtMon(b.start) : fmtDay(b.start)),
    };
  }

  function _pickXLabelIdxs(xs, minGap) {
    const n = xs.length;
    if (n <= 1) return new Set([0]);
    const chosen = [0];
    let lastX = xs[0];
    for (let i = 1; i < n - 1; i++) {
      if (xs[i] - lastX >= minGap && xs[n - 1] - xs[i] >= minGap) { chosen.push(i); lastX = xs[i]; }
    }
    chosen.push(n - 1);
    return new Set(chosen);
  }

  function _getChartTooltip() {
    let tt = document.getElementById('chart-tooltip');
    if (!tt) {
      tt = document.createElement('div');
      tt.id = 'chart-tooltip';
      tt.style.cssText = 'position:fixed;z-index:100000;background:#1C1C1E;border-radius:8px;padding:6px 10px;color:#fff;font-size:12px;font-family:system-ui,-apple-system,sans-serif;pointer-events:none;display:none;white-space:nowrap;transform:translate(-50%,-100%);box-shadow:0 2px 8px rgba(0,0,0,.4);';
      document.body.appendChild(tt);
      /* dismiss on any tap; a dot tap re-shows it via the canvas click handler */
      document.addEventListener('pointerdown', _hideChartTooltip, true);
    }
    return tt;
  }

  function _hideChartTooltip() { const tt = document.getElementById('chart-tooltip'); if (tt) tt.style.display = 'none'; }

  function _showChartTooltip(text, screenX, screenY) {
    const tt = _getChartTooltip();
    tt.textContent = text;
    tt.style.left = screenX + 'px';
    tt.style.top  = (screenY - 8) + 'px';
    tt.style.display = 'block';
  }

  function _attachDotTooltip(canvas, dots) {
    if (!canvas) return;
    canvas.style.cursor = 'pointer';
    canvas.addEventListener('click', function(e) {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left, y = e.clientY - rect.top;
      let best = null, bd = 1e9;
      dots.forEach(d => { const dx = d.x - x, dy = d.y - y; const dist = Math.sqrt(dx*dx + dy*dy); if (dist < bd) { bd = dist; best = d; } });
      if (best && bd <= 22) {
        e.stopPropagation();
        _showChartTooltip(best.label + ' · ' + best.value, rect.left + best.x, rect.top + best.y);
      }
    });
  }

  function _getProgressRange() {
    const r = localStorage.getItem('progressRange');
    return ['1M','3M','6M','1Y','2Y'].includes(r) ? r : '3M';
  }

  function _setProgressRange(key) { localStorage.setItem('progressRange', key); }

  function _renderProgressRangeSeg() {
    const seg = document.getElementById('progress-range-seg');
    if (!seg) return;
    const cur = _getProgressRange();
    const N   = RANGE_OPTS.length;
    /* shared sliding-pill pattern */
    seg.classList.add('segmented-control');
    seg.style.overflow  = 'hidden';
    seg.style.transform = 'translateZ(0)';
    seg.innerHTML = '<div class="segment-pill"></div>' + RANGE_OPTS.map(o =>
      `<button class="chart-mode-btn${o.key === cur ? ' active' : ''}" data-range="${o.key}">${o.label}</button>`
    ).join('');

    function _sizePill() {
      const p = seg.querySelector('.segment-pill');
      if (p) p.style.width = 'calc((100% - 8px) / ' + N + ')';
    }
    requestAnimationFrame(() => { initSegmentedPill(seg); _sizePill(); });

    seg.querySelectorAll('.chart-mode-btn').forEach((btn, i) => {
      btn.addEventListener('click', () => {
        _setProgressRange(btn.dataset.range);
        seg.querySelectorAll('.chart-mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        moveSegmentedPill(seg, i, N);
        _sizePill();
        _rerangeAllCharts(btn.dataset.range);
      });
    });
  }

  function _rerangeAllCharts(rangeKey) {
    document.querySelectorAll('#progress-charts .chart-card').forEach(card => {
      if (!card._chartData) return;
      if (card.offsetParent !== null) _redrawCharts(card, rangeKey);
    });
    /* redraw warmup card if visible */
    const wuCard = document.getElementById('warmup-progress-card');
    if (wuCard && wuCard.offsetParent !== null) _redrawWarmupCharts(rangeKey);
    _progCatPending.forEach((pending, cat) => {
      _progCatPending.set(cat, pending);
    });
  }

  function _redrawCharts(card, rangeKey) {
    const { name, sessions, maxSets } = card._chartData;
    const w1 = document.getElementById('wrap-' + CSS.escape(name));
    if (w1) w1.innerHTML = '';
    const sub = card.querySelector('.chart-card-subtitle');
    if (sub) sub.textContent = sessions.length === 1
      ? 'Log another session to see your trend'
      : `${sessions.length} sessions`;
    /* Draw all sessions; the selected range only sets the visible window/zoom. */
    _drawChartForMode(name, sessions, maxSets, _progressMode);
  }

  function _redrawAllVisibleCharts() {
    document.querySelectorAll('#progress-charts .chart-card').forEach(card => {
      if (!card._chartData || card.offsetParent === null) return;
      _redrawCharts(card, _getProgressRange());
    });
  }

  function _buildChartCard(name, sessions) {
    const maxSets  = Math.max(...sessions.map(s => s.sets.length));
    const subtitle = sessions.length === 1
      ? 'Log another session to see your trend'
      : `${sessions.length} sessions`;

    const escapedName = CSS.escape(name);
    const card = document.createElement('div');
    card.className = 'chart-card';
    const hintDismissed = !!localStorage.getItem('chartTapHintDone');
    card.innerHTML = `
      <div class="chart-card-header">
        <div>
          <div class="chart-card-title">${name}</div>
          <div class="chart-card-subtitle">${subtitle}</div>
        </div>
      </div>
      <div class="chart-wrap" id="wrap-${escapedName}" style="cursor:pointer"></div>
      ${hintDismissed ? '' : `<div class="chart-tap-hint" id="hint-${escapedName}">Tap graph to switch view</div>`}`;

    card._chartData = { name, sessions, maxSets };

    /* wire tap-to-toggle — updates global mode and redraws all visible charts */
    requestAnimationFrame(() => {
      const wrap = document.getElementById('wrap-' + escapedName);
      if (!wrap) return;
      wrap.addEventListener('click', () => {
        _progressMode = _progressMode === 'reps' ? 'intensity' : 'reps';
        _redrawAllVisibleCharts();
        /* dismiss hint on first tap */
        if (!localStorage.getItem('chartTapHintDone')) {
          localStorage.setItem('chartTapHintDone', '1');
          document.querySelectorAll('.chart-tap-hint').forEach(h => {
            h.style.opacity = '0'; setTimeout(() => h.remove(), 300);
          });
        }
      });
    });

    return { card, maxSets };
  }

  function renderWeekSummary() {
    const el = document.getElementById('progress-week-summary');
    if (!el) return;

    const now    = new Date();
    const dow    = now.getDay(); // 0=Sun
    const daysBack = dow === 0 ? 6 : dow - 1; // Mon=0
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysBack);
    const mondayMs = monday.getTime();

    /* Last week Mon-Sun */
    const lastMonday  = new Date(monday); lastMonday.setDate(lastMonday.getDate() - 7);
    const lastSunday  = new Date(monday); lastSunday.setDate(lastSunday.getDate() - 1);
    lastSunday.setHours(23, 59, 59, 999);
    const lastMonMs = lastMonday.getTime();
    const lastSunMs = lastSunday.getTime();

    const thisWeekWorkouts = workouts.filter(w => {
      if (!w.date) return false;
      const t = new Date(w.date).getTime();
      return !isNaN(t) && t >= mondayMs;
    });

    if (!thisWeekWorkouts.length) { el.innerHTML = ''; return; }

    /* Stats */
    const sessions = thisWeekWorkouts.length;
    const totalSets = thisWeekWorkouts.reduce((s, w) =>
      s + (w.exercises || []).reduce((a, ex) => a + (ex.sets || []).length, 0), 0);

    const thisInt = Math.round(thisWeekWorkouts.reduce((s, w) =>
      s + (w.exercises || []).reduce((a, ex) =>
        a + calcSessionIntensity(ex.name, ex.sets || []), 0), 0));

    const lastInt = Math.round(workouts.filter(w => {
      const t = new Date(w.date).getTime();
      return !isNaN(t) && t >= lastMonMs && t <= lastSunMs;
    }).reduce((s, w) =>
      s + (w.exercises || []).reduce((a, ex) =>
        a + calcSessionIntensity(ex.name, ex.sets || []), 0), 0));

    /* Categories trained this week */
    const lib = getExLib();
    const nameTocat = {};
    EX_CATS.forEach(cat => (lib[cat] || []).forEach(n => { nameTocat[n] = cat; }));
    const catsTrainedSet = new Set();
    thisWeekWorkouts.forEach(w =>
      (w.exercises || []).forEach(ex => {
        const c = nameTocat[(ex.name || '').trim()];
        if (c) catsTrainedSet.add(c);
      })
    );
    const catColors = {
      'Push': '#FF6B6B', 'Pull': '#4ECDC4', 'Core': '#FFE66D',
      'Legs': '#A8E6CF', 'Weighted/Gym': '#C3A6FF'
    };

    /* Per-day intensity for the 7 bars (Mon=0 … Sun=6) */
    const dayInt = [0, 0, 0, 0, 0, 0, 0];
    thisWeekWorkouts.forEach(w => {
      const d = new Date(w.date);
      const idx = ((d.getDay() + 6) % 7); // Mon=0
      const int = (w.exercises || []).reduce((a, ex) =>
        a + calcSessionIntensity(ex.name, ex.sets || []), 0);
      dayInt[idx] += int;
    });
    const maxDay = Math.max(...dayInt, 1);
    const dayLabels = ['M','T','W','T','F','S','S'];
    const todayIdx = (now.getDay() + 6) % 7;

    const catTagsHtml = [...catsTrainedSet].map(c => `
      <span class="week-sum-cat-tag">
        <span class="week-sum-cat-dot" style="background:${catColors[c] || '#888'}"></span>${c}
      </span>`).join('');

    const barsHtml = dayInt.map((v, i) => {
      const heightPct = v > 0 ? Math.max(8, Math.round((v / maxDay) * 100)) : 0;
      const isToday   = i === todayIdx;
      const fillCls   = v === 0 ? 'rest' : isToday ? 'today' : '';
      return `<div class="week-sum-bar-col">
        <div class="week-sum-bar-track">
          <div class="week-sum-bar-fill ${fillCls}" style="height:${heightPct}%"></div>
        </div>
        <div class="week-sum-bar-lbl ${isToday ? 'today' : ''}">${dayLabels[i]}</div>
      </div>`;
    }).join('');

    const intDiff = lastInt > 0
      ? `<span class="int-last"> · ${fmtInt(lastInt)} last week</span>`
      : '';

    el.innerHTML = `<div class="week-sum-card">
      <div class="week-sum-title">This Week</div>
      <div class="week-sum-stats">
        <div class="week-sum-stat">
          <div class="week-sum-stat-val">${sessions}</div>
          <div class="week-sum-stat-lbl">Session${sessions !== 1 ? 's' : ''}</div>
        </div>
        <div class="week-sum-stat">
          <div class="week-sum-stat-val">${totalSets}</div>
          <div class="week-sum-stat-lbl">Sets</div>
        </div>
      </div>
      ${thisInt > 0 ? `<div class="week-sum-intensity">⚡ ${fmtInt(thisInt)} intensity${intDiff}</div>` : ''}
      ${catTagsHtml ? `<div class="week-sum-cats">${catTagsHtml}</div>` : ''}
      <div class="week-sum-bars">${barsHtml}</div>
    </div>`;
  }

  // === PROGRESS TAB ===
  function renderProgress() {
    const container = document.getElementById('progress-charts');
    const data      = buildExerciseData();
    const names     = Object.keys(data);

    if (!names.length) {
      container.innerHTML = emptyState('📈', 'No Data Yet', 'Complete more workouts to see your progress.');
      return;
    }

    container.innerHTML = '';
    _progCatPending = new Map();
    _progressMode   = 'reps';
    renderWeekSummary();
    _renderProgressRangeSeg();

    /* Build exercise→category reverse map from the library */
    const lib = getExLib();
    const nameTocat = {};
    EX_CATS.forEach(cat => (lib[cat] || []).forEach(n => { nameTocat[n] = cat; }));

    /* Group exercises by category, recording last session date */
    const catGroups = {}; /* cat → [{name, lastDate}] */
    names.forEach(name => {
      const sessions = data[name];
      const lastDate = sessions[sessions.length - 1]?.date || '';
      const cat = nameTocat[name] || 'Other';
      if (!catGroups[cat]) catGroups[cat] = [];
      catGroups[cat].push({ name, lastDate });
    });

    /* Sort each category: most-recently-performed first, never-performed alpha at bottom */
    Object.values(catGroups).forEach(arr =>
      arr.sort((a, b) => {
        if (!a.lastDate && !b.lastDate) return a.name.localeCompare(b.name);
        if (!a.lastDate) return 1;
        if (!b.lastDate) return -1;
        return new Date(b.lastDate) - new Date(a.lastDate);
      })
    );

    /* Find the category with the globally most-recent exercise */
    let mostRecentCat = null, mostRecentDate = '';
    [...EX_CATS, 'Other'].forEach(cat => {
      if (!catGroups[cat]) return;
      const d = catGroups[cat][0]?.lastDate || '';
      if (d > mostRecentDate) { mostRecentDate = d; mostRecentCat = cat; }
    });

    /* Load persisted collapse state; first visit → only mostRecentCat open */
    let savedCollapsed;
    try { savedCollapsed = JSON.parse(localStorage.getItem('progCatCollapsed') || 'null'); } catch(e) {}
    const getCollapsed = cat =>
      savedCollapsed ? (savedCollapsed[cat] !== undefined ? savedCollapsed[cat] : true)
                     : cat !== mostRecentCat;

    /* Strength Warmup folder at top */
    _renderWarmupProgressFolder(container);

    /* Render one folder per category that has data */
    [...EX_CATS, 'Other'].forEach(cat => {
      const group = catGroups[cat];
      if (!group || !group.length) return;

      const isCollapsed = getCollapsed(cat);

      const folder = document.createElement('div');
      folder.className = 'prog-cat-folder';

      const header = document.createElement('div');
      header.className = 'prog-cat-header';
      header.innerHTML = `<span class="prog-cat-name">${cat}</span><span class="prog-cat-chevron${isCollapsed ? '' : ' open'}">▸</span>`;
      header.addEventListener('click', () => _toggleProgCat(cat));
      folder.appendChild(header);

      const body = document.createElement('div');
      body.className = 'prog-cat-body';
      body.id = 'prog-cat-body-' + cat;
      if (isCollapsed) { body.style.display = 'none'; body.style.height = '0px'; }
      folder.appendChild(body);
      container.appendChild(folder);

      /* Build card elements and record pending draws */
      const pending = [];
      group.forEach(({ name }) => {
        const sessions       = data[name];
        const { card, maxSets } = _buildChartCard(name, sessions);
        body.appendChild(card);
        pending.push({ name, sessions, maxSets });
      });
      _progCatPending.set(cat, pending);

      /* Draw charts immediately for the expanded folder */
      if (!isCollapsed) {
        requestAnimationFrame(() => {
          const rk = _getProgressRange();
          pending.forEach(({ name, sessions, maxSets }) => {
            _drawChartForMode(name, _filterSessions(sessions, rk), maxSets, _progressMode);
          });
          _progCatPending.delete(cat);
        });
      }
    });

    /* Set sticky top offsets after layout */
    requestAnimationFrame(() => {
      const nav    = document.querySelector('#progress-screen .nav-bar');
      const navH   = nav ? nav.offsetHeight : 0;
      const rangeBar = document.getElementById('progress-range-bar');
      if (rangeBar) rangeBar.style.top = navH + 'px';
      const rangeBarH = rangeBar ? rangeBar.offsetHeight : 0;
      document.querySelectorAll('#progress-charts .prog-cat-header').forEach(h => {
        h.style.top = (navH + rangeBarH) + 'px';
      });
    });
  }

  function _toggleProgCat(cat) {
    const body   = document.getElementById('prog-cat-body-' + cat);
    const folder = body?.closest('.prog-cat-folder');
    if (!body || !folder) return;

    const expanding = body.style.display === 'none' || body.style.height === '0px';

    const chevron = folder.querySelector('.prog-cat-chevron');
    if (chevron) chevron.classList.toggle('open', expanding);

    /* Persist */
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem('progCatCollapsed') || '{}'); } catch(e) {}
    saved[cat] = !expanding;
    localStorage.setItem('progCatCollapsed', JSON.stringify(saved));

    if (expanding) {
      body.style.display = '';
      body.style.opacity = '0';
      const h = body.scrollHeight;
      body.style.height = '0px';
      requestAnimationFrame(() => {
        body.style.height  = h + 'px';
        body.style.opacity = '1';
        setTimeout(() => { if (saved[cat] === false) body.style.height = 'auto'; }, 225);
      });
    } else {
      body.style.height  = body.scrollHeight + 'px';
      body.style.opacity = '0';
      requestAnimationFrame(() => {
        body.style.height = '0px';
        setTimeout(() => { body.style.display = 'none'; }, 220);
      });
    }

    /* Draw charts lazily on first expand */
    if (expanding && _progCatPending.has(cat)) {
      const pending = _progCatPending.get(cat);
      _progCatPending.delete(cat);
      setTimeout(() => {
        const rk = _getProgressRange();
        pending.forEach(({ name, sessions, maxSets }) => {
          _drawChartForMode(name, _filterSessions(sessions, rk), maxSets, _progressMode);
        });
      }, 230);
    }
  }

  function _drawChartForMode(name, sessions, maxSets, mode) {
    if ((mode || 'reps') === 'intensity') {
      drawSessionTotalChart(name, sessions);
    } else {
      drawBestSetChart(name, sessions);
    }
  }

  // === CHART DRAWING ===
  function drawBestSetChart(name, sessions) {
    const wrap = document.getElementById('wrap-' + CSS.escape(name));
    if (!wrap) return;

    const dark = isDark();
    const dpr  = window.devicePixelRatio || 1;
    const containerW = wrap.clientWidth;
    const H    = Math.min(220, Math.max(140, Math.round(containerW * 0.48)));

    const PAD  = { top: 28, right: 20, bottom: 50, left: 44 };
    const _rangeKey = _getProgressRange();
    const _rawBest  = sessions.map(s => Math.max(0, ...s.sets.map(st => parseFloat(st.reps) || 0)));
    const _agg   = _aggregateChart(sessions.map(s => s.date), _rawBest, _rangeKey);
    const bestReps = _agg.values;
    const n = bestReps.length;
    const _scale = _chartXScale(_agg.times, _horizonDaysFor(_rangeKey, _agg.times), PAD, containerW);
    const W = _scale.canvasW;

    const canvas = document.createElement('canvas');
    canvas.className = 'chart-canvas';
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    wrap.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const cW   = W - PAD.left - PAD.right;
    const cH   = H - PAD.top  - PAD.bottom;
    const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

    const yTicks = niceYTicks(0, Math.max(...bestReps, 1), 4);
    const yMin   = yTicks[0];
    const yMax   = yTicks[yTicks.length - 1];

    const xOf = _scale.xOf;
    const yOf = v => PAD.top + (1 - (v - yMin) / (yMax - yMin)) * cH;

    const labelColor = dark ? 'rgba(160,160,168,0.85)' : 'rgba(60,60,67,0.50)';
    const gridColor  = dark ? 'rgba(255,255,255,0.10)' : 'rgba(60,60,67,0.08)';
    const dotFill    = dark ? '#242426' : '#FFFFFF';
    const blue       = dark ? '#0A84FF' : '#007AFF';
    const gold       = '#FFD700';

    /* grid */
    ctx.save();
    ctx.strokeStyle = gridColor;
    ctx.lineWidth   = 0.5;
    yTicks.forEach(t => {
      ctx.beginPath();
      ctx.moveTo(PAD.left, yOf(t));
      ctx.lineTo(PAD.left + cW, yOf(t));
      ctx.stroke();
    });
    ctx.restore();

    /* left y labels */
    ctx.save();
    ctx.fillStyle    = blue;
    ctx.font         = '400 10px -apple-system, sans-serif';
    ctx.textAlign    = 'right';
    ctx.textBaseline = 'middle';
    yTicks.forEach(t => ctx.fillText(t, PAD.left - 6, yOf(t)));
    ctx.restore();

    /* x labels */
    ctx.save();
    ctx.fillStyle    = labelColor;
    ctx.font         = '400 10px -apple-system, sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';
    if (n === 1) {
      ctx.fillText(_agg.labels[0], PAD.left + cW / 2, H - PAD.bottom + 9);
    } else {
      const xIdxs = _pickXLabelIdxs(_agg.labels.map(function(l, i){ return xOf(i); }), 50);
      _agg.labels.forEach((lbl, i) => { if (xIdxs.has(i)) ctx.fillText(lbl, xOf(i), H - PAD.bottom + 9); });
    }
    ctx.restore();

    /* axis labels */
    ctx.save();
    ctx.fillStyle    = labelColor;
    ctx.font         = '400 9px -apple-system, sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('Date', PAD.left + cW / 2, H - 4);
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.translate(9, PAD.top + cH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Reps', 0, 0);
    ctx.restore();

    const pts = bestReps.map((r, i) => ({ x: xOf(i), y: yOf(r) }));

    /* area fill */
    if (pts.length > 1) {
      const grad = ctx.createLinearGradient(0, PAD.top, 0, PAD.top + cH);
      grad.addColorStop(0, hexAlpha(blue, 0.13));
      grad.addColorStop(1, hexAlpha(blue, 0));
      ctx.beginPath();
      ctx.moveTo(pts[0].x, yOf(yMin));
      pts.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.lineTo(pts[pts.length - 1].x, yOf(yMin));
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
    }

    /* main line */
    if (pts.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = blue;
      ctx.lineWidth   = 2;
      ctx.lineJoin    = 'round';
      pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
      ctx.stroke();
    }

    /* trend line */
    if (pts.length > 1) {
      ctx.save();
      ctx.strokeStyle = dark ? 'rgba(255,255,255,0.28)' : 'rgba(60,60,67,0.20)';
      ctx.lineWidth   = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.lineJoin    = 'round';
      ctx.beginPath();
      bestReps.forEach((_, i) => {
        const win = bestReps.slice(Math.max(0, i - 6), i + 1);
        const avg = win.reduce((s, v) => s + v, 0) / win.length;
        i === 0 ? ctx.moveTo(xOf(i), yOf(clamp(avg, yMin, yMax)))
                : ctx.lineTo(xOf(i), yOf(clamp(avg, yMin, yMax)));
      });
      ctx.stroke();
      ctx.restore();
    }

    /* dots */
    pts.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2);
      ctx.fillStyle   = dotFill;
      ctx.fill();
      ctx.strokeStyle = blue;
      ctx.lineWidth   = 2.5;
      ctx.stroke();
    });

    /* PR dot */
    const prVal = Math.max(...bestReps);
    if (prVal > 0) {
      const prIdx = bestReps.lastIndexOf(prVal);
      ctx.beginPath();
      ctx.arc(xOf(prIdx), yOf(prVal), 5.5, 0, Math.PI * 2);
      ctx.fillStyle = '#FF2D55';
      ctx.fill();
    }

    /* mode indicator */
    ctx.save();
    ctx.font         = '500 9px -apple-system, sans-serif';
    ctx.fillStyle    = labelColor;
    ctx.textAlign    = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText('Reps', PAD.left + cW, PAD.top - 14);
    ctx.restore();

    _attachDotTooltip(canvas, bestReps.map((v, i) => ({ x: xOf(i), y: yOf(v), label: _agg.labels[i], value: String(Math.round(v)) })));
    _scrollChartRight(wrap);
  }

  function drawSessionTotalChart(name, sessions) {
    const wrap = document.getElementById('wrap-' + CSS.escape(name));
    if (!wrap) return;

    const _rawTotals = sessions.map(s => calcSessionIntensity(name, s.sets));
    if (_rawTotals.every(v => v === 0)) {
      wrap.innerHTML = '<div style="text-align:center;padding:.75rem 0 .875rem;font-size:.8125rem;color:var(--tertiary)">Log weight or reps to see intensity</div>';
      return;
    }

    const dark  = isDark();
    const dpr   = window.devicePixelRatio || 1;
    const containerW = wrap.clientWidth;
    const H     = Math.min(220, Math.max(140, Math.round(containerW * 0.48)));
    const color = '#FFD700';

    const PAD    = { top: 28, right: 20, bottom: 50, left: 44 };
    const _rangeKey = _getProgressRange();
    const _agg   = _aggregateChart(sessions.map(s => s.date), _rawTotals, _rangeKey);
    const totals = _agg.values;
    const n      = totals.length;
    const _scale = _chartXScale(_agg.times, _horizonDaysFor(_rangeKey, _agg.times), PAD, containerW);
    const W = _scale.canvasW;

    const canvas = document.createElement('canvas');
    canvas.className = 'chart-canvas';
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    wrap.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const cW     = W - PAD.left - PAD.right;
    const cH     = H - PAD.top  - PAD.bottom;
    const clamp  = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

    const yTicks = niceYTicks(0, Math.max(...totals, 1), 4);
    const yMin   = yTicks[0];
    const yMax   = yTicks[yTicks.length - 1];

    const xOf = _scale.xOf;
    const yOf = v => PAD.top + (1 - (v - yMin) / (yMax - yMin)) * cH;

    const labelColor = dark ? 'rgba(160,160,168,0.85)' : 'rgba(60,60,67,0.50)';
    const gridColor  = dark ? 'rgba(255,255,255,0.10)' : 'rgba(60,60,67,0.08)';
    const dotFill    = dark ? '#242426' : '#FFFFFF';
    const trendColor = dark ? 'rgba(255,255,255,0.28)' : 'rgba(60,60,67,0.20)';

    /* grid */
    ctx.save();
    ctx.strokeStyle = gridColor;
    ctx.lineWidth   = 0.5;
    yTicks.forEach(t => {
      ctx.beginPath(); ctx.moveTo(PAD.left, yOf(t)); ctx.lineTo(PAD.left + cW, yOf(t)); ctx.stroke();
    });
    ctx.restore();

    /* y labels */
    ctx.save();
    ctx.fillStyle    = color;
    ctx.font         = '400 10px -apple-system, sans-serif';
    ctx.textAlign    = 'right';
    ctx.textBaseline = 'middle';
    yTicks.forEach(t => ctx.fillText(fmtInt(t), PAD.left - 6, yOf(t)));
    ctx.restore();

    /* x labels */
    ctx.save();
    ctx.fillStyle    = labelColor;
    ctx.font         = '400 10px -apple-system, sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';
    if (n === 1) {
      ctx.fillText(_agg.labels[0], PAD.left + cW / 2, H - PAD.bottom + 9);
    } else {
      const xIdxs = _pickXLabelIdxs(_agg.labels.map(function(l, i){ return xOf(i); }), 50);
      _agg.labels.forEach((lbl, i) => { if (xIdxs.has(i)) ctx.fillText(lbl, xOf(i), H - PAD.bottom + 9); });
    }
    ctx.restore();

    /* axis labels */
    ctx.save();
    ctx.fillStyle    = labelColor;
    ctx.font         = '400 9px -apple-system, sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('Date', PAD.left + cW / 2, H - 4);
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.translate(9, PAD.top + cH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Intensity', 0, 0);
    ctx.restore();

    const pts = totals.map((v, i) => ({ x: xOf(i), y: yOf(v) }));

    /* area fill */
    if (pts.length > 1) {
      const grad = ctx.createLinearGradient(0, PAD.top, 0, PAD.top + cH);
      grad.addColorStop(0, hexAlpha(color, 0.15));
      grad.addColorStop(1, hexAlpha(color, 0));
      ctx.beginPath();
      ctx.moveTo(pts[0].x, yOf(yMin));
      pts.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.lineTo(pts[pts.length - 1].x, yOf(yMin));
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
    }

    /* main line */
    if (pts.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth   = 2;
      ctx.lineJoin    = 'round';
      pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
      ctx.stroke();
    }

    /* trend line */
    if (pts.length > 1) {
      ctx.save();
      ctx.strokeStyle = trendColor;
      ctx.lineWidth   = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.lineJoin    = 'round';
      ctx.beginPath();
      totals.forEach((_, i) => {
        const win = totals.slice(Math.max(0, i - 6), i + 1);
        const avg = win.reduce((a, v) => a + v, 0) / win.length;
        i === 0 ? ctx.moveTo(xOf(i), yOf(clamp(avg, yMin, yMax)))
                : ctx.lineTo(xOf(i), yOf(clamp(avg, yMin, yMax)));
      });
      ctx.stroke();
      ctx.restore();
    }

    /* dots */
    pts.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2);
      ctx.fillStyle   = dotFill;
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth   = 2.5;
      ctx.stroke();
    });

    /* PR dot (highest intensity) */
    const prVal = Math.max(...totals);
    if (prVal > 0) {
      const prIdx = totals.lastIndexOf(prVal);
      ctx.beginPath();
      ctx.arc(xOf(prIdx), yOf(prVal), 5.5, 0, Math.PI * 2);
      ctx.fillStyle = '#FF2D55';
      ctx.fill();
    }

    /* mode indicator — top-right, muted */
    ctx.save();
    ctx.font         = '500 9px -apple-system, sans-serif';
    ctx.fillStyle    = labelColor;
    ctx.textAlign    = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText('⚡ Intensity', PAD.left + cW, PAD.top - 14);
    ctx.restore();

    _attachDotTooltip(canvas, totals.map((v, i) => ({ x: xOf(i), y: yOf(v), label: _agg.labels[i], value: String(Math.round(v)) })));
    _scrollChartRight(wrap);
  }

  function _getWarmupSessions(rangeKey) {
    const times = _getLinkedStrengthTimes().filter(t => t.secs > 0);
    let filtered = times;
    if (rangeKey !== 'all') {
      if (rangeKey === '30') {
        filtered = times.slice(-30);
      } else {
        const now = new Date();
        let cutoff;
        if (rangeKey === '3M') cutoff = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        else if (rangeKey === '6M') cutoff = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
        else if (rangeKey === '1Y') cutoff = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        else if (rangeKey === '5Y') cutoff = new Date(now.getFullYear() - 5, now.getMonth(), now.getDate());
        if (cutoff) filtered = times.filter(t => new Date(t.date) >= cutoff);
      }
    }
    return filtered.map(t => {
      const d = new Date(t.date);
      return { secs: t.secs, date: t.date, label: d.getDate() + ' ' + d.toLocaleDateString('en-US', { month: 'short' }) };
    });
  }

  function _renderWarmupProgressFolder(container) {
    const allSessions = _getWarmupSessions('all');
    if (!allSessions.length) return;

    const isCollapsed = (() => {
      try { const s = JSON.parse(localStorage.getItem('progCatCollapsed') || '{}'); return s['__warmup__'] !== false; }
      catch(e) { return false; }
    })();

    const folder = document.createElement('div');
    folder.className = 'prog-cat-folder';
    folder.id = 'warmup-progress-folder';

    const header = document.createElement('div');
    header.className = 'prog-cat-header';
    header.innerHTML = `<span class="prog-cat-name">🔥 Strength Warmup</span><span class="prog-cat-chevron${isCollapsed ? '' : ' open'}">▸</span>`;
    header.addEventListener('click', () => _toggleWarmupFolder());
    folder.appendChild(header);

    const body = document.createElement('div');
    body.className = 'prog-cat-body';
    body.id = 'prog-cat-body-__warmup__';
    if (isCollapsed) { body.style.display = 'none'; body.style.height = '0px'; }
    folder.appendChild(body);
    container.appendChild(folder);

    const card = _buildWarmupCard(allSessions);
    body.appendChild(card);

    if (!isCollapsed) {
      /* defer until layout is complete so canvas has width */
      setTimeout(() => _drawWarmupCharts(_getWarmupSessions('all')), 0);
    }
  }

  function _toggleWarmupFolder() {
    const body   = document.getElementById('prog-cat-body-__warmup__');
    const folder = document.getElementById('warmup-progress-folder');
    if (!body || !folder) return;
    const expanding = body.style.display === 'none' || body.style.height === '0px';
    const chevron = folder.querySelector('.prog-cat-chevron');
    if (chevron) chevron.classList.toggle('open', expanding);
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem('progCatCollapsed') || '{}'); } catch(e) {}
    saved['__warmup__'] = !expanding;
    localStorage.setItem('progCatCollapsed', JSON.stringify(saved));
    if (expanding) {
      body.style.display = '';
      body.style.opacity = '0';
      const h = body.scrollHeight;
      body.style.height = '0px';
      requestAnimationFrame(() => {
        body.style.height  = h + 'px';
        body.style.opacity = '1';
        setTimeout(() => { body.style.height = 'auto'; }, 225);
      });
      /* draw charts on first expand */
      setTimeout(() => _drawWarmupCharts(_getWarmupSessions(_getProgressRange())), 230);
    } else {
      body.style.height  = body.scrollHeight + 'px';
      body.style.opacity = '0';
      requestAnimationFrame(() => {
        body.style.height = '0px';
        setTimeout(() => { body.style.display = 'none'; }, 220);
      });
    }
  }

  function _buildWarmupCard(allSessions) {
    const fmtT = s => `${Math.floor(s/60) > 0 ? Math.floor(s/60) + 'm ' : ''}${s%60}s`;
    const valid = allSessions.filter(s => s.secs > 0);
    const avg   = valid.length ? Math.round(valid.reduce((a, s) => a + s.secs, 0) / valid.length) : 0;
    const best  = valid.length ? Math.min(...valid.map(s => s.secs)) : 0;
    const count = valid.length;

    const card = document.createElement('div');
    card.className = 'chart-card';
    card.id = 'warmup-progress-card';
    card.innerHTML = `
      <div class="chart-card-header">
        <div>
          <div class="chart-card-title">Strength Warmup</div>
          <div class="chart-card-subtitle">${count} session${count !== 1 ? 's' : ''} completed</div>
        </div>
      </div>
      <div style="display:flex;gap:1.25rem;padding:.75rem 1rem .25rem">
        <div class="week-sum-stat">
          <div class="week-sum-stat-val" style="font-size:1.125rem;color:#FF9500">${avg ? fmtT(avg) : '—'}</div>
          <div class="week-sum-stat-lbl">Average</div>
        </div>
        <div class="week-sum-stat">
          <div class="week-sum-stat-val" style="font-size:1.125rem;color:#FFD700">${best ? fmtT(best) : '—'}</div>
          <div class="week-sum-stat-lbl">Best</div>
        </div>
        <div class="week-sum-stat">
          <div class="week-sum-stat-val" style="font-size:1.125rem">${count}</div>
          <div class="week-sum-stat-lbl">Sessions</div>
        </div>
      </div>
      <div class="chart-graph-label">Session Time</div>
      <div class="chart-graph-desc">Duration of each completed warmup</div>
      <div class="chart-wrap" id="warmup-wrap-time"></div>
      <div class="chart-graph-label" style="margin-top:.5rem">vs Average</div>
      <div class="chart-graph-desc">Session time vs rolling average — spot improvement or regression</div>
      <div class="chart-wrap" id="warmup-wrap-avg"></div>`;
    return card;
  }

  function _redrawWarmupCharts(rangeKey) {
    const wrap1 = document.getElementById('warmup-wrap-time');
    const wrap2 = document.getElementById('warmup-wrap-avg');
    if (wrap1) wrap1.innerHTML = '';
    if (wrap2) wrap2.innerHTML = '';
    /* Draw all sessions; the range only sets the visible window/zoom. */
    _drawWarmupCharts(_getWarmupSessions('all'));
  }

  function _drawWarmupCharts(sessions) {
    if (!sessions.length) return;
    _drawWarmupTimeChart(sessions);
    _drawWarmupAvgChart(sessions);
  }

  function _drawWarmupTimeChart(sessions) {
    const wrap = document.getElementById('warmup-wrap-time');
    if (!wrap) return;
    wrap.innerHTML = '';

    const dark   = isDark();
    const dpr    = window.devicePixelRatio || 1;
    const containerW = wrap.clientWidth;
    const H      = Math.min(220, Math.max(140, Math.round(containerW * 0.48)));
    const orange = '#FF9500';
    const gold   = '#FFD700';

    const PAD   = { top: 28, right: 20, bottom: 50, left: 44 };
    const _rangeKey = _getProgressRange();
    const _agg   = _aggregateChart(sessions.map(s => s.date), sessions.map(s => s.secs), _rangeKey);
    const secs   = _agg.values;
    const n      = secs.length;
    const _scale = _chartXScale(_agg.times, _horizonDaysFor(_rangeKey, _agg.times), PAD, containerW);
    const W = _scale.canvasW;

    const canvas = document.createElement('canvas');
    canvas.className = 'chart-canvas';
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    wrap.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const cW    = W - PAD.left - PAD.right;
    const cH    = H - PAD.top  - PAD.bottom;

    const yTicks = niceYTicks(0, Math.max(...secs, 30), 4);
    const yMin   = yTicks[0];
    const yMax   = yTicks[yTicks.length - 1];
    const xOf    = _scale.xOf;
    const yOf    = v => PAD.top + (1 - (v - yMin) / (yMax - yMin)) * cH;
    const clamp  = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

    const labelColor = dark ? 'rgba(160,160,168,0.85)' : 'rgba(60,60,67,0.50)';
    const gridColor  = dark ? 'rgba(255,255,255,0.10)' : 'rgba(60,60,67,0.08)';
    const dotFill    = dark ? '#242426' : '#FFFFFF';

    /* grid */
    ctx.save();
    ctx.strokeStyle = gridColor;
    ctx.lineWidth   = 0.5;
    yTicks.forEach(t => {
      ctx.beginPath(); ctx.moveTo(PAD.left, yOf(t)); ctx.lineTo(PAD.left + cW, yOf(t)); ctx.stroke();
    });
    ctx.restore();

    /* y labels — format as time */
    const fmtT = s => `${Math.floor(s/60) > 0 ? Math.floor(s/60) + 'm' : s + 's'}`;
    ctx.save();
    ctx.fillStyle    = orange;
    ctx.font         = '400 10px -apple-system, sans-serif';
    ctx.textAlign    = 'right';
    ctx.textBaseline = 'middle';
    yTicks.forEach(t => ctx.fillText(fmtT(t), PAD.left - 6, yOf(t)));
    ctx.restore();

    /* x labels */
    ctx.save();
    ctx.fillStyle    = labelColor;
    ctx.font         = '400 10px -apple-system, sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';
    const xIdxs = _pickXLabelIdxs(_agg.labels.map(function(l, i){ return xOf(i); }), 50);
    _agg.labels.forEach((lbl, i) => { if (xIdxs.has(i)) ctx.fillText(lbl, xOf(i), H - PAD.bottom + 9); });
    ctx.restore();

    /* axis label */
    ctx.save();
    ctx.fillStyle    = labelColor;
    ctx.font         = '400 9px -apple-system, sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('Date', PAD.left + cW / 2, H - 4);
    ctx.restore();

    const pts = secs.map((v, i) => ({ x: xOf(i), y: yOf(v) }));

    /* area fill */
    if (pts.length > 1) {
      const grad = ctx.createLinearGradient(0, PAD.top, 0, PAD.top + cH);
      grad.addColorStop(0, hexAlpha(orange, 0.18));
      grad.addColorStop(1, hexAlpha(orange, 0));
      ctx.beginPath();
      ctx.moveTo(pts[0].x, yOf(yMin));
      pts.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.lineTo(pts[pts.length - 1].x, yOf(yMin));
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
    }

    /* main line */
    if (pts.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = orange;
      ctx.lineWidth   = 2;
      ctx.lineJoin    = 'round';
      pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
      ctx.stroke();
    }

    /* trend line (dashed) */
    if (pts.length > 1) {
      ctx.save();
      ctx.strokeStyle = dark ? 'rgba(255,255,255,0.28)' : 'rgba(60,60,67,0.20)';
      ctx.lineWidth   = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.lineJoin    = 'round';
      ctx.beginPath();
      secs.forEach((_, i) => {
        const win = secs.slice(Math.max(0, i - 6), i + 1);
        const avg = win.reduce((a, v) => a + v, 0) / win.length;
        i === 0 ? ctx.moveTo(xOf(i), yOf(clamp(avg, yMin, yMax)))
                : ctx.lineTo(xOf(i), yOf(clamp(avg, yMin, yMax)));
      });
      ctx.stroke();
      ctx.restore();
    }

    /* dots */
    pts.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2);
      ctx.fillStyle   = dotFill;
      ctx.fill();
      ctx.strokeStyle = orange;
      ctx.lineWidth   = 2.5;
      ctx.stroke();
    });

    /* Best (fastest = min seconds) marker */
    const bestVal = Math.min(...secs);
    if (bestVal > 0) {
      const bestIdx = secs.indexOf(bestVal);
      const bx = xOf(bestIdx);
      const by = yOf(bestVal);
      ctx.beginPath();
      ctx.arc(bx, by, 5.5, 0, Math.PI * 2);
      ctx.fillStyle = gold;
      ctx.fill();
      /* "Best" label */
      ctx.save();
      ctx.fillStyle    = gold;
      ctx.font         = '600 9px -apple-system, sans-serif';
      ctx.textAlign    = bx > W / 2 ? 'right' : 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText('Best', bx + (bx > W / 2 ? -8 : 8), by - 2);
      ctx.restore();
    }

    _attachDotTooltip(canvas, secs.map((v, i) => ({ x: xOf(i), y: yOf(v), label: _agg.labels[i], value: fmtT(v) })));
    _scrollChartRight(wrap);
  }

  function _drawWarmupAvgChart(sessions) {
    const wrap = document.getElementById('warmup-wrap-avg');
    if (!wrap) return;
    wrap.innerHTML = '';

    const dark   = isDark();
    const dpr    = window.devicePixelRatio || 1;
    const containerW = wrap.clientWidth;
    const H      = Math.min(180, Math.max(120, Math.round(containerW * 0.38)));
    const orange = '#FF9500';

    const PAD     = { top: 14, right: 20, bottom: 50, left: 44 };
    const _rangeKey = _getProgressRange();
    const _agg   = _aggregateChart(sessions.map(s => s.date), sessions.map(s => s.secs), _rangeKey);
    const secs   = _agg.values;
    const n      = secs.length;
    const _scale = _chartXScale(_agg.times, _horizonDaysFor(_rangeKey, _agg.times), PAD, containerW);
    const W = _scale.canvasW;

    const canvas = document.createElement('canvas');
    canvas.className = 'chart-canvas';
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    wrap.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    /* cumulative rolling average up to each point */
    const avgs   = secs.map((_, i) => {
      const win = secs.slice(Math.max(0, i - 6), i + 1);
      return Math.round(win.reduce((a, v) => a + v, 0) / win.length);
    });

    const allVals = [...secs, ...avgs];
    const cW      = W - PAD.left - PAD.right;
    const cH      = H - PAD.top  - PAD.bottom;

    const yTicks  = niceYTicks(0, Math.max(...allVals, 30), 4);
    const yMin    = yTicks[0];
    const yMax    = yTicks[yTicks.length - 1];
    const xOf     = _scale.xOf;
    const yOf     = v => PAD.top + (1 - (v - yMin) / (yMax - yMin)) * cH;

    const labelColor  = dark ? 'rgba(160,160,168,0.85)' : 'rgba(60,60,67,0.50)';
    const gridColor   = dark ? 'rgba(255,255,255,0.10)' : 'rgba(60,60,67,0.08)';
    const dotFill     = dark ? '#242426' : '#FFFFFF';
    const avgColor    = dark ? 'rgba(255,255,255,0.45)' : 'rgba(60,60,67,0.35)';

    const fmtT = s => `${Math.floor(s/60) > 0 ? Math.floor(s/60) + 'm' : s + 's'}`;

    /* grid */
    ctx.save();
    ctx.strokeStyle = gridColor;
    ctx.lineWidth   = 0.5;
    yTicks.forEach(t => {
      ctx.beginPath(); ctx.moveTo(PAD.left, yOf(t)); ctx.lineTo(PAD.left + cW, yOf(t)); ctx.stroke();
    });
    ctx.restore();

    /* y labels */
    ctx.save();
    ctx.fillStyle    = orange;
    ctx.font         = '400 10px -apple-system, sans-serif';
    ctx.textAlign    = 'right';
    ctx.textBaseline = 'middle';
    yTicks.forEach(t => ctx.fillText(fmtT(t), PAD.left - 6, yOf(t)));
    ctx.restore();

    /* x labels */
    ctx.save();
    ctx.fillStyle    = labelColor;
    ctx.font         = '400 10px -apple-system, sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';
    const xIdxs = _pickXLabelIdxs(_agg.labels.map(function(l, i){ return xOf(i); }), 50);
    _agg.labels.forEach((lbl, i) => { if (xIdxs.has(i)) ctx.fillText(lbl, xOf(i), H - PAD.bottom + 9); });
    ctx.restore();

    /* axis labels */
    ctx.save();
    ctx.fillStyle    = labelColor;
    ctx.font         = '400 9px -apple-system, sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('Date', PAD.left + cW / 2, H - 4);
    ctx.restore();

    const pts    = secs.map((v, i) => ({ x: xOf(i), y: yOf(v) }));
    const avgPts = avgs.map((v, i) => ({ x: xOf(i), y: yOf(v) }));

    /* rolling avg line (muted, dashed) */
    if (avgPts.length > 1) {
      ctx.save();
      ctx.strokeStyle = avgColor;
      ctx.lineWidth   = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.lineJoin    = 'round';
      ctx.beginPath();
      avgPts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
      ctx.stroke();
      ctx.restore();
    }

    /* session line (orange, solid) */
    if (pts.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = orange;
      ctx.lineWidth   = 2;
      ctx.lineJoin    = 'round';
      pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
      ctx.stroke();
    }

    /* session dots */
    pts.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fillStyle   = dotFill;
      ctx.fill();
      ctx.strokeStyle = orange;
      ctx.lineWidth   = 2;
      ctx.stroke();
    });

    /* mini legend */
    ctx.save();
    ctx.font         = '500 9px -apple-system, sans-serif';
    ctx.textBaseline = 'middle';
    const lY    = PAD.top - 10;
    const dotR  = 3, gap = 4, spacing = 14;
    const lbW1  = ctx.measureText('Session').width;
    const lbW2  = ctx.measureText('Avg (7-session)').width;
    const totW  = dotR * 2 + gap + lbW1 + spacing + dotR * 2 + gap + lbW2;
    let lCur    = PAD.left + cW / 2 - totW / 2;
    ctx.fillStyle = orange;
    ctx.beginPath(); ctx.arc(lCur + dotR, lY, dotR, 0, Math.PI * 2); ctx.fill();
    lCur += dotR * 2 + gap;
    ctx.fillText('Session', lCur, lY);
    lCur += lbW1 + spacing;
    ctx.fillStyle = avgColor;
    ctx.beginPath(); ctx.arc(lCur + dotR, lY, dotR, 0, Math.PI * 2); ctx.fill();
    lCur += dotR * 2 + gap;
    ctx.fillText('Avg (7-session)', lCur, lY);
    ctx.restore();

    _attachDotTooltip(canvas, secs.map((v, i) => ({ x: xOf(i), y: yOf(v), label: _agg.labels[i], value: fmtT(v) })));
    _scrollChartRight(wrap);
  }

  function drawChart(name, sessions, maxSets) {
    const wrap = document.getElementById('wrap-' + CSS.escape(name));
    if (!wrap) return;

    const dark = isDark();
    const dpr  = window.devicePixelRatio || 1;
    const W    = wrap.clientWidth;
    const H    = Math.min(220, Math.max(140, Math.round(W * 0.48)));

    const canvas = document.createElement('canvas');
    canvas.className    = 'chart-canvas';
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';
    canvas.width        = W * dpr;
    canvas.height       = H * dpr;
    wrap.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const PAD = { top: 14, right: 20, bottom: 38, left: 36 };
    const cW  = W - PAD.left - PAD.right;
    const cH  = H - PAD.top  - PAD.bottom;

    /* Best set per session: highest-rep set from each session */
    const bestReps = sessions.map(s => Math.max(0, ...s.sets.map(st => st.reps)));

    const yTicks  = niceYTicks(0, Math.max(...bestReps, 1), 4);
    const yMin    = yTicks[0];
    const yMax    = yTicks[yTicks.length - 1];

    const xOf = i => sessions.length === 1
      ? PAD.left + cW / 2
      : PAD.left + (i / (sessions.length - 1)) * cW;
    const yOf = r => PAD.top + (1 - (r - yMin) / (yMax - yMin)) * cH;
    const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

    const labelColor = dark ? 'rgba(160,160,168,0.85)' : 'rgba(60,60,67,0.50)';
    const gridColor  = dark ? 'rgba(255,255,255,0.10)' : 'rgba(60,60,67,0.08)';
    const dotFill    = dark ? '#242426' : '#FFFFFF';
    const color      = setColor(0);

    /* grid */
    ctx.save();
    ctx.strokeStyle = gridColor;
    ctx.lineWidth   = 0.5;
    yTicks.forEach(t => {
      ctx.beginPath();
      ctx.moveTo(PAD.left, yOf(t));
      ctx.lineTo(PAD.left + cW, yOf(t));
      ctx.stroke();
    });
    ctx.restore();

    /* y-axis labels */
    ctx.save();
    ctx.fillStyle    = labelColor;
    ctx.font         = '400 10px -apple-system, sans-serif';
    ctx.textAlign    = 'right';
    ctx.textBaseline = 'middle';
    yTicks.forEach(t => ctx.fillText(t, PAD.left - 7, yOf(t)));
    ctx.restore();

    /* x-axis labels */
    ctx.save();
    ctx.fillStyle    = labelColor;
    ctx.font         = '400 10px -apple-system, sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';
    const xIdxs = pickLabelIdxs(sessions.length, 5);
    sessions.forEach((s, i) => {
      if (xIdxs.has(i)) ctx.fillText(s.label, xOf(i), H - PAD.bottom + 9);
    });
    ctx.restore();

    const pts = bestReps.map((r, i) => ({ x: xOf(i), y: yOf(r) }));

    /* area fill + data line */
    if (pts.length > 1) {
      const grad = ctx.createLinearGradient(0, PAD.top, 0, PAD.top + cH);
      grad.addColorStop(0, hexAlpha(color, 0.14));
      grad.addColorStop(1, hexAlpha(color, 0));
      ctx.beginPath();
      ctx.moveTo(pts[0].x, yOf(yMin));
      pts.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.lineTo(pts[pts.length - 1].x, yOf(yMin));
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth   = 2;
      ctx.lineJoin    = 'round';
      pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
      ctx.stroke();
    }

    /* trend line: 5-session rolling average */
    if (pts.length > 1) {
      const trendColor = dark ? 'rgba(255,255,255,0.30)' : 'rgba(60,60,67,0.22)';
      ctx.save();
      ctx.strokeStyle = trendColor;
      ctx.lineWidth   = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.lineJoin    = 'round';
      ctx.beginPath();
      bestReps.forEach((_, i) => {
        const window = bestReps.slice(Math.max(0, i - 6), i + 1);
        const avg = window.reduce((s, v) => s + v, 0) / window.length;
        i === 0 ? ctx.moveTo(xOf(i), yOf(clamp(avg, yMin, yMax)))
                : ctx.lineTo(xOf(i), yOf(clamp(avg, yMin, yMax)));
      });
      ctx.stroke();
      ctx.restore();
    }

    /* dots */
    pts.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2);
      ctx.fillStyle   = dotFill;
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth   = 2.5;
      ctx.stroke();
    });

    /* PR marker: gold dot + label on the all-time best session */
    const prVal = Math.max(...bestReps);
    if (prVal > 0) {
      const prIdx = bestReps.lastIndexOf(prVal);
      const px = xOf(prIdx);
      const py = yOf(prVal);
      ctx.beginPath();
      ctx.arc(px, py, 5.5, 0, Math.PI * 2);
      ctx.fillStyle = '#FFD700';
      ctx.fill();
      ctx.save();
      ctx.fillStyle    = '#FFD700';
      ctx.font         = '700 9px -apple-system, sans-serif';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText('PR', px, py - 7);
      ctx.restore();
    }
  }

  function drawIntensityWithPR(name, sessions) {
    const wrap = document.getElementById('wrap-' + CSS.escape(name));
    if (!wrap) return;

    const values = sessions.map(s => calcSessionIntensity(name, s.sets));
    if (values.every(v => v === 0)) {
      wrap.innerHTML = '<div style="text-align:center;padding:1.5rem 0;font-size:.8125rem;color:var(--tertiary)">Log weight or reps to see intensity</div>';
      return;
    }

    const dark = isDark();
    const dpr  = window.devicePixelRatio || 1;
    const W    = wrap.clientWidth;
    const H    = Math.min(220, Math.max(140, Math.round(W * 0.48)));

    const canvas = document.createElement('canvas');
    canvas.className    = 'chart-canvas';
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';
    canvas.width        = W * dpr;
    canvas.height       = H * dpr;
    wrap.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const PAD = { top: 14, right: 20, bottom: 38, left: 44 };
    const cW  = W - PAD.left - PAD.right;
    const cH  = H - PAD.top  - PAD.bottom;

    const yTicks = niceYTicks(0, Math.max(...values, 1), 4);
    const yMin   = yTicks[0];
    const yMax   = yTicks[yTicks.length - 1];

    const xOf = i => sessions.length === 1
      ? PAD.left + cW / 2
      : PAD.left + (i / (sessions.length - 1)) * cW;
    const yOf = v => PAD.top + (1 - (v - yMin) / (yMax - yMin)) * cH;
    const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

    const color      = dark ? '#0A84FF' : '#007AFF';
    const labelColor = dark ? 'rgba(160,160,168,0.85)' : 'rgba(60,60,67,0.50)';
    const gridColor  = dark ? 'rgba(255,255,255,0.10)' : 'rgba(60,60,67,0.08)';
    const dotFill    = dark ? '#242426' : '#FFFFFF';

    /* grid */
    ctx.save();
    ctx.strokeStyle = gridColor;
    ctx.lineWidth   = 0.5;
    yTicks.forEach(t => {
      ctx.beginPath();
      ctx.moveTo(PAD.left, yOf(t));
      ctx.lineTo(PAD.left + cW, yOf(t));
      ctx.stroke();
    });
    ctx.restore();

    /* y-axis labels */
    ctx.save();
    ctx.fillStyle    = labelColor;
    ctx.font         = '400 10px -apple-system, sans-serif';
    ctx.textAlign    = 'right';
    ctx.textBaseline = 'middle';
    yTicks.forEach(t => ctx.fillText(fmtInt(t), PAD.left - 7, yOf(t)));
    ctx.restore();

    /* x-axis labels */
    ctx.save();
    ctx.fillStyle    = labelColor;
    ctx.font         = '400 10px -apple-system, sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';
    const xIdxs = pickLabelIdxs(sessions.length, 5);
    sessions.forEach((s, i) => {
      if (xIdxs.has(i)) ctx.fillText(s.label, xOf(i), H - PAD.bottom + 9);
    });
    ctx.restore();

    const pts = values.map((v, i) => ({ x: xOf(i), y: yOf(v) }));

    /* area fill + data line */
    if (pts.length > 1) {
      const grad = ctx.createLinearGradient(0, PAD.top, 0, PAD.top + cH);
      grad.addColorStop(0, hexAlpha(color, 0.14));
      grad.addColorStop(1, hexAlpha(color, 0));
      ctx.beginPath();
      ctx.moveTo(pts[0].x, yOf(yMin));
      pts.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.lineTo(pts[pts.length - 1].x, yOf(yMin));
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth   = 2;
      ctx.lineJoin    = 'round';
      pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
      ctx.stroke();
    }

    /* trend line: 7-session rolling average */
    if (pts.length > 1) {
      const trendColor = dark ? 'rgba(255,255,255,0.30)' : 'rgba(60,60,67,0.22)';
      ctx.save();
      ctx.strokeStyle = trendColor;
      ctx.lineWidth   = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.lineJoin    = 'round';
      ctx.beginPath();
      values.forEach((_, i) => {
        const win = values.slice(Math.max(0, i - 6), i + 1);
        const avg = win.reduce((s, v) => s + v, 0) / win.length;
        i === 0 ? ctx.moveTo(xOf(i), yOf(clamp(avg, yMin, yMax)))
                : ctx.lineTo(xOf(i), yOf(clamp(avg, yMin, yMax)));
      });
      ctx.stroke();
      ctx.restore();
    }

    /* dots */
    pts.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2);
      ctx.fillStyle   = dotFill;
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth   = 2.5;
      ctx.stroke();
    });

    /* PR marker */
    const prVal = Math.max(...values);
    if (prVal > 0) {
      const prIdx = values.lastIndexOf(prVal);
      const px = xOf(prIdx);
      const py = yOf(prVal);
      ctx.beginPath();
      ctx.arc(px, py, 5.5, 0, Math.PI * 2);
      ctx.fillStyle = '#FFD700';
      ctx.fill();
      ctx.save();
      ctx.fillStyle    = '#FFD700';
      ctx.font         = '700 9px -apple-system, sans-serif';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText('PR', px, py - 7);
      ctx.restore();
    }
  }

  function drawIntensityChart(name, sessions) {
    const wrap = document.getElementById('int-wrap-' + CSS.escape(name));
    if (!wrap) return;

    const intensities = sessions.map(s => calcSessionIntensity(name, s.sets));
    if (intensities.every(v => v === 0)) {
      wrap.innerHTML = '<div style="text-align:center;padding:.75rem 0 .875rem;font-size:.8125rem;color:var(--tertiary)">Log weight or reps to see intensity</div>';
      return;
    }

    const dark = isDark();
    const dpr  = window.devicePixelRatio || 1;
    const W    = wrap.clientWidth;
    const H    = Math.min(160, Math.max(110, Math.round(W * 0.38)));

    const canvas = document.createElement('canvas');
    canvas.className    = 'chart-canvas';
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';
    canvas.width        = W * dpr;
    canvas.height       = H * dpr;
    wrap.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const PAD   = { top: 10, right: 20, bottom: 34, left: 44 };
    const cW    = W - PAD.left - PAD.right;
    const cH    = H - PAD.top  - PAD.bottom;
    const color = dark ? '#0A84FF' : '#007AFF';

    const yTicks  = niceYTicks(0, Math.max(...intensities, 1), 3);
    const yMin    = yTicks[0];
    const yMax    = yTicks[yTicks.length - 1];
    const xOf = i => sessions.length === 1 ? PAD.left + cW / 2
                   : PAD.left + (i / (sessions.length - 1)) * cW;
    const yOf = v => PAD.top + (1 - (v - yMin) / (yMax - yMin)) * cH;

    const labelColor = dark ? 'rgba(160,160,168,0.85)' : 'rgba(60,60,67,0.50)';
    const gridColor  = dark ? 'rgba(255,255,255,0.10)' : 'rgba(60,60,67,0.08)';

    /* grid lines */
    ctx.save();
    ctx.strokeStyle = gridColor;
    ctx.lineWidth   = 0.5;
    yTicks.forEach(t => {
      ctx.beginPath(); ctx.moveTo(PAD.left, yOf(t)); ctx.lineTo(PAD.left + cW, yOf(t)); ctx.stroke();
    });
    ctx.restore();

    /* y-axis labels */
    ctx.save();
    ctx.fillStyle    = labelColor;
    ctx.font         = '400 10px -apple-system, sans-serif';
    ctx.textAlign    = 'right';
    ctx.textBaseline = 'middle';
    yTicks.forEach(t => ctx.fillText(fmtInt(t), PAD.left - 6, yOf(t)));
    ctx.restore();

    /* x-axis labels */
    ctx.save();
    ctx.fillStyle    = labelColor;
    ctx.font         = '400 10px -apple-system, sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';
    const xIdxs = pickLabelIdxs(sessions.length, 5);
    sessions.forEach((s, i) => { if (xIdxs.has(i)) ctx.fillText(s.label, xOf(i), H - PAD.bottom + 7); });
    ctx.restore();

    const pts = intensities.map((v, i) => ({ x: xOf(i), y: yOf(v) }));

    if (pts.length > 1) {
      const grad = ctx.createLinearGradient(0, PAD.top, 0, PAD.top + cH);
      grad.addColorStop(0, hexAlpha(color, 0.14));
      grad.addColorStop(1, hexAlpha(color, 0));
      ctx.beginPath();
      ctx.moveTo(pts[0].x, yOf(yMin));
      pts.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.lineTo(pts[pts.length - 1].x, yOf(yMin));
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth   = 2;
      ctx.lineJoin    = 'round';
      pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
      ctx.stroke();
    }

    const dotFill = dark ? '#242426' : '#FFFFFF';
    pts.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fillStyle   = dotFill;
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth   = 2.5;
      ctx.stroke();
    });
  }

  function hexAlpha(hex, a) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${a})`;
  }

  function niceYTicks(min, max, count) {
    const rawStep  = (max - min || 1) / count;
    const niceStep = [1, 2, 5, 10, 15, 20, 25, 50, 100].find(s => s >= rawStep) || Math.ceil(rawStep);
    const ticks    = [];
    for (let t = 0; t <= max + niceStep; t += niceStep) {
      ticks.push(t);
      if (t >= max) break;
    }
    return ticks;
  }

  function pickLabelIdxs(total, max) {
    const set = new Set([0, total - 1]);
    if (total <= max) { for (let i = 0; i < total; i++) set.add(i); }
    else {
      const step = Math.round((total - 1) / (max - 1));
      for (let i = 0; i < total; i += step) set.add(i);
    }
    return set;
  }
