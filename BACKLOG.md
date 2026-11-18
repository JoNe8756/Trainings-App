# Trainings App backlog (status as of 15 Nov 2026)

Rules for this file: Claude Code does not start items on its own. Items move between sections only when Joel confirms he tested them. One task per request, bug fixes and features never mixed.

## A. VERIFY FIRST (built or written, result not confirmed)
30. Music while the app speaks: two audio-mode attempts (ambient, transient) stopped the music on iPhone and it did not come back. Third attempt (ambient set once for the whole warm-up, no per-cue audio changes) pushed 15 Nov 2026, Joel tests it in the next training. If it fails, fallback: a 'Spoken cues' on/off switch in Settings (workouts.js, _warmupSpeak). Item 47 (music does not start again after the app speaks) is the same problem.
17. Plan archive and journey archive: deleting a plan or a journey moves it to an archive (row at the bottom of the Plans and Journeys lists) where it can be restored or deleted for good. New keys plansArchive and journeysArchive, mapped in EXPORT_CATEGORIES (library.js, settings.js). Built and pushed 18 Nov 2026. Joel to test.
51. Coach's assessment: the AI (Gemini generation and the export guide / import) says whether the goal is reachable with the chosen weeks, days, duration and level; shown as a card in the journey and as a heads-up after creation. Stored in journey.feasibility (library.js, journey-exchange.js). Built and pushed 18 Nov 2026. Joel to test.
6. Mac copy on localhost:8000 is old. When syncing it, log in with the private account and choose "Cloud" for all categories (the phone chose "This device"). Tell Joel first before doing this.

## B. DECISIONS PENDING
(none)

## C. NEXT FEATURES (in this order; prioritised 18 Nov 2026: bugs first, then what Joel feels in every workout, then quick wins, then engagement, then bigger features, last what is blocked)
1. 11. Week preview (what is coming this week)
2. 9. Weekly challenge (bonus session for extra XP)
3. 10. Journey completion certificate (special screen when all sessions are done)
4. 12. Rest day tips (recovery and mobility)
5. 36. Journey option for location/equipment: gym vs park or less equipment. (Partly covered by the AI guide export; revisit.)
6. 35. Journey exercises do not have to be only exercises I already did before. (Partly covered by the AI guide export; revisit.)
7. 48b. Plant story step 2: baby plants around level 40 (about 17,000 XP, far away at level 8, so later).
8. 48c. Plant story step 3: forest with its own flora and fauna, collection log of discoveries (new key, mapped in export). Biggest item, after 48b.
9. 13. Mid-journey check-in (Gemini). Blocked while Gemini journey creation does not work.
10. 14. Weekly adaptive reassessment (Gemini). Blocked, same reason.
11. 15. Adaptive difficulty (goes with 13 and 14). Blocked, same reason.

## D. MAINTENANCE AND IDEAS
19. Cache busting: add a version number to the script and style links in index.html so phones fetch fresh files after each push (the home screen app kept old files for a long time after the sync release).
20. Forgot password and change password in Account & Sync (there is no password reset today).
21. Gemini key proxy (for example a Supabase Edge Function) so colleagues do not need their own key. The key is currently stored per browser and never synced.
22. Soft notice instead of the hard 5-training gate when sharing ("less history means a more general journey").
23. Different AI provider (Claude API) or a rule-based fallback journey if Gemini fails repeatedly.
24. Cleanup: restPerf:<exercise> keys are never deleted when an exercise is renamed or removed. Check whether clearAllData() also wipes the backup-status keys. Legacy v1 backups restore only 9 keys.
25. Colleague onboarding: sign-ups are switched off in Supabase. To add a user, open sign-ups briefly, he creates his own account in the app, then close sign-ups again. He needs his own Gemini key.
39. Week plan together with journey trainings.
43. Create a training plan from a template made in another AI, and upload it.

## E. DEPRIORITIZED
26. Native iOS app (React Native conversion roughly 4-6 weeks; lock screen widgets and push need native)
27. Weekly strength assessment, weekly progress photos, supersets and circuits, running/biking/cardio tracking, push notifications, training location tracking
28. Older ideas, unscheduled: general goal setting beyond frequency, intensity streaks, level-up skill progression prompts, weekly hardest set spotlight, monthly collapsible history folders, warm-up vs working set distinction for PR calculations

