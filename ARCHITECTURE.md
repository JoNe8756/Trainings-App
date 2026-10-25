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
- `exercises` — array of all exercises with difficulty ratings
- `trainingPlans` — array of training plans
- `trainingJourneys` — array of AI-generated journeys
- `geminiApiKey` — Gemini API key for journey generation
- `userSettings` — user preferences and personal info
- `personalRecords` — personal bests per exercise

## Key Rules
- Always edit the specific file listed above — never edit index.html
  for logic or styles
- Test in browser after every change
- Push to GitHub after every confirmed working change
