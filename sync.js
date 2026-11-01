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
/* Upload only (step 1): local data is never overwritten from the cloud here. */
const SYNC_DEBOUNCE_MS = 4000;
const SYNC_MIN_INTERVAL_MS = 60000;
/* Gemini key and per-device UI state never leave this device */
const SYNC_EXCLUDED_KEYS = ['geminiApiKey', 'exLibExpand1', 'histFolderState', 'progCatCollapsed', 'progressRange', 'chartTapHintDone'];
/* Must match the user_data.category check constraint */
const _SYNC_CATEGORY_IDS = ['history', 'plans', 'library', 'journeys', 'xp', 'settings'];

// === SYNC STATE ===
let isApplyingRemote = false;   /* step 2 sets this while writing downloaded data so it is not tracked */
let _syncRunning = false;
let _syncQueued = false;
let _syncTimer = null;
let _syncLastAttempt = 0;
let _syncCurrentUser = null;
let _syncWarned = false;
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

async function runSync(reason) {
  if (_syncRunning) { _syncQueued = true; return; }
  if (!syncClient) return;
  if (!navigator.onLine) { if (reason === 'manual') { _syncSetError('Offline, will retry'); _syncNotify(); } return; }
  if (!_syncHelpersReady()) return;
  _syncRunning = true;
  _syncLastAttempt = Date.now();
  _syncNotify();
  try {
    const user = await getSyncUser();
    _syncCurrentUser = user;
    if (!user) return;
    let meta = _syncEnsureMeta(user.id);
    const dirtyIds = _SYNC_CATEGORY_IDS.filter(id => meta.categories[id] && meta.categories[id].dirty);
    if (dirtyIds.length) {
      const { data: rows, error: selErr } = await syncClient.from('user_data').select('category,updated_at').eq('user_id', user.id);
      if (selErr) throw selErr;
      const serverAt = {};
      (rows || []).forEach(r => { serverAt[r.category] = r.updated_at; });
      for (const id of dirtyIds) {
        const before = (_syncLoadMeta().categories[id] || {}).localModifiedAt;
        const keys = _syncKeysFor(id);
        if (!keys.length) {
          /* Never upload an empty category; nothing to push */
          const m = _syncLoadMeta(), c = m.categories[id];
          if (c && c.localModifiedAt === before) { c.dirty = false; c.cloudAhead = false; _syncSaveMeta(m); }
          continue;
        }
        if (serverAt[id] !== undefined) {
          const stored = (_syncLoadMeta().categories[id] || {}).lastSyncedServerAt;
          const a = Date.parse(serverAt[id]), b = Date.parse(stored);
          if (isNaN(a) || isNaN(b) || a !== b) {
            /* Cloud copy is newer or unknown to this device: keep dirty, download comes in step 2 */
            const m = _syncLoadMeta(); m.categories[id].cloudAhead = true; _syncSaveMeta(m);
            continue;
          }
        }
        const payload = { v: 1, keys: {} };
        keys.forEach(k => { payload.keys[k] = _syncOrigGet.call(localStorage, k); });
        const { data, error } = await syncClient.from('user_data')
          .upsert({ user_id: user.id, category: id, payload }, { onConflict: 'user_id,category' })
          .select('updated_at');
        if (error) throw error;
        if (!data || !data[0] || !data[0].updated_at) throw new Error('Upload not confirmed');
        const m = _syncLoadMeta(), c = m.categories[id];
        c.lastSyncedServerAt = data[0].updated_at;
        c.cloudAhead = false;
        if (c.localModifiedAt === before) c.dirty = false;   /* changed again while uploading: stays dirty */
        _syncSaveMeta(m);
      }
    }
    meta = _syncLoadMeta();
    meta.lastError = null;
    meta.lastSyncAt = Date.now();
    _syncSaveMeta(meta);
  } catch (e) {
    try { _syncSetError(_syncShortError(e)); } catch (e2) {}
  } finally {
    _syncRunning = false;
    _syncNotify();
    if (_syncQueued) { _syncQueued = false; if (_syncCurrentUser) _syncSchedule(); }
  }
}

// === SYNC STATUS ===
function getSyncStatus() {
  const meta = _syncLoadMeta();
  const cats = Object.values(meta.categories || {}).filter(c => c && c.dirty);
  const waiting = cats.length;
  const ahead = cats.some(c => c.cloudAhead);
  let state, text, short;
  if (_syncRunning) { state = 'syncing'; text = 'Syncing...'; short = 'Syncing...'; }
  else if (meta.lastError) { state = 'error'; text = meta.lastError; short = meta.lastError; }
  else if (ahead) { state = 'cloud-ahead'; text = 'Cloud has newer data (download comes in the next update)'; short = 'Cloud has newer data'; }
  else if (waiting) { state = 'waiting'; text = waiting + (waiting === 1 ? ' change waiting' : ' changes waiting'); short = waiting + ' waiting'; }
  else { state = 'ok'; text = 'Up to date'; short = 'Up to date'; }
  return { state, text, short, running: _syncRunning, lastSyncAt: meta.lastSyncAt || null };
}

// === SYNC TRIGGERS ===
function _syncInit() {
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
