// === CONSTANTS ===
/* The publishable key is public by design. The secret / service_role key must NEVER appear in this repo. */
const SUPABASE_URL = 'https://dntwvlruqzxyiqtdltmb.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_mJRdYTkV7YJ9EoovFVxH0w_Z7X53v3p';

// === CLIENT ===
/* Created once. null when supabase-js is blocked or offline; the app keeps working without it. */
let syncClient = null;
try {
  if (window.supabase && window.supabase.createClient) {
    syncClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
    });
  }
} catch (e) { syncClient = null; }

// === ERROR MAPPING ===
function _syncErrorText(err) {
  if (!err) return 'Something went wrong. Try again.';
  const msg = String(err.message || err).toLowerCase();
  const code = String(err.code || '').toLowerCase();
  if (code === 'invalid_credentials' || msg.includes('invalid login credentials')) return 'Wrong email or password';
  if (code === 'user_already_exists' || msg.includes('already registered') || msg.includes('already been registered')) return 'This email already has an account';
  if (code === 'weak_password' || msg.includes('password should be') || msg.includes('weak password')) return 'Password too short';
  if (msg.includes('failed to fetch') || msg.includes('network') || msg.includes('load failed') || err.name === 'AuthRetryableFetchError') return 'No connection. Try again later.';
  return 'Something went wrong. Try again.';
}

// === AUTH HELPERS ===
const _SYNC_UNAVAILABLE = { ok: false, error: 'Sync unavailable right now' };

/* Current user from the stored session, or null. */
async function getSyncUser() {
  if (!syncClient) return null;
  try {
    const { data } = await syncClient.auth.getSession();
    return (data && data.session && data.session.user) || null;
  } catch (e) { return null; }
}

async function signUpWithEmail(email, password) {
  if (!syncClient) return _SYNC_UNAVAILABLE;
  try {
    const { data, error } = await syncClient.auth.signUp({ email, password });
    if (error) return { ok: false, error: _syncErrorText(error) };
    if (data && data.session) return { ok: true };
    if (data && data.user) {
      /* Existing confirmed emails return a user with no identities */
      if (Array.isArray(data.user.identities) && data.user.identities.length === 0) return { ok: false, error: 'This email already has an account' };
      return { ok: true, needsConfirmation: true, message: 'Check your email to confirm your account, then log in.' };
    }
    return { ok: false, error: 'Something went wrong. Try again.' };
  } catch (e) { return { ok: false, error: _syncErrorText(e) }; }
}

async function signInWithEmail(email, password) {
  if (!syncClient) return _SYNC_UNAVAILABLE;
  try {
    const { error } = await syncClient.auth.signInWithPassword({ email, password });
    return error ? { ok: false, error: _syncErrorText(error) } : { ok: true };
  } catch (e) { return { ok: false, error: _syncErrorText(e) }; }
}

async function signOutUser() {
  if (!syncClient) return _SYNC_UNAVAILABLE;
  try {
    const { error } = await syncClient.auth.signOut();
    return error ? { ok: false, error: _syncErrorText(error) } : { ok: true };
  } catch (e) { return { ok: false, error: _syncErrorText(e) }; }
}

function onSyncAuthChange(callback) {
  if (!syncClient) return;
  try { syncClient.auth.onAuthStateChange((event, session) => callback((session && session.user) || null, event)); } catch (e) {}
}

// === SYNC CONSTANTS ===
const SYNC_SAFETY_MAX_ENTRIES = 5;
const SYNC_SAFETY_MAX_CHARS = 1500000;
const SYNC_PAYLOAD_VERSION = 1;
const SYNC_DEBOUNCE_MS = 4000;
const SYNC_MIN_INTERVAL_MS = 60000;
/* Gemini key and per-device UI state never leave this device */
const SYNC_EXCLUDED_KEYS = ['geminiApiKey', 'exLibExpand1', 'histFolderState', 'progCatCollapsed', 'progressRange', 'chartTapHintDone'];
/* Must match the user_data.category check constraint */
const _SYNC_CATEGORY_IDS = ['history', 'plans', 'library', 'journeys', 'xp', 'settings'];

// === SYNC STATE ===
let isApplyingRemote = false;   /* set while writing downloaded or restored data so it is not tracked */
let _syncRunning = false;
let _syncQueued = false;
let _syncTimer = null;
let _syncLastAttempt = 0;
let _syncCurrentUser = null;
let _syncWarned = false;
let _syncWorkoutBlocked = false;
let _syncWorkoutTimer = null;
let _syncSheetOpen = false;
let _syncSheetShown = false;
const _syncOrigSet = Storage.prototype.setItem;
const _syncOrigRemove = Storage.prototype.removeItem;
const _syncOrigGet = Storage.prototype.getItem;

