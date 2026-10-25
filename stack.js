// === CARD STACK CONSTANTS ===
const STACK_PEEK_PX = 10;
const STACK_SCALE_STEP = 0.04;
const STACK_MAX_VISIBLE_LAYERS = 2;   /* layers behind the top card */

// === CARD STACK STATE ===
/* Expanded/collapsed state per stack, kept in memory so Summary re-renders do not reset it. */
const _cardStackState = {};
const _cardStacks = {};

// === CARD STACK COMPONENT ===
/* iOS-notification-style stack. cards = rendered card elements; stackKey = 'journeys' | 'goals'.
   Cards are absolutely positioned and moved only via transform + z-index. */
function createCardStack(containerEl, cards, stackKey) {
  containerEl.innerHTML = '';
  containerEl.classList.add('card-stack');
  const n = cards.length;
  if (n < 2) {                      /* single card: no stack behavior */
    _cardStackState[stackKey] = false;
    _cardStacks[stackKey] = null;
    containerEl.classList.add('card-stack-single');
    if (n) containerEl.appendChild(cards[0]);
    return null;
  }
  containerEl.classList.remove('card-stack-single');

  // === CARD STACK ITEMS ===
  const items = cards.map((card, i) => {
    const item = document.createElement('div');
    item.className = 'card-stack-item';
    item.style.zIndex = String(n - i);
    const content = document.createElement('div');
    content.className = 'card-stack-content';
    content.appendChild(card);
    item.appendChild(content);
    containerEl.appendChild(item);
    return item;
  });
  const less = document.createElement('button');
  less.type = 'button';
  less.className = 'card-stack-less';
  less.textContent = 'Show less';
  containerEl.insertAdjacentElement('afterend', less);

  // === CARD STACK LAYOUT ===
  const GAP = 8;
  /* natural height = wrapper height + item borders (2px collapsed, 1px expanded); wrapper is never height-constrained */
  function layout() {
    const expanded = !!_cardStackState[stackKey];
    const hs = items.map(it => it.firstChild.offsetHeight + (expanded ? 1 : 2));   /* re-measured on every call */
    const h0 = hs[0];
    let y = 0;
    items.forEach((it, i) => {
      const content = it.firstChild;
      it.style.setProperty('--depth', expanded ? '0' : String(Math.min(i, STACK_MAX_VISIBLE_LAYERS)));   /* depth shading */
      it.style.height = (expanded ? hs[i] : h0) + 'px';
      if (expanded) {
        it.style.transform = `translateY(${y}px) scale(1)`;
        it.style.opacity = '1';
        it.style.pointerEvents = 'auto';
        content.style.opacity = '1';
        y += hs[i] + GAP;
      } else {
        const k = Math.min(i, STACK_MAX_VISIBLE_LAYERS);
        it.style.transform = `translateY(${k * STACK_PEEK_PX}px) scale(${1 - k * STACK_SCALE_STEP})`;
        it.style.opacity = i > STACK_MAX_VISIBLE_LAYERS ? '0' : '1';
        it.style.pointerEvents = i === 0 ? 'auto' : 'none';
        content.style.opacity = i === 0 ? '1' : '0';
      }
    });
    const h = expanded ? Math.max(0, y - GAP) : h0 + Math.min(n - 1, STACK_MAX_VISIBLE_LAYERS) * STACK_PEEK_PX;
    containerEl.style.height = h + 'px';
    less.style.display = expanded ? 'block' : 'none';
    containerEl.classList.toggle('expanded', expanded);
  }

  function setExpanded(v) {
    _cardStackState[stackKey] = !!v;
    layout();
  }
  function toggle() { setExpanded(!_cardStackState[stackKey]); }

  // === CARD STACK EVENTS ===
  containerEl.addEventListener('click', e => {
    if (e.target.closest('button, a')) return;
    toggle();
  });
  less.addEventListener('click', e => { e.stopPropagation(); setExpanded(false); });

  layout();
  if (typeof ResizeObserver === 'function') {   /* re-measure on width change or when the tab becomes visible */
    const ro = new ResizeObserver(() => { if (containerEl.isConnected) layout(); else ro.disconnect(); });
    ro.observe(containerEl);
    items.forEach(it => ro.observe(it.firstChild));
  }
  requestAnimationFrame(() => requestAnimationFrame(() => containerEl.classList.add('card-stack-ready')));

  const api = { toggle, setExpanded };
  _cardStacks[stackKey] = api;
  return api;
}

// === CARD STACK HEADER ===
/* Header tap toggles the stack; safe to call on every render (binds once per header element). */
function bindCardStackHeader(headerEl, stackKey) {
  if (!headerEl || headerEl._stackKey === stackKey) return;
  headerEl._stackKey = stackKey;
  headerEl.addEventListener('click', () => { const s = _cardStacks[stackKey]; if (s) s.toggle(); });
}
