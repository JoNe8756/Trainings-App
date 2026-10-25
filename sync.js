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