/* settings.js loads after this file: its helpers are only touched at runtime, never at load */
function _syncHelpersReady() {
  const ok = typeof EXPORT_CATEGORIES !== 'undefined' && typeof getCategoryForKey === 'function' && typeof isTransientKey === 'function';
  if (!ok && !_syncWarned) { _syncWarned = true; console.warn('Sync disabled: category helpers from settings.js are missing'); }
  return ok;
}

function _syncNotify() {
  try { window.dispatchEvent(new CustomEvent('sync-status-changed')); } catch (e) {}
}

// === SYNC META ===
function _syncEmptyMeta(userId) { return { userId: userId || null, categories: {}, lastSyncAt: null, lastError: null }; }

function _syncLoadMeta() {
  try {
    const m = JSON.parse(_syncOrigGet.call(localStorage, 'syncMeta'));
    if (m && typeof m === 'object' && m.categories && typeof m.categories === 'object') return m;
  } catch (e) {}
  return _syncEmptyMeta(null);
}

/* Written with the original setItem so it never re-enters tracking */
function _syncSaveMeta(m) {
  try { _syncOrigSet.call(localStorage, 'syncMeta', JSON.stringify(m)); } catch (e) {}
}

function _syncIsSyncable(key) {
  return typeof key === 'string' && !isTransientKey(key) && !SYNC_EXCLUDED_KEYS.includes(key);
}

/* All syncable localStorage keys of one category */
function _syncKeysFor(catId) {
  return Object.keys(localStorage).filter(k => _syncIsSyncable(k) && getCategoryForKey(k) === catId);
}

/* Fresh structure for a new user; every category that already holds data is uploaded once */
function _syncEnsureMeta(userId) {
  let meta = _syncLoadMeta();
  if (meta.userId === userId) return meta;
  meta = _syncEmptyMeta(userId);
  const now = Date.now();
  _SYNC_CATEGORY_IDS.forEach(id => {
    if (_syncKeysFor(id).length) meta.categories[id] = { dirty: true, localModifiedAt: now, lastSyncedServerAt: null };
  });
  _syncSaveMeta(meta);
  return meta;
}

// === DIRTY TRACKING ===
function _syncTrackChange(key) {
  if (!_syncHelpersReady() || !_syncIsSyncable(key)) return;
  const cat = getCategoryForKey(key);
  if (!cat || !_SYNC_CATEGORY_IDS.includes(cat)) return;
  const meta = _syncLoadMeta();
  const c = meta.categories[cat] || (meta.categories[cat] = { dirty: false, localModifiedAt: 0, lastSyncedServerAt: null });
  c.dirty = true;
  c.localModifiedAt = Math.max(Date.now(), (c.localModifiedAt || 0) + 1);   /* strictly increasing so mid-upload edits are detected */
  _syncSaveMeta(meta);
  if (_syncCurrentUser) _syncSchedule();
  _syncNotify();
}

/* Wrapped once. The original call always runs first and tracking can never throw into the caller. */
if (!Storage.prototype._syncWrapped) {
  Storage.prototype._syncWrapped = true;
  Storage.prototype.setItem = function (key, value) {
    let old = null, track = false;
    try { track = this === window.localStorage && !isApplyingRemote; if (track) old = _syncOrigGet.call(this, key); } catch (e) { track = false; }
    const r = _syncOrigSet.apply(this, arguments);
    try { if (track && old !== String(value)) _syncTrackChange(key); } catch (e) {}
    return r;
  };
  Storage.prototype.removeItem = function (key) {
    let old = null, track = false;
    try { track = this === window.localStorage && !isApplyingRemote; if (track) old = _syncOrigGet.call(this, key); } catch (e) { track = false; }
    const r = _syncOrigRemove.apply(this, arguments);
    try { if (track && old !== null) _syncTrackChange(key); } catch (e) {}
    return r;
  };
}

// === SYNC LOCAL DATA HELPERS ===
/* Raw localStorage strings of one category, never transient or excluded keys */
function getLocalKeys(category) {
  const out = {};
  try {
    if (!_syncHelpersReady()) return out;
    _syncKeysFor(category).forEach(k => { const v = _syncOrigGet.call(localStorage, k); if (v !== null) out[k] = v; });
  } catch (e) {}
  return out;
}

