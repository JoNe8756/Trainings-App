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
- settings.js — all Settings screens, data import/export

## Working Conventions
- Always edit the specific file(s) relevant to the task — do not
  search across all files, use the structure above
- Each file has // === SECTION === comments marking major blocks —
  locate the relevant section before editing, do not read the
  whole file
- Keep bug fixes and new features in separate changes — never
  mix them in one edit
- Do not add explanatory preambles or postambles to responses —
  confirm done concisely
- Do not over-think simple, well-specified tasks — implement
  directly unless the task is genuinely complex (multi-file
  architecture, ambiguous root cause)
- Test manually in browser after changes — no automated test
  runner exists except tests.html for calculation logic

## Design Language
Apple Health-inspired dark mode. iOS blue (#007AFF) accents.
Card-based layout: background #1C1C1E, border-radius 12px.
Section headers: 11px uppercase, #8E8E93, letter-spacing. Sticky
bottom nav with sliding pill highlight (shared .segment-pill
pattern used across all segmented controls in the app).

## Data Keys (localStorage)
workouts, exercises, trainingPlans, trainingJourneys, userSettings,
personalRecords, geminiApiKey, xpData. See ARCHITECTURE.md for
full schema detail.

## Git Workflow
After any confirmed working change: git add . → git commit -m
"..." → git push. Commit messages are short and descriptive.