## F. DONE (do not re-suggest)
- Smart rest timer, rest stats, post-workout summary, seconds-based intensity, file split
- XP and levels, journey completion rules, manual completion, peek at future sessions, duration display, goal exercise guarantee, journey test sessions and looser variety, 5-training gate
- Summary redesign (XP hero card, journeys, goals, compact highlights and last training), per-journey accent colors, reusable stacked cards for journeys and goals (stack.js), journey cards with full text and no AI badge, "Session logged" pill removed, journey back navigation returns to Summary
- Badges and achievements: series with tiers, hub and category screens, XP rewards (bronze 5, silver 15, gold 40), post-workout celebration
- Backups: share-sheet export, last-backup tracking and reminder banner, storage persistence request, category-based export and import (v3), true replace import, optional Gemini key checkbox, complete key coverage
- Supabase account and sync: email and password login, upload, download, first-login and conflict choices, safety copies with restore, tested end to end, rolled out to the phone, sign-ups switched off
- Gemini error handling: clear failure messages, rate-limit waits, model fallback
- Faster journey session start: preview sheet from Summary Continue and from the + button, back returns to the chooser (tested by Joel 15 Nov 2026)
- Supabase keep-alive GitHub Action (pings every 3 days, tested by Joel 15 Nov 2026); also verified: Gemini tests, secret-scan hook, reviewer agent
- Rest timer is now a floating card that stays visible across exercises and tabs, and is removed when the training ends (item 29, tested by Joel 15 Nov 2026)
- Plant gamification (item 37, tested by Joel 15 Nov 2026): plant on the XP screen that grows with every level, 9 ranks with aging forms, 5 tree types chosen once, nameable, thirsty and XP loss after idle weeks (10% of the level's XP per week, never below the rank), level-up grow animation, 7-chapter story with a story beat per level and a training journal (keys plantLog, plantName, plantType, in the XP & badges export category; penalty fields inside xpData)
- Wider, visible tick button for completing a set, with more distance to the delete button (item 31, tested by Joel 15 Nov 2026)
- Resume banner floats clear above the bottom nav and scroll areas leave room so it never covers the last card (item 32, tested by Joel 15 Nov 2026)
- During a workout the + button is hidden and the bottom nav widens into its place; the resume banner is the single way back (tested by Joel 15 Nov 2026)
- Summary training calendar: month grid with training days in blue, month arrows, tap a day to open the training detail (several trainings per day are listed first) (15 Nov 2026)
- Journey sessions started from a journey now count only when the completion rule is met (every planned set, at least 80% of planned reps); the post-workout summary shows a counted / not counted card with the exact reasons (item 33, tested by Joel 15 Nov 2026)
- Plant story step 1: 100 levels on a 5% curve, 20 ranks of 5 levels named after the 20 story chapters, future ranks hidden until reached
- Journey creation without Gemini: export a guide for another AI from the Journey creator, import the AI's JSON and save it as a normal journey (journey-exchange.js, tested by Joel 15 Nov 2026)
- Warm-up now runs when a journey session is started from the + button with the warm-up switched on (tested by Joel 15 Nov 2026)
- Progress charts (item 34, tested by Joel 18 Nov 2026): fixed left axis, sticky Date and Intensity/Reps labels, first point off the axis edge, charts show all data on first open (no tap needed)
- Rest timer card no longer overlaps the resume banner and glides smoothly between the workout view and the minimised view (item 46, tested by Joel 18 Nov 2026)
- Bigger rest timer inside the workout (48px time, larger buttons) that shrinks back to the compact size above the resume banner, with a smooth move, shrink and grow between the two views (item 50, tested by Joel 18 Nov 2026)
- Exercise type (reps or seconds) shown in the Library exercise list and as chips (category, type, difficulty) in the exercise detail (item 49, tested by Joel 18 Nov 2026)
- Rest almost over (item 40, tested by Joel 18 Nov 2026): countdown card pulses amber in the last 10 s and red in the last 3 s; the end-of-rest beep was removed because app sounds interrupt the music
- Journey trainings show their focus (week focus, plus a test-session line) in the quick-start preview sheet and on the session screen (item 44, tested by Joel 18 Nov 2026)
- Plant nature notes (item 45, tested by Joel 18 Nov 2026): tooltip per chapter (tree-specific for chapters 1-8, forest for 9-20) and per level (100 notes, matched to the story lines); story chapters and levels fold open and closed, only the current one starts open
- Swap an exercise in a journey training (item 38, 18 Nov 2026): only similar alternatives (same category, same reps/seconds type, within one difficulty level), only before a set is logged, journey keeps counting against the planned exercise; the exercise name on journey cards is read-only
- Descoped by Joel, do not re-suggest: milestone messages (16), post-workout feedback prompt (18), time since last training (42), badge-earned hint (41, already covered by the post-workout summary)
- Verified by Joel (15 Nov 2026): weekly goal XP check, bottom nav 6px shift, hold exercises showing seconds instead of reps, sync decision sheet inside the app container, Gemini 5xx retry and model fallback

## Reference
- Models: gemini-3.8-flash (primary), gemini-3.5-flash-lite (fallback). Free tier limits are small, so keep test journeys short and avoid repeated retries.
- Real account uses the private email, the Accenture account is a test account used only on localhost:8001. Never log in with the private account on a test environment.