function hasLocalData(category) {
  return Object.keys(getLocalKeys(category)).length > 0;
}

/* Exact, order-independent comparison of raw stored strings */
function payloadsEqual(localKeys, remoteKeys) {
  try {
    if (!localKeys || !remoteKeys || typeof localKeys !== 'object' || typeof remoteKeys !== 'object') return false;
    const a = Object.keys(localKeys), b = Object.keys(remoteKeys);
    if (a.length !== b.length) return false;
    return a.every(k => Object.prototype.hasOwnProperty.call(remoteKeys, k) && localKeys[k] === remoteKeys[k]);
  } catch (e) { return false; }
}

function _syncParse(raw) {
  try { return JSON.parse(raw); } catch (e) { return undefined; }
}

function _syncCount(v) {
  if (Array.isArray(v)) return v.length;
  if (v && typeof v === 'object') return Object.keys(v).length;
  return null;
}

function _syncPlural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }

function getSyncCategoryLabel(id) {
  try { const c = EXPORT_CATEGORIES.find(c => c.id === id); if (c) return c.label; } catch (e) {}
  return id;
}

/* Short human summary of a category payload; never throws */
function summarizeCategory(category, keysObj) {
  const keys = (keysObj && typeof keysObj === 'object') ? keysObj : {};
  const fallback = () => _syncPlural(Object.keys(keys).length, 'item', 'items');
  try {
    if (category === 'history') {
      const w = _syncParse(keys.workouts);
      if (!Array.isArray(w)) return fallback();
      let last = 0;
      w.forEach(x => { const t = x && Date.parse(x.date); if (t && t > last) last = t; });
      const base = _syncPlural(w.length, 'training', 'trainings');
      return last ? base + ', last ' + new Date(last).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : base;
    }
    if (category === 'plans') { const n = _syncCount(_syncParse(keys.plans)); return n === null ? fallback() : _syncPlural(n, 'plan', 'plans'); }
    if (category === 'library') { const n = _syncCount(_syncParse(keys.exLib)); return n === null ? fallback() : _syncPlural(n, 'custom exercise', 'custom exercises'); }
    if (category === 'journeys') { const n = _syncCount(_syncParse(keys.trainingJourneys)); return n === null ? fallback() : _syncPlural(n, 'journey', 'journeys'); }
    if (category === 'xp') {
      const x = _syncParse(keys.xpData);
      if (!x || typeof x !== 'object') return fallback();
      const total = Number(x.totalXP) || 0;
      const b = _syncParse(keys.badgeData);
      const badges = b && b.earned && typeof b.earned === 'object' ? Object.keys(b.earned).length : 0;
      const lvl = typeof _levelForXP === 'function' ? 'Level ' + _levelForXP(total) + ', ' : '';
      return lvl + total + ' XP, ' + _syncPlural(badges, 'badge', 'badges');
    }
    if (category === 'settings') return _syncPlural(Object.keys(keys).length, 'setting', 'settings');
  } catch (e) {}
  return fallback();
}

/* True when this device holds no real data yet (no trainings, no journeys, no XP) */
function isFreshDevice() {
  try {
    const w = _syncParse(_syncOrigGet.call(localStorage, 'workouts'));
    if (Array.isArray(w) && w.length) return false;
    const j = _syncParse(_syncOrigGet.call(localStorage, 'trainingJourneys'));
    if (Array.isArray(j) && j.length) return false;
    const x = _syncParse(_syncOrigGet.call(localStorage, 'xpData'));
    if (x && Number(x.totalXP) > 0) return false;
    return true;
  } catch (e) { return false; }
}

function _syncHasActiveWorkout() {
  try { return _syncOrigGet.call(localStorage, 'activeWorkout') !== null; } catch (e) { return false; }
}

/* Per-category meta record, created on demand; always load fresh, patch, save */
function _syncPatchCat(id, fn) {
  const m = _syncLoadMeta();
  const c = m.categories[id] || (m.categories[id] = { dirty: false, localModifiedAt: 0, lastSyncedServerAt: null });
  fn(c, m);
  _syncSaveMeta(m);
}

function _syncGetCat(id) { return _syncLoadMeta().categories[id] || {}; }

