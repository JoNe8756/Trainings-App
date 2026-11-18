  // === XP DETAIL SCREEN ===
  /* Full-screen "XP & Levels" page opened by tapping the XP card on Summary.
     Reuses the Settings panel/nav styles; look is in styles.css under
     "XP DETAIL STYLES" (xp- classes). Reads from app.js: getLevelInfo,
     getXPData, getXPForLevel, getStreakStatus, XP_RULES, _xpWeekKey. */

  /* 20 ranks of 5 levels each; names must match _XP_RANK_NAMES in app.js */
  const _XP_RANK_EMOJI = ['🌰', '🌱', '🌿', '🪴', '🌾', '🌷', '🌸', '🌺', '🫘', '🧑‍🌾', '🌳', '🌲', '🐝', '🐸', '🦌', '🦉', '✨', '🍃', '🦊', '👑'];
  const _XP_RANKS = _XP_RANK_NAMES.map((label, i) => ({ label, from: 1 + i * 5, to: 5 + i * 5, emoji: _XP_RANK_EMOJI[i] }));

  const _XP_SOURCES_UI = [
    ['workout', 'Workouts', '#0A84FF'], ['journey_session', 'Journey sessions', '#BF5AF2'], ['pr', 'Personal records', '#FFD60A'],
    ['weekly_goal', 'Weekly goals', '#30D158'], ['streak', 'Streak bonuses', '#FF9F0A'], ['badges', 'Badges', '#FF453A'],
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
    return `<div class="xp-card xp-hero xp-hero-split">
      <div class="xp-hero-top">
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
      <div class="xp-hero-info">
        <div class="xp-rank">${rank.label} ${rank.emoji}</div>
        <div class="xp-sub">${_xpNum(info.totalXP)} XP total</div>
        ${pill}
      </div>
      </div>
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
      /* future ranks stay a secret until reached */
      nextRow = `<div class="xp-row"><div class="xp-icon" style="background:rgba(191,90,242,.18)">❔</div>
        <div class="xp-row-main"><div class="xp-row-title">Next rank · ???</div>
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
        <div class="xp-rank-emoji">${state === 'locked' ? '❔' : r.emoji}</div><div class="xp-rank-name">${state === 'locked' ? '???' : r.label}</div>
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

  // === XP PLANT ===
  /* A drawn plant that grows with the level (item 37) and gets thirsty when you stop
     training. Everything is a pure function of getLevelInfo() and workouts, so it
     needs no stored data. g runs from 0 (new seed) to 1 (max level, full bloom). */
  const _XP_PLANT_STAGES = [[0, 'Seed'], [0.05, 'Sprout'], [0.2, 'Young plant'], [0.4, 'Growing strong'], [0.6, 'Almost in bloom'], [0.85, 'In bloom'], [1, 'Full bloom']];

  /* The plant grows up over levels 1-40 (fully grown at 40); later levels belong to the
     baby plants and the forest (next steps). */
  const _XP_PLANT_MATURE_LEVEL = 40;

  function _xpPlantGrowth(info) {
    if (info.isMaxLevel || info.level >= _XP_PLANT_MATURE_LEVEL) return 1;
    const frac = info.xpForNextLevel > 0 ? Math.min(1, info.currentLevelXP / info.xpForNextLevel) : 0;
    return Math.min(1, ((info.level - 1) + frac) / (_XP_PLANT_MATURE_LEVEL - 1));
  }

  /* Plant form 0..8 from growth g (the 9 forms of the plant drawing, spread over levels 1-40) */
  const _XP_PLANT_FORM_G = [0, 0.082, 0.184, 0.306, 0.429, 0.612, 0.755, 0.857, 1];
  function _xpPlantForm(g) {
    let f = 0;
    _XP_PLANT_FORM_G.forEach((thr, i) => { if (g >= thr - 1e-9) f = i; });
    return f;
  }

  function _xpPlantStageIdx(g) {
    let idx = 0;
    _XP_PLANT_STAGES.forEach((st, i) => { if (g >= st[0]) idx = i; });
    return idx;
  }

  // === PLANT WATER ===
  /* Every training waters the plant. Thirst grows with the days since the last training:
     fine for 2 days, then increasingly thirsty and droopy, fully droopy after 8 days. */
  function _xpPlantThirst() {
    const list = (typeof workouts !== 'undefined' ? workouts : []);
    let last = 0;
    list.forEach(w => { const t = (w && w.date) ? new Date(w.date).getTime() : NaN; if (isFinite(t) && t > last) last = t; });
    if (!last) return { days: null, d: 0.6, pct: 15, label: 'Waiting for its first drink', hint: 'Do a training to water your plant', today: false };
    const dayStart = t => { const x = new Date(t); return new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime(); };
    const days = Math.max(0, Math.round((dayStart(Date.now()) - dayStart(last)) / 86400000));
    const d = Math.max(0, Math.min(1, (days - 2) / 6));
    const pct = Math.max(8, Math.round((1 - Math.min(days, 8) / 8) * 100));
    let label, hint;
    if (days === 0)      { label = 'Freshly watered';    hint = 'You trained today'; }
    else if (days <= 2)  { label = 'Well watered';       hint = days === 1 ? 'Last training: yesterday' : 'Last training: 2 days ago'; }
    else if (days <= 4)  { label = 'Getting thirsty';    hint = `Last training: ${days} days ago`; }
    else if (days <= 7)  { label = 'Thirsty';            hint = `Last training: ${days} days ago`; }
    else                 { label = 'Very thirsty';       hint = `Last training: ${days} days ago`; }
    return { days, d, pct, label, hint, today: days === 0 };
  }

  // === PLANT TREE TYPES ===
  /* Five tree types (localStorage "plantType", category "xp" in EXPORT_CATEGORIES). Chosen once
     on the XP screen. A type changes the look (leaves, trunk, blossoms), the fruit and the default
     name only; levels, ranks, story and water rules stay the same. */
  const _XP_TREES = {
    fig:    { name: 'Fig',    fruit: 'fig',    fruits: 'figs',      desc: 'Purple figs hang from a sturdy, leafy tree.',
              leaf: 'ellipse', ry: 0.42, pal: ['#34C759', '#30D158', '#248A3D'], trunk: '#7A5230', petal: '#FF6482', heart: '#FFD60A', fruitKind: 'fig', fruitColor: '#6B3FA0' },
    oak:    { name: 'Oak',    fruit: 'acorn',  fruits: 'acorns',    desc: 'A broad, strong crown with acorns.',
              leaf: 'ellipse', ry: 0.6, leafScale: 1.2, pal: ['#4C9A2A', '#3D8B22', '#2F6F1A'], trunk: '#6B4A2B', trunkExtra: 1.5, petal: '#C9B458', heart: '#8A7A2A', fruitKind: 'acorn', fruitColor: '#8B5A2B' },
    cherry: { name: 'Cherry', fruit: 'cherry', fruits: 'cherries',  desc: 'Pale pink blossoms cover the whole crown.',
              leaf: 'ellipse', ry: 0.32, pal: ['#7BC96F', '#66BB5A', '#4FA84A'], trunk: '#5A3A31', petal: '#FFB7C5', heart: '#FF4D79', round: true, many: true, fruitKind: 'cherry', fruitColor: '#D6336C' },
    pine:   { name: 'Pine',   fruit: 'cone',   fruits: 'cones',     desc: 'Tall, straight, evergreen, with cones.',
              leaf: 'needle', pal: ['#2F7D4F', '#256B42', '#1B5733'], trunk: '#6E4B3A', straight: true, conifer: true, cone: true, petal: '#C8A165', heart: '#8B5A2B', fruitKind: 'cone', fruitColor: '#8B5A2B' },
    maple:  { name: 'Maple',  fruit: 'seed',   fruits: 'seeds',     desc: 'Red-orange star leaves in a round crown.',
              leaf: 'maple', pal: ['#E8590C', '#F08C00', '#C92A2A'], trunk: '#7A4B2A', petal: '#E03131', heart: '#FFD43B', fruitKind: 'samara', fruitColor: '#D9B382' },
  };
  const _XP_TREE_ORDER = ['fig', 'oak', 'cherry', 'pine', 'maple'];

  function plantTypeChosen() { return _XP_TREES[localStorage.getItem('plantType')] ? localStorage.getItem('plantType') : null; }
  function plantTypeGet() { return plantTypeChosen() || 'fig'; }
  function plantTypeSet(k) { if (_XP_TREES[k] && !plantTypeChosen()) localStorage.setItem('plantType', k); }   /* choose once: ignored after the first confirm */

  // === PLANT AGING ===
  /* Growth: every level adds a little height, leaf size and leaf count (g = level progress).
     Aging: each of the 9 ranks gives the plant a distinct form.
       0 Beginner (1-4)       young herb
       1 Novice (5-9)         leafier herb
       2 Intermediate (10-15) thicker stem, first small side shoot
       3 Skilled (16-21)      two side branches
       4 Advanced (22-30)     three branches with small green buds
       5 Expert (31-37)       woody trunk and a leafy crown (bud on top from g 0.6)
       6 Elite (38-42)        thicker trunk, pink buds on the branches
       7 Master (43-49)       blossoms (from g 0.85) and hanging fruit
       8 Legend (50)          ancient bark trunk, golden blossoms and fruit, glow, sparkles */
  let _xpPlantUid = 0;
  function _xpPlantSVG(g, thirst, px, typeKey) {
    const T = _XP_TREES[typeKey] || _XP_TREES[plantTypeGet()];
    const d = thirst.d;
    const rank = _xpPlantForm(g);   /* plant form 0..8 */
    const uid = 'xpg' + (++_xpPlantUid);
    const bx = 100, by = 150, H = 14 + g * 100, lean = T.straight ? 1 + g * 2 : 8 + g * 6;
    const tx = bx + lean + H * 0.45 * d, ty = by - H * (1 - 0.35 * d), cx = bx - (T.straight ? 2 : 10), cy = by - H / 2;   /* stem: quadratic curve; droops when thirsty */
    const pt = t => [(1-t)*(1-t)*bx + 2*(1-t)*t*cx + t*t*tx, (1-t)*(1-t)*by + 2*(1-t)*t*cy + t*t*ty];
    const n = 2 + Math.round(g * 14);
    const pal = d < 0.33 ? T.pal : (d < 0.66 ? ['#9BB83A', '#86A32F', '#6B8E23'] : ['#B59B3A', '#9C8434', '#8A6E2F']);
    const woody = rank >= 5, legend = rank === 8;
    const stemColor = d >= 0.66 ? '#8A6E2F' : (woody ? T.trunk : (T.conifer ? T.trunk : '#248A3D'));
    const stemW = 3 + g * 3 + rank * 0.75 + (T.trunkExtra || 0);
    const LS = T.leafScale || 1;
    const leaf = (x, y, rot, len, fill, side) => {
      len *= LS;
      const sd = side || 1, hd = `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot.toFixed(1)})">`;
      if (T.leaf === 'needle') return hd + [-18, 0, 18].map(a => `<ellipse cx="${(sd * len * 1.05).toFixed(1)}" cy="0" rx="${(len * 1.05).toFixed(1)}" ry="${(len * 0.11).toFixed(1)}" fill="${fill}" transform="rotate(${a})"/>`).join('') + '</g>';
      if (T.leaf === 'maple') return hd + `<path transform="translate(${(sd * len * 0.9).toFixed(1)} 0) scale(${(len * 0.27).toFixed(2)})" d="M0 -1 L1.2 -3.2 L1.6 -1.2 L3.8 -1.6 L2.6 0.4 L4.2 2.4 L1.8 2.2 L1.4 4.4 L0 3 L-1.4 4.4 L-1.8 2.2 L-4.2 2.4 L-2.6 0.4 L-3.8 -1.6 L-1.6 -1.2 L-1.2 -3.2 Z" fill="${fill}"/></g>`;
      return hd + `<ellipse cx="${(sd * len).toFixed(1)}" cy="0" rx="${len.toFixed(1)}" ry="${(len * T.ry).toFixed(1)}" fill="${fill}"/></g>`;
    };
    const petal = legend ? (d > 0.5 ? '#C9B24A' : '#FFD60A') : (d > 0.5 ? '#B8A07A' : T.petal);
    const heart = legend ? '#FF9F0A' : T.heart;
    const flower = (x, y, r) => {
      let f = '';
      if (T.cone) {   /* pine: pollen cones instead of flowers */
        f = `<ellipse cx="${x.toFixed(1)}" cy="${(y - r * 0.4).toFixed(1)}" rx="${(r * 0.45).toFixed(1)}" ry="${(r * 0.9).toFixed(1)}" fill="${petal}"/><ellipse cx="${x.toFixed(1)}" cy="${(y - r * 0.4).toFixed(1)}" rx="${(r * 0.45).toFixed(1)}" ry="${(r * 0.9).toFixed(1)}" fill="none" stroke="${heart}" stroke-width="1"/>`;
        return f;
      }
      for (let a = 0; a < 5; a++) {
        f += T.round
          ? `<circle cx="${x.toFixed(1)}" cy="${(y - r * 0.7).toFixed(1)}" r="${(r * 0.55).toFixed(1)}" fill="${petal}" transform="rotate(${a * 72} ${x.toFixed(1)} ${y.toFixed(1)})"/>`
          : `<ellipse cx="${x.toFixed(1)}" cy="${(y - r).toFixed(1)}" rx="${(r * 0.55).toFixed(1)}" ry="${r.toFixed(1)}" fill="${petal}" transform="rotate(${a * 72} ${x.toFixed(1)} ${y.toFixed(1)})"/>`;
      }
      return f + `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(r * 0.4).toFixed(1)}" fill="${heart}"/>`;
    };
    const fruit = (x, y) => {
      const col = legend ? '#E6B800' : (d > 0.5 ? '#7A6A3A' : T.fruitColor), X = x.toFixed(1), Y = y.toFixed(1);
      switch (T.fruitKind) {
        case 'acorn':  return `<ellipse cx="${X}" cy="${Y}" rx="3" ry="3.8" fill="${col}"/><path d="M${(x - 3.4).toFixed(1)} ${(y - 1.6).toFixed(1)} Q${X} ${(y - 6).toFixed(1)} ${(x + 3.4).toFixed(1)} ${(y - 1.6).toFixed(1)} Z" fill="#5A3A1E"/>`;
        case 'cherry': return `<circle cx="${(x - 2.6).toFixed(1)}" cy="${(y + 1).toFixed(1)}" r="2.8" fill="${col}"/><circle cx="${(x + 2.6).toFixed(1)}" cy="${(y + 2).toFixed(1)}" r="2.8" fill="${col}"/>`;
        case 'cone':   return `<ellipse cx="${X}" cy="${Y}" rx="3" ry="5.4" fill="${col}"/><path d="M${(x - 2.4).toFixed(1)} ${(y - 1).toFixed(1)} h4.8 M${(x - 2).toFixed(1)} ${(y + 2).toFixed(1)} h4" stroke="#5A3A1E" stroke-width="1"/>`;
        case 'samara': return `<ellipse cx="${X}" cy="${Y}" rx="2" ry="2.8" fill="${col}"/><ellipse cx="${(x + 3.2).toFixed(1)}" cy="${(y - 2.2).toFixed(1)}" rx="1.8" ry="4.6" fill="${col}" opacity=".85" transform="rotate(35 ${(x + 3.2).toFixed(1)} ${(y - 2.2).toFixed(1)})"/>`;
        default:       return `<ellipse cx="${X}" cy="${Y}" rx="3.6" ry="4.6" fill="${col}"/>`;
      }
    };
    const blooming = g >= 0.85;
    const fk = Math.min(1, (g - 0.85) / 0.15), fr = (8 + 9 * fk) * (1 - 0.4 * d);

    let leaves = '';
    for (let i = 0; i < n; i++) {
      const t = 0.25 + 0.7 * (n > 1 ? i / (n - 1) : 0), [lx, ly] = pt(t);
      const side = i % 2 ? 1 : -1, len = (5 + g * 13) * (1.15 - t * 0.5);
      leaves += leaf(lx, ly, -side * (25 - 70 * d) + (T.conifer ? side * 35 : 0), len, pal[i % 3], side);
    }

    /* side branches from Intermediate on: 1, then 2, then 3 (pine branches droop) */
    let branches = '';
    if (rank >= 2) {
      [0.42, 0.62, 0.8].slice(0, Math.min(3, rank - 1)).forEach((t, i) => {
        const [sx, sy] = pt(t), side = i % 2 ? 1 : -1;
        const dy = T.conifer ? (4 + g * 4) : -(8 + g * 8) * (1 - 0.5 * d);
        const ex = sx + side * (14 + g * 14), ey = sy + dy;
        branches += `<path d="M${sx.toFixed(1)} ${sy.toFixed(1)} Q${(sx + side * 4).toFixed(1)} ${(sy + (T.conifer ? -2 : -10)).toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}" fill="none" stroke="${stemColor}" stroke-width="${(stemW * 0.45).toFixed(1)}" stroke-linecap="round"/>`;
        const bl = 6 + g * 6;
        [-30, 10, 50].forEach((ang, k) => { branches += leaf(ex, ey, -90 + ang * side * (1 - d * 1.2), bl, pal[(i + k) % 3]); });
        if (blooming) branches += flower(ex, ey - 3, 4.5 * (1 - 0.4 * d));
        else if (rank === 4) branches += `<circle cx="${ex.toFixed(1)}" cy="${(ey - 4).toFixed(1)}" r="2.6" fill="${pal[0]}"/>`;
        else if (rank >= 6) branches += `<ellipse cx="${ex.toFixed(1)}" cy="${(ey - 5).toFixed(1)}" rx="2.8" ry="4.2" fill="${d > 0.5 ? '#B59B3A' : T.petal}" opacity=".85"/>`;
        if (rank >= 7) {   /* hanging fruit */
          const fx = sx + side * (6 + g * 5), fy = sy + 6 + g * 4;
          branches += `<line x1="${sx.toFixed(1)}" y1="${sy.toFixed(1)}" x2="${fx.toFixed(1)}" y2="${(fy - 3).toFixed(1)}" stroke="${stemColor}" stroke-width="1.4"/>` + fruit(fx, fy);
        }
      });
    }

    /* crown on the Expert+ trunk: leaf ring, or stacked tiers for the pine */
    let crown = '';
    if (woody) {
      if (T.conifer) {
        for (let k = 0; k < 4; k++) {
          const [kx, ky] = pt(0.55 + k * 0.15), w = (20 - k * 4) * (0.6 + g * 0.6), h = 12 + g * 4;
          crown += `<path d="M${(kx - w).toFixed(1)} ${(ky + h * 0.4).toFixed(1)} L${kx.toFixed(1)} ${(ky - h).toFixed(1)} L${(kx + w).toFixed(1)} ${(ky + h * 0.4).toFixed(1)} Z" fill="${pal[k % 3]}"/>`;
        }
      } else {
        const cl = 9 + g * 8;
        for (let k = 0; k < 6; k++) crown += leaf(tx, ty, -90 + k * 60 + (d * 40), cl, pal[k % 3]);
        /* cherry: blossoms scattered through the whole crown once it blooms */
        if (T.many && blooming) [[-16, 8], [14, 10], [-8, 22], [10, 26], [0, 14]].forEach(([ox, oy]) => { crown += flower(tx + ox, ty + oy, 4.5 * (1 - 0.4 * d)); });
      }
    }

    /* top of the plant: bud (Expert/Elite, before blossoms) or blossom */
    let top_ = '';
    if (g >= 0.6 && !blooming) top_ = `<ellipse cx="${tx.toFixed(1)}" cy="${(ty - 6).toFixed(1)}" rx="${(4 + 4 * ((g - 0.6) / 0.25)).toFixed(1)}" ry="${(7 + 5 * ((g - 0.6) / 0.25)).toFixed(1)}" fill="${d > 0.5 ? '#B59B3A' : T.petal}" opacity=".9"/><path d="M${(tx - 5).toFixed(1)} ${(ty + 1).toFixed(1)} Q${tx.toFixed(1)} ${(ty - 5).toFixed(1)} ${(tx + 5).toFixed(1)} ${(ty + 1).toFixed(1)}" fill="none" stroke="${pal[2]}" stroke-width="3" stroke-linecap="round"/>`;
    if (blooming) top_ = flower(tx, ty, fr);

    /* Legend: glow, bark lines, sparkles */
    let glow = '', bark = '', sparkles = '';
    if (legend) {
      glow = `<defs><radialGradient id="${uid}"><stop offset="0" stop-color="#FFD60A" stop-opacity=".38"/><stop offset="1" stop-color="#FFD60A" stop-opacity="0"/></radialGradient></defs><circle cx="${tx.toFixed(1)}" cy="${(ty + 10).toFixed(1)}" r="62" fill="url(#${uid})"/>`;
      for (let k = 1; k <= 5; k++) { const [kx, ky] = pt(k / 6); bark += `<path d="M${(kx - 2).toFixed(1)} ${(ky + 3).toFixed(1)} l4 -5" stroke="#4E3320" stroke-width="1.2" stroke-linecap="round"/>`; }
      sparkles = [[-34, 10], [38, 30], [-22, 52], [30, -4]].map(([ox, oy], k) => `<path d="M${(tx + ox).toFixed(1)} ${(ty + oy - 4).toFixed(1)} v8 M${(tx + ox - 4).toFixed(1)} ${(ty + oy).toFixed(1)} h8" stroke="#FFF4B8" stroke-width="1.6" stroke-linecap="round" opacity="${0.55 + 0.15 * (k % 3)}"/>`).join('');
    }

    /* frame is cropped to the plant's height at a constant scale: no empty space above a small plant */
    const top = Math.max(8, by - H - 40), vh = 196 - top, vw = 140, PX = px || 1.15;
    const drops = thirst.today ? [88, 100, 112].map((x, i) => `<circle class="xp-drop" style="animation-delay:${i * 0.25}s" cx="${x}" cy="${(top + 4).toFixed(1)}" r="3" fill="#64D2FF"/>`).join('') : '';
    return `<svg viewBox="30 ${top.toFixed(1)} ${vw} ${vh.toFixed(1)}" width="${Math.round(vw * PX)}" height="${Math.round(vh * PX)}" role="img" aria-label="Your plant">
      ${glow}
      <g class="xp-plant-g">
        <path d="M${bx} ${by} Q${cx} ${cy} ${tx.toFixed(1)} ${ty.toFixed(1)}" fill="none" stroke="${stemColor}" stroke-width="${stemW.toFixed(1)}" stroke-linecap="round"/>
        ${bark}${crown}${branches}${leaves}${top_}${sparkles}
      </g>
      ${drops}
      <ellipse cx="100" cy="152" rx="38" ry="6" fill="#3A2A1E"/>
      <path d="M64 152 L72 188 Q73 192 78 192 L122 192 Q127 192 128 188 L136 152 Z" fill="#A0522D"/>
      <rect x="60" y="146" width="80" height="10" rx="4" fill="#B8643A"/>
    </svg>`;
  }

  // === PLANT GROW ANIMATION ===
  /* Level-up celebration: shows how the plant grew from its previous size to the new one.
     A faint ghost of the old plant stays in place while the real plant grows over it, and a
     size line counts up (e.g. "Fig: 12 cm -> 14 cm"). The SVG is redrawn every frame with an
     interpolated growth value, so new leaves, branches and rank forms appear as it grows. */
  const _xpPlantCm = g => Math.round(4 + g * 96);

  function plantGrowAnimate(host, fromInfo, toInfo, labelEl) {
    if (!host) return;
    const toG = _xpPlantGrowth(toInfo);
    const fromG = Math.min(toG, typeof fromInfo === 'number'
      ? Math.min(1, Math.max(0, (fromInfo - 1 + 0.5) / (_XP_PLANT_MATURE_LEVEL - 1)))
      : _xpPlantGrowth(fromInfo));
    const svg = g => _xpPlantSVG(g, { d: 0, today: false }, 1.1);
    const hm = svg(toG).match(/height="(\d+)"/);
    host.classList.add('xp-go');
    host.style.height = (hm ? hm[1] : 200) + 'px';
    host.style.position = 'relative';
    host.innerHTML = '<div class="xp-grow-ghost"></div><div class="xp-grow-live"></div>';
    const ghost = host.firstChild, live = host.lastChild;
    const name = plantNameGet(), fromCm = _xpPlantCm(fromG), toCm = _xpPlantCm(toG);
    const setLabel = cm => { if (labelEl) labelEl.textContent = `${name}: ${fromCm} cm \u2192 ${cm} cm`; };
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || fromG >= toG) { live.innerHTML = svg(toG); setLabel(toCm); return; }
    ghost.innerHTML = svg(fromG);
    live.innerHTML = svg(fromG);
    setLabel(fromCm);
    const T0 = performance.now() + 500, DUR = 2200;
    (function tick(now) {
      if (!host.isConnected) return;
      const p = Math.max(0, Math.min(1, (now - T0) / DUR)), e = 1 - Math.pow(1 - p, 3);
      live.innerHTML = svg(fromG + (toG - fromG) * e);
      setLabel(Math.round(fromCm + (toCm - fromCm) * e));
      if (p < 1) requestAnimationFrame(tick);
    })(performance.now());
  }

  // === PLANT TREE PICKER ===
  /* One-time choice of the tree type. Locked after Confirm (see plantTypeSet). */
  let _xpTreeSel = null;

  function _xpTreePickerHTML() {
    return _XP_TREE_ORDER.map(k => {
      const T = _XP_TREES[k];
      return `<button class="xp-card xp-tree-opt${_xpTreeSel === k ? ' sel' : ''}" data-tree="${k}">
        <span class="xp-tree-art">${_xpPlantSVG(0.92, { d: 0, today: false }, 0.5, k)}</span>
        <span class="xp-tree-info"><span class="xp-tree-name">${T.name}</span><span class="xp-tree-desc">${T.desc}</span></span>
        <span class="xp-tree-check">${_xpTreeSel === k ? '✓' : ''}</span>
      </button>`;
    }).join('');
  }

  function openPlantTypePicker() {
    if (plantTypeChosen()) return;
    _xpTreeSel = null;
    let panel = document.getElementById('plant-type');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'plant-type';
      panel.className = 'settings-panel sub';
      panel.innerHTML =
        `<div class="settings-nav">
          <button class="settings-back-btn" id="plant-type-back" aria-label="Back">
            <svg width="11" height="18" viewBox="0 0 9 15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="8,1 1,7.5 8,14"/></svg>
          </button>
          <div class="settings-nav-title">Choose your tree</div>
        </div>
        <div class="settings-body" id="plant-type-body"></div>`;
      document.body.appendChild(panel);
      document.getElementById('plant-type-back').addEventListener('click', closePlantTypePicker);
    }
    const body = document.getElementById('plant-type-body');
    body.style.padding = '8px var(--gutter) calc(env(safe-area-inset-bottom, 0px) + 2rem)';
    const render = () => {
      body.innerHTML = '<div class="xp-cap" style="margin:4px 2px 12px">Pick the tree you want to grow. You can choose only once.</div>' + _xpTreePickerHTML() +
        `<button class="xp-tree-confirm" id="plant-type-confirm"${_xpTreeSel ? '' : ' disabled'}>Confirm</button>`;
      body.querySelectorAll('.xp-tree-opt').forEach(b => b.addEventListener('click', () => { _xpTreeSel = b.dataset.tree; render(); }));
      document.getElementById('plant-type-confirm').addEventListener('click', () => {
        if (!_xpTreeSel) return;
        plantTypeSet(_xpTreeSel);
        closePlantTypePicker();
        _xpRefreshPlantCard();
      });
    };
    render();
    requestAnimationFrame(() => { panel.classList.add('open'); body.scrollTop = 0; });
  }

  function closePlantTypePicker() {
    document.getElementById('plant-type')?.classList.remove('open');
  }

  /* Re-draw the plant card after the tree (and so the default name) changed */
  function _xpRefreshPlantCard() {
    const card = document.getElementById('xp-plant-card');
    if (!card) return;
    card.outerHTML = _xpPlant(getLevelInfo());
    _xpWirePlantCard();
    const root = document.getElementById('xp-detail-body');
    if (root) { root.classList.remove('xp-go'); requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('xp-go'))); }
  }

  function _xpWirePlantCard() {
    const nBtn = document.getElementById('xp-plant-name');
    if (nBtn) nBtn.addEventListener('click', _xpPlantRenameStart);
    const sRow = document.getElementById('xp-story-row');
    if (sRow) sRow.addEventListener('click', openPlantStory);
    const cBtn = document.getElementById('xp-choose-tree');
    if (cBtn) cBtn.addEventListener('click', openPlantTypePicker);
  }

  // === PLANT NAME ===
  /* The user can rename the plant (localStorage "plantName", category "xp" in EXPORT_CATEGORIES).
     Story and journal texts are written with the default name "Fig" and swapped at display time. */
  const _XP_PLANT_NAME_MAX = 16;
  const _xpDefaultName = () => (_XP_TREES[plantTypeGet()] || _XP_TREES.fig).name;   /* the tree's own name until the user names it */

  function plantNameGet() {
    const n = (localStorage.getItem('plantName') || '').trim();
    return n || _xpDefaultName();
  }
  function plantNameSet(v) {
    v = String(v || '').trim().slice(0, _XP_PLANT_NAME_MAX);
    if (!v || v === _xpDefaultName()) localStorage.removeItem('plantName');
    else localStorage.setItem('plantName', v);
  }
  const _xpEsc = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  /* HTML-safe text with the plant's current name in place of "Fig" */
  const _xpFig = text => text.replace(/\bFig\b/g, () => _xpEsc(plantNameGet()))
    .replace(/\{fruits\}/g, () => _XP_TREES[plantTypeGet()].fruits).replace(/\{fruit\}/g, () => _XP_TREES[plantTypeGet()].fruit);

  function _xpPlantRenameStart() {
    const btn = document.getElementById('xp-plant-name');
    if (!btn) return;
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'xp-plant-name-input';
    input.maxLength = _XP_PLANT_NAME_MAX;
    input.value = plantNameGet();
    input.setAttribute('aria-label', 'Plant name');
    btn.replaceWith(input);
    input.focus(); input.select();
    let done = false;
    const finish = save => { if (done) return; done = true; if (save) plantNameSet(input.value); _xpPlantNameShow(input); };
    input.addEventListener('keydown', e => { if (e.key === 'Enter') finish(true); else if (e.key === 'Escape') finish(false); });
    input.addEventListener('blur', () => finish(true));
  }

  function _xpPlantNameShow(input) {
    const n = _xpEsc(plantNameGet());
    const b = document.createElement('button');
    b.className = 'xp-plant-name'; b.id = 'xp-plant-name';
    b.setAttribute('aria-label', 'Rename plant');
    b.innerHTML = `${n} <span class="xp-plant-name-edit">✎</span>`;
    b.addEventListener('click', _xpPlantRenameStart);
    input.replaceWith(b);
    const lbl = document.querySelector('#xp-story-row .xp-badges-lbl');
    if (lbl) lbl.innerHTML = `${n}'s Story`;
  }

  // === PLANT JOURNAL ===
  /* After every training one short snippet is written to the journal (localStorage "plantLog",
     category "xp" in EXPORT_CATEGORIES). Entries hold only indices { w: workoutId, ts, ch, sn },
     the text comes from the pools below, so wording can change without touching saved data. */
  const _XP_PLANT_SNIPPETS = [
    ['You press the seed into the soil and pour in a little water. Nothing happens yet, and that is fine.',
     'The soil is still dark and quiet. Somewhere underneath, something is listening.',
     'You set the pot on the windowsill. The seed has company now.',
     'A drop of water slides down the clay. The seed is patient. So are you.',
     'Still no green. But the soil looks darker where you watered it, and that counts.'],
    ['Fig leans a little toward you as you pour the water.',
     'A third leaf unfolds, tiny and a bit crumpled, but proud.',
     'Fig drinks it all in. The leaves look a shade greener.',
     'You wipe a bit of dust off a leaf. Fig seems to approve.',
     'The window light hits Fig just right today.'],
    ['Fig\'s stem is thicker today. Sturdy, like it is bracing for a heavy set.',
     'You water Fig and it nods, which is probably just a draft. Probably.',
     'A new leaf has appeared overnight, pointing straight at the ceiling.',
     'Fig stretches toward the light the way you stretch after your last rep.',
     'The pot feels a bit small for Fig now. A good problem to have.'],
    ['Fig\'s roots press against the clay, hungry for more.',
     'Steady weeks, steady growth. Fig has stopped drooping on rest days.',
     'Fig stands tall while you put the weights away. You both earned this.',
     'A strong breeze comes through the window and Fig does not even sway.',
     'You and Fig have a routine now: you sweat, Fig drinks.'],
    ['The bud at Fig\'s tip is a little bigger today, still closed tight.',
     'Fig trembles with anticipation. Or maybe that is the washing machine.',
     'A hint of pink shows between the bud\'s green scales.',
     'You water Fig gently, careful not to rush what is almost ready.',
     'The bud swells a little more. Any day now.'],
    ['Petals catch the light as you pour the water. Fig is showing off.',
     'A bee drifts in through the window to say hello to the flower.',
     'The flower turns toward you as if to say: nice work.',
     'Fig\'s blossom smells faintly sweet today. Training pays off.',
     'Another petal opens. Fig is becoming the star of the room.'],
    ['Fig glows. You water it out of habit and it feels like a thank-you.',
     'Full bloom, full effort. Fig knows what you did today.',
     'Visitors ask for Fig\'s secret. You just smile and point at your gym bag.',
     'Fig does not need much now, just you showing up. And you do.',
     'Another training, another drink. The habit is the real flower.'],
  ];

  /* More lines per chapter (indices 5-13) so a long chapter stays varied; the first five above keep their indices. */
  const _XP_PLANT_SNIPPETS_MORE = [
    [
      "You tuck the soil in tighter around the seed, like a blanket.",
      "The pot is quiet today. Somewhere below, a plan is taking shape.",
      "You water slowly and watch the soil darken. Good soil, good start.",
      "You check the windowsill. Still nothing, still hopeful.",
      "A morning of sunlight warms the clay. The seed does not mind waiting.",
      "You tell the seed about your workout. It keeps your secrets.",
      "The soil smells fresh, like rain on a gym floor.",
      "Another day, another drink. Roots may be starting, unseen.",
      "You turn the pot a quarter so the light finds every side."
    ],
    [
      "Fig bends toward the window, then back toward you. Hard to choose.",
      "A tiny leaf wiggles when you close the door. Fig is excited.",
      "The sprout stands a little straighter after its drink.",
      "You find a drop of water balanced on a leaf. Fig is saving it for later.",
      "Fig grew a bit overnight. You measure it with your thumb.",
      "Fig watches you stretch and tries its best to copy.",
      "The leaves feel soft and a little cool. A healthy sign.",
      "You hum while you water. Fig might be humming back.",
      "Fig is still small, but it already takes up more of the windowsill than before."
    ],
    [
      "Fig has outgrown its first saucer. You find a bigger one.",
      "A leaf unfurls wide, like an arm stretching after a long set.",
      "You steady the stem with a stick. Fig does not really need it, but it likes it.",
      "Fig casts a little shade on the windowsill. It is growing up fast.",
      "The stem is firm between your fingers. Strong, like your grip is getting.",
      "Fig catches the afternoon sun and glows green.",
      "You trim a yellow leaf. Fig looks neater and a bit lighter.",
      "You come home tired. Fig is waiting, and somehow that helps.",
      "Fig is taller than the water glass now. Progress you can measure."
    ],
    [
      "Fig is dense with leaves now, a small green gym of its own.",
      "The pot feels snug. Fig is clearly ready for a bigger one.",
      "You water Fig after a hard session. It drinks like it earned it too.",
      "Fig does not flinch at the cold draft. Hardened by routine.",
      "A side shoot appears. Fig is branching out, just like you.",
      "You lift the pot to dust the shelf. It is heavier than last month.",
      "Fig leans on nothing. It stands on its own now.",
      "You catch your reflection and Fig in the window. A good team.",
      "Fig is greener than you remembered. Consistency shows."
    ],
    [
      "The bud shows a streak of colour at its edge.",
      "Fig holds its breath. You water gently and hold yours too.",
      "The bud is firmer today, packed with potential.",
      "You resist peeking too often. The bud opens when it is ready.",
      "A leaf curls protectively around the bud.",
      "The room smells faintly sweet. Something is about to happen.",
      "You check the bud before and after training. A new ritual.",
      "The bud trembles slightly in the breeze, and stays shut.",
      "Almost there, Fig. Almost there."
    ],
    [
      "You pause at the door just to look at the flower.",
      "A petal drifts onto the windowsill. Fig has plenty more.",
      "The flower is open to the afternoon light, wide and unashamed.",
      "Fig smells like a well-earned rest day.",
      "You send a photo of Fig to a friend. They ask who is training whom.",
      "The blossom follows the sun across the room. Fig has its own routine.",
      "A second bud is forming. Fig is not done yet.",
      "You water gently so the petals stay dry. Fig appreciates the care.",
      "The colour of the flower deepens a shade. A good week."
    ],
    [
      "The whole plant is in bloom. You do not remember a time it was not.",
      "You water Fig and realise you would miss this routine.",
      "Fig stands tall, bright and unbothered. You know the feeling.",
      "A visitor stops and stares at Fig. You just nod.",
      "Fig has become part of your training day, like warm-up and cooldown.",
      "You sit with Fig for a minute after your session. Quiet and proud.",
      "New petals open while old ones fall. Growth never really stops.",
      "Fig does not ask for much. Water, light, and you.",
      "You trained, Fig bloomed. That is the whole story, and it is a good one."
    ]
  ];
  _XP_PLANT_SNIPPETS.forEach((pool, i) => pool.push(...(_XP_PLANT_SNIPPETS_MORE[i] || [])));

  const _XP_PLANT_SNIPPETS_MORE2 = [
    [
      "You wipe the soil dust off your hands and look at the pot. Still waiting.",
      "The seed sits in the dark, trusting you to keep coming back.",
      "A little condensation beads on the inside of the pot. Life is happening somewhere.",
      "You water the seed the way you set a weight down: carefully.",
      "The soil has settled around the seed. It feels like a promise.",
      "You almost forget the pot, then smile. Today you remembered.",
      "The pot smells of earth and patience.",
      "A breeze stirs the curtain. The seed stays put, deep and calm."
    ],
    [
      "Fig tilts its tiny leaves as if listening to your breathing.",
      "You notice a new fold on a leaf. Fig is learning to unfurl.",
      "Fig is slightly taller than yesterday, or you are slightly prouder.",
      "You rest a finger near Fig. It does not move, but it feels close.",
      "A bit of morning dew clings to Fig. Or maybe that is sweat from your hands.",
      "Fig sways gently, unbothered by the busy day outside.",
      "The window light makes Fig look almost see-through.",
      "Fig has a little more green than yesterday. Small steps."
    ],
    [
      "Fig leans toward the light like you lean into a heavy set.",
      "You notice Fig has a favourite side to grow on.",
      "A leaf tip browns slightly. You trim it and Fig looks relieved.",
      "Fig drinks quickly now, thirsty for the work you both did.",
      "The stem sways when you walk past. Fig waves.",
      "A new leaf is forming in the middle, tightly rolled like a fist.",
      "You catch yourself talking to Fig about your next goal.",
      "Fig has found its rhythm: sun, water, repeat."
    ],
    [
      "Fig fills the corner of the room with a calm green.",
      "You prune a stray leaf. Fig is tidier and stronger for it.",
      "Fig bears the weight of its own branches without bending.",
      "The soil dries faster now. Fig is hungry for effort.",
      "You move the pot to catch more light. Fig thanks you by growing.",
      "Fig is not just surviving anymore. It is thriving.",
      "Raindrops on the window, and Fig does not even notice.",
      "You compare Fig to a photo from last month. Hard to believe."
    ],
    [
      "You bring a lamp near Fig, just in case the bud needs extra warmth.",
      "The bud is the most patient thing in the room.",
      "A tiny petal edge peeks out, then hides again.",
      "Fig puts everything into this one bud. You know the feeling.",
      "You hold your breath for a moment. The bud holds still.",
      "The leaves around the bud arch like cheering friends.",
      "The bud leans a little toward you today.",
      "You water, then step back and give Fig some quiet."
    ],
    [
      "The flower is the brightest thing on your windowsill.",
      "You count the petals again. All there, all perfect.",
      "A friend asks if Fig is real. You show them your training log.",
      "The scent of the flower drifts across the room as you stretch.",
      "Fig bows slightly under the weight of its blossom.",
      "You pause mid-cooldown just to look at the bloom.",
      "Fig has become the heart of the room.",
      "The petals are soft and warm in the afternoon light."
    ],
    [
      "The tree glows in the evening light, golden at the edges.",
      "You stand in front of Fig a moment. Neither of you needs words.",
      "Fig has grown into the room, and you have grown into the habit.",
      "A {fruit} drops softly onto the saucer. A little reward for showing up.",
      "You trained, and Fig answers with a quiet, bright bloom.",
      "Fig stands as proof that small days add up.",
      "Every petal is a training session you did not skip.",
      "The leaves rustle like polite applause."
    ]
  ];
  _XP_PLANT_SNIPPETS.forEach((pool, i) => pool.push(...(_XP_PLANT_SNIPPETS_MORE2[i] || [])));

  // === PLANT TRAINING TAIL ===
  /* A second short sentence built from the training itself (time of day, length, size, new record,
     weekday). Together with the main line it multiplies the possible sentences. Entries store only
     the tail id and two numbers: { tl, d: minutes, x: exercises }. */
  const _xpV = (e, list) => list[(e.ts || 0) % list.length];   /* stable wording per entry */
  const _XP_TAILS = {
    am:    e => _xpV(e, ['A morning session, the best way to start.', 'Done before the day even got going.', 'An early start. Fig likes early starts.']),
    pm:    e => _xpV(e, ['An evening session, and the day ends well.', 'Late effort, calm finish.', 'You trained after the day was done with you.']),
    noon:  e => _xpV(e, ['A midday session, squeezed into a busy day.', 'A break in the day, spent well.', 'Right in the middle of the day. Good timing.']),
    long:  e => _xpV(e, [`${e.d} minutes of work. Fig felt every one.`, `A long ${e.d} minute session. Fig is proud.`, `${e.d} minutes. That takes patience.`]),
    short: e => _xpV(e, ['Short and sharp today, and it still counts.', 'Quick but it counts.', 'Not long, but you showed up.']),
    many:  e => _xpV(e, [`${e.x} exercises in one session. Fig is impressed.`, `${e.x} different exercises today. Variety suits you.`, `A busy ${e.x} exercise session.`]),
    pr:    e => _xpV(e, ['A new personal record too. Fig heard about it.', 'And a new personal record. Fig is cheering quietly.', 'A personal best on top of it all.']),
    mon:   e => _xpV(e, ['Starting the week right.', 'Monday done. The week is yours.']),
    fri:   e => _xpV(e, ['A strong finish to the week.', 'Friday, and you still showed up.']),
    wkd:   e => _xpV(e, ['Weekend effort, the best kind of free time.', 'Even on the weekend. Fig noticed.']),
  };

  function _xpPickTail(w, lastTl) {
    const d = Math.round(((w && w.duration) || 0) / 60);
    const x = ((w && w.exercises) || []).filter(e => !e.killer).length;
    const now = new Date(), h = now.getHours(), dow = now.getDay();
    let pr = false;
    try { pr = typeof findNewPRs === 'function' && findNewPRs().length > 0; } catch (e) {}
    const c = [h < 10 ? 'am' : (h >= 18 ? 'pm' : 'noon'), 'none', 'none'];
    if (d >= 60) c.push('long'); else if (d > 0 && d <= 20) c.push('short');
    if (x >= 6) c.push('many');
    if (pr) c.push('pr', 'pr');
    if (dow === 1) c.push('mon'); else if (dow === 5) c.push('fri'); else if (dow === 0 || dow === 6) c.push('wkd');
    const pool = c.filter(t => t !== lastTl);
    const tl = (pool.length ? pool : c)[Math.floor(Math.random() * (pool.length || c.length))];
    return { tl: tl === 'none' ? '' : tl, d, x };
  }

  function _xpPlantLogRead() {
    try { const a = JSON.parse(localStorage.getItem('plantLog')); return Array.isArray(a) ? a : []; } catch (e) { return []; }
  }

  function plantSnippetText(e) {
    const pool = e && e.p !== undefined ? e.p : (e && e.ch);   /* old entries: ch was the pool */
    const main = (_XP_PLANT_SNIPPETS[pool] || [])[e && e.sn] || '';
    const tail = e && e.tl && _XP_TAILS[e.tl] ? ' ' + _XP_TAILS[e.tl](e) : '';
    return _xpFig(main + tail);
  }

  /* Called once per finished training; returns the journal entry (existing one if already logged). */
  function plantLogTraining(w) {
    const log = _xpPlantLogRead();
    const wid = w && w.id !== undefined ? w.id : null;
    if (wid !== null) { const have = log.find(e => e.w === wid); if (have) return have; }
    const info = getLevelInfo();
    const p = _xpPlantStageIdx(_xpPlantGrowth(info));   /* line pool follows the plant's growth stage */
    const ch = _xpChapterIdx(info.level);               /* chapter follows the rank */
    /* pick a line used least often in this pool, never the same as the previous entry */
    const pool = _XP_PLANT_SNIPPETS[p], used = log.filter(e => (e.p !== undefined ? e.p : e.ch) === p);
    const counts = pool.map((_, i) => used.filter(e => e.sn === i).length);
    const min = Math.min(...counts);
    let cands = pool.map((_, i) => i).filter(i => counts[i] === min);
    const lastSn = used.length ? used[used.length - 1].sn : -1;
    if (cands.length > 1) cands = cands.filter(i => i !== lastSn);
    const lastTl = log.length ? log[log.length - 1].tl || '' : '';
    const entry = { w: wid, ts: Date.now(), ch, p, lv: info.level, sn: cands[Math.floor(Math.random() * cands.length)], ..._xpPickTail(w, lastTl) };
    log.push(entry);
    try { localStorage.setItem('plantLog', JSON.stringify(log)); } catch (e) {}
    return entry;
  }

  /* Top of the post-workout screen: the animated plant (watered, so no thirst) and today's journal line */
  function plantPostWorkoutHTML(entry) {
    const g = _xpPlantGrowth(getLevelInfo());
    const ch = _XP_PLANT_STORY[entry.ch] || ['', ''];
    return `<div class="pw-plant-card">
      <div class="pw-plant-art">${_xpPlantSVG(g, { d: 0, today: true }, 1.1)}</div>
      <div class="pw-plant-chap">${_xpEsc(plantNameGet())}'s story · Chapter ${entry.ch + 1} · ${ch[0]}</div>
      <div class="pw-plant-line">${plantSnippetText(entry)}</div>
    </div>`;
  }

  // === PLANT LEVEL STORY ===
  /* One short story beat per level (1-50), so the story moves with every level and not only per chapter.
     Shown on the level-up screen and listed per chapter in the story screen. Derived from the level, nothing stored. */
  const _XP_PLANT_BEATS = [
    "You plant the seed and water it for the first time.",
    "Nothing yet, but the soil feels alive.",
    "A hairline crack opens in the seed. Something is stirring.",
    "A pale green tip breaks through the soil.",
    "Two tiny leaves open. Fig is officially a plant.",
    "The sprout stands straight and turns toward the window.",
    "A third leaf unfolds, small and a little crumpled.",
    "Fig leans toward you whenever you come home.",
    "The leaves deepen to a healthy green.",
    "A first side shoot appears. Fig is branching out.",
    "A proper stem. Fig stands up on its own.",
    "Fig puts out a leaf wider than your thumb.",
    "You move Fig to a bigger saucer.",
    "Fig casts a little shadow on the windowsill.",
    "The leaves turn glossy.",
    "A second branch reaches out. Fig is becoming bushy.",
    "Fig shrugs off a cold night by the window.",
    "New leaves crowd the branches.",
    "The stem thickens a little more.",
    "Fig is a full young plant. The roots are catching up.",
    "Fig has outgrown the shadow of its pot.",
    "A third branch. Tiny green buds show at the tips.",
    "Fig reaches for the light like you reach for a new rep.",
    "The buds on the branches stay small but stubborn.",
    "You lift the pot. Heavier than it used to be.",
    "Fig drinks more now, and grows more for it.",
    "The leaves are dense, a small green gym of their own.",
    "Fig has stopped wobbling in the draft.",
    "A branch thickens into something almost woody.",
    "One more level and Fig will look like a tree in the making.",
    "The base of the stem turns woody and brown. Fig looks grown up.",
    "A crown of leaves fans out at the top.",
    "A closed bud forms at the very tip.",
    "The trunk keeps thickening, steady as your routine.",
    "The bud swells, still shut tight.",
    "Fig stands tall without any support.",
    "A streak of colour shows on the bud.",
    "Pink buds appear along the branches.",
    "The trunk has real bark texture now.",
    "Fig fills the windowsill.",
    "The top bud trembles with anticipation.",
    "One level before the first flower. You can smell it coming.",
    "The first blossom opens. Fig is in bloom.",
    "Small {fruits} start to hang from the branches.",
    "More petals open every day.",
    "The flowers follow the sun across the room.",
    "The {fruits} ripen on the branches.",
    "Fig stands out in the room like a trophy.",
    "One more level to the legend. Fig glows.",
    "Fig is an ancient tree in full golden bloom. The habit grew with it, and it is yours now."
  ];

  function plantLevelBeat(level) {
    /* the 50 beats describe the plant growing up; spread them over levels 1-40 */
    if (level > _XP_PLANT_MATURE_LEVEL) return _xpFig(`Level ${level}. Fig stands fully grown and strong, and keeps getting sturdier.`);
    const idx = Math.round((Math.max(1, level) - 1) / (_XP_PLANT_MATURE_LEVEL - 1) * (_XP_PLANT_BEATS.length - 1));
    return _xpFig(_XP_PLANT_BEATS[idx] || '');
  }

  // === PLANT NATURE NOTES ===
  /* Item 45: short, true facts told along the story. Chapters 1-8 (the plant growing up) carry a note
     about the chosen tree type; chapters 9-20 (the forest) carry a note about forests and wildlife. */
  const _XP_NATURE_NOTES = {
    "fig": [
      "A fig seed is smaller than a sesame seed, yet it can grow into a tree that lives for many decades.",
      "In the wild, fig seedlings often sprout in cracks in walls and rocks, wherever a bird dropped a seed.",
      "Fig leaves are large and lobed, and they give welcome shade. People have planted fig trees beside their homes for thousands of years.",
      "Fig roots search deep for water. Some wild fig roots have been found more than 100 metres underground.",
      "A fig tree spreads its branches very wide, which is why old fig trees make such good shade.",
      "A fig is not a normal fruit. It is a hollow cluster of flowers: the tiny flowers bloom hidden inside.",
      "Many fig species depend on one kind of tiny wasp to pollinate their hidden flowers. Tree and wasp have grown up together for millions of years.",
      "Figs feed birds, bats, monkeys and insects. In tropical forests fig trees are called keystone species, because so many animals depend on them."
    ],
    "oak": [
      "An acorn holds everything an oak needs to start: a tiny root, a shoot and a store of food.",
      "Jays and squirrels bury acorns for the winter and forget some of them. That is how oak forests spread.",
      "Oak leaves have rounded lobes. When they fall in autumn they rot slowly and feed the soil.",
      "A young oak first grows one strong root straight down, and only then grows tall.",
      "Oak branches grow wide and gnarled, and each one becomes a home for moss, lichens and birds' nests.",
      "In spring oaks hang out long flowers called catkins that release clouds of pollen.",
      "Oaks do not need bees. The wind carries their pollen from tree to tree.",
      "An oak can host hundreds of species of insects, birds and mammals, and some oaks live for more than 500 years."
    ],
    "cherry": [
      "Cherry seeds need a cold winter before they wake up. Gardeners copy winter in the fridge to make them sprout.",
      "A young cherry tree grows fast, and it can start to flower after only a few years.",
      "Cherry bark has horizontal stripes called lenticels. They are tiny breathing holes that let the trunk exchange air.",
      "Cherry roots spread wide near the surface, which is why the tree likes loose, well-drained soil.",
      "Cherry branches carry short side shoots called spurs, which produce the flowers year after year.",
      "In early spring cherry trees cover themselves in blossom, an important meal for bees when little else is flowering.",
      "Cherry blossom lasts only a few days, which is why many cultures celebrate it as a reminder to enjoy the moment.",
      "Birds love ripe cherries and spread the seeds in their droppings, so new trees grow far from the old one."
    ],
    "pine": [
      "Pine seeds sit inside cones. Many cones only open to release them when the weather is warm and dry.",
      "A pine's roots team up with fungi in the soil. The fungi help the tree find water and nutrients.",
      "Pine needles have a waxy coat that keeps water in, so pines can stay green in cold or dry places.",
      "Pines send roots deep and wide, which helps them hold poor, sandy soil in place.",
      "Pines grow their branches in rings around the trunk. Counting the rings gives a good idea of a young pine's age.",
      "Pines carry male and female cones on the same tree. The small male cones release clouds of yellow pollen.",
      "The wind carries pine pollen, and a cone can take two years to ripen after it has been pollinated.",
      "Pines stay green all year, sheltering birds and small animals in winter. The oldest known bristlecone pines are about 4,800 years old."
    ],
    "maple": [
      "Maple seeds have two wings and spin like helicopters as they fall, which carries them away from the parent tree.",
      "A maple seedling sprouts with two narrow leaves first, and only later grows its typical lobed leaves.",
      "Maple leaves are broad and catch lots of sunlight, which helps the tree grow fast.",
      "In early spring maple roots pull up water and the sap rises. People tap sugar maples for it: about 40 litres of sap make one litre of syrup.",
      "Maple branches grow in opposite pairs, which is an easy way to recognise a maple.",
      "Maples flower in early spring, often before the leaves open, giving bees an early meal.",
      "Maple flowers are small and grow in clusters, yellow-green or red. They are easy to miss but bees find them.",
      "In autumn the green fades and shows the yellow and orange colours that were hidden all summer, while the tree makes new red ones."
    ]
  };
  const _XP_FOREST_NOTES = [
    "A tree makes thousands of seeds in its life, and only a few ever grow into trees. That is normal, and the forest needs it that way.",
    "Young trees grow best with enough light and space. Crowded seedlings compete for the same sun and water.",
    "Trees take in carbon dioxide and release oxygen while they grow.",
    "Trees in a grove can share more than space. Their roots connect through fungi in the soil, which can pass water and nutrients between them.",
    "Wildflowers feed bees and butterflies, and these insects pollinate many plants and feed birds.",
    "Trees along a stream shade the water and keep it cool, which helps fish and frogs. Their roots also hold the bank together.",
    "Many forest animals, such as deer and foxes, are most active at dusk and dawn. The edge of a forest is a rich place to live.",
    "Old trees with hollow trunks and dead wood are homes for owls, bats and beetles. That is why old trees are worth protecting.",
    "Fireflies need damp, undisturbed ground to grow up, so they are a sign of a healthy habitat.",
    "A healthy forest recycles itself: fallen leaves and wood feed fungi and insects, which feed the soil, which feeds new trees.",
    "Forests are home to most of the world's land animals and plants. Protecting a forest protects thousands of connected species.",
    "Trees can store carbon for hundreds of years. One seed and years of care can become a lasting home for many other species."
  ];

  /* One short true fact per level (1-100), shown when a level is opened in the story. */
  const _XP_LEVEL_NOTES = [
    "Water is what wakes a seed up: it softens the shell and starts the tiny plant inside growing.",
    "Before anything shows, a lot happens under the soil: the seed swells and a tiny root pushes out first.",
    "Seedlings are pale at first. They turn green once they reach the light and make chlorophyll.",
    "The first two leaves are called seed leaves. They come from the seed and feed the seedling until the true leaves grow.",
    "Plants bend toward light: the shaded side of the stem grows faster, which turns the plant toward the window.",
    "New leaves unfold from tight buds. They start out crumpled because they were folded to fit into a tiny space.",
    "Leaves get greener as they build more chlorophyll, the pigment that captures sunlight to make food.",
    "Side shoots grow from buds along the stem. Pinching the tip of a plant makes it send out more of them.",
    "Stems stand up because their cells are full of water. When a plant runs low on water, it droops.",
    "A bigger leaf catches more light, so it can make more food for the plant.",
    "Leaves cast shade because they absorb most of the light that hits them. That is why it is cooler under a tree.",
    "Many leaves have a waxy coat that makes them glossy and keeps water from escaping.",
    "Branching gives a plant more leaves in the light, but each new branch also needs water from the roots.",
    "Plants cope with cold by slowing their growth and by making sugars that work like a natural antifreeze.",
    "A woody stem grows thicker through a thin layer of cells just under the bark, which adds new wood each year.",
    "Roots and leaves grow in balance: the more leaves a plant has, the more root it needs to supply them with water.",
    "When roots fill the whole pot, a plant slows down. That is why it is time for a bigger pot.",
    "Buds at the tips are tiny packed shoots. Some will become leaves, others flowers.",
    "Many buds stay dormant, waiting for the right light and season before they open.",
    "A growing plant gets heavy: much of its weight is water, plus the wood and the soil held by its roots.",
    "A plant drinks a lot more as it grows. A big tree can draw up hundreds of litres of water on a hot day.",
    "Dense leaves are working hard: each leaf is a tiny food factory powered by sunlight.",
    "Wood is made of tough fibres. It lets a plant stand tall and carry water a long way up.",
    "A tree is simply a plant with a woody trunk that lasts from year to year.",
    "Brown bark forms as the outer layer dries and toughens, protecting the living wood inside.",
    "The leafy top of a tree is called the crown. It spreads its leaves out to catch as much light as possible.",
    "A trunk gets wider a little each growing season, adding a new ring of wood.",
    "A flower bud swells as the plant moves sugar into it, getting ready to open.",
    "Trees stay upright by bending in the wind: flexible wood and wide roots keep them from toppling.",
    "The colour you see first on a bud comes from the petals folded inside, already waiting.",
    "The pattern of bark is different for each kind of tree, and experts can name a tree from its bark alone.",
    "A plant grows toward open space and light, and its leaves arrange themselves to avoid shading each other.",
    "Flower buds open when day length and warmth tell the plant it is the right season.",
    "Flower scent is a signal: it guides bees, butterflies and moths to the nectar.",
    "A fruit grows from the flower after pollination, and it protects the seeds inside.",
    "Petals are colourful signposts that guide pollinators to the nectar.",
    "Some flowers turn to follow the sun during the day, which warms them and attracts more pollinators.",
    "As fruit ripens it gets softer, sweeter and more colourful, which tells animals it is ready to eat and carry the seeds away.",
    "A healthy tree does a lot of quiet work: it makes oxygen, shade and food for many other living things.",
    "Some trees live for hundreds or even thousands of years, because they keep growing new wood and new roots every year.",
    "Parent plants often drop their seeds close by, so tiny seedlings appear all around them.",
    "Most seedlings never become trees: they run out of light, water or space.",
    "A seedling has only a few leaves, so it grows slowly until its roots have settled in.",
    "A seedling growing in its parent's shade stretches toward the light.",
    "A tree can make thousands of seeds in its life, and only a few of them ever become trees.",
    "Many trees send up new shoots from their roots, making copies of themselves.",
    "An aspen grove can be a single living organism, connected underground.",
    "Young trees often grow in the shelter of older ones, which break wind and frost.",
    "Gardeners re-pot young plants so each one has room to grow its roots.",
    "Many plants can be grown from cuttings: a piece of stem can grow new roots.",
    "The best time to plant a tree is when it is dormant, so it settles in before it starts growing.",
    "Newly planted trees need steady water in their first years while the roots spread.",
    "Mulch around a young tree keeps moisture in and protects the roots from temperature swings.",
    "Roots usually spread as wide as the crown or wider, not only deep.",
    "Trees can cool a street by several degrees, by giving shade and releasing water vapour.",
    "In a group, trees often grow straighter and taller as they reach for the same light.",
    "Studies have found that trees can share sugars through fungal networks in the soil.",
    "Birds nest in trees and eat insects that would otherwise damage the leaves.",
    "Squirrels and jays plant more trees than people notice, by burying seeds and forgetting some.",
    "Trees are home to creatures from tiny insects to owls and woodpeckers.",
    "Wildflowers grow without being planted, from seeds carried by wind, birds and animals.",
    "A flower meadow can host many times more insects than a mown lawn.",
    "Butterflies taste with their feet.",
    "Hoverflies pollinate flowers, and their larvae often eat pests such as aphids.",
    "Different flowers bloom at different times, giving pollinators food through the year.",
    "Streams carry water, nutrients and seeds through a forest.",
    "Trees along a bank shade the water, which keeps it cool for fish.",
    "Frogs breathe partly through their skin, so they need clean, damp places.",
    "Dragonfly larvae live underwater for months or even years before they fly.",
    "Forests act like sponges: soil and roots soak up rain and release it slowly.",
    "At dusk, deer, foxes and bats come out. Many forest animals are active in the twilight.",
    "Foxes can hear small animals moving under grass and snow.",
    "A bat can eat thousands of small insects in a single night.",
    "Deer eat young shoots, and too many deer can keep a young forest from growing back.",
    "Hedgehogs roam at night and eat beetles and slugs.",
    "Owls fly almost silently thanks to soft, fringed feathers.",
    "Old trees with hollows give shelter to bats, owls and many insects.",
    "The biggest trees store the most carbon, so protecting old trees matters.",
    "Some old trees are hollow inside and still alive, because only the outer layers carry water.",
    "Lichens grow very slowly on old bark, and they show that the air is clean.",
    "Fireflies make light with a chemical reaction that gives off almost no heat.",
    "Each firefly species has its own flashing pattern, like a code.",
    "Fireflies and glow-worms are beetles.",
    "Fireflies need dark nights, and bright artificial lights can disturb their signals.",
    "Firefly larvae live in damp ground and eat snails and slugs.",
    "Fungi are nature's recyclers: they break wood and leaves down into nutrients.",
    "A mushroom is only the fruit of a much bigger network of threads in the soil.",
    "A fallen tree becomes a nursery for moss, fungi and young trees.",
    "Bacteria, and plants such as clover, help bring nitrogen from the air into the soil.",
    "Healthy soil stores water and carbon, and holds the forest in place.",
    "Forests are home to most of the world's land animals and plants.",
    "Many trees depend on particular animals to spread their seeds.",
    "Predators like owls and foxes keep the number of mice and voles in balance.",
    "Leaving some dead wood and wild corners helps wildlife in gardens too.",
    "Volunteers who count birds, butterflies and fireflies help scientists protect nature.",
    "Some trees stay green all year and shelter animals through winter.",
    "Trees store carbon in their wood for as long as they live, and even afterwards as timber.",
    "Many trees keep making seeds for decades, so a single tree can start a whole forest.",
    "A forest takes many human lifetimes to grow, so what you plant now is for the future.",
    "From one seed to a whole forest: small steady actions, repeated for years, add up."
  ];
  const _xpLevelNote = l => _XP_LEVEL_NOTES[Math.max(1, Math.min(_XP_LEVEL_NOTES.length, l)) - 1] || '';

  function _xpNatureNote(chIdx) {
    if (chIdx < 8) return ((_XP_NATURE_NOTES[plantTypeGet()] || _XP_NATURE_NOTES.fig)[chIdx]) || '';
    return _XP_FOREST_NOTES[chIdx - 8] || '';
  }

  // === PLANT STORY ===
  /* 20 chapters, one per rank (5 levels each). Chapters 1-8 follow the plant growing up
     (levels 1-40); chapters 9-20 tell the story of the baby plants and the forest. */
  const _XP_PLANT_STORY = [
    ['The Gym Bag Seed', 'At the bottom of your old gym bag you find a single seed, a gift from a stranger who said: "It only grows for people who show up." You plant it in a small clay pot and give it a first drink.'],
    ['First Green', 'Two tiny leaves push through the soil. Every time you train, the pot gets watered. You start calling the plant Fig, and Fig seems to wait by the window for you.'],
    ['Standing Tall', 'Fig has a real stem now and leans toward the light, and toward you. On days you skip training the leaves droop a little. It never complains, but you notice.'],
    ['Roots Run Deep', 'Under the pot, roots have wound around the clay. Strong roots come from steady weeks, not perfect ones. Fig has learned your rhythm, and so have you.'],
    ['Branching Out', 'Fig sends out its first branches, one to each side, like arms reaching for more. Small green buds form at the tips. Growth is no longer only upward.'],
    ['A Hidden Bud', 'The stem turns woody and a leafy crown fans out. At the very top a bud appears, closed tight like a fist before the last rep. Keep watering and you will see what it has been saving.'],
    ['The First Flower', 'The bud opens into a flower around a golden heart. The stranger was right. It grew because you kept showing up. Visitors ask what your secret is.'],
    ['Full Bloom', 'Fig is fully grown, covered in blossoms, with {fruits} hanging from its branches. The seed was never really about the plant. The habit grew with it. And the story is not over.'],
    ['Little Ones', 'One morning you find tiny green shoots in the soil around the pot. Fig has dropped seeds of its own. You are not looking after one plant anymore.'],
    ['A Family of Pots', 'The little ones get their own pots, lined up along the windowsill. Each one leans toward the light the way Fig once did.'],
    ['Moving Outside', 'The young plants outgrow the windowsill. You carry them outside and plant them in the ground, with Fig watching from its pot.'],
    ['The First Grove', 'A small grove stands where there was only grass. The first birds stop on the branches, then decide to stay.'],
    ['Wildflowers', 'Flowers you never planted appear between the trees. Bees and butterflies arrive to look after them.'],
    ['Running Water', 'A small stream finds its way through the grove. Frogs move in, and the evenings get louder.'],
    ['Visitors at Dusk', 'At dusk a deer steps out between the trees, and a fox crosses the path. The grove has become a home.'],
    ['Old Giants', 'The first trees have grown tall and wide. An owl watches from the oldest one, which has a little of Fig in every branch.'],
    ['Fireflies', 'On warm nights the forest floor lights up with fireflies. It feels a bit like magic, but it is just years of showing up.'],
    ['The Forest Remembers', 'The forest now waters and feeds itself. Even on days you rest, it keeps going. That is what strong habits do.'],
    ['Keeper of the Woods', 'Animals no longer run when you walk in. They know you. You are the keeper of this forest now.'],
    ['Evergreen', 'A whole forest grew from one seed in a gym bag. Fig still stands at its heart, in full bloom. This is your legend.'],
  ];
  const _xpChapterIdx = level => Math.max(0, Math.min(_XP_PLANT_STORY.length - 1, Math.floor((level - 1) / 5)));
  const _xpStoryUnlockLevel = i => 1 + i * 5;

  /* Shown only while the current idle period has already cost XP (see XP DECAY in app.js) */
  function _xpDecayNote() {
    const lost = (typeof getXPData === 'function' ? getXPData().decayLost : 0) || 0;
    return lost > 0 ? `<div class="xp-cap" style="margin-top:4px;color:#FF9F0A">−${_xpFmt(lost)} XP lost from inactivity. Train to climb back.</div>` : '';
  }

  function _xpPlant(info) {
    const g = _xpPlantGrowth(info), idx = _xpPlantStageIdx(g), th = _xpPlantThirst();
    return `<div class="xp-card xp-plant" id="xp-plant-card">
      <div class="xp-plant-art">${_xpPlantSVG(g, th)}</div>
      <button class="xp-plant-name" id="xp-plant-name" aria-label="Rename plant">${_xpEsc(plantNameGet())} <span class="xp-plant-name-edit">✎</span></button>
      <div class="xp-plant-stage">${_XP_PLANT_STAGES[idx][1]} · <span class="xp-plant-water">${th.label}</span></div>
      <div class="xp-bar" style="margin-top:8px"><div class="xp-bar-fill xp-water-fill xp-anim" style="--xp-w:${th.pct}%"></div></div>
      <div class="xp-cap" style="margin-top:6px">${th.hint}</div>
      ${_xpDecayNote()}
      ${plantTypeChosen() ? '' : `<button class="xp-choose-tree" id="xp-choose-tree">🌳 Choose your tree ›</button>`}
      <div class="xp-divider" style="margin:12px 0 4px"></div>
      <button class="xp-story-row" id="xp-story-row"><span class="xp-badges-ic">📖</span><span class="xp-badges-lbl">${_xpEsc(plantNameGet())}'s Story</span><span class="xp-badges-count">Chapter ${_xpChapterIdx(info.level) + 1} of ${_XP_PLANT_STORY.length}</span><span class="xp-badges-chev">›</span></button>
    </div>`;
  }

  function _xpStoryHTML(info) {
    const idx = _xpChapterIdx(info.level);
    const log = _xpPlantLogRead();
    const xd = getXPData();
    const effNow = Math.max(0, xd.totalXP - xd.xpPenalty);
    /* level an entry was made at: stored for new entries, estimated from the XP log for older ones */
    const entryLevel = e => {
      if (e.lv && e.p !== undefined) return e.lv;   /* new entries: level on the current scale */
      if (typeof _levelForXP !== 'function') return e.lv || null;
      const after = xd.xpLog.reduce((t, x) => (x && new Date(x.date).getTime() > e.ts) ? t + (Number(x.amount) || 0) : t, 0);
      return _levelForXP(Math.max(0, effNow - after));
    };
    const fmt = ts => new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
    const row = e => `<div class="xp-journal-row xp-journal-nested"><span class="xp-journal-date">${fmt(e.ts)}</span><span class="xp-journal-text">${plantSnippetText(e)}</span></div>`;
    return _XP_PLANT_STORY.map((c, i) => {
      const open = i <= idx;
      const from = _xpStoryUnlockLevel(i), to = from + 4;
      let beats = '';
      if (open) {
        /* each journal entry sits under the level where it was written (inside the chapter it belongs to) */
        const byLevel = {};
        let maxLv = info.level;
        log.forEach(e => {
          const lv = entryLevel(e) || 1;
          if (_xpChapterIdx(lv) !== i) return;   /* entries sit in the chapter of the level they were written at */
          (byLevel[lv] = byLevel[lv] || []).push(e);
          if (lv > maxLv) maxLv = lv;
        });
        for (let l = from; l <= Math.min(to, maxLv); l++) {
          /* level beats exist for the growing-up levels (1-40); later levels only list journal entries */
          const ents = byLevel[l] || [];
          const head = l <= _XP_PLANT_MATURE_LEVEL
            ? `<span class="xp-level-lv">Lv ${l}</span><span class="xp-level-txt">${plantLevelBeat(l)}</span>`
            : `<span class="xp-level-lv">Lv ${l}</span><span class="xp-level-txt">Level ${l}</span>`;
          if (!head) continue;
          /* each level folds away its journal entries (only the current level starts open); its nature note is a tooltip */
          beats += `<div class="xp-lvl${ents.length ? ' has-entries' : ''}${l === info.level ? ' expanded' : ''}">
            <div class="xp-level-row">${head}<button class="xp-note-btn" data-k="L${l}" aria-label="Nature note">ⓘ</button>${ents.length ? '<span class="xp-lvl-chev">›</span>' : ''}</div>
            <div class="xp-lvl-body">${ents.map(row).join('')}</div>
          </div>`;
        }
        beats = `<div class="xp-divider" style="margin:12px 0 6px"></div><div class="xp-plant-chap">Levels ${from}\u2013${to}</div>${beats}`;
      }
      /* only the current chapter starts expanded; tap a chapter to open or close it */
      const expanded = open && i === idx;
      return `<div class="xp-card xp-story-ch${open ? '' : ' locked'}${expanded ? ' expanded' : ''}">
        <div class="xp-ch-head"${open ? ' role="button" tabindex="0"' : ''}>
          <div class="xp-ch-head-text">
            <div class="xp-plant-chap">Chapter ${i + 1} · ${open && _XP_RANKS[i] ? _XP_RANKS[i].label + ' ' + _XP_RANKS[i].emoji : '???'}</div>
            <div class="xp-story-title">${open ? c[0] : 'Locked'}</div>
          </div>
          ${open && _xpNatureNote(i) ? `<button class="xp-note-btn" data-k="C${i}" aria-label="Nature note">ⓘ</button>` : ''}
          ${open ? '<span class="xp-ch-chev">›</span>' : ''}
        </div>
        ${open ? '' : `<div class="xp-story-text">Reach Level ${_xpStoryUnlockLevel(i)} to unlock this chapter.</div>`}
        ${open ? `<div class="xp-ch-body">
          <div class="xp-story-text">${_xpFig(c[1])}</div>
          ${beats}
        </div>` : ''}
      </div>`;
    }).join('');
  }

  // === PLANT NOTE TOOLTIP ===
  /* Nature notes open as a small bubble from the ⓘ next to a chapter or level, instead of taking space in the list. */
  let _xpStoryTip = null;   /* { el, anchor, onDown } */
  function _xpStoryTipClose() {
    if (!_xpStoryTip) return;
    document.removeEventListener('pointerdown', _xpStoryTip.onDown, true);
    _xpStoryTip.el.remove();
    _xpStoryTip = null;
  }
  function _xpStoryTipToggle(btn) {
    const wasOpen = _xpStoryTip && _xpStoryTip.anchor === btn;
    _xpStoryTipClose();
    if (wasOpen) return;
    const k = btn.dataset.k || '';
    const text = k[0] === 'C' ? _xpNatureNote(Number(k.slice(1))) : _xpLevelNote(Number(k.slice(1)));
    if (!text) return;
    const panel = document.getElementById('plant-story');
    const el = document.createElement('div');
    el.className = 'xp-tip xp-story-tip';
    el.innerHTML = '<div class="xp-tip-arrow"></div><div class="xp-story-tip-lbl">Nature note</div>' + text;
    panel.appendChild(el);
    const pr = panel.getBoundingClientRect(), br = btn.getBoundingClientRect();
    const cx = br.left + br.width / 2 - pr.left, cy = br.bottom - pr.top;
    const w = el.offsetWidth, margin = 12;
    const left = Math.max(margin, Math.min(cx - w / 2, pr.width - margin - w));
    el.style.left = left + 'px';
    el.style.top = (cy + 8) + 'px';
    el.style.setProperty('--xp-arrow-x', Math.max(18, Math.min(cx - left, w - 18)) + 'px');
    requestAnimationFrame(() => el.classList.add('show'));
    const onDown = e => { if (!el.contains(e.target) && !btn.contains(e.target)) _xpStoryTipClose(); };
    document.addEventListener('pointerdown', onDown, true);
    _xpStoryTip = { el, anchor: btn, onDown };
  }

  function openPlantStory() {
    let panel = document.getElementById('plant-story');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'plant-story';
      panel.className = 'settings-panel sub';
      panel.innerHTML =
        `<div class="settings-nav">
          <button class="settings-back-btn" id="plant-story-back" aria-label="Back">
            <svg width="11" height="18" viewBox="0 0 9 15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="8,1 1,7.5 8,14"/></svg>
          </button>
          <div class="settings-nav-title" id="plant-story-title"></div>
        </div>
        <div class="settings-body" id="plant-story-body"></div>`;
      document.body.appendChild(panel);
      document.getElementById('plant-story-back').addEventListener('click', closePlantStory);
    }
    document.getElementById('plant-story-title').textContent = plantNameGet() + "'s Story";
    const body = document.getElementById('plant-story-body');
    body.innerHTML = _xpStoryHTML(getLevelInfo());
    body.querySelectorAll('.xp-note-btn').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); _xpStoryTipToggle(b); }));
    body.addEventListener('scroll', _xpStoryTipClose, { passive: true });
    body.querySelectorAll('.xp-lvl.has-entries .xp-level-row').forEach(r => r.addEventListener('click', () => r.parentElement.classList.toggle('expanded')));
    body.querySelectorAll('.xp-story-ch:not(.locked) .xp-ch-head').forEach(h => {
      const toggle = () => h.closest('.xp-story-ch').classList.toggle('expanded');
      h.addEventListener('click', toggle);
      h.addEventListener('keydown', e => { if (e.key === 'Enter') toggle(); });
    });
    body.style.padding = '8px var(--gutter) calc(env(safe-area-inset-bottom, 0px) + 2rem)';
    requestAnimationFrame(() => { panel.classList.add('open'); body.scrollTop = 0; });
  }

  function closePlantStory() {
    _xpStoryTipClose();
    document.getElementById('plant-story')?.classList.remove('open');
  }

  // === XP BADGES ROW ===
  function _xpBadgesRow() {
    if (typeof badgesSummaryText !== 'function') return '';
    return `<button class="xp-card xp-badges-row" id="xp-badges-row"><span class="xp-badges-ic">🏅</span><span class="xp-badges-lbl">Badges</span><span class="xp-badges-count" id="xp-badges-count">${badgesSummaryText()}</span><span class="xp-badges-chev">›</span></button>`;
  }

  function _xpDetailHTML() {
    const info = getLevelInfo();
    return _xpPlant(info) +
      _xpHero(info) +
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
      row('Badge earned', `${BADGE_XP.bronze} / ${BADGE_XP.silver} / ${BADGE_XP.gold} XP`) +
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
    _xpWirePlantCard();
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
    closePlantStory();
    closePlantTypePicker();
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
