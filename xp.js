  // === XP DETAIL SCREEN ===
  /* Full-screen "XP & Levels" page opened by tapping the XP card on Summary.
     Reuses the Settings panel/nav styles; look is in styles.css under
     "XP DETAIL STYLES" (xp- classes). Reads from app.js: getLevelInfo,
     getXPData, getXPForLevel, getStreakStatus, XP_RULES, _xpWeekKey. */

  const _XP_RANKS = [
    { label: 'Beginner',     from: 1,  to: 5,  emoji: '🌱' },
    { label: 'Intermediate', from: 6,  to: 15, emoji: '⚡' },
    { label: 'Advanced',     from: 16, to: 30, emoji: '🔥' },
    { label: 'Elite',        from: 31, to: 49, emoji: '💎' },
    { label: 'Legend',       from: 50, to: 50, emoji: '👑' },
  ];
  const _XP_SOURCES_UI = [
    ['workout', 'Workouts', '#0A84FF'], ['journey_session', 'Journey sessions', '#BF5AF2'], ['pr', 'Personal records', '#FFD60A'],
    ['weekly_goal', 'Weekly goals', '#30D158'], ['streak', 'Streak bonuses', '#FF9F0A'],
  ];
  let _xpDetailHidden = null;

  const _xpFmt  = n => Number(n).toLocaleString();
  const _xpNum  = n => `<span data-xp-count="${n}">${_xpFmt(n)}</span>`;   /* counted up on open */
  const _xpRankFor = lvl => _XP_RANKS.slice().reverse().find(r => lvl >= r.from);

  function _xpHero(info) {
    const R = 93, C = 2 * Math.PI * R;
    const frac = info.isMaxLevel ? 1 : (info.xpForNextLevel > 0 ? Math.min(1, info.currentLevelXP / info.xpForNextLevel) : 0);
    const rank = _xpRankFor(info.level);
    const dot  = frac === 0 ? '<circle cx="100" cy="7" r="7" fill="#BF5AF2"/>' : '';
    const pill = info.isMaxLevel ? '<div class="xp-pill">MAX LEVEL</div>'
      : `<div class="xp-pill">${_xpFmt(info.xpForNextLevel - info.currentLevelXP)} XP to Level ${info.level + 1}</div>`;
    return `<div class="xp-card xp-hero">
      <div class="xp-ring">
        <svg viewBox="0 0 200 200" width="200" height="200">
          <defs><linearGradient id="xp-grad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#BF5AF2"/><stop offset="1" stop-color="#5E5CE6"/></linearGradient></defs>
          <g transform="rotate(-90 100 100)">
            <circle cx="100" cy="100" r="${R}" fill="none" stroke="#2C2C2E" stroke-width="14"/>
            <circle class="xp-ring-fg" cx="100" cy="100" r="${R}" fill="none" stroke="url(#xp-grad)" stroke-width="14" stroke-linecap="round"
              stroke-dasharray="${C}" style="--xp-c:${C};--xp-off:${C * (1 - frac)}"/>
          </g>
          ${dot ? `<g>${dot}</g>` : ''}
        </svg>
        <div class="xp-ring-center"><div class="xp-ring-cap">LEVEL</div><div class="xp-ring-level">${_xpNum(info.level)}</div></div>
      </div>
      <div class="xp-rank">${rank.label} ${rank.emoji}</div>
      <div class="xp-sub">${_xpNum(info.totalXP)} XP total</div>
      ${pill}
    </div>`;
  }

  function _xpMilestones(info) {
    const step = (lvl, kind) => `<div class="xp-step ${kind}">
        <div class="xp-circle">${kind === 'done' ? '✓' : lvl}</div>
        <div class="xp-step-lvl">Level ${lvl}</div>
        <div class="xp-step-xp">${_xpFmt(getXPForLevel(lvl))} XP</div></div>`;
    let steps = '';
    if (info.level > 1) steps += step(info.level - 1, 'done');
    steps += step(info.level, 'current');
    if (!info.isMaxLevel) steps += step(info.level + 1, 'next');
    let nextRow;
    if (info.isMaxLevel) {
      nextRow = `<div class="xp-row"><div class="xp-icon" style="background:rgba(191,90,242,.18)">👑</div><div class="xp-row-main"><div class="xp-row-title">Next rank</div><div class="xp-row-sub">Max level reached</div></div></div>`;
    } else {
      const r = _XP_RANKS.find(x => x.from > info.level);
      nextRow = `<div class="xp-row"><div class="xp-icon" style="background:rgba(191,90,242,.18)">${r.emoji}</div>
        <div class="xp-row-main"><div class="xp-row-title">Next rank · ${r.label}</div>
        <div class="xp-row-sub">Level ${r.from} · ${_xpFmt(getXPForLevel(r.from) - info.totalXP)} XP to go</div></div></div>`;
    }
    return `<div class="xp-card"><div class="xp-track">${steps}</div><div class="xp-divider"></div>${nextRow}</div>`;
  }

  function _xpRanks(info) {
    const cur = _xpRankFor(info.level);
    const lock = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8E8E93" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
    return '<div class="xp-ranks">' + _XP_RANKS.map(r => {
      const state = r === cur ? 'current' : (r.from < cur.from ? 'reached' : 'locked');
      const badge = state === 'locked' ? lock : (state === 'reached' ? '<span class="xp-check">✓</span>' : '');
      const range = r.from === r.to ? `Level ${r.from}` : `Level ${r.from}-${r.to}`;
      return `<div class="xp-rank-card ${state}"><div class="xp-rank-badge">${badge}</div>
        <div class="xp-rank-emoji">${r.emoji}</div><div class="xp-rank-name">${r.label}</div>
        <div class="xp-rank-cap">${range}</div><div class="xp-rank-cap">${_xpFmt(getXPForLevel(r.from))} XP</div></div>`;
    }).join('') + '</div>';
  }

  function _xpStreak() {
    const st = getStreakStatus();
    const done = new Set((typeof workouts !== 'undefined' ? workouts : []).map(w => (w && w.date) ? _xpWeekKey(w.date) : null));
    let dots = '';
    for (let i = 7; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - 7 * i);
      const trained = done.has(_xpWeekKey(d));
      dots += `<div class="xp-week${trained ? ' on' : (i === 0 ? ' now' : '')}"></div>`;
    }
    const nextBonus = Math.min(XP_RULES.streakPerWeek * (st.weeks + 1), XP_RULES.streakCap);
    const toCap = Math.max(0, Math.ceil(XP_RULES.streakCap / XP_RULES.streakPerWeek) - st.weeks);
    const tag = !st.active ? '' : (st.trainedThisWeek
      ? '<div class="xp-tag" style="color:#30D158">✓ Trained this week</div>'
      : '<div class="xp-tag" style="color:#FF9F0A">Train this week to keep it</div>');
    const big = st.active
      ? `<div class="xp-streak-num">${_xpNum(st.weeks)} 🔥</div><div class="xp-sub">week streak</div>`
      : `<div class="xp-sub" style="font-size:17px">No active streak yet</div>`;
    return `<div class="xp-card">
      <div class="xp-streak-top"><div>${big}</div>${tag}</div>
      <div class="xp-weeks">${dots}</div><div class="xp-cap">Last 8 weeks</div>
      <div class="xp-divider"></div>
      <div class="xp-bonus-line"><span>Next streak bonus</span><b>+${nextBonus} XP</b></div>
      <div class="xp-bar"><div class="xp-bar-fill xp-anim" style="--xp-w:${Math.round(nextBonus / XP_RULES.streakCap * 100)}%"></div></div>
      <div class="xp-cap" style="margin-top:8px;font-size:13px">${toCap > 0 ? `${toCap} week${toCap === 1 ? '' : 's'} until max bonus` : 'Max bonus reached'}</div>
    </div>`;
  }

  function _xpSources() {
    const xd = getXPData();
    const rows = _XP_SOURCES_UI.map(([k, l, c]) => [l, xd.xpBySource[k] || 0, c]).sort((a, b) => b[1] - a[1]);
    const earlier = xd.totalXP - rows.reduce((t, r) => t + r[1], 0);
    if (earlier > 0) rows.push(['Earlier XP', earlier, '#636366']);
    const total = xd.totalXP;
    const pct = v => total > 0 ? Math.round(v / total * 100) : 0;
    const segs = rows.filter(r => r[1] > 0).map(r => `<div style="flex:${r[1]};background:${r[2]}"></div>`).join('');
    const list = rows.map(r => `<div class="xp-src"><span class="xp-dot" style="background:${r[2]}"></span><span class="xp-src-label">${r[0]}</span>
      <span class="xp-src-val"><b>${_xpFmt(r[1])} XP</b> <span>${pct(r[1])}%</span></span></div>`).join('');
    return `<div class="xp-card"><div class="xp-stack xp-reveal">${segs}</div><div class="xp-src-list">${list}</div>
      <div class="xp-divider"></div><div class="xp-src xp-src-total"><span class="xp-src-label">Total</span><span class="xp-src-val"><b>${_xpFmt(total)} XP</b></span></div></div>`;
  }

  // === XP BADGES ROW ===
  function _xpBadgesRow() {
    if (typeof badgesSummaryText !== 'function') return '';
    return `<button class="xp-card xp-badges-row" id="xp-badges-row"><span class="xp-badges-ic">🏅</span><span class="xp-badges-lbl">Badges</span><span class="xp-badges-count" id="xp-badges-count">${badgesSummaryText()}</span><span class="xp-badges-chev">›</span></button>`;
  }

  function _xpDetailHTML() {
    const info = getLevelInfo();
    return _xpHero(info) +
      _xpBadgesRow() +
      `<div class="xp-title">Milestones</div>${_xpMilestones(info)}` +
      `<div class="xp-title">Ranks</div>${_xpRanks(info)}` +
      `<div class="xp-title">Streak</div>${_xpStreak()}` +
      `<div class="xp-title xp-title-row">Where my XP comes from<button class="xp-info" aria-label="How XP works">ⓘ</button></div>${_xpSources()}`;
  }

  /* Ring/bars animate from 0 via CSS (.xp-go); big numbers count up here. */
  function _xpDetailAnimate(root) {
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    root.classList.remove('xp-go');
    if (reduce) { root.classList.add('xp-go'); return; }
    const els = Array.from(root.querySelectorAll('[data-xp-count]'));
    els.forEach(el => { el.textContent = '0'; });
    requestAnimationFrame(() => requestAnimationFrame(() => {
      root.classList.add('xp-go');
      const t0 = performance.now();
      (function tick(now) {
        const p = Math.min(1, (now - t0) / 800), e = 1 - Math.pow(1 - p, 3);
        els.forEach(el => { el.textContent = _xpFmt(Math.round(Number(el.dataset.xpCount) * e)); });
        if (p < 1) requestAnimationFrame(tick);
      })(t0);
    }));
  }

  /* XP rules tooltip: one bubble at a time, anchored under the ⓘ button. */
  let _xpTip = null;   /* { el, onDown, onScroll, body } */

  function _xpTipHTML() {
    const row = (l, a) => `<div class="xp-tip-row"><span>${l}</span><span class="xp-amt">${a}</span></div>`;
    return row('Workout', `+${XP_RULES.workout}`) +
      row('Journey session', `+${XP_RULES.journeySession}`) +
      row('Personal record', `+${XP_RULES.pr}`) +
      row('Weekly goal', `+${XP_RULES.weeklyGoal}`) +
      row('Streak bonus', `+${XP_RULES.streakPerWeek} per week (max +${XP_RULES.streakCap})`) +
      '<div class="xp-tip-note">Manually completed journey sessions give no XP</div>';
  }

  function _xpTipClose() {
    if (!_xpTip) return;
    document.removeEventListener('pointerdown', _xpTip.onDown, true);
    _xpTip.body.removeEventListener('scroll', _xpTip.onScroll);
    _xpTip.el.remove();
    _xpTip = null;
  }

  function _xpTipToggle(btn) {
    const wasOpen = _xpTip && _xpTip.anchor === btn;
    _xpTipClose();
    if (wasOpen) return;
    const panel = document.getElementById('xp-detail');
    const body  = document.getElementById('xp-detail-body');
    const el = document.createElement('div');
    el.className = 'xp-tip';
    el.innerHTML = '<div class="xp-tip-arrow"></div>' + _xpTipHTML();
    panel.appendChild(el);
    const pr = panel.getBoundingClientRect(), br = btn.getBoundingClientRect();
    const cx = br.left + br.width / 2 - pr.left, cy = br.top + br.height / 2 - pr.top;
    const w = el.offsetWidth, margin = 12;
    const left = Math.max(margin, Math.min(cx - w / 2, pr.width - margin - w));
    el.style.left = left + 'px';
    el.style.top  = (cy + 10 + 10) + 'px';
    el.style.setProperty('--xp-arrow-x', Math.max(18, Math.min(cx - left, w - 18)) + 'px');
    requestAnimationFrame(() => el.classList.add('show'));
    const onDown   = e => { if (!el.contains(e.target) && !btn.contains(e.target)) _xpTipClose(); };
    const onScroll = () => _xpTipClose();
    document.addEventListener('pointerdown', onDown, true);
    body.addEventListener('scroll', onScroll, { passive: true });
    _xpTip = { el, onDown, onScroll, body, anchor: btn };
  }

  function _xpDetailPanel() {
    let panel = document.getElementById('xp-detail');
    if (panel) return panel;
    panel = document.createElement('div');
    panel.id = 'xp-detail';
    panel.className = 'settings-panel sub';
    panel.innerHTML =
      `<div class="settings-nav">
        <button class="settings-back-btn" onclick="closeXPDetail()" aria-label="Back">
          <svg width="11" height="18" viewBox="0 0 9 15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="8,1 1,7.5 8,14"/></svg>
        </button>
        <div class="settings-nav-title">XP &amp; Levels</div>
      </div>
      <div class="settings-body" id="xp-detail-body"></div>`;
    document.body.appendChild(panel);
    return panel;
  }

  /* Hide bottom nav, + button and frosted backdrop while open; restore on close. */
  function openXPDetail() {
    const panel = _xpDetailPanel();
    _xpTipClose();
    document.getElementById('xp-detail-body').innerHTML = _xpDetailHTML();
    _xpDetailAnimate(document.getElementById('xp-detail-body'));
    const info = document.querySelector('#xp-detail-body .xp-info');
    if (info) info.addEventListener('click', e => { e.stopPropagation(); _xpTipToggle(info); });
    const bRow = document.getElementById('xp-badges-row');
    if (bRow) bRow.addEventListener('click', () => openBadgesScreen());
    const tabBar = document.querySelector('.tab-bar');
    const fab    = document.getElementById('home-fab-wrap');
    _xpDetailHidden = {
      tab: tabBar ? tabBar.style.display : '',
      fab: fab ? fab.style.display : '',
      navHidden: document.body.classList.contains('nav-hidden'),
    };
    if (tabBar) tabBar.style.display = 'none';
    if (fab) fab.style.display = 'none';
    document.body.classList.add('nav-hidden');
    requestAnimationFrame(() => {
      panel.classList.add('open');
      const body = document.getElementById('xp-detail-body');
      body.scrollTop = 0;
      const cur = body.querySelector('.xp-rank-card.current');
      if (cur) cur.parentNode.scrollLeft = Math.max(0, cur.offsetLeft - cur.parentNode.offsetLeft - 16);
    });
  }

  function closeXPDetail() {
    if (typeof closeBadgesScreen === 'function') closeBadgesScreen();
    _xpTipClose();
    const panel = document.getElementById('xp-detail');
    if (panel) panel.classList.remove('open');
    const h = _xpDetailHidden;
    if (!h) return;
    const tabBar = document.querySelector('.tab-bar');
    const fab    = document.getElementById('home-fab-wrap');
    if (tabBar) tabBar.style.display = h.tab;
    if (fab) fab.style.display = h.fab;
    if (!h.navHidden) document.body.classList.remove('nav-hidden');
    _xpDetailHidden = null;
  }