// === SYNC SAFETY COPIES ===
/* localStorage "syncSafety" (transient): [{ id, category, savedAt, reason, keys }], newest first */
function getSafetyCopies() {
  try {
    const l = JSON.parse(_syncOrigGet.call(localStorage, 'syncSafety'));
    return Array.isArray(l) ? l : [];
  } catch (e) { return []; }
}

/* Returns the new entry id, or null when it could not be stored */
function _syncSaveSafetyCopy(category, keys, reason) {
  try {
    const entry = { id: Date.now() + '-' + Math.random().toString(36).slice(2, 7), category, savedAt: Date.now(), reason, keys };
    const list = getSafetyCopies();
    list.unshift(entry);
    while (list.length > SYNC_SAFETY_MAX_ENTRIES) list.pop();
    let json = JSON.stringify(list);
    while (json.length > SYNC_SAFETY_MAX_CHARS && list.length) { list.pop(); json = JSON.stringify(list); }
    if (!list.some(e => e.id === entry.id)) return null;
    _syncOrigSet.call(localStorage, 'syncSafety', json);
    return entry.id;
  } catch (e) { return null; }
}

// === SYNC APPLY REMOTE ===
/* Replaces the local keys of one category by newKeys (safety copy first, rollback on failure). Synchronous. */
function _syncReplaceCategory(category, newKeys, reason) {
  const before = getLocalKeys(category);
  if (Object.keys(before).length && !_syncSaveSafetyCopy(category, before, reason)) {
    return { ok: false, error: 'Not enough storage for a safety copy' };
  }
  isApplyingRemote = true;
  try {
    try {
      Object.keys(before).forEach(k => { if (!Object.prototype.hasOwnProperty.call(newKeys, k)) _syncOrigRemove.call(localStorage, k); });
      Object.keys(newKeys).forEach(k => {
        if (!_syncIsSyncable(k) || getCategoryForKey(k) !== category || typeof newKeys[k] !== 'string') return;
        _syncOrigSet.call(localStorage, k, newKeys[k]);
      });
      return { ok: true };
    } catch (e) {
      try {
        Object.keys(getLocalKeys(category)).forEach(k => { if (!Object.prototype.hasOwnProperty.call(before, k)) _syncOrigRemove.call(localStorage, k); });
        Object.keys(before).forEach(k => _syncOrigSet.call(localStorage, k, before[k]));
      } catch (e2) {}
      return { ok: false, error: 'Could not apply cloud data' };
    }
  } finally { isApplyingRemote = false; }
}

/* decidedAt = category localModifiedAt captured when the decision was made */
function applyRemoteCategory(category, remotePayload, serverUpdatedAt, decidedAt, reason) {
  const res = { applied: false, aborted: false, error: null };
  try {
    if (!remotePayload || remotePayload.v !== SYNC_PAYLOAD_VERSION || !remotePayload.keys || typeof remotePayload.keys !== 'object' || Array.isArray(remotePayload.keys)) {
      res.error = 'Cloud data is from a newer app version';
      _syncSetError(res.error);
      return res;
    }
    if ((_syncGetCat(category).localModifiedAt || 0) !== (decidedAt || 0)) { res.aborted = true; return res; }
    const r = _syncReplaceCategory(category, remotePayload.keys, reason || 'cloud-download');
    if (!r.ok) { res.error = r.error; _syncSetError(r.error); return res; }
    _syncPatchCat(category, c => { c.dirty = false; c.cloudAhead = false; c.pending = null; c.lastSyncedServerAt = serverUpdatedAt; });
    res.applied = true;
  } catch (e) {
    res.error = 'Could not apply cloud data';
    try { _syncSetError(res.error); } catch (e2) {}
  }
  return res;
}

/* Restores a safety copy: new safety copy of the current state, then mark dirty and let the caller reload */
function restoreSafetyCopy(id) {
  try {
    if (_syncHasActiveWorkout()) return { ok: false, error: 'Finish your workout first' };
    if (_syncRunning) return { ok: false, error: 'Sync is running, try again in a moment' };
    const copy = getSafetyCopies().find(c => c.id === id);
    if (!copy || !copy.keys || typeof copy.keys !== 'object') return { ok: false, error: 'Safety copy not found' };
    const r = _syncReplaceCategory(copy.category, copy.keys, 'restore');
    if (!r.ok) return r;
    _syncPatchCat(copy.category, c => { c.dirty = true; c.localModifiedAt = Math.max(Date.now(), (c.localModifiedAt || 0) + 1); });
    _syncNotify();
    setTimeout(() => { if (!_syncHasActiveWorkout()) location.reload(); }, 50);
    return { ok: true };
  } catch (e) { return { ok: false, error: 'Restore failed' }; }
}

