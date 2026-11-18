# Trainings App backlog (status as of 15 Nov 2026)

Rules for this file: Claude Code does not start items on its own. Items move between sections only when Joel confirms he tested them. One task per request, bug fixes and features never mixed.

## A. VERIFY FIRST (built or written, result not confirmed)
30. Music while the app speaks: two audio-mode attempts (ambient, transient) stopped the music on iPhone and it did not come back. Third attempt (ambient set once for the whole warm-up, no per-cue audio changes) pushed 15 Nov 2026, Joel tests it in the next training. If it fails, fallback: a 'Spoken cues' on/off switch in Settings (workouts.js, _warmupSpeak). Item 47 (music does not start again after the app speaks) is the same problem.
6. Mac copy on localhost:8000 is old. When syncing it, log in with the private account and choose "Cloud" for all categories (the phone chose "This device"). Tell Joel first before doing this.

## B. DECISIONS PENDING
(none)

## C. NEXT FEATURES (in this order; prioritised 18 Nov 2026: bugs first, then what Joel feels in every workout, then quick wins, then engagement, then bigger features, last what is blocked)
1. 40. Indicator when the set break (rest) is almost over. Same rest card, high daily value.
2. 42. Show how long since the last training. (Note said "last tick in training", confirm meaning with Joel.) Small, supports the thirsty-plant habit loop.
3. 41. Tell me when a badge was earned (notification or visible hint). Makes existing rewards visible.
4. 44. For each training of a journey, show its goal/focus. Makes journeys easier to follow.
5. 45. Plant story: nature benefits, learn something about the plant in a storytelling format. Content on top of the finished story system.
6. 38. Alternate (swap) exercises during journey trainings. Flexibility when equipment is missing.
7. 16. Progress milestone messages (motivational text at key completion points)
8. 18. Post-workout feedback prompt
9. 11. Week preview (what is coming this week)
10. 9. Weekly challenge (bonus session for extra XP)
11. 10. Journey completion certificate (special screen when all sessions are done)
12. 12. Rest day tips (recovery and mobility)
13. 17. Training plan archive (deleted plans move to an archive, restorable or permanently deletable)
14. 36. Journey option for location/equipment: gym vs park or less equipment. (Partly covered by the AI guide export; revisit.)
15. 35. Journey exercises do not have to be only exercises I already did before. (Partly covered by the AI guide export; revisit.)
16. 48b. Plant story step 2: baby plants around level 40 (about 17,000 XP, far away at level 8, so later).
17. 48c. Plant story step 3: forest with its own flora and fauna, collection log of discoveries (new key, mapped in export). Biggest item, after 48b.
18. 13. Mid-journey check-in (Gemini). Blocked while Gemini journey creation does not work.
19. 14. Weekly adaptive reassessment (Gemini). Blocked, same reason.
20. 15. Adaptive difficulty (goes with 13 and 14). Blocked, same reason.

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
- Verified by Joel (15 Nov 2026): weekly goal XP check, bottom nav 6px shift, hold exercises showing seconds instead of reps, sync decision sheet inside the app container, Gemini 5xx retry and model fallback

## Reference
- Models: gemini-3.8-flash (primary), gemini-3.5-flash-lite (fallback). Free tier limits are small, so keep test journeys short and avoid repeated retries.
- Real account uses the private email, the Accenture account is a test account used only on localhost:8001. Never log in with the private account on a test environment.
