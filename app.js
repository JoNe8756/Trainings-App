/* Extracted from index.html — global state variables and data constants. */
  // === GLOBAL STATE ===
  let journeyReturnTo = 'library';   /* where journey detail's back goes: 'library' | 'summary' */
  /* ── State ──────────────────────────────────────────────── */
  let workouts = JSON.parse(localStorage.getItem('workouts') || '[]');
  let plans    = JSON.parse(localStorage.getItem('plans')    || '[]');
  let activePlanData = null;   /* { planName, exercises[], nextIndex } when plan workout running */
  let timerInterval    = null;
  let timerSeconds     = 0; /* kept in sync for display; source of truth is timestamps */
  let _workoutStartTs  = 0; /* Date.now() when workout started (or restored) */
  let _workoutPausedMs = 0; /* total ms spent paused */
  let _workoutPausedAt = 0; /* Date.now() when last pause began, 0 = not paused */
  let exerciseCount  = 0;
  let _workoutActive = false;  /* true while a workout is in progress */
  /* journey session keys ("journeyId-w-s") being logged in the open workout (same state as the resume banner) */
  function _activeJourneySessionKeys() {
    if (!_workoutActive) return [];
    return Array.from(document.querySelectorAll('#exercise-list .exercise-card[data-journey-key]')).map(c => c.dataset.journeyKey);
  }
  let _sessionRestEnabled = null; /* null = follow global setting; true/false = session override */

  /* ── XP & level system ──────────────────────────────────── */
  /* localStorage "xpData": { totalXP, lastStreakWeek, streakWeeks, xpLog[], lastWeeklyGoalWeek, xpBySource{} } */
  let xpData = (function () {
    try {
      const d = JSON.parse(localStorage.getItem('xpData'));
      if (d && typeof d === 'object') return d;
    } catch (e) {}
    return { totalXP: 0, lastStreakWeek: null, streakWeeks: 0, xpLog: [], lastWeeklyGoalWeek: null, xpBySource: { workout: 0, journey_session: 0, pr: 0, weekly_goal: 0, streak: 0 } };
  })();

  // === SEGMENTED CONTROL PILL ===
  /* Reusable sliding-pill behaviour for every segmented control (same feel as
     the bottom nav). A container needs class "segmented-control", position
     relative (via CSS), a first child ".segment-pill", then N segment buttons. */
  /* Position a pill with explicit left/width (4px inset each side) so it is
     mathematically exact for any segment count or container width, and never
     overshoots. Uses calc() so it stays correct on resize and when hidden. */
  function _placeSegmentPill(pill, activeIndex, totalCount) {
    if (!pill || !totalCount) return;
    const seg = '(100% - 8px) / ' + totalCount;   /* 8px = 4px inset on both sides */
    pill.style.width     = 'calc(' + seg + ')';
    pill.style.left      = 'calc(4px + (' + seg + ') * ' + activeIndex + ')';
    pill.style.transform = 'none';
  }

  function moveSegmentedPill(containerEl, activeIndex, totalCount) {
    if (!containerEl) return;
    const pill = containerEl.querySelector('.segment-pill');
    if (!pill) return;
    _placeSegmentPill(pill, activeIndex, totalCount);
    containerEl.classList.add('is-moving');
    clearTimeout(containerEl._segPillTid);
    containerEl._segPillTid = setTimeout(() => containerEl.classList.remove('is-moving'), 450);
  }

  function initSegmentedPill(containerEl) {
    if (!containerEl) return;
    const pill = containerEl.querySelector('.segment-pill');
    if (!pill) return;
    const segs  = Array.from(containerEl.children).filter(c => !c.classList.contains('segment-pill'));
    const total = segs.length;
    let active  = segs.findIndex(s => s.classList.contains('active'));
    if (active < 0) active = 0;
    /* position once on init without the slide animation */
    const prev = pill.style.transition;
    pill.style.transition = 'none';
    _placeSegmentPill(pill, active, total);
    void pill.offsetWidth;                 /* force reflow so the reset sticks */
    pill.style.transition = prev;
  }

  /* Initialise every existing segmented control once its buttons are in the DOM */
  (function _initSegmentedControls() {
    function wire() {
      ['lib-seg'].forEach(id => initSegmentedPill(document.getElementById(id)));
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
    else wire();
  })();

  /* ── Exercise library ───────────────────────────────────── */
  const DEFAULT_EX_LIB = {
    Push: ['Push-ups','Dips','Pike push-ups','Handstand push-ups','Negative Slow Handstand Push-ups',
           'Handstand Hold','Diamond push-ups','Archer push-ups','Pseudo planche push-ups','One arm push-up',
           'Frog stand','Tuck planche','Advanced tuck planche','Straddle planche','Full planche',
           'Wall handstand','Freestanding handstand','L-sit to handstand',
           'Straight Bar Dips','Dips with Chest Press at Top','Push-ups with Raised Legs',
           'Wall push-ups','Ring push-ups','Decline push-ups','Incline push-ups','Clapping push-ups',
           'One-arm push-up negatives','Ring dips','Korean dips','Russian dips','Bulgarian dips',
           'L-sit dips','Pelican curls','Handstand walk','Wall handstand hold','Handstand push-up negatives',
           'Pike handstand push-ups','Deficit handstand push-ups','Ring handstand push-ups'],
    Pull: ['Pull-ups','Chin-ups','Rows','Muscle-ups','Fast Muscle-ups','Slow Transition Muscle-ups',
           'Australian rows','Archer pull-ups','One arm pull-up','Commando pull-ups',
           'Tuck front lever','Advanced tuck front lever','Straddle front lever','Full front lever',
           'Front Lever Hold','Front Lever Bicycles','Tucked Front Lever Rows',
           'Tuck back lever','Straddle back lever','Full back lever',
           'Fast Pull-ups','30 Second Pull-up Hold',
           'Neutral grip pull-ups','Wide grip pull-ups','Close grip pull-ups','L-sit pull-ups',
           'One-arm pull-up negatives','One-arm chin-up negatives','Ring pull-ups','Ring chin-ups',
           'Typewriter pull-ups','Explosive pull-ups','Chest to bar pull-ups','Behind the neck pull-ups',
           'Muscle-up negatives','Ring muscle-ups','Bar muscle-up','Strict muscle-ups','Kipping muscle-ups',
           'Ice cream makers','Back lever','Front lever raises','Front lever pulls',
           'One arm row','Inverted rows','Ring rows','Australian pull-ups'],
    Core: ['Planks','Leg raises','Sit-ups','Hollow holds','Dragon flag',
           'L-sit','V-sit','Tuck L-sit','Hollow body rock','Dead bug',
           'Ab wheel rollouts','Hanging knee raises','Toes to bar','Human flag',
           'Windshield Wipers',
           'Hollow body hold','Arch body hold','Dragon flag negatives','Hanging leg raises',
           'Side plank','Copenhagen plank','Pallof press','GHD sit-ups','Reverse hypers',
           'Jefferson curl','Back extensions','Manna','Straddle L-sit','Human flag negatives',
           'Skin the cat','German hang','Shoulder dislocates','Wrist push-ups','Finger push-ups'],
    Legs: ['Squats','Lunges','Pistol squats','Calf raises','Shrimp squats',
           'Sissy squats','Nordic curls','Bulgarian split squats',
           'Step-ups','Box jumps','Glute bridges','Single leg deadlift',
           'Jump squats','Hip thrusts','Reverse lunges','Broad jumps','Single leg calf raises',
           'Wall sit','Squat jumps','Sprints','Hill sprints','Depth jumps','Lateral bounds'],
    'Weighted/Gym': [
      'Bench press','Back squat','Deadlift','Overhead press','Barbell row',
      'Lat pulldown','Leg press','Romanian deadlift','Incline bench press',
      'Decline bench press','Dumbbell bench press','Dumbbell row',
      'Push press','Front squat','Goblet squat','Bulgarian split squat',
      'Hip thrust','Cable row','Chest-supported row','T-bar row',
      "Farmer's carry",'Sumo deadlift','Hack squat','Pendlay row','Seal row',
      'Bicep curls','Tricep pushdowns','Lateral raises','Front raises',
      'Rear delt fly','Face pulls','Skull crushers','Hammer curls','Preacher curls',
      'Leg extensions','Leg curls','Calf raises (machine)','Cable lateral raise',
      'Cable bicep curl','Tricep kickbacks','Dumbbell chest fly','Pec deck',
      'Cable fly','Concentration curls','Overhead tricep extension',
      'Reverse fly','Upright row','Shrugs','Good mornings','Cable crunch',
      'Dumbbell press','Incline dumbbell press','Arnold press','Cable curls','Close grip bench',
      'Dips weighted','Pull-ups weighted','Chin-ups weighted','Dumbbell flyes','Hip thrusts weighted',
      'Glute bridges weighted','Cable kickbacks','Kettlebell swings','Kettlebell deadlifts','Box squats',
      'Pause squats','Safety bar squats','Zercher squats','Good mornings weighted',
    ],
    Cardio: [
      'Running','Sprinting','Cycling','Swimming','Rowing machine','Ski erg','Jump rope','Burpees',
      'Mountain climbers','High knees','Jumping jacks','Battle ropes','Assault bike','Stair climbing',
      'Elliptical','Walking','Hiking','HIIT circuits','Tabata intervals',
    ],
    Mobility: [
      'Hip flexor stretch','Hamstring stretch','Quad stretch','Pigeon pose','Lizard pose',
      'Pancake stretch','Middle splits','Front splits','Bridge','Wheel pose','Thoracic rotations',
      'Cat cow','Child pose','Down dog','Up dog','Wrist circles','Ankle circles','Foam rolling',
      'Deep squat hold','Jefferson curl mobility',
    ],
  };
  const EX_CATS = ['Push','Pull','Core','Legs','Weighted/Gym','Cardio','Mobility'];

  /* difficulty + type for all built-in exercises */
  const EXERCISE_META = {
    /* Push — bodyweight */
    'Push-ups':{type:'bw',diff:2},'Dips':{type:'bw',diff:4},
    'Pike push-ups':{type:'bw',diff:3},'Handstand push-ups':{type:'bw',diff:9},
    'Negative Slow Handstand Push-ups':{type:'bw',diff:6},'Handstand Hold':{type:'bw',diff:7,tb:1},
    'Diamond push-ups':{type:'bw',diff:3},'Archer push-ups':{type:'bw',diff:7},
    'Pseudo planche push-ups':{type:'bw',diff:5},'One arm push-up':{type:'bw',diff:7},
    'Frog stand':{type:'bw',diff:4,tb:1},'Tuck planche':{type:'bw',diff:4,tb:1},
    'Advanced tuck planche':{type:'bw',diff:5,tb:1},'Straddle planche':{type:'bw',diff:9,tb:1},
    'Full planche':{type:'bw',diff:10,tb:1},'Wall handstand':{type:'bw',diff:2,tb:1},
    'Freestanding handstand':{type:'bw',diff:5,tb:1},
    'L-sit to handstand':{type:'bw',diff:8,tb:1},
    'Straight Bar Dips':{type:'bw',diff:6},
    'Dips with Chest Press at Top':{type:'bw',diff:5},
    'Push-ups with Raised Legs':{type:'bw',diff:4},
    /* Pull — bodyweight */
    'Pull-ups':{type:'bw',diff:6},'Chin-ups':{type:'bw',diff:7},
    'Rows':{type:'bw',diff:4},'Muscle-ups':{type:'bw',diff:8},
    'Fast Muscle-ups':{type:'bw',diff:9},'Slow Transition Muscle-ups':{type:'bw',diff:9},
    'Front Lever Hold':{type:'bw',diff:8,tb:1},'Front Lever Bicycles':{type:'bw',diff:3},
    'Tucked Front Lever Rows':{type:'bw',diff:5},
    'Australian rows':{type:'bw',diff:2},'Archer pull-ups':{type:'bw',diff:7},
    'One arm pull-up':{type:'bw',diff:9},'Commando pull-ups':{type:'bw',diff:7},
    'Tuck front lever':{type:'bw',diff:5,tb:1},'Advanced tuck front lever':{type:'bw',diff:6,tb:1},
    'Straddle front lever':{type:'bw',diff:8,tb:1},'Full front lever':{type:'bw',diff:9,tb:1},
    'Tuck back lever':{type:'bw',diff:5,tb:1},'Straddle back lever':{type:'bw',diff:7,tb:1},
    'Full back lever':{type:'bw',diff:9,tb:1},
    'Fast Pull-ups':{type:'bw',diff:7},
    '30 Second Pull-up Hold':{type:'bw',diff:5,tb:1},
    /* Core — bodyweight */
    'Planks':{type:'bw',diff:2,tb:1},'Leg raises':{type:'bw',diff:3},
    'Sit-ups':{type:'bw',diff:2},'Hollow holds':{type:'bw',diff:3,tb:1},
    'Dragon flag':{type:'bw',diff:5},'L-sit':{type:'bw',diff:2,tb:1},
    'V-sit':{type:'bw',diff:7,tb:1},'Tuck L-sit':{type:'bw',diff:4,tb:1},
    'Hollow body rock':{type:'bw',diff:1},'Dead bug':{type:'bw',diff:2},
    'Ab wheel rollouts':{type:'bw',diff:6},'Hanging knee raises':{type:'bw',diff:3},
    'Toes to bar':{type:'bw',diff:7},'Human flag':{type:'bw',diff:9,tb:1},
    'Windshield Wipers':{type:'bw',diff:7},
    /* Legs — bodyweight */
    'Squats':{type:'bw',diff:1},'Lunges':{type:'bw',diff:2},
    'Pistol squats':{type:'bw',diff:9},'Calf raises':{type:'bw',diff:1},
    'Shrimp squats':{type:'bw',diff:6},'Sissy squats':{type:'bw',diff:6},
    'Nordic curls':{type:'bw',diff:4},'Bulgarian split squats':{type:'bw',diff:4},
    'Step-ups':{type:'bw',diff:2},'Box jumps':{type:'bw',diff:3},
    'Glute bridges':{type:'bw',diff:2},'Single leg deadlift':{type:'bw',diff:4},
    /* Weighted/Gym — compounds */
    'Bench press':{type:'w',diff:5},'Back squat':{type:'w',diff:6},
    'Deadlift':{type:'w',diff:6},'Overhead press':{type:'w',diff:5},
    'Barbell row':{type:'w',diff:5},'Lat pulldown':{type:'w',diff:4},
    'Leg press':{type:'w',diff:4},'Romanian deadlift':{type:'w',diff:5},
    'Incline bench press':{type:'w',diff:5},'Decline bench press':{type:'w',diff:4},
    'Dumbbell bench press':{type:'w',diff:4},'Dumbbell row':{type:'w',diff:4},
    'Push press':{type:'w',diff:6},'Front squat':{type:'w',diff:7},
    'Goblet squat':{type:'w',diff:3},'Bulgarian split squat':{type:'w',diff:4},
    'Hip thrust':{type:'w',diff:3},'Cable row':{type:'w',diff:3},
    'Chest-supported row':{type:'w',diff:3},'T-bar row':{type:'w',diff:5},
    "Farmer's carry":{type:'w',diff:4},'Sumo deadlift':{type:'w',diff:5},
    'Hack squat':{type:'w',diff:4},'Pendlay row':{type:'w',diff:5},
    'Seal row':{type:'w',diff:4},
    /* Weighted/Gym — isolations */
    'Bicep curls':{type:'w',diff:2},'Tricep pushdowns':{type:'w',diff:2},
    'Lateral raises':{type:'w',diff:2},'Front raises':{type:'w',diff:2},
    'Rear delt fly':{type:'w',diff:2},'Face pulls':{type:'w',diff:2},
    'Skull crushers':{type:'w',diff:3},'Hammer curls':{type:'w',diff:2},
    'Preacher curls':{type:'w',diff:2},'Leg extensions':{type:'w',diff:2},
    'Leg curls':{type:'w',diff:2},'Calf raises (machine)':{type:'w',diff:1},
    'Cable lateral raise':{type:'w',diff:2},'Cable bicep curl':{type:'w',diff:2},
    'Tricep kickbacks':{type:'w',diff:2},'Dumbbell chest fly':{type:'w',diff:2},
    'Pec deck':{type:'w',diff:2},'Cable fly':{type:'w',diff:2},
    'Concentration curls':{type:'w',diff:2},'Overhead tricep extension':{type:'w',diff:2},
    'Reverse fly':{type:'w',diff:2},'Upright row':{type:'w',diff:3},
    'Shrugs':{type:'w',diff:2},'Good mornings':{type:'w',diff:4},
    'Cable crunch':{type:'w',diff:2},
    /* ── Added library (estimated difficulty, verified:false) ── */
    /* Push */
    'Wall push-ups':{type:'bw',diff:1,verified:false},'Ring push-ups':{type:'bw',diff:5,verified:false},
    'Decline push-ups':{type:'bw',diff:3,verified:false},'Incline push-ups':{type:'bw',diff:1,verified:false},
    'Clapping push-ups':{type:'bw',diff:5,verified:false},'One-arm push-up negatives':{type:'bw',diff:6,verified:false},
    'Ring dips':{type:'bw',diff:6,verified:false},'Korean dips':{type:'bw',diff:7,verified:false},
    'Russian dips':{type:'bw',diff:8,verified:false},'Bulgarian dips':{type:'bw',diff:6,verified:false},
    'L-sit dips':{type:'bw',diff:7,verified:false},'Pelican curls':{type:'bw',diff:8,verified:false},
    'Handstand walk':{type:'bw',diff:8,verified:false},'Wall handstand hold':{type:'bw',diff:2,tb:1,verified:false},
    'Handstand push-up negatives':{type:'bw',diff:6,verified:false},'Pike handstand push-ups':{type:'bw',diff:4,verified:false},
    'Deficit handstand push-ups':{type:'bw',diff:8,verified:false},'Ring handstand push-ups':{type:'bw',diff:10,verified:false},
    /* Pull */
    'Neutral grip pull-ups':{type:'bw',diff:5,verified:false},'Wide grip pull-ups':{type:'bw',diff:6,verified:false},
    'Close grip pull-ups':{type:'bw',diff:5,verified:false},'L-sit pull-ups':{type:'bw',diff:7,verified:false},
    'One-arm pull-up negatives':{type:'bw',diff:8,verified:false},'One-arm chin-up negatives':{type:'bw',diff:8,verified:false},
    'Ring pull-ups':{type:'bw',diff:6,verified:false},'Ring chin-ups':{type:'bw',diff:6,verified:false},
    'Typewriter pull-ups':{type:'bw',diff:8,verified:false},'Explosive pull-ups':{type:'bw',diff:6,verified:false},
    'Chest to bar pull-ups':{type:'bw',diff:6,verified:false},'Behind the neck pull-ups':{type:'bw',diff:7,verified:false},
    'Muscle-up negatives':{type:'bw',diff:7,verified:false},'Ring muscle-ups':{type:'bw',diff:9,verified:false},
    'Bar muscle-up':{type:'bw',diff:8,verified:false},'Strict muscle-ups':{type:'bw',diff:9,verified:false},
    'Kipping muscle-ups':{type:'bw',diff:6,verified:false},'Ice cream makers':{type:'bw',diff:9,verified:false},
    'Back lever':{type:'bw',diff:8,tb:1,verified:false},'Front lever raises':{type:'bw',diff:7,verified:false},
    'Front lever pulls':{type:'bw',diff:7,verified:false},'One arm row':{type:'bw',diff:4,verified:false},
    'Inverted rows':{type:'bw',diff:2,verified:false},'Ring rows':{type:'bw',diff:3,verified:false},
    'Australian pull-ups':{type:'bw',diff:2,verified:false},
    /* Core */
    'Hollow body hold':{type:'bw',diff:3,tb:1,verified:false},'Arch body hold':{type:'bw',diff:2,tb:1,verified:false},
    'Dragon flag negatives':{type:'bw',diff:4,verified:false},'Hanging leg raises':{type:'bw',diff:5,verified:false},
    'Side plank':{type:'bw',diff:2,tb:1,verified:false},'Copenhagen plank':{type:'bw',diff:5,tb:1,verified:false},
    'Pallof press':{type:'bw',diff:3,verified:false},'GHD sit-ups':{type:'bw',diff:5,verified:false},
    'Reverse hypers':{type:'bw',diff:3,verified:false},'Jefferson curl':{type:'bw',diff:4,verified:false},
    'Back extensions':{type:'bw',diff:2,verified:false},'Manna':{type:'bw',diff:10,tb:1,verified:false},
    'Straddle L-sit':{type:'bw',diff:5,tb:1,verified:false},'Human flag negatives':{type:'bw',diff:7,verified:false},
    'Skin the cat':{type:'bw',diff:5,verified:false},'German hang':{type:'bw',diff:4,tb:1,verified:false},
    'Shoulder dislocates':{type:'bw',diff:1,verified:false},'Wrist push-ups':{type:'bw',diff:3,verified:false},
    'Finger push-ups':{type:'bw',diff:7,verified:false},
    /* Legs */
    'Jump squats':{type:'bw',diff:2,verified:false},'Hip thrusts':{type:'bw',diff:2,verified:false},
    'Reverse lunges':{type:'bw',diff:2,verified:false},'Broad jumps':{type:'bw',diff:3,verified:false},
    'Single leg calf raises':{type:'bw',diff:2,verified:false},'Wall sit':{type:'bw',diff:2,tb:1,verified:false},
    'Squat jumps':{type:'bw',diff:2,verified:false},'Sprints':{type:'bw',diff:3,verified:false},
    'Hill sprints':{type:'bw',diff:4,verified:false},'Depth jumps':{type:'bw',diff:5,verified:false},
    'Lateral bounds':{type:'bw',diff:3,verified:false},
    /* Weighted */
    'Dumbbell press':{type:'w',diff:4,verified:false},'Incline dumbbell press':{type:'w',diff:4,verified:false},
    'Arnold press':{type:'w',diff:4,verified:false},'Cable curls':{type:'w',diff:2,verified:false},
    'Close grip bench':{type:'w',diff:4,verified:false},'Dips weighted':{type:'w',diff:6,verified:false},
    'Pull-ups weighted':{type:'w',diff:7,verified:false},'Chin-ups weighted':{type:'w',diff:7,verified:false},
    'Dumbbell flyes':{type:'w',diff:3,verified:false},'Hip thrusts weighted':{type:'w',diff:4,verified:false},
    'Glute bridges weighted':{type:'w',diff:3,verified:false},'Cable kickbacks':{type:'w',diff:2,verified:false},
    'Kettlebell swings':{type:'w',diff:3,verified:false},'Kettlebell deadlifts':{type:'w',diff:3,verified:false},
    'Box squats':{type:'w',diff:4,verified:false},'Pause squats':{type:'w',diff:6,verified:false},
    'Safety bar squats':{type:'w',diff:5,verified:false},'Zercher squats':{type:'w',diff:6,verified:false},
    'Good mornings weighted':{type:'w',diff:4,verified:false},
    /* Cardio */
    'Running':{type:'bw',diff:2,verified:false},'Sprinting':{type:'bw',diff:4,verified:false},
    'Cycling':{type:'bw',diff:2,verified:false},'Swimming':{type:'bw',diff:4,verified:false},
    'Rowing machine':{type:'bw',diff:3,verified:false},'Ski erg':{type:'bw',diff:3,verified:false},
    'Jump rope':{type:'bw',diff:2,verified:false},'Burpees':{type:'bw',diff:3,verified:false},
    'Mountain climbers':{type:'bw',diff:2,verified:false},'High knees':{type:'bw',diff:1,verified:false},
    'Jumping jacks':{type:'bw',diff:1,verified:false},'Battle ropes':{type:'bw',diff:3,verified:false},
    'Assault bike':{type:'bw',diff:4,verified:false},'Stair climbing':{type:'bw',diff:2,verified:false},
    'Elliptical':{type:'bw',diff:1,verified:false},'Walking':{type:'bw',diff:1,verified:false},
    'Hiking':{type:'bw',diff:2,verified:false},'HIIT circuits':{type:'bw',diff:5,verified:false},
    'Tabata intervals':{type:'bw',diff:5,verified:false},
    /* Mobility */
    'Hip flexor stretch':{type:'bw',diff:1,tb:1,verified:false},'Hamstring stretch':{type:'bw',diff:1,tb:1,verified:false},
    'Quad stretch':{type:'bw',diff:1,tb:1,verified:false},'Pigeon pose':{type:'bw',diff:2,tb:1,verified:false},
    'Lizard pose':{type:'bw',diff:3,tb:1,verified:false},'Pancake stretch':{type:'bw',diff:4,tb:1,verified:false},
    'Middle splits':{type:'bw',diff:7,tb:1,verified:false},'Front splits':{type:'bw',diff:7,tb:1,verified:false},
    'Bridge':{type:'bw',diff:4,tb:1,verified:false},'Wheel pose':{type:'bw',diff:5,tb:1,verified:false},
    'Thoracic rotations':{type:'bw',diff:1,verified:false},'Cat cow':{type:'bw',diff:1,verified:false},
    'Child pose':{type:'bw',diff:1,tb:1,verified:false},'Down dog':{type:'bw',diff:1,tb:1,verified:false},
    'Up dog':{type:'bw',diff:1,tb:1,verified:false},'Wrist circles':{type:'bw',diff:1,verified:false},
    'Ankle circles':{type:'bw',diff:1,verified:false},'Foam rolling':{type:'bw',diff:1,verified:false},
    'Deep squat hold':{type:'bw',diff:2,tb:1,verified:false},'Jefferson curl mobility':{type:'bw',diff:3,verified:false},
  };

  /* qs() — single-quote a string for safe use inside double-quoted HTML onclick attrs */

  const EXERCISE_DETAIL = {
    /* ── Push ── */
    'Push-ups':{how:['Place hands slightly wider than shoulder-width, body in a straight plank.','Lower chest to within an inch of the floor, elbows at roughly 45° from your torso.','Press back to full arm extension, maintaining a rigid body line throughout.'],cues:['Core tight the whole time — hips must not sag or pike up.','Elbows at ~45° from the torso, never flared wide.','Full range: chest near the floor at the bottom, arms fully locked at the top.']},
    'Dips':{how:['Grip parallel bars with arms straight, body upright or slightly forward-leaning.','Lower by bending elbows until upper arms reach parallel with the floor.','Press back to full lockout, squeezing the triceps at the top.'],cues:['Lean forward to bias the chest; stay more upright to hit triceps harder.','Keep shoulders packed down — don\'t let them shrug up during the movement.','Control the descent; avoid bouncing at the bottom.']},
    'Pike push-ups':{how:['Start in a downward-dog (inverted V): hips high, arms and legs straight.','Bend elbows to lower the crown of your head toward the floor between your hands.','Press back to full arm extension, keeping hips elevated throughout.'],cues:['Higher hips = more shoulder load. Push hips as high as possible.','Elbows track out to the sides, not forward.','Build toward this as a direct progression for handstand push-ups.']},
    'Handstand push-ups':{how:['Kick up to a wall handstand, hands 6–8 inches from the wall, shoulder-width apart.','Slowly lower by bending elbows until the crown of your head touches the floor.','Press explosively back to lockout, maintaining full-body tension throughout.'],cues:['Squeeze core and glutes — avoid excessive arch in the lower back.','Spread fingers and distribute weight through all fingertips, not just the heel of the hand.','Wrists, elbows, and shoulders should stack vertically at full lockout.']},
    'Diamond push-ups':{how:['Form a diamond with thumbs and index fingers, place hands under your sternum.','Lower chest to your hands with elbows tracking tight to your sides.','Press back to full lockout, squeezing the triceps hard at the top.'],cues:['Elbows must stay close to the body — that\'s what makes it tricep-focused.','Keep hips level; narrower hand position makes balance harder.','Don\'t let wrists bend excessively — adjust hand angle if needed.']},
    'Archer push-ups':{how:['Set up wide with arms straight, one hand\'s fingers pointing outward.','Shift your weight toward one hand while bending that elbow, keeping the opposite arm fully straight.','Press back to center and alternate sides.'],cues:['The straight arm stays fully extended throughout its side — no bend.','Lower as deep as possible: aim for shoulder-height on the active elbow.','A key progression toward the one-arm push-up.']},
    'Pseudo planche push-ups':{how:['Place hands beside your hips with fingers pointing back, lean torso forward so shoulders are ahead of wrists.','Lower slowly by bending elbows, maintaining the forward lean throughout.','Press back up, keeping the same torso-over-hands angle.'],cues:['More forward lean = harder. Begin with 30–45° and progress from there.','Protract (spread) shoulder blades throughout the movement.','Essential conditioning for wrists and shoulders before planche training.']},
    'One arm push-up':{how:['Set up in push-up position, move one hand to center under your chest.','Place the other hand behind your back or along your thigh.','Lower your chest toward the floor while resisting rotation, then press back up.'],cues:['Actively brace against hip and shoulder rotation — body stays square.','Keep feet wider than usual for better lateral stability.','Archer push-ups are the direct prerequisite — master those first.']},
    'Frog stand':{how:['Squat down and place both hands flat on the floor, shoulder-width apart.','Place your knees on the backs of your upper arms near the armpits.','Lean forward slowly, shift weight into hands, and lift feet off the floor. Hold.'],cues:['Spread fingers wide and grip the floor actively for stability.','Start with toes lightly touching the floor, then lift them as balance improves.','The entry-level balance hold and foundation for all planche progressions.']},
    'Tuck planche':{how:['From a support position on bars or the floor, lean torso forward over your hands.','Protract shoulder blades strongly (push them forward and apart).','Lift hips with knees drawn tightly to your chest until body is parallel to the floor. Hold.'],cues:['Scapular protraction is essential — round the upper back and push through the shoulders.','Hips level with shoulders. If hips drop, you\'ve lost the planche position.','Engage everything simultaneously: core, glutes, quads, and shoulders.']},
    'Advanced tuck planche':{how:['Start in a tuck planche, then gradually extend knees slightly away from the chest.','Hold with your back flat and horizontal, legs in a less-compressed tuck.','The key difference from tuck: back is fully horizontal, not angled.'],cues:['Maximum scapular protraction must be maintained as you open the tuck.','As you extend the tuck, your hips must rise to stay parallel — fight for this.','Work up to 10+ second holds with good form before progressing further.']},
    'Straddle planche':{how:['Push into full shoulder protraction and extend legs wide to the sides.','Hold body horizontal with arms straight and legs spread in a straddle position.','Hips stay in line with shoulders — no sagging.'],cues:['Wider straddle shortens the lever and makes this easier — use width as your difficulty dial.','Point toes and squeeze glutes to maintain leg tension throughout.','The critical bridge between advanced tuck and full planche.']},
    'Full planche':{how:['From a straddle planche, bring legs together into a fully straight body position.','Hold horizontal: arms straight, legs together, body parallel to the floor.','Maintain through maximal full-body isometric tension.'],cues:['Every joint fully extended: elbows, hips, knees, ankles. No sag anywhere.','Maintain a hollow body (posterior pelvic tilt) — not an arched back.','One of the hardest bodyweight skills. Expect years of dedicated training.']},
    'Wall handstand':{how:['Place hands about 6 inches from the wall, kick or walk feet up.','Adjust until body is close to straight, heels lightly contacting the wall.','Hold the inverted position, bearing weight fully through the hands.'],cues:['Point toes, squeeze glutes, and brace core for full body tension.','The wall is for balance only — your hands carry all the weight.','Progressively reduce wall contact to build toward a freestanding handstand.']},
    'Freestanding handstand':{how:['Press or kick up into a handstand with only hands on the floor.','Maintain a straight (or slightly hollowed) body from wrists to toes.','Balance using active fingertip pressure — press fingers when falling forward.'],cues:['Fingertip pressure is your balance control: press into the floor to correct a forward fall.','Arms straight, shoulders slightly elevated (active shrug) for the most stable base.','Look at a fixed point between your hands — head position strongly affects balance.']},
    /* ── Pull ── */
    'Pull-ups':{how:['Hang from a bar with an overhand grip, hands slightly wider than shoulder-width.','Pull until your chin clears the bar (or chest touches for full range).','Lower with control to a complete dead hang before each rep.'],cues:['Initiate by depressing the scapulae (pull shoulder blades down) before bending elbows.','Drive elbows toward your hips — "elbows to pockets."','Full dead hang between reps maximizes strength development.']},
    'Chin-ups':{how:['Hang from a bar with an underhand (supinated) grip, hands shoulder-width apart.','Pull until your chin clears the bar, leading with your chest.','Lower fully to a dead hang between every rep.'],cues:['Supinated grip involves more biceps, making this slightly easier than overhand pull-ups.','Keep elbows tracking forward and in during the movement.','Squeeze both the biceps and back hard at the top.']},
    'Rows':{how:['Hang under a bar or rings at an angle, overhand grip, body straight.','Pull your chest up to the bar, driving elbows back past your torso.','Lower under control to full arm extension.'],cues:['Body angle controls difficulty: more horizontal = harder.','Hold your body rigid as a plank throughout — hips must not sag.','Squeeze shoulder blades together and pause briefly at the top of each rep.']},
    'Muscle-ups':{how:['Dead hang from a bar with a false grip (wrists hooked over the bar).','Pull explosively, aiming to bring your hips level with the bar.','As elbows pass bar height, transition by leaning forward and pressing into a dip lockout.'],cues:['Practice high-rep strict pull-ups and ring dip transitions separately before combining.','Bar path stays close to the body throughout the entire pull.','A slight forward lean at the top of the pull makes the transition significantly easier.']},
    'Fast Muscle-ups':{how:['Use a false grip and initiate with a powerful explosive hip drive and pull.','Accelerate through the transition as quickly as possible — speed through the sticking point.','Lock out the dip aggressively and reset for the next rep.'],cues:['Maximum intent on every rep — think "attack the bar" on each pull.','Fast muscle-ups train rate of force development, not just strength.','Ensure you have solid slow muscle-ups before training the explosive variation.']},
    'Slow Transition Muscle-ups':{how:['Pull into the transition and pause deliberately when elbows are at bar height.','Control the forward lean and press into the dip with deliberate, slow tempo.','Lower under full control — 3–5 seconds down if adding an eccentric.'],cues:['The slow transition exposes and builds the weakest point in the movement.','Full body tension throughout — no swinging or kipping to compensate.','Excellent for identifying and correcting technique flaws in the standard muscle-up.']},
    'Handstand push-ups':{how:['Kick up to a wall handstand, hands 6–8 inches from the wall.','Lower your head toward the floor in a controlled descent, elbows tracking slightly forward.','Press back to full lockout with a tall, vertical torso.'],cues:['Stack: wrists, elbows, shoulders — keep the shoulder-to-wrist line vertical.','Tuck the chin: looking at the floor keeps the neck neutral.','Build: start with negatives (controlled lowering) before attempting the full press.']},
    'Negative Slow Handstand Push-ups':{how:['Kick up to a wall handstand with hands 6–8 inches from the wall.','Lower your head to the floor as slowly as possible — aim for 5–10 seconds down.','Reset at the top for each rep; do not press back up (eccentric-only).'],cues:['The slower the descent, the greater the strength stimulus.','Protract scapulae slightly at the top to maintain tension before initiating the lower.','Use this as a primary progression tool before achieving the first full handstand push-up.']},
    'Handstand Hold':{how:['Kick up to a wall handstand or free handstand, hands shoulder-width.','Stack: hands, wrists, elbows, shoulders, hips, heels in one vertical line.','Breathe steadily and hold for the target duration.'],cues:['Push the floor away — active depression of shoulders is essential.','Fingers spread and grip the floor to maintain balance.','Engage glutes and point toes to keep the lower body in line.']},
    'Front Lever Hold':{how:['Hang from a bar, depress and retract scapulae strongly.','Pull hips up until the entire body is horizontal, arms straight.','Hold with legs together and fully extended, face down.'],cues:['Scapular depression is non-negotiable — if shoulders rise, the lever collapses.','Total body tension: squeeze glutes, quads, and core simultaneously.','Progress through tuck → advanced tuck → straddle before attempting the full hold.']},
    'Front Lever Bicycles':{how:['Pull into a front lever position with hips horizontal and core tight.','Drive one knee toward the chest while extending the other leg fully — like pedalling a bicycle.','Alternate legs in a controlled rhythmic motion while maintaining the horizontal body position.'],cues:['The hips must stay level throughout — no rocking side to side.','Scapulae stay depressed and retracted the entire time.','Start slow and deliberate before building to a continuous rhythm.']},
    'Tucked Front Lever Rows':{how:['Hang from a bar and pull into a tuck front lever position (knees drawn to chest, back horizontal).','Row by bending the elbows and pulling the chest toward the bar, maintaining the tuck.','Lower under control back to straight arms, keeping the tuck throughout.'],cues:['This combines an isometric lever hold with a dynamic rowing movement.','Scapular retraction and depression must precede each pull.','If hips drop during the row, reduce range of motion until you build more strength.']},
    'Australian rows':{how:['Set up under a low bar with an overhand grip, body at roughly 45° to the floor.','Keep the body straight and pull chest up to the bar.','Lower under control to full arm extension.'],cues:['Easier than horizontal rows — use to build pulling strength progressively.','Body stays completely rigid like a plank in reverse.','Focus on squeezing shoulder blades together at the top.']},
    'Archer pull-ups':{how:['Hang from a bar with a wide overhand grip.','Pull toward one hand while extending the opposite arm fully straight.','Alternate sides each rep, or complete a full set on one side.'],cues:['The extended arm stays as straight as possible throughout.','Control body rotation — this is not a side sway, it\'s a pull.','A direct progression toward the one-arm pull-up.']},
    'One arm pull-up':{how:['Hang from a bar with one hand; place the other hand on your wrist for training, or let it hang free.','Pull your body up with the single working arm until your chin clears the bar.','Lower slowly with the same arm to a full dead hang.'],cues:['Expect years of progressive training — archer pull-ups and slow negatives are the key progressions.','Keep your free hand on your wrist (not gripping the bar) to practice the real pattern.','Core must be braced to minimize rotation throughout the movement.']},
    'Commando pull-ups':{how:['Hang from a bar with a hammer grip (palms facing each other), hands close together.','Pull up and move your head to one side of the bar.','Lower and alternate sides on the next rep.'],cues:['Neutral grip is joint-friendly — good for shoulder health.','Keep body swing minimal: controlled pull only.','Builds overall pulling strength and prepares you for more advanced movements.']},
    'Tuck front lever':{how:['Hang from a bar, shoulders packed and depressed.','Lift knees to your chest and pull hips up until your back is parallel to the floor.','Hold with arms completely straight and knees drawn tight to your chest.'],cues:['Depress and retract scapulae strongly throughout — shoulder blades pulled down and together.','Arms stay perfectly straight — any bend defeats the isometric hold.','Build with 3–5 second holds initially before progressing to longer durations.']},
    'Advanced tuck front lever':{how:['Pull into a tuck front lever, then gradually extend your knees away from your chest.','Hold with thighs roughly horizontal and your back parallel to the floor.','The progression challenge: hips lower as you open the tuck — fight to keep them level.'],cues:['Maintain constant scapular depression and retraction.','The more you open the knees, the harder it is to keep hips from dropping.','This is the hardest beginner step before progressing to a straddle front lever.']},
    'Straddle front lever':{how:['Pull into a front lever position with legs spread wide to the sides.','Hold body horizontal, arms straight, legs extended in a straddle.','Minimize any vertical distance between your hips and shoulder height.'],cues:['Wider straddle = shorter lever = easier. Use leg width as your difficulty control.','Point toes and engage inner thighs to maintain leg tension.','Back must stay flat and horizontal — not angled downward.']},
    'Full front lever':{how:['Pull into a front lever with legs together and fully extended.','Hold the body completely horizontal: arms straight, hips in line with shoulders.','Maintain through maximal full-body isometric tension.'],cues:['Total body tension from fingertips to toes — any relaxation collapses the hold.','Squeeze glutes and point toes; mentally try to pull your legs upward against resistance.','Even 2–3 second holds at this level represent significant achievement.']},
    'Tuck back lever':{how:['From a hang, rotate backward under the bar until you face upward.','Draw knees to your chest and position your back horizontal, face up, arms straight.','Hold the inverted tuck with your back toward the floor.'],cues:['The back lever is face-up (supine), the opposite orientation to the front lever.','Arms straight and push slightly into the bar to maintain height.','Stop if you feel any biceps tendon discomfort — the shoulder is in a vulnerable position.']},
    'Straddle back lever':{how:['Rotate backward under the bar into a supine hang.','Extend legs wide to the sides while holding the body as horizontal as possible.','Hold with arms straight, hips level with shoulders, legs straddled.'],cues:['Push arms gently into the bar to keep hips from dropping.','Wider straddle makes this easier — use leg spread as a difficulty control.','Shoulder flexibility is a prerequisite — warm up the shoulders and biceps tendon thoroughly.']},
    'Full back lever':{how:['Rotate backward under the bar into a supine hang.','Extend both legs together fully until the entire body is horizontal, face up.','Hold with arms straight and every muscle under maximum tension.'],cues:['Arms push into the bar to keep hips level with shoulders.','The full back lever requires significant shoulder flexibility — progress through straddle first.','Exit under control — don\'t drop suddenly from the position.']},
    /* ── Core ── */
    'Planks':{how:['Place forearms flat on the floor with elbows under shoulders, or arms fully extended.','Hold your body in a straight line from head to heels.','Breathe steadily and sustain the position for the target duration.'],cues:['No hip sag and no piking — maintain a perfectly neutral spine.','Squeeze glutes, quads, and abs simultaneously: every muscle working.','Actively push elbows or hands into the floor — don\'t just passively hang.']},
    'Leg raises':{how:['Lie flat or hang from a bar with legs straight.','Keep legs straight and raise them from 0° to 90° (vertical).','Lower slowly under control back toward the floor without letting them rest.'],cues:['Flatten your lower back against the floor or bar — prevent excessive arch.','Control the lowering phase — the eccentric builds the majority of the strength.','Slightly bent knees are acceptable when building initial strength.']},
    'Sit-ups':{how:['Lie on your back with knees bent, feet flat, hands at your temples.','Contract your abs and raise your torso fully upright.','Lower under control back to the starting position.'],cues:['Don\'t pull your neck forward with your hands — keep them lightly at your temples.','Exhale on the way up; inhale on the way down.','Anchor your feet only if needed — free sit-ups are harder and more effective.']},
    'Hollow holds':{how:['Lie on your back and press your lower back firmly into the floor (posterior pelvic tilt).','Extend arms overhead and lift legs off the floor, creating a curved "banana" shape.','Hold with lower back pressed down the entire time, breathing steadily.'],cues:['Lower back must stay pressed into the floor — if it lifts, raise your legs higher.','The longer the lever (straighter arms and legs), the harder the hold.','This is the fundamental tension pattern for handstands, front levers, and planches.']},
    'Dragon flag':{how:['Lie on a bench and grip it firmly behind your head for support.','Raise your entire body straight up, then slowly lower it until nearly parallel to the floor.','Pause briefly at the bottom without touching the bench, then raise back up.'],cues:['Slower lowering = more strength gain. Aim for a 3–5 second eccentric.','Your entire body below the shoulder blades must stay rigid like a plank.','Begin with tucked or bent-knee versions before attempting straight-leg.']},
    'L-sit':{how:['Support your bodyweight on parallel bars or the floor with straight arms.','Lift legs to horizontal with toes pointed and legs straight.','Hold with arms locked, shoulders depressed, and legs parallel to the floor.'],cues:['Push actively through the bars/floor to depress and stabilize your shoulders.','Legs must be horizontal, not drooping — build hip flexor strength if they won\'t reach.','Progression: Tuck L-sit → One-leg L-sit → L-sit → V-sit.']},
    'V-sit':{how:['From an L-sit, continue raising your legs well above horizontal.','Hold with legs elevated, torso leaning back to counterbalance.','Maintain straight arms, full shoulder depression, and straight legs.'],cues:['Requires strong hip flexors and good hamstring flexibility.','The higher the legs, the more the torso leans back — this is correct and intended.','Point toes and squeeze legs together to maintain the V shape.']},
    'Tuck L-sit':{how:['Support bodyweight on parallel bars or the floor with straight arms.','Lift both knees toward your chest with feet off the floor.','Hold the compressed tuck position with shoulders depressed.'],cues:['This is the first hold in the L-sit progression ladder.','Push actively into the surface to keep shoulders depressed and stable.','Work on gradually extending your legs from the tuck toward a full L-sit.']},
    'Hollow body rock':{how:['Get into a hollow hold: lower back pressed into the floor, arms and legs extended.','Gently rock your body forward and backward like a rocking chair.','Your body shape must stay rigid and curved throughout the rocking motion.'],cues:['The rock comes from momentum — your body shape should not change at all.','Lower back must stay pressed down at every point of the rock.','Builds the motor pattern used in handstands and all gymnastic skills.']},
    'Dead bug':{how:['Lie on your back with arms pointing to the ceiling and knees bent at 90°.','Simultaneously lower one arm overhead and extend the opposite leg toward the floor.','Return to start and alternate sides, lower back pressed flat throughout.'],cues:['Lower back must stay in contact with the floor at all times — that\'s the entire point.','Move slowly and with full control — tempo matters more than range here.','Exhale as you extend to create maximum core stiffness against the movement.']},
    'Ab wheel rollouts':{how:['Kneel with the ab wheel in front of you, both hands gripping the handles.','Slowly roll forward, extending your body toward the floor while keeping a rigid core.','Pull back by contracting your lats and abs to return to the start.'],cues:['Prevent lower back from arching during the rollout — reduce range if it does.','Think "lat pulldown" on the way back — pull your elbows down toward your hips.','Stand rollouts (from feet, not knees) are the advanced progression.']},
    'Hanging knee raises':{how:['Hang from a bar with a shoulder-width grip and straight arms.','Lift knees toward your chest, focusing on curling the hips up (posterior pelvic tilt).','Lower under control back to a dead hang.'],cues:['The hip curl at the top is what makes this effective — don\'t just swing knees up.','Minimize body swing — controlled, deliberate movement only.','Progression: Hanging knee raises → Leg raises → Toes to bar.']},
    'Toes to bar':{how:['Hang from a bar with straight arms and shoulder-width grip.','Raise straight legs until your toes touch the bar.','Lower under control back to a dead hang.'],cues:['Keep the movement strict and controlled — this is not a kip.','Posterior pelvic tilt (tuck the tailbone) at the top for full abdominal contraction.','Requires hamstring flexibility and significant hip flexor and core strength.']},
    'Human flag':{how:['Grip a vertical pole with one hand above the other, both arms extended.','Push with the lower arm and pull with the upper arm to lift your body horizontal.','Hold the flag position with a completely rigid, straight body.'],cues:['It\'s a simultaneous push (lower hand) and pull (upper hand) — not just hanging sideways.','Begin with a straddle or tuck flag before progressing to straight legs.','Full-body tension is required — core, obliques, and shoulders all fire at once.']},
    /* ── Legs ── */
    'Squats':{how:['Stand with feet shoulder-width apart, toes slightly out.','Push hips back and down while keeping chest up and knees tracking over your toes.','Descend until thighs are at least parallel, then drive up through your heels.'],cues:['Chest stays up — don\'t fold your torso forward as you descend.','Knees track in line with your toes — don\'t let them cave inward.','Drive the hips up first out of the bottom, then extend your knees.']},
    'Lunges':{how:['Step forward with one foot, lowering until the rear knee nearly touches the floor.','Keep your front shin vertical (knee over ankle) and torso upright.','Push through the front foot to return to standing; repeat on the other side.'],cues:['Don\'t let the front knee travel past the toes — maintain the shin angle.','An upright torso focuses load on the quad; forward lean shifts it to the hip.','Step far enough forward that the back knee can drop straight down.']},
    'Pistol squats':{how:['Stand on one leg with the other extended straight in front.','Sit down on the standing leg until your hip crease passes below the knee.','Drive through the heel of your standing foot to rise back up.'],cues:['The extended leg must stay off the floor — truly unilateral strength.','Build with assisted pistols (holding a suspension trainer) before going unassisted.','Ankle flexibility is often the limiting factor — elevate the heel slightly if needed.']},
    'Calf raises':{how:['Stand with the balls of your feet on the edge of a step.','Rise as high as possible onto your toes.','Lower all the way down until heels are below the step edge, then repeat.'],cues:['Full range is essential — deep stretch at the bottom, maximum contraction at the top.','Slow controlled tempo: calves respond better to time under tension than fast reps.','Single-leg calf raises are far more effective for strength development.']},
    'Shrimp squats':{how:['Stand on one leg, bend the other behind you and hold that ankle.','Squat down on the standing leg, lowering the rear knee toward the floor.','Descend until the rear knee taps the floor, then drive back up.'],cues:['More quad-dominant than pistol squats — the knee travels far forward by design.','Elevate the standing foot on a step to allow full depth without the rear foot interfering.','Keep your torso as upright as possible throughout.']},
    'Sissy squats':{how:['Stand with heels slightly elevated, holding a support for balance initially.','Let knees travel far forward as you lower your body, leaning the torso backward.','Descend until your thighs and torso form a straight line backward, then return.'],cues:['This is an extreme knee-forward movement by design — it isolates the quads.','From knees to shoulders, the body stays as one rigid plank; only hips don\'t bend.','Start with a short range of motion and add depth gradually as tendons adapt.']},
    'Nordic curls':{how:['Kneel with feet firmly anchored, body upright.','Lower yourself forward toward the floor as slowly as possible using hamstrings eccentrically.','Use hands to catch at the bottom, then pull with hamstrings to return to upright.'],cues:['The slow lowering phase is the stimulus — aim for 3–5 seconds down.','Keep hips fully extended throughout — don\'t bend at the waist.','Among the most effective hamstring exercises for strength and injury prevention.']},
    'Bulgarian split squats':{how:['Face away from a bench, place the top of one foot on it behind you.','Squat down on the front leg until the rear knee nears the floor.','Drive through the front heel to return to the start.'],cues:['Front foot further from the bench = more glute; closer = more quad.','Torso upright; avoid collapsing forward at the bottom of the rep.','Expect significant DOMS initially — introduce this movement with light weight.']},
    'Step-ups':{how:['Stand facing a box or bench; place one foot fully on top.','Drive through the elevated foot to bring your whole body up onto the box.','Step back down with control; repeat for all reps then switch legs.'],cues:['Drive exclusively through the top foot — don\'t push off the floor foot.','Box height should put the working thigh at or past horizontal at the start.','Add dumbbells or a barbell to progressively increase difficulty.']},
    'Box jumps':{how:['Stand facing a sturdy box, feet hip-width.','Dip into a quarter squat and swing your arms, then explode upward.','Land softly on the whole foot in a partial squat, then step (never jump) back down.'],cues:['Land soft — absorb force through the entire foot, not just toes or heels.','Always step down, never jump down — repeated landing impacts are hard on the knees.','Focus on the speed and power of your jump, not just box height.']},
    'Glute bridges':{how:['Lie on your back, knees bent, feet flat and hip-width apart.','Drive hips up by squeezing glutes until your body forms a straight line from knees to shoulders.','Hold briefly at the top, then lower under control.'],cues:['Squeeze glutes hard — don\'t just thrust hips up with your lower back.','Feet close enough that your shins are roughly vertical at the top.','Progress to single-leg or weighted (barbell across hips) variations.']},
    'Single leg deadlift':{how:['Stand on one leg with a soft knee, holding a weight in the opposite hand.','Hinge at the hip, lowering the weight toward the floor while extending the free leg behind you.','Return to upright by driving through the standing heel and squeezing the glute.'],cues:['The free leg and torso move together as one unit — maintain a straight spine.','Minimize hip rotation — the free hip should stay level with the standing hip.','Excellent for hamstring strength, glute activation, and single-leg stability.']},
    /* ── Weighted / Gym ── */
    'Bench press':{how:['Lie on a bench with eyes under the bar, grip slightly wider than shoulder-width.','Unrack and lower the bar to your lower chest/sternum under control.','Press back to lockout, keeping the bar path over your lower chest.'],cues:['Retract and depress shoulder blades — slight arch, blades pressed into the bench.','Bar touches the lower chest/sternum, not the upper chest.','Drive feet into the floor for leg drive and full-body tension.']},
    'Back squat':{how:['Bar across your upper traps (high bar) or rear delts (low bar), step back to your stance.','Descend by pushing hips back and down, chest up, knees tracking over toes.','Drive through your heels from the bottom to return to full extension.'],cues:['Brace your core hard before every single rep — treat it like taking a punch.','Bar stays directly over mid-foot throughout the entire lift.','Reach at least parallel depth: hip crease below the top of the kneecap.']},
    'Deadlift':{how:['Stand with mid-foot under the bar, hip-width stance, grip just outside your legs.','Set a neutral spine (chest up, hips above knees), pull the slack out of the bar, then push the floor away.','Extend legs and then hips to full lockout. Reverse the movement to lower.'],cues:['Bar stays in contact with your legs the whole way — it should scrape your shins.','Think "push the floor away" with your legs rather than "pull the bar up."','Hinge at the hip on the descent; don\'t let the bar drift away from your body.']},
    'Overhead press':{how:['Hold the bar at shoulder height, grip slightly wider than shoulder-width.','Press the bar straight up, moving your head back briefly to let it pass, then forward.','Lock out fully overhead with arms vertical and the bar stacked over your base.'],cues:['Brace core and squeeze glutes hard — you press from a completely rigid base.','The bar path curves slightly back as it passes the head, then vertical overall.','Fully shrug at lockout: push the bar toward the ceiling to finish the movement.']},
    'Barbell row':{how:['Hinge forward to roughly 45°, barbell hanging at arm\'s length, overhand grip.','Pull the bar toward your lower chest/upper abdomen, leading with the elbows.','Lower under control to full extension, maintaining the hip hinge angle.'],cues:['Keep your back flat and your hinge angle consistent throughout the set.','Pull to the lower chest — not the navel (too low) or upper chest (too high).','Squeeze shoulder blades together at the top of each rep.']},
    'Lat pulldown':{how:['Grip the bar wider than shoulder-width, thighs secured under the pad.','Pull the bar to your upper chest, elbows driving down and back, slight backward lean.','Return to full arm extension under control, getting a full lat stretch at the top.'],cues:['"Elbows to hips" to engage the lats — don\'t just think about pulling the bar down.','Full stretch at the top is critical — don\'t cheat the range of motion.','Keep the lean under 20–30°; excessive backward lean turns it into a row.']},
    'Leg press':{how:['Sit in the machine, feet shoulder-width on the platform.','Release the safety and lower the sled by bending knees toward your chest.','Press back to near-full extension (avoid aggressive lockout) and repeat.'],cues:['Foot position changes the emphasis: high = glute/hamstring, low = quad.','Don\'t let your lower back peel off the seat as you lower — only go as deep as control allows.','Avoid fully locking out the knees under heavy loads.']},
    'Romanian deadlift':{how:['Stand with the bar at arm\'s length in front of you, hip-width stance.','Hinge by pushing your hips back, lowering the bar along your legs with a flat back.','Once you feel a hamstring stretch (typically mid-shin), drive hips forward to stand.'],cues:['Hinge, don\'t squat — knees remain slightly bent but largely stationary.','Bar slides close to your legs throughout the entire descent.','The hamstring stretch at the bottom is the point — don\'t cut the range short.']},
    'Incline bench press':{how:['Set bench to 30–45°, lie back with eyes under the bar, grip slightly wider than shoulder-width.','Lower the bar to your upper chest (below the collarbone).','Press back to lockout, keeping the bar over your upper chest.'],cues:['Targets the clavicular (upper) head of the pec more than flat bench.','Same scapular setup as flat bench — retract and depress shoulder blades.','Don\'t exceed 45° incline — above that it effectively becomes a shoulder press.']},
    'Decline bench press':{how:['Set bench to -15° to -30°, secure legs, grip slightly wider than shoulder-width.','Lower the bar to your lower chest or upper abdomen.','Press back to lockout.'],cues:['Emphasizes the lower (sternal) portion of the pec major.','Lower chest contact distinguishes it clearly from flat and incline press.','Blood rushes to the head — don\'t hold your breath; breathe steadily.']},
    'Dumbbell bench press':{how:['Sit on a bench with dumbbells on your knees, then lie back and kick them to chest height.','Lower them to the sides of your chest with elbows at roughly 45°.','Press back up until arms are extended, letting the dumbbells nearly touch at the top.'],cues:['Greater range of motion than the barbell — exploit the deeper stretch at the bottom.','Allows each arm to work independently, which helps correct strength imbalances.','Control the lowering: don\'t let the dumbbells drop.']},
    'Dumbbell row':{how:['Place one hand and the same-side knee on a bench for support, hold a dumbbell in the other hand.','Pull the dumbbell up along your side until your elbow passes your torso.','Lower to full arm extension.'],cues:['Keep your back flat and parallel to the bench throughout.','Drive the elbow back — "elbow to hip," not "hand to armpit."','Full extension at the bottom: complete lat stretch on every rep.']},
    'Push press':{how:['Hold a barbell at shoulder height, feet shoulder-width.','Dip the knees in a fast, shallow bend, then explosively drive the bar overhead with leg power.','Lock out arms fully overhead, then lower under control to the shoulders.'],cues:['Dip is shallow and fast — a knee bend, not a squat.','Leg drive allows you to handle heavier loads than a strict press.','Stabilize and control the bar before lowering it back to your shoulders.']},
    'Front squat':{how:['Hold the bar in a front rack (resting on front delts, elbows high) or crossed-arm position.','Squat down keeping your torso very upright, knees tracking over toes.','Drive back to full extension through your heels.'],cues:['Elbows must stay high throughout — if they drop, the bar rolls forward off the rack.','More upright torso than a back squat — greater quad and upper back demand.','Wrist and ankle mobility are prerequisites — address these before loading heavily.']},
    'Goblet squat':{how:['Hold a dumbbell or kettlebell vertically at your chest with both hands.','Squat down with an upright torso, elbows tracking inside your knees.','Drive back to full extension through your heels.'],cues:['The weight counterbalances your body and naturally promotes an upright torso.','Pause at the bottom to improve depth and reinforce the squat pattern.','An excellent teaching tool and warm-up for the back squat.']},
    'Bulgarian split squat':{how:['Face away from a bench, rest the top of one foot on it.','Squat down on the front leg until the rear knee nears the floor.','Drive through the front heel to return to standing.'],cues:['Front foot further from bench = more glute; closer = more quad emphasis.','Keep torso upright; resist the urge to lean forward at the bottom.','Highly effective for both muscle development and athletic performance.']},
    'Hip thrust':{how:['Sit with your upper back against a bench, feet flat hip-width, barbell across your hips.','Drive hips up by squeezing your glutes until your body is parallel to the floor.','Lower under control and repeat.'],cues:['Squeeze glutes at the top — don\'t hyperextend the lower back to reach height.','Tuck your chin: don\'t crane your neck upward as your hips rise.','Use a barbell pad to protect your hip bones under heavy loads.']},
    'Cable row':{how:['Sit at the cable row station, feet on the platform, torso upright, slight knee bend.','Pull the handle to your lower abdomen, driving elbows back past your torso.','Return to full arm extension under control, allowing a slight forward lean for a lat stretch.'],cues:['Torso stays upright and stationary — avoid rocking forward and backward.','Squeeze shoulder blades together and hold briefly at peak contraction.','Let the weight fully stretch the lats at the end of each rep.']},
    'Chest-supported row':{how:['Lie face-down on an incline bench (~30–45°), dumbbells hanging at arm\'s length.','Pull the dumbbells up, driving elbows past your torso, squeezing shoulder blades.','Lower under control to a full hang.'],cues:['Chest support eliminates lower back fatigue and all body english — pure pulling.','Drive elbows straight back and up, not outward to the sides.','Excellent for accumulating high-volume back work with strict technique.']},
    'T-bar row':{how:['Stand over a T-bar or landmine setup, hinge forward, and grip the handles.','Pull the weight toward your lower chest, driving elbows back.','Lower under control to full arm extension.'],cues:['Maintain a flat back at your hinged angle throughout the set.','Neutral or close grip engages more lat; wide grip targets more rear delt.','Never round the lower back under heavy loads — position over weight, always.']},
    "Farmer's carry":{how:['Pick up heavy dumbbells or implements in each hand, standing tall.','Walk a set distance or for a set time, keeping shoulders packed back and down.','Maintain an upright torso and even strides throughout.'],cues:['Think tall posture: no leaning, no swaying. Walk with purpose.','Shoulders stay packed down, not shrugged up into your ears under load.','Grip, core, and traps are the primary muscles — a true full-body strength exercise.']},
    'Sumo deadlift':{how:['Take a wide stance with toes pointing 30–45° outward; grip the bar inside your legs.','Set a neutral spine with upright torso, then push the floor apart as you stand.','Drive hips through at lockout, then hinge back down to return the bar.'],cues:['Push your knees out hard along the line of your toes throughout the lift.','Torso stays more upright than a conventional deadlift — intended by the setup.','Hip and groin mobility are requirements — warm up thoroughly before heavy sets.']},
    'Hack squat':{how:['Position shoulders under the pads of the hack squat machine, feet on the platform.','Release the safety handles and lower under control until hips are at or below parallel.','Drive the platform away with your legs to return to the top.'],cues:['Lower back stays pressed against the pad throughout the movement.','Foot position (high/low, wide/narrow) changes the muscle emphasis.','Avoid aggressive knee lockout under heavy loads at the top.']},
    'Pendlay row':{how:['Hinge to a horizontal torso (parallel to the floor), barbell on the floor in front.','Explosively pull the bar from the floor to your lower chest in one powerful movement.','Lower the bar all the way back to the floor between every rep — complete dead stop.'],cues:['The dead stop eliminates momentum — every rep is from a standstill.','Horizontal torso (not 45°) distinguishes Pendlay rows from conventional barbell rows.','Emphasizes upper back explosiveness more than any other row variation.']},
    'Seal row':{how:['Lie face-down on an elevated bench, bar on plates or blocks beneath you.','Pull the bar to your lower chest, squeezing shoulder blades fully.','Lower to a complete dead hang.'],cues:['The strictest barbell row: zero lower back involvement, zero body english.','Full range on every rep: complete dead hang at the bottom, full contraction at the top.','Reveals and helps correct pulling strength imbalances between sides.']},
    'Bicep curls':{how:['Stand with dumbbells or a barbell at arm\'s length, palms facing forward.','Curl the weight up by flexing your elbows, keeping upper arms stationary.','Lower under control to full extension.'],cues:['Keep elbows pinned at your sides — don\'t let them drift forward as a cheat.','Squeeze the bicep at the top of the curl for a full contraction.','Full extension at the bottom ensures complete range of motion.']},
    'Tricep pushdowns':{how:['Stand at a cable machine, bar or rope at head height, grip overhand.','Press down by extending elbows until arms are fully straight.','Return under control, keeping upper arms pinned to your sides.'],cues:['Upper arms stay stationary — only the forearms move.','Squeeze the triceps hard at full extension.','Rope attachment allows wrists to rotate outward at the bottom for a stronger contraction.']},
    'Lateral raises':{how:['Stand with dumbbells at your sides, a slight bend in your elbows.','Raise arms out to the sides until hands reach shoulder height, leading with elbows.','Lower under control — resist gravity on the way down.'],cues:['Lead with elbows, not wrists — think "pour a glass of water" at the top.','Avoid shrugging — keep shoulders away from your ears throughout.','Use light to moderate weight; medial delt is a small muscle.']},
    'Front raises':{how:['Stand with dumbbells at your thighs, palms facing your body.','Raise one or both arms forward to shoulder height.','Lower under control back to the starting position.'],cues:['Don\'t lean back as you raise — keep your torso stable and upright.','Stop at shoulder height — going higher doesn\'t increase benefit.','Alternating arms reduces momentum; cables provide constant tension.']},
    'Rear delt fly':{how:['Hinge forward ~45°, hold dumbbells hanging below with a neutral grip.','Raise arms out to the sides, leading with elbows, until they reach shoulder height.','Lower under control back to the start.'],cues:['"Elbows wide and back" — avoid bicep-curling the weight upward.','Keep the weight light — rear delts are small and form breaks easily.','Maintain a flat back in the hinge throughout; don\'t round as you fatigue.']},
    'Face pulls':{how:['Set a cable at upper chest/face height with a rope attachment.','Pull the rope toward your face, separating the ends so your hands finish beside your ears.','Return under control to full arm extension.'],cues:['Pull to your face — not your neck or chest.','Elbows flare high (above shoulder level) at the peak of the pull.','One of the best exercises for shoulder health and external rotation strength.']},
    'Skull crushers':{how:['Lie on a bench, hold an EZ bar or dumbbells with arms extended straight up.','Lower the weight by bending elbows, bringing it to or slightly behind your forehead.','Extend back to straight arms by contracting the triceps.'],cues:['Upper arms must stay pointing straight up — no elbow flare or drift.','Lowering slightly behind the head (not to the forehead) gives a better tricep stretch.','Control the weight meticulously — momentum here is genuinely dangerous.']},
    'Hammer curls':{how:['Hold dumbbells with a neutral (hammer) grip, thumbs facing up.','Curl the dumbbells up maintaining the neutral grip throughout.','Lower under control to full extension.'],cues:['Neutral grip targets the brachialis and brachioradialis alongside the bicep.','Keep upper arms stationary at your sides.','Can be done alternating or simultaneously; alternating provides better control.']},
    'Preacher curls':{how:['Sit at a preacher curl bench with upper arms resting on the angled pad.','Curl from full extension all the way up to peak contraction.','Lower under complete control — the stretch at the bottom is where the gains are.'],cues:['The pad locks your upper arm in place — strict bicep isolation only.','Don\'t let the weight drop quickly; actively resist on the way down.','Full extension at the bottom is non-negotiable — cutting it short dramatically reduces effectiveness.']},
    'Leg extensions':{how:['Sit in the machine with the pad resting just above your ankles.','Extend legs to fully straight by contracting your quadriceps.','Lower under control to the starting position.'],cues:['Full extension with a brief peak contraction at the top.','Control the eccentric (lowering) phase to maximize quad stimulus.','Open-chain knee extension — be cautious with heavy loads if you have knee issues.']},
    'Leg curls':{how:['Lie face-down in the machine (or sit in a seated variation), pad just above your heels.','Curl your heels toward your glutes by contracting your hamstrings.','Lower under control to full extension.'],cues:['Hips stay pressed into the pad — don\'t lift the hips to extend range of motion.','Plantarflexing (pointing toes) increases hamstring activation.','Lower slowly — the eccentric phase is where most of the hamstring stimulus comes from.']},
    'Calf raises (machine)':{how:['Position yourself in the machine with the pad on your shoulders (standing) or thighs (seated).','Rise onto your toes as high as possible.','Lower all the way to a deep stretch and repeat.'],cues:['Maximum range of motion: deep stretch at the bottom, peak contraction at the top.','Pause briefly at both ends of the range for better time under tension.','Calves respond well to higher rep ranges — 15–25 reps per set is appropriate.']},
    'Cable lateral raise':{how:['Stand next to a low cable, grip the handle with the arm furthest from the machine.','Raise your arm out to the side (across your body) to shoulder height.','Lower under control against constant cable tension.'],cues:['Cable provides constant tension unlike dumbbells — superior isolation throughout.','Cross the cable slightly in front of your body for a longer range of motion.','Keep the movement clean; resist the pull actively on the way back down.']},
    'Cable bicep curl':{how:['Stand at a low cable with a straight bar or EZ attachment, palms up.','Curl the weight up with elbows stationary at your sides.','Lower under control against constant cable tension.'],cues:['Cable maintains resistance at full extension — superior stimulus compared to dumbbells.','Elbows pinned to your sides throughout the entire movement.','Squeeze the bicep hard at full flexion before lowering.']},
    'Tricep kickbacks':{how:['Hinge forward ~45°, upper arm parallel to the floor, dumbbell in hand.','Extend your forearm back by straightening the elbow until fully extended.','Lower the forearm back to 90° and repeat.'],cues:['Upper arm stays parallel to the floor and stationary throughout — only the forearm moves.','Full extension = peak contraction. Squeeze hard at the top.','Use light weight — the leverage makes even a small dumbbell feel heavy.']},
    'Dumbbell chest fly':{how:['Lie on a bench with dumbbells above your chest, a slight bend in your elbows.','Lower arms in a wide arc to the sides until you feel a deep chest stretch.','Bring the dumbbells back together above your chest by squeezing the pecs.'],cues:['This is an isolation movement — keep the elbow angle constant. Do not press.','Think "hugging a barrel": wide arc, not a straight push.','The stretch at the bottom is the key stimulus — don\'t sacrifice depth for more weight.']},
    'Pec deck':{how:['Sit in the pec deck with forearms resting on the pads, elbows at shoulder height.','Bring the pads together in front by squeezing the chest.','Return under control to the fully stretched position.'],cues:['Full stretch at the end of each rep is critical — don\'t limit range to use more weight.','Squeeze the chest hard at peak contraction.','Keep your back pressed against the pad throughout — no leaning forward.']},
    'Cable fly':{how:['Set cables at the appropriate height, grip the handles with a slight elbow bend.','Bring your hands together in a wide arc in front of you.','Return under control to the starting position to fully stretch the chest.'],cues:['Cables maintain constant tension throughout — superior to dumbbells for pec isolation.','Resist the weight actively on the return — don\'t let the cables snap back.','Adjust cable height to target different parts of the chest (high = lower pec, low = upper pec).']},
    'Concentration curls':{how:['Sit on a bench, lean forward, and rest the back of one upper arm against your inner thigh.','Curl the dumbbell up to shoulder height with a peak contraction.','Lower slowly to complete extension.'],cues:['The thigh support locks the arm in place — strict bicep isolation.','Supinate the wrist (rotate palm toward your shoulder) as you curl for a stronger contraction.','Complete range: full stretch at the bottom, hard squeeze at the top.']},
    'Overhead tricep extension':{how:['Hold a dumbbell or EZ bar overhead with both hands, elbows pointing forward.','Lower the weight behind your head by bending elbows until you feel a full tricep stretch.','Extend back to full lockout overhead.'],cues:['Elbows stay pointed forward and up throughout — don\'t let them flare outward.','The long head of the tricep is maximally stretched in this overhead position.','Brace your core and avoid excessive lower back arch under the load.']},
    'Reverse fly':{how:['Hinge forward ~45°, hold dumbbells with palms facing each other.','Raise arms out to the sides with a slight elbow bend until they reach shoulder height.','Lower under control back to the start.'],cues:['Targets rear delts and rhomboids — essential for shoulder health and posture.','Keep the movement deliberate and controlled — don\'t use momentum.','Squeeze shoulder blades together at the top of each rep.']},
    'Upright row':{how:['Hold a barbell or dumbbells at hip level with an overhand grip.','Pull straight up along your body until the bar reaches chin height, elbows leading.','Lower under control back to the starting position.'],cues:['Elbows should rise higher than the bar — elbows lead, not the bar.','Keep the bar close to your body as it travels upward.','Wide grip reduces shoulder impingement risk; avoid narrow grip under heavy loads.']},
    'Shrugs':{how:['Hold heavy dumbbells or a barbell at arm\'s length, shoulders relaxed and depressed.','Elevate your shoulders straight up toward your ears as high as possible.','Hold briefly at peak elevation, then lower back to full depression.'],cues:['Movement is strictly up and down — no rolling or circular shoulder motion.','Full range: maximum depression at the bottom, maximum elevation at the top.','Use straps here — grip shouldn\'t be the limiting factor for trap development.']},
    'Good mornings':{how:['Place a barbell across your upper traps, feet shoulder-width, slight knee bend.','Hinge at the hips by pushing them back, lowering your torso until near-horizontal.','Drive hips forward to return to upright, maintaining a flat back throughout.'],cues:['Neutral spine is non-negotiable — rounding the lower back under load is genuinely dangerous.','Range of motion is limited by your hamstring flexibility — never force depth.','Start with very light weight; this movement is highly technical.']},
    'Cable crunch':{how:['Kneel in front of a cable with a rope at head height, hold the rope at your temples.','Crunch your rib cage down toward your hips, rounding your spine against the resistance.','Return under control to an upright position.'],cues:['Focus on curling the rib cage DOWN — spinal flexion, not a hip hinge.','Pelvis stays fixed — don\'t generate power by pulling with your hips.','Cables let you progressively overload the abs — a major advantage over bodyweight crunches.']},
  };

  // === XP & LEVEL SYSTEM ===
  /* Data layer only — see addXP / getLevelInfo / checkWeeklyBonuses below.
     localStorage key "xpData" is picked up automatically by the export/import
     in settings.js (DATA MANAGEMENT reads every key), so no change is needed there. */

  const XP_LEVEL_CAP = 50;

  /* Single source of truth for every XP amount (also read by the XP detail screen). */
  const XP_RULES = { workout: 20, journeySession: 35, pr: 15, weeklyGoal: 50, streakPerWeek: 5, streakCap: 50 };
  const _XP_SOURCES = ['workout', 'journey_session', 'pr', 'weekly_goal', 'streak'];

  /* Cumulative total XP required to REACH each level (index = level, 1..50).
     Level 1 = 0 XP, Level 2 = 100 XP. Each step costs 13% more than the previous,
     rounded to the nearest 10. */
  const _XP_THRESHOLDS = (function () {
    const thr = [0, 0];               /* thr[1] = 0 XP needed to be level 1 */
    for (let lvl = 2; lvl <= XP_LEVEL_CAP; lvl++) {
      const inc = Math.round((100 * Math.pow(1.13, lvl - 2)) / 10) * 10;
      thr[lvl] = thr[lvl - 1] + inc;
    }
    return thr;
  })();

  /* Running XP total per source. If missing, rebuild from the (capped) xpLog. */
  function _xpSourcesFrom(d) {
    const out = {};
    _XP_SOURCES.forEach(k => { out[k] = 0; });
    if (d && d.xpBySource && typeof d.xpBySource === 'object') {
      _XP_SOURCES.forEach(k => { out[k] = Number(d.xpBySource[k]) || 0; });
    } else if (d && Array.isArray(d.xpLog)) {
      d.xpLog.forEach(e => { if (e && e.reason in out) out[e.reason] += Number(e.amount) || 0; });
    }
    return out;
  }

  /* Cumulative total XP required to reach `level` (uses the same curve as above). */
  function getXPForLevel(level) {
    return _XP_THRESHOLDS[Math.max(1, Math.min(XP_LEVEL_CAP, level))];
  }

  function _xpNormalize(d) {
    return {
      totalXP:            (d && d.totalXP)                  || 0,
      lastStreakWeek:     (d && d.lastStreakWeek)           ?? null,
      streakWeeks:        (d && d.streakWeeks)              || 0,
      xpLog:              (d && Array.isArray(d.xpLog)) ? d.xpLog : [],
      lastWeeklyGoalWeek: (d && d.lastWeeklyGoalWeek)       ?? null,
      xpBySource:         _xpSourcesFrom(d),
    };
  }

  function getXPData() { return _xpNormalize(xpData); }

  function _saveXPData(d) {
    xpData = d;
    localStorage.setItem('xpData', JSON.stringify(d));
  }

  function _levelForXP(xp) {
    let level = 1;
    for (let l = 2; l <= XP_LEVEL_CAP; l++) {
      if (xp >= _XP_THRESHOLDS[l]) level = l; else break;
    }
    return level;
  }

  function _xpLevelLabel(level) {
    if (level >= 50) return 'Legend';
    if (level >= 31) return 'Elite';
    if (level >= 16) return 'Advanced';
    if (level >= 6)  return 'Intermediate';
    return 'Beginner';
  }

  /* The single entry point for every XP award. Returns true if a level-up occurred. */
  function addXP(amount, reason) {
    amount = Math.round(Number(amount) || 0);
    if (amount <= 0) return false;
    const d = _xpNormalize(xpData);
    const before = _levelForXP(d.totalXP);
    d.totalXP += amount;
    if (d.xpBySource && (reason in d.xpBySource)) d.xpBySource[reason] += amount;
    d.xpLog.push({ date: new Date().toISOString(), amount, reason: reason || 'misc' });
    if (d.xpLog.length > 200) d.xpLog = d.xpLog.slice(d.xpLog.length - 200);  /* keep newest 200 */
    _saveXPData(d);
    return _levelForXP(d.totalXP) > before;
  }

  function getLevelInfo() {
    const xp    = _xpNormalize(xpData).totalXP;
    const level = _levelForXP(xp);
    const label = _xpLevelLabel(level);
    if (level >= XP_LEVEL_CAP) {
      return { level: XP_LEVEL_CAP, label, currentLevelXP: xp - _XP_THRESHOLDS[XP_LEVEL_CAP], xpForNextLevel: 0, totalXP: xp, isMaxLevel: true };
    }
    const base = _XP_THRESHOLDS[level];
    const next = _XP_THRESHOLDS[level + 1];
    return { level, label, currentLevelXP: xp - base, xpForNextLevel: next - base, totalXP: xp, isMaxLevel: false };
  }

  /* Week key = the local Monday (YYYY-MM-DD) of the week containing `date`. */
  function _xpWeekKey(date) {
    const d = date ? new Date(date) : new Date();
    if (isNaN(d.getTime())) return null;
    const day = d.getDay();
    const daysBack = day === 0 ? 6 : day - 1;
    const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - daysBack);
    const m  = String(monday.getMonth() + 1).padStart(2, '0');
    const dd = String(monday.getDate()).padStart(2, '0');
    return `${monday.getFullYear()}-${m}-${dd}`;
  }

  /* Consecutive weeks (ending this week) that each have at least one workout. */
  function _xpConsecutiveWeeks() {
    const weeksWith = new Set();
    (typeof workouts !== 'undefined' ? workouts : []).forEach(w => {
      const k = w && w.date ? _xpWeekKey(w.date) : null;
      if (k) weeksWith.add(k);
    });
    let streak = 0;
    const cursor = new Date();
    while (weeksWith.has(_xpWeekKey(cursor))) {
      streak++;
      cursor.setDate(cursor.getDate() - 7);
    }
    return streak;
  }

  /* Award the weekly frequency-goal bonus (+50) and the streak bonus
     (+5 per streak week, capped +50), each at most once per calendar week.
     Safe to call on load and after every workout finish. */
  function checkWeeklyBonuses() {
    const thisWeek = _xpWeekKey(new Date());
    let awarded = false;

    /* Weekly frequency goal reached → +50, once per week */
    let goal = null;
    try { goal = JSON.parse(localStorage.getItem('freqGoal') || 'null'); } catch (e) {}
    if (goal && goal.period === 'week' && goal.target > 0 && _xpNormalize(xpData).lastWeeklyGoalWeek !== thisWeek) {
      const done = (typeof workouts !== 'undefined' ? workouts : [])
        .filter(w => w && w.date && _xpWeekKey(w.date) === thisWeek).length;
      if (done >= goal.target) {
        const d = _xpNormalize(xpData);
        d.lastWeeklyGoalWeek = thisWeek;
        _saveXPData(d);                 /* mark first so addXP preserves it */
        addXP(XP_RULES.weeklyGoal, 'weekly_goal');
        awarded = true;
      }
    }

    /* Keep streakWeeks current, then award the streak bonus once per week */
    const streak = _xpConsecutiveWeeks();
    if (_xpNormalize(xpData).streakWeeks !== streak) {
      const d = _xpNormalize(xpData);
      d.streakWeeks = streak;
      _saveXPData(d);
    }
    if (streak > 0 && _xpNormalize(xpData).lastStreakWeek !== thisWeek) {
      const d = _xpNormalize(xpData);
      d.lastStreakWeek = thisWeek;
      _saveXPData(d);                   /* mark first so addXP preserves it */
      addXP(Math.min(XP_RULES.streakPerWeek * streak, XP_RULES.streakCap), 'streak');
      awarded = true;
    }
    return awarded;
  }

  /* Display-only streak state: a stored streak is stale if lastStreakWeek is older than last calendar week. */
  function getStreakStatus() {
    const xd = _xpNormalize(xpData);
    const prev = new Date(); prev.setDate(prev.getDate() - 7);
    const active = xd.streakWeeks > 0 && !!xd.lastStreakWeek && xd.lastStreakWeek >= _xpWeekKey(prev);
    return { active, weeks: active ? xd.streakWeeks : 0, trainedThisWeek: active && xd.lastStreakWeek === _xpWeekKey(new Date()) };
  }

  // === XP BREAKDOWN ===
  /* Renders the "XP Earned" breakdown on the post-workout summary, below the
     stats, listing exactly the awards earned in this workout. `entries` is the
     slice of xpLog added during this completion flow. */
  function _renderXPBreakdown(entries) {
    const host = document.getElementById('pw-stats');
    if (!host || !host.parentNode) return;

    let box = document.getElementById('pw-xp-breakdown');
    if (!box) {
      box = document.createElement('div');
      box.id = 'pw-xp-breakdown';
      box.style.cssText = 'width:100%;margin-top:10px;';
      host.parentNode.insertBefore(box, host.nextSibling);   /* directly below the stats */
    }

    if (!entries || !entries.length) { box.innerHTML = ''; return; }

    let workoutXP = 0, prCount = 0, prXP = 0, weeklyXP = 0, streakXP = 0, otherXP = 0;
    const journeyRows = [];
    entries.forEach(e => {
      if      (e.reason === 'workout')      workoutXP += e.amount;
      else if (e.reason === 'journey_session') journeyRows.push(['Journey session completed', e.amount]);
      else if (e.reason === 'pr')         { prCount++; prXP += e.amount; }
      else if (e.reason === 'weekly_goal')  weeklyXP += e.amount;
      else if (e.reason === 'streak')       streakXP += e.amount;
      else                                  otherXP += e.amount || 0;
    });
    const total = entries.reduce((s, e) => s + (e.amount || 0), 0);

    const rows = [];
    if (workoutXP)      rows.push(['Workout completed', workoutXP]);
    journeyRows.forEach(r => rows.push(r));
    if (prCount === 1)  rows.push(['Personal record', prXP]);
    else if (prCount > 1) rows.push([prCount + ' Personal records', prXP]);
    if (weeklyXP)       rows.push(['Weekly goal reached', weeklyXP]);
    if (streakXP)       rows.push([(getXPData().streakWeeks || 0) + ' week streak', streakXP]);
    if (otherXP)        rows.push(['Other XP', otherXP]);

    const line = (label, amt, bold) =>
      `<div style="display:flex;align-items:center;justify-content:space-between;padding:${bold ? '12px 0 0' : '6px 0'};${bold ? 'border-top:1px solid rgba(255,255,255,.08);margin-top:6px;' : ''}">
         <span style="font-size:.875rem;color:${bold ? '#fff' : '#8E8E93'};font-weight:${bold ? '700' : '500'}">${label}</span>
         <span style="font-size:${bold ? '1rem' : '.9375rem'};font-weight:${bold ? '800' : '700'};color:#BF5AF2;letter-spacing:-.2px">+${amt} XP</span>
       </div>`;

    box.innerHTML =
      `<div style="background:#1C1C1E;border-radius:12px;padding:16px 20px;">
         <div style="font-size:.875rem;color:#8E8E93;text-transform:uppercase;letter-spacing:.5px;font-weight:600;margin-bottom:8px">XP Earned</div>
         ${rows.map(r => line(r[0], r[1], false)).join('')}
         ${line('Total', total, true)}
       </div>`;
  }

  // === LEVEL UP CELEBRATION ===
  /* Snapshot of the level at the start of a workout-completion flow. Set when
     _doFinishWorkout begins (before any XP is awarded) and consumed when the
     post-workout summary is about to show. */
  let _xpLevelBeforeFinish = null;
  /* Last xpLog entry before this workout's awards — used to slice out exactly
     this workout's awards for the summary breakdown (robust to the 200-cap). */
  let _xpLastEntryBeforeFinish = null;

  function _showLevelUpCelebration(info, onContinue) {
    const done = () => { if (typeof onContinue === 'function') onContinue(); };
    const existing = document.getElementById('levelup-overlay');
    if (existing) existing.remove();

    const pct = info.isMaxLevel ? 100
      : (info.xpForNextLevel > 0 ? Math.min(100, Math.round(info.currentLevelXP / info.xpForNextLevel * 100)) : 0);

    const ov = document.createElement('div');
    ov.id = 'levelup-overlay';
    ov.style.cssText =
      'position:fixed;inset:0;z-index:100050;background:#000;display:flex;flex-direction:column;' +
      'align-items:center;justify-content:center;text-align:center;padding:2rem;opacity:0;transition:opacity .25s ease;';
    ov.innerHTML =
      `<div style="font-size:5rem;line-height:1;margin-bottom:1.25rem">🎉</div>
       <div style="font-size:2rem;font-weight:800;color:#fff;letter-spacing:-.5px;margin-bottom:.5rem">Level Up!</div>
       <div style="font-size:1.0625rem;color:#8E8E93;margin-bottom:2rem">You're now Level ${info.level} — ${info.label}</div>
       <div style="width:min(300px,80%);height:8px;background:rgba(255,255,255,.12);border-radius:99px;overflow:hidden;margin-bottom:2.5rem">
         <div id="levelup-bar" style="height:100%;width:0;border-radius:99px;background:#BF5AF2;transition:width 1s cubic-bezier(.4,0,.2,1)"></div>
       </div>
       <button id="levelup-continue" style="background:#BF5AF2;color:#fff;border:none;border-radius:14px;padding:14px 48px;font-size:1.0625rem;font-weight:700;font-family:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent">Continue</button>`;
    document.body.appendChild(ov);

    requestAnimationFrame(() => {
      ov.style.opacity = '1';
      const bar = document.getElementById('levelup-bar');
      if (bar) requestAnimationFrame(() => { bar.style.width = pct + '%'; });  /* animate fill ~1s */
    });

    document.getElementById('levelup-continue').onclick = () => {
      ov.style.opacity = '0';
      setTimeout(() => { ov.remove(); done(); }, 200);
    };
  }

  /* Patch the workout-completion flow so a level-up earned this workout shows
     the celebration once (for the highest level reached) before the summary. */
  (function _initLevelUpCelebration() {
    function wire() {
      if (typeof _doFinishWorkout === 'function' && !_doFinishWorkout._xpWrapped) {
        const _origFinish = _doFinishWorkout;
        _doFinishWorkout = function () {
          _xpLevelBeforeFinish = getLevelInfo().level;   /* before any XP is awarded */
          const lg = getXPData().xpLog;
          _xpLastEntryBeforeFinish = lg.length ? lg[lg.length - 1] : null;
          return _origFinish.apply(this, arguments);
        };
        _doFinishWorkout._xpWrapped = true;
      }
      if (typeof _showPostWorkout === 'function' && !_showPostWorkout._xpWrapped) {
        const _origSPW = _showPostWorkout;
        _showPostWorkout = function (w) {
          const after  = getLevelInfo();
          const before = _xpLevelBeforeFinish;
          _xpLevelBeforeFinish = null;
          /* slice out exactly this workout's awards */
          const log = getXPData().xpLog;
          const idx = _xpLastEntryBeforeFinish ? log.indexOf(_xpLastEntryBeforeFinish) : -1;
          const awards = log.slice(idx + 1);
          _xpLastEntryBeforeFinish = null;
          const self = this;
          const proceed = () => { _origSPW.call(self, w); try { _renderXPBreakdown(awards); } catch (e) {} };
          if (before != null && after.level > before) {
            _showLevelUpCelebration(after, proceed);  /* breakdown shows after dismissing the overlay */
            return;
          }
          proceed();
        };
        _showPostWorkout._xpWrapped = true;
      }
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
    else wire();
  })();