// === SYNC UPLOAD ===
function _syncSchedule() {
  clearTimeout(_syncTimer);
  _syncTimer = setTimeout(() => runSync('change'), SYNC_DEBOUNCE_MS);
}

function _syncShortError(e) {
  const msg = String((e && e.message) || e || '').toLowerCase();
  if (!navigator.onLine || msg.includes('failed to fetch') || msg.includes('network') || msg.includes('load failed')) return 'Offline, will retry';
  return ('Sync failed: ' + String((e && e.message) || 'unknown error')).slice(0, 80);
}

function _syncSetError(text) {
  const meta = _syncLoadMeta();
  meta.lastError = text;
  _syncSaveMeta(meta);
}

/* Upserts the whole local category, returns the server updated_at */
async function _syncPushCategory(userId, id) {
  const payload = { v: SYNC_PAYLOAD_VERSION, keys: getLocalKeys(id) };
  const { data, error } = await syncClient.from('user_data')
    .upsert({ user_id: userId, category: id, payload }, { onConflict: 'user_id,category' })
    .select('updated_at');
  if (error) throw error;
  if (!data || !data[0] || !data[0].updated_at) throw new Error('Upload not confirmed');
  return data[0].updated_at;
}

async function _syncFetchRows(userId, ids) {
  const { data, error } = await syncClient.from('user_data').select('category,payload,updated_at').eq('user_id', userId).in('category', ids);
  if (error) throw error;
  const map = {};
  (data || []).forEach(r => { map[r.category] = r; });
  return map;
}

function _syncSetBlocked(b) {
  _syncWorkoutBlocked = b;
  if (b && !_syncWorkoutTimer) {
    _syncWorkoutTimer = setInterval(() => {
      if (!_syncWorkoutBlocked) return;
      if (!_syncHasActiveWorkout() && _syncCurrentUser) runSync('workout-check'); else _syncNotify();
    }, 30000);
  } else if (!b && _syncWorkoutTimer) { clearInterval(_syncWorkoutTimer); _syncWorkoutTimer = null; }
}

function _syncCanReload() { return !_syncHasActiveWorkout() && !_syncSheetOpen; }

function _syncHasPending() {
  const m = _syncLoadMeta();
  return _SYNC_CATEGORY_IDS.some(id => m.categories[id] && m.categories[id].pending);
}

