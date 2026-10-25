  // === SUMMARY LAYOUT ===
  /* Summary tab rendering: layout markup, goals, highlights, active journeys,
     last training, XP card. Loaded right after app.js; the markup is injected
     synchronously at load so later scripts find every element. */

  (function _sumInjectLayout() {
    const ph = document.getElementById('summary-sections');
    if (!ph) return;
    ph.insertAdjacentHTML('beforebegin', `
    <div id="xp-card" class="sum-xp-wrap"></div>
    <div id="active-journeys-section"></div>
    <div id="goals-section-label" class="sum-title" style="display:none">Goals</div>
    <div id="goals-section" class="sum-goals" style="display:none"></div>
    <div id="highlights-section"><div id="highlights-list" class="sum-chips"></div></div>
    <div class="sum-title">Last training</div>
    <div id="recent-list">
      <div class="empty-state">
        <span class="empty-state-emoji">🏋️</span>
        <div class="empty-state-title">No Workouts Yet</div>
        Tap Start Workout to log your first session.
      </div>
    </div>
    <div style="height:7rem"></div>
`);
    ph.remove();
  })();

  /* ── Render: recent (home) ──────────────────────────────── */
  function _recentCard(w) {
    const d       = new Date(w.date);
    const dateStr = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const mins    = Math.floor(w.duration / 60);
    const secs    = w.duration % 60;
    const durStr  = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    return `<div class="sum-last" data-wid="${w.id}">
        <div class="sum-last-main">
          <div class="sum-last-plan">${w.planName ? w.planName : 'Workout'}</div>
          <div class="sum-last-meta">${dateStr} · ${durStr}</div>
        </div>
        <span class="sum-chev">›</span>
      </div>`;
  }

  function renderRecent() {
    const el = document.getElementById('recent-list');
    if (!workouts.length) {
      el.innerHTML = emptyState('🏋️', 'No Workouts Yet', 'Tap Start Workout to log your first session.');
      updateRepeatBtn();
      return;
    }
    el.innerHTML = _recentCard(workouts[0]);
    if (!el._sumBound) {            /* one delegated listener, survives re-renders */
      el._sumBound = true;
      el.addEventListener('click', e => {
        const c = e.target.closest('.sum-last');
        if (c) openWorkoutDetail(Number(c.dataset.wid));
      });
    }
    updateRepeatBtn();
  }

  /* ── Summary tab: active journeys ───────────────────────── */
  const _JOURNEY_COLORS = ['#BF5AF2', '#0A84FF', '#30D158', '#FF9F0A', '#FF375F', '#64D2FF'];
  /* Stable color from a hash of the journey id (not list position). */
  function getJourneyColor(journeyId) {
    const str = String(journeyId);
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
    return _JOURNEY_COLORS[h % _JOURNEY_COLORS.length];
  }
  function renderActiveJourneys() {
    const el = document.getElementById('active-journeys-section');
    if (!el) return;
    /* Read fresh from localStorage every render so the section shows on first
       load without needing to visit the Journeys tab first. */
    try { _journeys = JSON.parse(localStorage.getItem('trainingJourneys') || '[]'); } catch (e) { _journeys = []; }
    const active = _journeys.filter(j => (j.completedSessions || []).length > 0);
    if (!active.length) { el.innerHTML = ''; return; }
    // === JOURNEY STACK ===
    /* 2+ journeys render through createCardStack (stack.js); state lives in _cardStackState. */
    const n = active.length;
    el.innerHTML = `<div class="sum-title${n >= 2 ? ' sum-title-tap' : ''}" id="sum-j-title">Journeys${n >= 2 ? ' · ' + n : ''}</div><div id="sum-jstack"></div>`;
    const cards = [];
    const usedColors = new Set();
    active.forEach(j => {
      /* hash color; if already shown on another card take the next free palette color */
      let color = getJourneyColor(j.id);
      if (usedColors.size < _JOURNEY_COLORS.length) {
        let idx = _JOURNEY_COLORS.indexOf(color);
        while (usedColors.has(_JOURNEY_COLORS[idx])) idx = (idx + 1) % _JOURNEY_COLORS.length;
        color = _JOURNEY_COLORS[idx];
      }
      usedColors.add(color);
      const initial = _esc((String(j.name || '').trim().charAt(0) || '•').toUpperCase());
      const total = _journeyTotalSessions(j), done = (j.completedSessions || []).length;
      const next = _journeyNextSession(j);
      const card = document.createElement('div');
      card.className = 'sum-journey';
      card.style.setProperty('--jc', color);
      card.style.setProperty('--jc-bg', color + '33');
      card.innerHTML = `
        <div class="sum-j-head"><div class="sum-j-badge">${initial}</div><div class="sum-j-name">${_esc(j.name)}</div></div>
        <div class="sum-j-prog"><div class="sum-bar"><div class="sum-bar-fill" style="width:${total ? (done / total * 100) : 0}%"></div></div><span class="sum-j-count">${done} / ${total} sessions</span></div>
        <div class="sum-j-foot">
        ${next
          ? `<div class="sum-j-next"><span class="sum-j-next-lbl">NEXT</span><span class="sum-j-next-name">${_esc(next.s.planName || next.s.day || ('Session ' + (next.si+1)))} · Week ${next.week}</span></div>
             <button class="sum-continue">Continue</button>`
          : `<div class="sum-j-next" style="color:#34C759">✓ All sessions complete</div>`}
        </div>`;
      const btn = card.querySelector('.sum-continue');
      if (btn) btn.addEventListener('click', e => {
        e.stopPropagation();        /* Continue never toggles the stack */
        journeyReturnTo = 'summary';      /* back from journey detail returns here */
        _startNextJourneySession(j.id);   /* opens journey detail, never starts the workout */
      });
      cards.push(card);
    });
    createCardStack(document.getElementById('sum-jstack'), cards, 'journeys');
    bindCardStackHeader(document.getElementById('sum-j-title'), 'journeys');
  }

  /* ── Summary highlights ────────────────────────────────────── */
  function calcStreak() {
    if (!workouts.length) return 0;
    const fmt = d => d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate();
    const days = new Set(workouts.map(w => fmt(new Date(w.date))));
    const cur  = new Date();
    if (!days.has(fmt(cur))) {
      cur.setDate(cur.getDate() - 1);
      if (!days.has(fmt(cur))) return 0;
    }
    let streak = 0;
    while (days.has(fmt(cur))) { streak++; cur.setDate(cur.getDate() - 1); }
    return streak;
  }

  /* Best single-set value for an exercise across a list of workouts.
     Uses volume (reps * max(1, kg)) so weighted exercises compare fairly. */
  function _bestSetVol(workoutList, exName) {
    let best = 0;
    workoutList.forEach(w => {
      (w.exercises || []).forEach(ex => {
        if ((ex.name || '').trim() !== exName) return;
        (ex.sets || []).forEach(s => {
          const reps = parseFloat(s.reps) || 0;
          const kg   = parseFloat(s.kg)   || 0;
          const vol  = reps * Math.max(1, kg);
          if (vol > best) best = vol;
        });
      });
    });
    return best;
  }

  /* New PRs set in the most recent workout — compares each exercise's best
     set-volume to the best across all previous workouts. */
  function findNewPRs() {
    if (workouts.length < 2) return [];
    const latest  = workouts[0];
    const history = workouts.slice(1);
    const results = [];
    const seen    = new Set();

    latest.exercises.forEach(ex => {
      const name = (ex.name || '').trim();
      if (!name || seen.has(name) || ex.killer) return;  // skip killer-set exercises (they're finishers, not rep PRs)
      seen.add(name);

      // Best set in this workout
      let latestVol = 0, latestReps = 0, latestKg = 0;
      ex.sets.forEach(s => {
        const reps = parseFloat(s.reps) || 0;
        const kg   = parseFloat(s.kg)   || 0;
        const vol  = reps * Math.max(1, kg);
        if (vol > latestVol) { latestVol = vol; latestReps = reps; latestKg = kg; }
      });
      if (latestVol <= 0) return;

      const prevBest = _bestSetVol(history, name);
      if (prevBest <= 0) return;   // first time ever — will appear as "first time" instead
      if (latestVol <= prevBest)  return;   // not a new record

      // Format display label
      const tb   = !!getExMeta(name).tb;
      const unit = tb ? 'secs' : 'reps';
      let label;
      if (latestKg > 0) {
        label = `${latestReps} reps @ ${latestKg}kg`;
      } else {
        label = `${latestReps} ${unit}`;
      }
      results.push({ name, label, gain: latestVol - prevBest });
    });

    return results.sort((a, b) => b.gain - a.gain);
  }

  /* Exercises tried for the first time in the most recent workout. */
  function findFirstTimeExercises() {
    if (!workouts.length) return [];
    const latest  = workouts[0];
    const history = workouts.slice(1);

    const prevNames = new Set();
    history.forEach(w => (w.exercises || []).forEach(ex => {
      if (ex.name) prevNames.add(ex.name.trim());
    }));

    const seen = new Set();
    const firsts = [];
    latest.exercises.forEach(ex => {
      const name = (ex.name || '').trim();
      if (!name || seen.has(name)) return;
      seen.add(name);
      if (!prevNames.has(name)) firsts.push(name);
    });
    return firsts;
  }

  function findBiggestImprovement() {
    if (workouts.length < 2) return null;
    const latestTotals = {};
    workouts[0].exercises.forEach(ex => {
      const t = ex.sets.reduce((s, st) => s + (parseInt(st.reps) || 0), 0);
      if (t > 0) latestTotals[ex.name] = t;
    });
    let best = null;
    /* Compare each exercise against its immediately previous session (first match looking back) */
    Object.keys(latestTotals).forEach(name => {
      for (let i = 1; i < workouts.length; i++) {
        const prevEx = (workouts[i].exercises || []).find(ex => (ex.name || '').trim() === name);
        if (!prevEx) continue;
        const prev = prevEx.sets.reduce((s, st) => s + (parseInt(st.reps) || 0), 0);
        if (!prev) break;
        const pct = Math.round(((latestTotals[name] - prev) / prev) * 100);
        if (pct > 0 && (!best || pct > best.pct)) best = { name, pct };
        break; /* only compare against the single most-recent previous session */
      }
    });
    return best;
  }

  function renderHighlights() {
    const section = document.getElementById('highlights-section');
    const list    = document.getElementById('highlights-list');
    if (!section || !list) return;
    if (!workouts.length) { section.style.display = 'none'; return; }

    const items = [];

    const _iconPR  = '🏆';
    const _iconNew = '<span style="color:#007AFF;font-size:1.25rem;line-height:1">✦</span>';
    const _iconUp  = '<span style="color:#30D158;font-size:1.375rem;font-weight:700;line-height:1">↑</span>';

    // 1. New PRs — aggregate into one card
    const prs = findNewPRs();
    if (prs.length === 1) {
      items.push({ icon: _iconPR, title: `New PR: ${prs[0].label}!`, body: prs[0].name });
    } else if (prs.length >= 2) {
      const names = prs.map(p => p.name);
      const preview = names.length <= 3
        ? names.join(', ')
        : names.slice(0, 2).join(', ') + ` +${names.length - 2} more`;
      items.push({ icon: _iconPR, title: `${prs.length} new PRs this session!`, body: preview });
    }

    // 2. First-time exercises — aggregate into one card
    const firsts = findFirstTimeExercises();
    if (firsts.length === 1) {
      items.push({ icon: _iconNew, title: `First time: ${firsts[0]}`, body: 'New movement unlocked!' });
    } else if (firsts.length >= 2) {
      const preview = firsts.length <= 3
        ? firsts.join(', ')
        : firsts.slice(0, 2).join(', ') + ` +${firsts.length - 2} more`;
      items.push({ icon: _iconNew, title: `Tried ${firsts.length} new exercises!`, body: preview });
    }

    // 3. Workout streak
    const streak = calcStreak();
    if (streak >= 2) {
      items.push({ icon: '🔥', title: `${streak}-Day Streak!`, body: 'Consistency is your superpower.' });
    }

    // 4. Biggest % improvement (if room)
    if (items.length < 3) {
      const imp = findBiggestImprovement();
      if (imp && imp.pct >= 5) {
        items.push({ icon: _iconUp, title: `+${imp.pct}% on ${imp.name}`, body: 'Keep pushing!' });
      }
    }

    if (!items.length) {
      section.style.display = 'none';
      list.innerHTML = '';
      return;
    }

    _sumHlClose();
    _sumHlItems = items.slice(0, 3);
    list.innerHTML = _sumHlItems.map((it, idx) => `<button class="sum-chip" data-hl="${idx}"><span class="sum-chip-ic">${it.icon}</span>${it.title}</button>`).join('');
    section.style.display = 'block';
    if (!list._sumBound) {          /* one delegated listener, survives re-renders */
      list._sumBound = true;
      list.addEventListener('click', e => {
        const chip = e.target.closest('.sum-chip');
        if (chip) _sumHlToggle(chip);
      });
    }
  }

  /* Highlight popover: one bubble at a time; outside tap / scroll closes it. */
  let _sumHlItems = [];
  let _sumHl = null;   /* { el, chip, onDown, onScroll, scroller } */
  function _sumHlClose() {
    if (!_sumHl) return;
    document.removeEventListener('pointerdown', _sumHl.onDown, true);
    _sumHl.scroller.removeEventListener('scroll', _sumHl.onScroll);
    _sumHl.list.removeEventListener('scroll', _sumHl.onScroll);
    _sumHl.el.remove();
    _sumHl = null;
  }
  function _sumHlToggle(chip) {
    const wasOpen = _sumHl && _sumHl.chip === chip;
    _sumHlClose();
    if (wasOpen) return;
    const it = _sumHlItems[Number(chip.dataset.hl)];
    if (!it) return;
    const el = document.createElement('div');
    el.className = 'sum-pop';
    el.innerHTML = `<div class="sum-pop-arrow"></div><div class="sum-pop-title">${it.title}</div><div class="sum-pop-body">${it.body}</div>`;
    document.body.appendChild(el);
    const r = chip.getBoundingClientRect(), cx = r.left + r.width / 2, w = el.offsetWidth, m = 12;
    const left = Math.max(m, Math.min(cx - w / 2, window.innerWidth - m - w));
    el.style.left = left + 'px';
    el.style.top  = (r.bottom + 10) + 'px';
    el.style.setProperty('--sum-arrow-x', Math.max(18, Math.min(cx - left, w - 18)) + 'px');
    requestAnimationFrame(() => el.classList.add('show'));
    const scroller = document.querySelector('#home-screen .scroll-area') || window;
    const list = document.getElementById('highlights-list');
    const onDown = e => { if (!el.contains(e.target) && !chip.contains(e.target)) _sumHlClose(); };
    const onScroll = () => _sumHlClose();
    document.addEventListener('pointerdown', onDown, true);
    scroller.addEventListener('scroll', onScroll, { passive: true });
    list.addEventListener('scroll', onScroll, { passive: true });
    _sumHl = { el, chip, onDown, onScroll, scroller, list };
  }

  function _makeGoalCard(name, current, target, unit) {
    const pct     = target > 0 ? Math.min(100, Math.round(current / target * 100)) : 0;
    const reached = current >= target && target > 0;
    const fillCls = reached ? 'goal-card-bar-fill reached' : 'goal-card-bar-fill';
    const msgText = reached ? 'Goal reached! 🎉' : `${fmtInt(current)} / ${fmtInt(target)} ${unit}`;
    const msgCls  = reached ? 'goal-card-msg reached' : 'goal-card-msg';
    return `<div class="goal-card">
      <div class="goal-card-name">${name}</div>
      <div class="goal-card-values">${fmtInt(current)}<span class="goal-target"> / ${fmtInt(target)} ${unit}</span></div>
      <div class="goal-card-bar-track"><div class="${fillCls}" style="width:${pct}%"></div></div>
      <div class="${msgCls}">${msgText}</div>
    </div>`;
  }

  /* ── Goal stack helpers ────────────────────────────────── */
  let _goalStackExpanded = false;

  function _toggleGoalStack(e) {
    if (e) e.stopPropagation();
    _goalStackExpanded = !_goalStackExpanded;
    _applyGoalStack(_goalStackExpanded, true);
  }

  function _applyGoalStack(expand, animate) {
    const stack = document.getElementById('goal-stack');
    if (!stack) return;
    const items = [...stack.querySelectorAll('.goal-stack-item')];
    if (!items.length) return;
    const GAP = 8;
    const PEEK = 20;

    if (expand) {
      stack.classList.add('expanded');
      const badge = stack.querySelector('.goal-stack-count');
      if (badge) badge.remove();
      let top = 0;
      items.forEach((item, i) => {
        const h = item.offsetHeight;
        item.style.transition = animate
          ? `top 300ms ease-out ${i * 50}ms, transform 300ms ease-out ${i * 50}ms, opacity 300ms ease-out ${i * 50}ms`
          : 'none';
        item.style.top = top + 'px';
        item.style.transform = 'scale(1)';
        item.style.opacity = '1';
        item.style.zIndex = String(items.length - i);
        item.style.pointerEvents = '';
        top += h + GAP;
      });
      stack.style.height = (top - GAP) + 'px';
    } else {
      stack.classList.remove('expanded');
      const h0 = items[0].offsetHeight;
      /* inject/update badge in top card */
      const topCard = items[0].querySelector('.goal-card');
      if (topCard) {
        let badge = topCard.querySelector('.goal-stack-count');
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'goal-stack-count';
          const nameEl = topCard.querySelector('.goal-card-name');
          if (nameEl) nameEl.appendChild(badge);
        }
        badge.textContent = '+' + (items.length - 1) + ' more';
      }
      items.forEach((item, i) => {
        const delay = animate ? `${(items.length - 1 - i) * 30}ms` : '0ms';
        item.style.transition = animate
          ? `top 250ms ease-in ${delay}, transform 250ms ease-in ${delay}, opacity 250ms ease-in ${delay}`
          : 'none';
        item.style.top = '0px';
        item.style.zIndex = String(items.length - i);
        item.style.pointerEvents = i === 0 ? '' : 'none';
        if (i === 0) {
          item.style.transform = 'scale(1)';
          item.style.opacity = '1';
        } else if (i === 1) {
          item.style.transform = 'translateY(8px) scale(0.97)';
          item.style.opacity = '1';
        } else if (i === 2) {
          item.style.transform = 'translateY(16px) scale(0.94)';
          item.style.opacity = '1';
        } else {
          item.style.transform = 'translateY(16px) scale(0.94)';
          item.style.opacity = '0';
        }
      });
      stack.style.height = (h0 + PEEK) + 'px';
    }
  }

  function renderGoalsSection() {
    const section = document.getElementById('goals-section');
    if (!section) return;
    const freqGoal = getFreqGoal();
    const volGoal  = getVolumeGoal();
    const cards = [];
    if (freqGoal && freqGoal.enabled !== false) {
      const done    = countWorkoutsInPeriod(freqGoal.period);
      const reached = done >= freqGoal.count;
      const when    = freqGoal.period === 'week' ? 'This week' : 'This month';
      const dots    = Array.from({ length: freqGoal.count }, (_, i) => `<span class="sum-dot${i < done ? ' on' : ''}"></span>`).join('');
      cards.push(`<div class="goal-card sum-freq">
        <div class="sum-freq-row"><span class="sum-freq-label">${when}</span><span class="sum-dots">${dots}</span><span class="sum-freq-count">${done} / ${freqGoal.count}</span></div>
        ${reached ? '<div class="sum-freq-done">Goal reached 🎉</div>' : ''}
      </div>`);
    }
    if (volGoal && volGoal.enabled !== false) {
      const current = calcWeeklyIntensity();
      cards.push(_makeGoalCard('Weekly Volume ⚡', current, volGoal.target, 'intensity'));
    }
    if (_getExMasterEnabled()) {
      getExerciseGoals().forEach(g => {
        if (g && g.enabled !== false && g.name && g.target) {
          const tb      = !!getExMeta(g.name).tb;
          const unit    = tb ? 'secs' : 'reps';
          const current = getBestSetForExercise(g.name);
          cards.push(_makeGoalCard(g.name + ' Milestone', current, g.target, unit));
        }
      });
    }
    const label = document.getElementById('goals-section-label');
    if (cards.length === 0) {
      section.style.display = 'none';
      section.innerHTML = '';
      if (label) label.style.display = 'none';
    } else {
      section.style.display = '';
      if (label) label.style.display = '';
      // === GOALS STACK ===
      /* goal cards render as before, wrapped as stack items by createCardStack (stack.js) */
      const els = cards.map(html => { const t = document.createElement('div'); t.innerHTML = html.trim(); return t.firstElementChild; });
      section.innerHTML = '<div id="goals-stack"></div>';
      createCardStack(document.getElementById('goals-stack'), els, 'goals');
      if (label) {
        label.textContent = 'Goals' + (els.length >= 2 ? ' · ' + els.length : '');
        label.classList.toggle('sum-title-tap', els.length >= 2);
        bindCardStackHeader(label, 'goals');
      }
    }
  }

  // === BACKUP BANNER ===
  /* Reminder card above the XP hero. Uses _backupStatus() / exportData() from settings.js. */
  function renderBackupBanner() {
    const xp = document.getElementById('xp-card');
    if (!xp) return;
    let box = document.getElementById('backup-banner');
    if (!box) {
      box = document.createElement('div');
      box.id = 'backup-banner';
      xp.parentNode.insertBefore(box, xp);
    }
    box.innerHTML = '';
    if (typeof _backupStatus !== 'function') return;
    const st = _backupStatus();
    if (Date.now() < (Number(localStorage.getItem('backupBannerSnoozeUntil')) || 0)) return;
    const due = st.at
      ? (st.since >= 10 || (st.days >= 14 && st.since >= 1))
      : st.total >= 5;
    if (!due) return;
    const sub = st.at
      ? `Last backup ${_backupAgoText(st.days)} · ${st.since} new training${st.since === 1 ? '' : 's'}`
      : 'No backup yet';
    box.innerHTML = `<div class="sum-backup"><span class="sum-backup-ic">⚠️</span>
      <div class="sum-backup-txt"><div class="sum-backup-t">Back up your data</div><div class="sum-backup-s"></div></div>
      <button class="sum-backup-btn" type="button">Back up</button>
      <button class="sum-backup-x" type="button" aria-label="Dismiss">✕</button></div>`;
    box.querySelector('.sum-backup-s').textContent = sub;
    box.querySelector('.sum-backup-btn').addEventListener('click', () => exportData());
    box.querySelector('.sum-backup-x').addEventListener('click', () => {
      localStorage.setItem('backupBannerSnoozeUntil', String(Date.now() + 3 * 86400000));
      renderBackupBanner();
    });
  }
  window.addEventListener('load', () => { try { renderBackupBanner(); } catch (e) {} });

  // === XP CARD ===
  /* Renders the XP/Level card on the Summary tab, directly below the greeting
     header and above the GOALS section. Reuses the .goal-card styles so it
     matches the goals cards, with a purple accent bar to distinguish it. */
  function renderXPCard() {
    let card = document.getElementById('xp-card');
    if (!card) return;                                  /* Summary DOM not ready */
    if (!card._sumBound) {                              /* one listener, survives re-renders */
      card._sumBound = true;
      card.addEventListener('click', () => { if (typeof openXPDetail === 'function') openXPDetail(); });
    }

    const info = getLevelInfo();
    const EMOJI = { Beginner: '🌱', Intermediate: '⚡', Advanced: '🔥', Elite: '💎', Legend: '👑' };
    const R = 34, C = 2 * Math.PI * R;
    const frac = info.isMaxLevel ? 1 : (info.xpForNextLevel > 0 ? Math.min(1, info.currentLevelXP / info.xpForNextLevel) : 0);
    const toNext = info.isMaxLevel
      ? '<div class="sum-xp-next">MAX LEVEL</div>'
      : `<div class="sum-xp-next">${Math.max(0, info.xpForNextLevel - info.currentLevelXP)} XP to Level ${info.level + 1}</div>`;

    // === STREAK DISPLAY ===
    /* Display-only: a stored streak is stale if lastStreakWeek is older than last calendar week. */
    const st = getStreakStatus();
    let streakRow;
    if (st.active) {
      const tag = st.trainedThisWeek
        ? '<span class="sum-xp-tag" style="color:#30D158">✓ this week</span>'
        : '<span class="sum-xp-tag" style="color:#FF9F0A">Train this week</span>';
      streakRow = `<span>🔥 <b>${st.weeks}</b> week${st.weeks === 1 ? '' : 's'} streak</span>${tag}`;
    } else {
      streakRow = '<span>No active streak yet</span>';
    }

    card.innerHTML =
      `<div class="sum-xp">
        <span class="sum-xp-chev sum-chev">›</span>
        <div class="sum-xp-top">
          <div class="sum-xp-ring">
            <svg viewBox="0 0 76 76" width="76" height="76">
              <defs><linearGradient id="sum-xp-grad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#BF5AF2"/><stop offset="1" stop-color="#5E5CE6"/></linearGradient></defs>
              <g transform="rotate(-90 38 38)">
                <circle cx="38" cy="38" r="${R}" fill="none" stroke="#2C2C2E" stroke-width="8"/>
                <circle cx="38" cy="38" r="${R}" fill="none" stroke="url(#sum-xp-grad)" stroke-width="8" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - frac)}"/>
              </g>
            </svg>
            <div class="sum-xp-level">${info.level}</div>
          </div>
          <div class="sum-xp-text">
            <div class="sum-xp-rank">${info.label} ${EMOJI[info.label] || ''}</div>
            <div class="sum-xp-total">${info.totalXP} XP</div>
            ${toNext}
          </div>
        </div>
        <div class="sum-xp-streak">${streakRow}</div>
      </div>`;
  }

  /* Wire the card into the Summary render pipeline. renderGoalsSection() runs
     whenever Summary is shown and after each workout, so patch it to refresh
     the XP card too, and render once on load. */
  (function _initXPCard() {
    function wire() {
      if (typeof renderGoalsSection === 'function' && !renderGoalsSection._xpWrapped) {
        const _orig = renderGoalsSection;
        renderGoalsSection = function () {
          const r = _orig.apply(this, arguments);
          try { renderBackupBanner(); } catch (e) {}
          try { renderXPCard(); } catch (e) {}
          return r;
        };
        renderGoalsSection._xpWrapped = true;
      }
      try { renderXPCard(); } catch (e) {}
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
    else wire();
  })();
