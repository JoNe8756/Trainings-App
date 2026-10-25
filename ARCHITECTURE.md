# Trainings App — Architecture

## File Structure

### index.html
HTML structure and shell only. No CSS or JavaScript logic.
Links to all CSS and JS files.

### styles.css
All CSS styling for the entire app.
Edit this file for: colors, fonts, spacing, layout, animations.

### app.js
Core app foundation — loaded first, everything else depends on it.
Contains: localStorage helpers, tab navigation, global state variables,
app initialization, utility functions.
Edit this file for: navigation bugs, data storage issues, app startup.

### workouts.js
Active workout logging screen and all related functionality.
Contains: exercise cards, set logging, Intensity Index calculation,
ghost mode, rest timer, stopwatch, break timer, Killer Set,
warmup screens, post-workout summary, journey session integration.
Edit this file for: anything that happens during an active workout.

### progress.js
Progress tab and all chart rendering.
Contains: canvas chart drawing, time horizon filtering, data
aggregation, PR tracking, chart data preparation.
Edit this file for: chart bugs, progress tab issues.

### history.js
History tab and workout detail views.
Contains: history list rendering, workout detail view, exercise
trend modal, workout deletion, monthly grouping.
Edit this file for: history tab bugs, workout detail issues,
exercise performance trend charts.

### library.js
Library tab — exercises, plans and journeys.
Contains: exercise list, search, exercise detail, exercise creator,
training plans, plan config, plan intensity chart, journeys list,
journey detail, journey creator, Gemini API call, unknown exercise
handling.
Edit this file for: exercise library, training plans, journey
generation and display.

### stack.js
Reusable iOS-notification-style card stack: `createCardStack(containerEl, cards, stackKey)` (transform-based collapse/expand, state kept in memory per key) and `bindCardStackHeader`. Used for Summary Journeys and Goals.

### summary.js
Summary tab rendering (layout markup, XP card, goals, highlights, active journeys, last training).

### xp.js
XP & Levels detail screen (opened by tapping the Summary XP card): milestones, streak, XP by source, XP rules. Reads XP_RULES and helpers from app.js.

### badges.js
Badge definitions (BADGES), `checkBadges()`, earned state in localStorage `badgeData`, and the Badges screen opened from the XP & Levels screen.

### settings.js
All settings screens.
Contains: Personal Info, Training Goals, Workout Setup, Preferences,
Data Management, About, Gemini API key storage and guide modal.
Edit this file for: any settings screen issues.

## Key Data Structures (localStorage)

- `workouts` — array of all workout sessions
- `plans` — array of training plans
- `exLib` / `customExMeta` — exercise library and custom exercise metadata
- `xpData` — XP, level, streak and per-source totals
- `badgeData` — earned badge timestamps and seeded flag
- `freqGoal` / `volumeGoal` / `exerciseGoal` — training goals
- `userBW` / `userHeight` — body weight and height
- `warmup*` / `killerSet*` — warmup and Killer Set routines, times, history
- `restTimerEnabled` / `breakTimerMode` / `ghostMode` — workout preferences
- `restPerf:<exerciseName>` — per-exercise rest-timer performance points
- `trainingJourneys` — array of AI-generated journeys
- `geminiApiKey` — Gemini API key for journey generation

Export and import are category-based via `EXPORT_CATEGORIES` in settings.js (every new localStorage key must be added to a category; unmapped keys default to settings). They cover all keys except `_TRANSIENT_KEYS`
(active workout state and backup-tracking keys). Export format v3 is a full
replace on import; v1/v2 files merge. `geminiApiKey` is exported only if opted in.

## Key Rules
- Always edit the specific file listed above — never edit index.html
  for logic or styles
- Test in browser after every change
- Push to GitHub after every confirmed working change