// === SYNC RUN ===
async function runSync(reason) {
  if (_syncRunning) { _syncQueued = true; return; }
  if (!syncClient) return;
  if (!navigator.onLine) { if (reason === 'manual') { _syncSetError('Offline, will retry'); _syncNotify(); } return; }
  if (!_syncHelpersReady()) return;
  _syncRunning = true;
  _syncLastAttempt = Date.now();
  _syncNotify();
  let reloadNeeded = false;
  try {
    const user = await getSyncUser();
    _syncCurrentUser = user;
    if (!user) return;
    _syncEnsureMeta(user.id);
    let runError = null, blocked = false, note = null;
    const { data: rows, error: selErr } = await syncClient.from('user_data').select('category,updated_at').eq('user_id', user.id);
    if (selErr) throw selErr;
    const serverAt = {};
    (rows || []).forEach(r => { serverAt[r.category] = r.updated_at; });
    const fresh = isFreshDevice();   /* evaluated once so a download in this run does not change the verdict */
    const uploads = [], compare = [];
    for (const id of _SYNC_CATEGORY_IDS) {
      const m0 = _syncGetCat(id);
      if (m0.pending) continue;   /* waits for the user's decision */
      const sAt = serverAt[id];
      if (sAt === undefined) {
        /* A: no cloud row */
        if (hasLocalData(id)) {
          if (m0.lastSyncedServerAt) note = 'Cloud data was missing and has been uploaded again';
          _syncPatchCat(id, c => { if (!c.dirty) { c.dirty = true; c.localModifiedAt = Math.max(Date.now(), (c.localModifiedAt || 0) + 1); } });
          uploads.push(id);
        } else if (m0.dirty) _syncPatchCat(id, c => { c.dirty = false; });
        continue;
      }
      if (!m0.lastSyncedServerAt) { compare.push(id); continue; }   /* C */
      const a = Date.parse(sAt), b = Date.parse(m0.lastSyncedServerAt);
      if (!isNaN(a) && !isNaN(b) && a === b) { if (m0.dirty) uploads.push(id); continue; }   /* B */
      compare.push(id);   /* D */
    }
    if (compare.length) {
      const full = await _syncFetchRows(user.id, compare);
      for (const id of compare) {
        const row = full[id];
        if (!row) continue;
        const p = row.payload;
        if (!p || p.v !== SYNC_PAYLOAD_VERSION || !p.keys || typeof p.keys !== 'object' || Array.isArray(p.keys)) { runError = 'Cloud data is from a newer app version'; continue; }
        const m = _syncGetCat(id);   /* fresh read after the await */
        const local = getLocalKeys(id);
        if (payloadsEqual(local, p.keys)) {
          _syncPatchCat(id, c => { c.dirty = false; c.cloudAhead = false; c.lastSyncedServerAt = row.updated_at; });
          continue;
        }
        const first = !m.lastSyncedServerAt;
        let action;
        if (first) action = (fresh || !Object.keys(local).length) ? 'download' : 'first';
        else action = m.dirty ? 'conflict' : 'download';
        if (action === 'download') {
          if (_syncHasActiveWorkout()) { blocked = true; continue; }
          const res = applyRemoteCategory(id, p, row.updated_at, m.localModifiedAt || 0, first ? 'first-login' : 'cloud-download');
          if (res.applied) reloadNeeded = true; else if (res.error) runError = res.error;
        } else {
          _syncPatchCat(id, c => { c.pending = action; });
        }
      }
    }
    for (const id of uploads) {
      const before = _syncGetCat(id).localModifiedAt;
      if (!Object.keys(getLocalKeys(id)).length) {
        /* Never upload an empty category; nothing to push */
        _syncPatchCat(id, c => { if (c.localModifiedAt === before) c.dirty = false; });
        continue;
      }
      const at = await _syncPushCategory(user.id, id);
      _syncPatchCat(id, c => {
        c.lastSyncedServerAt = at;
        c.cloudAhead = false;
        if (c.localModifiedAt === before) c.dirty = false;   /* changed again while uploading: stays dirty */
      });
    }
    const meta = _syncLoadMeta();
    meta.lastError = runError;
    meta.note = note;
    meta.lastSyncAt = Date.now();
    if (reloadNeeded) meta.downloadedAt = Date.now();
    _syncSaveMeta(meta);
    _syncSetBlocked(blocked);
  } catch (e) {
    try { _syncSetError(_syncShortError(e)); } catch (e2) {}
  } finally {
    _syncRunning = false;
    _syncNotify();
    try {
      if (reloadNeeded && _syncCanReload()) { location.reload(); }
      else {
        if (_syncQueued) { _syncQueued = false; if (_syncCurrentUser) _syncSchedule(); }
        if (_syncCurrentUser && !_syncSheetShown && _syncHasPending() && !_syncHasActiveWorkout()) openSyncDecisionSheet(true);
      }
    } catch (e) {}
  }
}

// === SYNC STATUS ===
function getSyncStatus() {
  const meta = _syncLoadMeta();
  const cats = Object.values(meta.categories || {}).filter(c => c && c.dirty && !c.pending);
  const waiting = cats.length;
  const pending = _syncHasPending();
  const justDownloaded = meta.downloadedAt && Date.now() - meta.downloadedAt < 10000;
  let state, text, short;
  if (_syncRunning) { state = 'syncing'; text = 'Syncing...'; short = 'Syncing...'; }
  else if (meta.lastError) { state = 'error'; text = meta.lastError; short = meta.lastError; }
  else if (pending) { state = 'needs-decision'; text = 'Needs your decision'; short = 'Needs your decision'; }
  else if (_syncWorkoutBlocked && _syncHasActiveWorkout()) { state = 'workout'; text = 'Cloud update waiting until your workout ends'; short = 'Update waiting'; }
  else if (justDownloaded) { state = 'ok'; text = 'Downloaded updates from the cloud'; short = 'Downloaded updates'; }
  else if (waiting) { state = 'waiting'; text = waiting + (waiting === 1 ? ' change waiting' : ' changes waiting'); short = waiting + ' waiting'; }
  else { state = 'ok'; text = meta.note || 'Up to date'; short = 'Up to date'; }
  return { state, text, short, running: _syncRunning, lastSyncAt: meta.lastSyncAt || null };
}

