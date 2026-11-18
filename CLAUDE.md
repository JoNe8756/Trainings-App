# Trainings App — Project Conventions

## Tech Stack
Single-page web app. No frameworks, no build step, no npm packages
at runtime. Vanilla HTML, CSS, JavaScript. Data persists in
localStorage only (no backend). Deployed via GitHub Pages.

## File Structure
See ARCHITECTURE.md for full detail. Summary:
- index.html — HTML structure only
- styles.css — all CSS
- app.js — core: localStorage helpers, tab navigation, global
  state, XP/level system
- workouts.js — active workout logging, timers, Killer Set, warmup,
  post-workout summary, journey session integration
- progress.js — Progress tab, chart drawing, data aggregation
- history.js — History tab, workout detail, exercise trend modal
- library.js — exercises, training plans, journeys, Gemini API
- stack.js — reusable iOS-notification-style card stack (Journeys, Goals)
- summary.js — Summary tab rendering
- xp.js — XP & Levels detail screen (opened from Summary XP card)
- badges.js — badge definitions, earned state (badgeData), Badges screen
- journey-quickstart.js — journey session preview sheet (Summary Continue, + button Journey session rows)
- sync.js — Supabase client, auth helpers, two-way sync (tracks dirty categories, pushes to Supabase user_data using EXPORT_CATEGORIES ids, downloads, asks on first login and on conflicts, keeps safety copies in "syncSafety" (transient); SYNC_EXCLUDED_KEYS stay local). Keys starting with "sb-" are auth session keys, excluded from backups. NEVER add the secret/service_role key.
- settings.js — all Settings screens, data import/export

## Working rules
1. Scope: edit only the files I name, and look only in the named
   // === SECTION === comment. If a task needs another file, stop and
   ask. Add a // === SECTION === comment above all new code.
2. One task per request. If a request mixes a bug fix and a new
   feature, do the bug fix only and list the feature as a separate
   follow-up.
3. Effort: simple tasks, implement directly without long deliberation.
   Think longer only for complex logic (sync, import/export,
   difficulty and intensity calculations).
4. UI code: use addEventListener after rendering, never inline onclick
   inside innerHTML. Use one shared render function for fresh and
   resumed views. position: fixed is relative to the viewport, so
   constrain fixed elements to the phone-width app container.
5. Data safety: before changing export, import, sync, backup, or any
   localStorage key, tell me first and wait. Every new key must be
   mapped in EXPORT_CATEGORIES or listed as transient (see Data Keys).
6. Security: the repo is public. Never write a secret key
   (sb_secret_, service_role, a Gemini key) into any file, log, or
   message. The Supabase publishable key is public by design.
7. Git: do not commit or push unless I ask. I push after testing.
8. Model: stay on Sonnet unless I say otherwise. Never switch to Opus
   on your own.
9. Replies: at most 5 lines: what changed, in which files, and any
   assumption made. Then a short numbered test checklist in plain
   words (I am a product owner, not a developer).
10. Testing: test manually in browser after changes. tests.html is the
    only automated check, for calculation logic.
11. UI review: after every change that touches the interface, run the
    ui-reviewer agent (.claude/agents/ui-reviewer.md) before asking me to test.
    It checks look, intuitiveness and unwanted overlaps and fixes real problems.
    Tell me in plain words what was not good and what it changed.
12. Data and calculation changes: run the data-tester agent (.claude/agents/data-tester.md)
    after any change to calculations, stored data or keys, export/import/sync.
13. Before I push: run the release-checker agent (.claude/agents/release-checker.md)
    and tell me GO or STOP with the reason. It never pushes; I still say when.
14. Nothing may break: a hook (.claude/hooks/verify-after-edit.py) checks syntax and
    .claude/checks/run-checks.js after every edit, also edits made by agents. Agents
    back up a file before changing it, re-run the checks after each edit and revert
    when unsure. If a check fails, fix or revert before continuing and tell me.
Backlog and status: see BACKLOG.md. Do not start any backlog item unless I name it. Move items between sections only when I confirm that I tested them.

## Design Language
Apple Health-inspired dark mode. iOS blue (#007AFF) accents.
Card-based layout: background #1C1C1E, border-radius 12px.
Section headers: 11px uppercase, #8E8E93, letter-spacing. Sticky
bottom nav with sliding pill highlight (shared .segment-pill
pattern used across all segmented controls in the app).

## Data Keys (localStorage)
workouts, plans, exLib, customExMeta, trainingJourneys, xpData,
badgeData, freqGoal, volumeGoal, exerciseGoal, userBW, userHeight,
geminiApiKey, warmup*, killerSet*, restTimerEnabled, breakTimerMode,
ghostMode, restPerf:<exerciseName>. Export/import work on all keys
except _TRANSIENT_KEYS in settings.js; they are category-based via
EXPORT_CATEGORIES in settings.js (add every new key there; unmapped
keys default to settings). See ARCHITECTURE.md.