// === SYNC DECISION SHEET ===
const _SYNC_SHEET_ORDER = ['history', 'xp', 'journeys', 'plans', 'library', 'settings'];

function _syncFmtTime(t) {
  const ms = typeof t === 'number' ? t : Date.parse(t);
  if (!ms) return 'Unknown';
  return new Date(ms).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function _syncEl(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

async function openSyncDecisionSheet(auto) {
  if (_syncSheetOpen || !syncClient || !_syncCurrentUser || !_syncHelpersReady()) return;
  if (_syncHasActiveWorkout()) return;
  try {
    const meta = _syncLoadMeta();
    const pendIds = _SYNC_SHEET_ORDER.filter(id => meta.categories[id] && meta.categories[id].pending);
    if (!pendIds.length) return;
    const rows = await _syncFetchRows(_syncCurrentUser.id, pendIds);
    if (_syncSheetOpen || _syncHasActiveWorkout()) return;
    const cards = [];
    pendIds.forEach(id => {
      const row = rows[id];
      const m = _syncGetCat(id);
      if (!row || !row.payload || row.payload.v !== SYNC_PAYLOAD_VERSION || !row.payload.keys || typeof row.payload.keys !== 'object') return;
      cards.push({ id, row, pending: m.pending, lm: m.localModifiedAt || 0, choice: null });
    });
    if (!cards.length) { setTimeout(() => runSync('sheet'), 0); return; }
    if (auto) _syncSheetShown = true;
    _syncSheetOpen = true;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const backdrop = _syncEl('div', 'sds-backdrop');
    const sheet = _syncEl('div', 'sds-sheet');
    backdrop.appendChild(sheet);
    sheet.appendChild(_syncEl('div', 'sds-title', 'Choose which data to keep'));
    sheet.appendChild(_syncEl('div', 'sds-intro', 'This device and your cloud account both have data. Nothing is changed until you choose.'));
    const applyBtn = _syncEl('button', 'sds-apply', 'Apply');
    const msg = _syncEl('div', 'sds-msg');

    const refresh = () => { applyBtn.disabled = cards.some(c => !c.choice); };
    const setChoice = (c, choice) => {
      c.choice = choice;
      const idx = choice === 'device' ? 0 : 1;
      c.pill.style.opacity = '1';
      c.pill.style.width = 'calc((100% - 8px) / 2)';
      c.pill.style.left = 'calc(4px + ((100% - 8px) / 2) * ' + idx + ')';
      c.btns.forEach((b, i) => b.classList.toggle('active', i === idx));
      refresh();
    };
    cards.forEach(c => {
      const keysLocal = getLocalKeys(c.id);
      const card = _syncEl('div', 'sds-card');
      const head = _syncEl('div', 'sds-card-head');
      head.appendChild(_syncEl('span', 'sds-cat', getSyncCategoryLabel(c.id)));
      if (c.pending === 'conflict') head.appendChild(_syncEl('span', 'sds-both', 'Both changed'));
      card.appendChild(head);
      const cols = _syncEl('div', 'sds-cols');
      [['This device', summarizeCategory(c.id, keysLocal), c.lm ? _syncFmtTime(c.lm) : 'Unknown'],
       ['Cloud', summarizeCategory(c.id, c.row.payload.keys), _syncFmtTime(c.row.updated_at)]].forEach(col => {
        const d = _syncEl('div', 'sds-col');
        d.appendChild(_syncEl('div', 'sds-col-h', col[0]));
        d.appendChild(_syncEl('div', 'sds-sum', col[1]));
        d.appendChild(_syncEl('div', 'sds-time', 'Changed ' + col[2]));
        cols.appendChild(d);
      });
      card.appendChild(cols);
      const seg = _syncEl('div', 'segmented-control sds-seg');
      c.pill = _syncEl('div', 'segment-pill');
      c.pill.style.opacity = '0';
      seg.appendChild(c.pill);
      c.btns = [_syncEl('button', '', 'This device'), _syncEl('button', '', 'Cloud')];
      c.btns[0].addEventListener('click', () => setChoice(c, 'device'));
      c.btns[1].addEventListener('click', () => setChoice(c, 'cloud'));
      c.btns.forEach(b => { b.type = 'button'; seg.appendChild(b); });
      card.appendChild(seg);
      sheet.appendChild(card);
    });

    const short = _syncEl('div', 'sds-short');
    const allCloud = _syncEl('button', 'sds-link', 'Use cloud for all');
    const allDevice = _syncEl('button', 'sds-link', 'Keep this device for all');
    allCloud.addEventListener('click', () => cards.forEach(c => setChoice(c, 'cloud')));
    allDevice.addEventListener('click', () => cards.forEach(c => setChoice(c, 'device')));
    short.appendChild(allCloud); short.appendChild(allDevice);
    sheet.appendChild(short);
    sheet.appendChild(_syncEl('div', 'sds-note', "A safety copy of replaced data is kept on this device (and in the cloud for 'This device')."));
    sheet.appendChild(msg);
    applyBtn.disabled = true;
    sheet.appendChild(applyBtn);
    const later = _syncEl('button', 'sds-later', 'Decide later');
    sheet.appendChild(later);
    document.body.appendChild(backdrop);
    requestAnimationFrame(() => requestAnimationFrame(() => backdrop.classList.add('open')));

    const close = () => {
      _syncSheetOpen = false;
      document.body.style.overflow = prevOverflow;
      backdrop.classList.remove('open');
      setTimeout(() => backdrop.remove(), 300);
    };
    later.addEventListener('click', close);

    let busy = false;
    applyBtn.addEventListener('click', async () => {
      if (busy || cards.some(c => !c.choice)) return;
      if (_syncRunning) { msg.textContent = 'Sync is running, try again in a moment'; return; }
      if (_syncHasActiveWorkout()) { msg.textContent = 'Finish your workout first'; return; }
      busy = true; applyBtn.disabled = true; msg.textContent = '';
      _syncRunning = true; _syncNotify();
      let applied = false, problem = null;
      try {
        const fresh = await _syncFetchRows(_syncCurrentUser.id, cards.map(c => c.id));
        for (const c of cards) {
          const row = fresh[c.id];
          const m = _syncGetCat(c.id);
          if (!row || row.updated_at !== c.row.updated_at || (m.localModifiedAt || 0) !== c.lm) { problem = 'Data changed while you were deciding. Check again.'; continue; }
          if (c.choice === 'cloud') {
            if (_syncHasActiveWorkout()) { problem = 'Finish your workout first'; continue; }
            const res = applyRemoteCategory(c.id, row.payload, row.updated_at, c.lm, c.pending === 'conflict' ? 'conflict' : 'first-login');
            if (res.applied) applied = true; else problem = res.error || 'Data changed while you were deciding. Check again.';
          } else {
            if (!Object.keys(getLocalKeys(c.id)).length) { problem = 'This device has no ' + getSyncCategoryLabel(c.id) + ' data to keep'; continue; }
            const at = await _syncPushCategory(_syncCurrentUser.id, c.id);
            _syncPatchCat(c.id, cc => { cc.lastSyncedServerAt = at; cc.pending = null; cc.cloudAhead = false; if (cc.localModifiedAt === c.lm) cc.dirty = false; });
          }
        }
        const meta = _syncLoadMeta();
        meta.lastError = problem;
        if (applied) meta.downloadedAt = Date.now();
        _syncSaveMeta(meta);
      } catch (e) {
        problem = _syncShortError(e);
        try { _syncSetError(problem); } catch (e2) {}
      } finally { _syncRunning = false; _syncNotify(); }
      close();
      if (applied && _syncCanReload()) { location.reload(); return; }
      if (_syncCurrentUser) _syncSchedule();
    });
  } catch (e) { _syncSheetOpen = false; }
}

// === SYNC TRIGGERS ===
function _syncInit() {
  try {
    const m = _syncLoadMeta();
    if (m.downloadedAt) {
      const left = 10000 - (Date.now() - m.downloadedAt);
      if (left > 0) setTimeout(_syncNotify, left + 50);
      else { delete m.downloadedAt; _syncSaveMeta(m); }
    }
  } catch (e) {}
  getSyncUser().then(u => { _syncCurrentUser = u; if (u) runSync('start'); }).catch(() => {});
  /* Deferred: supabase-js must not be re-entered from inside its own auth callback */
  onSyncAuthChange((user, event) => {
    _syncCurrentUser = user;
    if (!user) { clearTimeout(_syncTimer); _syncNotify(); return; }
    if (event === 'SIGNED_IN') setTimeout(() => runSync('login'), 0);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && _syncCurrentUser && Date.now() - _syncLastAttempt >= SYNC_MIN_INTERVAL_MS) runSync('visible');
  });
  window.addEventListener('online', () => { if (_syncCurrentUser) runSync('online'); });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _syncInit); else _syncInit();
