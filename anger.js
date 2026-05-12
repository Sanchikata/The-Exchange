console.log('anger loaded');

window.angerData = {};

const gameStartTime = Date.now();
let totalResets = 0;

// ── Quit button ───────────────────────────────────────────────────────────────

const calibrateBtn = document.getElementById('calibrateBtn');

calibrateBtn.addEventListener('click', () => {
  if (mazeComplete) {
    showCalibration();
    return;
  }

  if (obstacle1Active) closeObstacle1(false);
  if (obstacle2Active) closeObstacle2(false);
  if (obstacle3Active) closeObstacle3(false);

  window.angerData.quitAfterReset = false;
  frustrationPoints = getFrustrationPoints();
  const total = frustrationPoints;
  updateDebugDisplay(frustrationPoints, null, total);
  saveAngerSession(frustrationPoints, null, total);

  var played = JSON.parse(localStorage.getItem('exchange_played_games') || '[]');
  if (played.indexOf('anger') === -1) played.push('anger');
  localStorage.setItem('exchange_played_games', JSON.stringify(played));

  window.location.href = 'games2.html?ret=1';
});

// ── Canvas setup ──────────────────────────────────────────────────────────────

const canvas = document.getElementById('mazeCanvas');
const ctx    = canvas.getContext('2d');

const W   = 528;
const H   = 520;
const DPR = window.devicePixelRatio || 1;

canvas.width        = W * DPR;
canvas.height       = H * DPR;
canvas.style.width  = W + 'px';
canvas.style.height = H + 'px';
ctx.scale(DPR, DPR);

// ── Maze data ─────────────────────────────────────────────────────────────────
//
//  Exact wall layout from Figma "maze layout" frame (node 159:363).
//  Canvas offset applied: Figma (140,140) → canvas (0,0).
//  Entrance gap: top-left (canvas x=16–32, y=0). Exit gap: bottom-right (x=488–520, y=512).
//  All coords use offset (140,140) subtracted from Figma values.

const walls = [
  // ── Border walls ─────────────────────────────────────────────────────────────
  {x:48,  y:0,   w:480, h:8},   // top  (entrance gap x=0–48)
  {x:0,   y:512, w:480, h:8},   // bottom (exit gap x=480–528)
  {x:0,   y:0,   w:8,   h:520}, // left
  {x:520, y:0,   w:8,   h:520}, // right

  // ── Inner blocks — simple Figma-style large rectangles ───────────────────────
  {x:48,  y:8,   w:432, h:132}, // upper block (x=48–480, y=8–140)
  {x:8,   y:200, w:472, h:312}, // lower block (x=8–480, y=200–512)
  // passage between the two blocks: y=140–200 (60 px), full width
  // left corridor:  x=8–48  (40 px), y=0–200  ← entrance, CP1
  // right corridor: x=480–520 (40 px), y=200–520 ← CP2, CP3, exit
];

const CP_HALF = 11;

const checkpoints = [
  { x: 24,  y: 104, n: 1, hit: false, cleared: false }, // left corridor, ~10% into path
  { x: 504, y: 213, n: 2, hit: false, cleared: false }, // right corridor, just entered (~68%)
  { x: 504, y: 459, n: 3, hit: false, cleared: false }, // right corridor, near finish (~95%)
];

const finish = { x: 480, y: 496, w: 40, h: 24 };
let mazeComplete = false;

// ── Frustration scoring ───────────────────────────────────────────────────────

let frustrationPoints = 0;
let scratchBonusPoints = 0;

// Returns base frustration based on how far the player got when they quit.
function getFrustrationPoints() {
  const cp1 = checkpoints.find(cp => cp.n === 1);
  const cp2 = checkpoints.find(cp => cp.n === 2);
  if (mazeComplete)   return 0;    // completed — no frustration
  if (cp2.cleared)    return 100;  // quit after obstacle 2, before finish
  if (cp1.cleared)    return 50;   // quit during obstacle 2 (cp1 done, cp2 not)
  return 0;
}

// Returns a random scratch-card bonus in [50, 500].
function calculateScratchPoints() {
  return Math.floor(Math.random() * 451) + 50;
}

// Updates the top-right debug display.
function updateDebugDisplay(frustration, scratch, total) {
  const el = document.getElementById('anger-debug-pts');
  if (!el) return;
  const scratchStr = scratch != null ? ' | scratch: ' + scratch : '';
  el.textContent = 'frustration: ' + frustration + scratchStr + ' | total: ' + total;
}

// Persists session to Supabase anger_sessions table.
async function saveAngerSession(frustration, scratch, total) {
  localStorage.setItem('exchange_ai', Math.round(Math.max(0, Math.min(100, total))));
  localStorage.setItem('exchange_ai_raw', Math.max(0, total));
  try {
    const db = window.supabaseClient;
    if (!db) return;
    const cp2 = checkpoints.find(cp => cp.n === 2);
    const checkpoint = mazeComplete ? 'completed'
                     : cp2.cleared  ? 'after_2'
                                    : 'during_2';
    await db.from('anger_sessions').insert({
      quit_checkpoint:    checkpoint,
      frustration_points: frustration,
      scratch_card_points: scratch,
      total_anger_points: total,
      anger_index:        total / 280,
    });
  } catch (e) {
    console.warn('anger_sessions insert error:', e && e.message);
  }
}

// ── Player ────────────────────────────────────────────────────────────────────

const PLAYER_R = 6;
const SPEED    = 10;

const player = {
  x: 24,
  y: PLAYER_R,
};

// ── Input (keys kept for movement logic; set by face tracker) ─────────────────

const keys = {
  ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false,
};

// ── Movement gate ─────────────────────────────────────────────────────────────

let movementPaused = false;

// ── Collision ─────────────────────────────────────────────────────────────────

function collidesWithWall(cx, cy) {
  const r = PLAYER_R;
  return walls.some(w => {
    const nearX = Math.max(w.x, Math.min(cx, w.x + w.w));
    const nearY = Math.max(w.y, Math.min(cy, w.y + w.h));
    return Math.hypot(cx - nearX, cy - nearY) < r;
  });
}

function isValidPosition(cx, cy) {
  if (cx - PLAYER_R < 0 || cx + PLAYER_R > W ||
      cy - PLAYER_R < 0 || cy + PLAYER_R > H) return false;
  return !collidesWithWall(cx, cy);
}

// ── Checkpoint barriers ───────────────────────────────────────────────────────
// Invisible wall spanning the full corridor width at each checkpoint.
// Lifted only after the associated obstacle is successfully completed.

function isBlockedByBarrier(x, y) {
  for (const cp of checkpoints) {
    if (cp.cleared) continue;
    // CP1 — entrance passage: block movement past the checkpoint line
    if (cp.n === 1 && y > cp.y + CP_HALF && x >= 8   && x <= 48 ) return true;
    // CP2 — right corridor upper: block movement past the checkpoint line
    if (cp.n === 2 && y > cp.y + CP_HALF && x >= 480 && x <= 520) return true;
    // CP3 — right corridor lower: block movement past the checkpoint line
    if (cp.n === 3 && y > cp.y + CP_HALF && x >= 480 && x <= 520) return true;
  }
  return false;
}

// ── Obstacle 1 — login popup ──────────────────────────────────────────────────

let obstacle1Active  = false;
let obs1Attempts     = 0;      // total Continue button clicks
let obs1CheckingDone = false;  // true after the 2s "checking" delay resolves
let obs1StartTime    = null;

const obs1Overlay    = document.getElementById('obstacle1Overlay');
const obs1Submit     = document.getElementById('obs1Submit');
const obs1ErrSpan    = document.getElementById('obs1UsernameError');
const obs1PwdErrSpan = document.getElementById('obs1PasswordError');

function obs1PasswordValid() {
  const val = document.getElementById('obs1Password').value;
  if (val.length < 6) {
    obs1PwdErrSpan.textContent = val.length === 0 ? '' : 'Minimum 6 characters';
    return false;
  }
  if (!/\d/.test(val)) {
    obs1PwdErrSpan.textContent = 'Must contain at least 1 number';
    return false;
  }
  obs1PwdErrSpan.textContent = '';
  return true;
}

document.getElementById('obs1Password').addEventListener('input', () => {
  const valid  = obs1PasswordValid();
  const inWait = obs1Attempts === 1 && !obs1CheckingDone;
  obs1Submit.disabled = !valid || inWait;
});

function showObstacle1() {
  movementPaused   = true;
  obstacle1Active  = true;
  obs1Attempts     = 0;
  obs1CheckingDone = false;
  obs1StartTime    = Date.now();

  document.getElementById('obs1Username').value = '';
  document.getElementById('obs1Password').value  = '';
  obs1ErrSpan.textContent      = '';
  obs1PwdErrSpan.textContent   = '';
  obs1Submit.disabled          = true;
  obs1Submit.textContent       = 'Continue';

  obs1Overlay.classList.remove('hidden');
  document.getElementById('obs1Username').focus();
}

function closeObstacle1(success) {
  obs1Overlay.classList.add('hidden');
  obstacle1Active = false;

  if (success) {
    const timeSpent = Math.round((Date.now() - obs1StartTime) / 100) / 10;
    window.angerData.obstacle1 = { attemptCount: obs1Attempts, timeSpent };
    checkpoints.find(cp => cp.n === 1).cleared = true;
    movementPaused = false;
    console.log('obstacle 1 cleared');
  } else {
    console.log('obstacle 1 abandoned');
    triggerReset();
  }
}

obs1Submit.addEventListener('click', () => {
  // Second click after the "username taken" turn — proceed
  if (obs1CheckingDone) {
    obs1Attempts++;
    closeObstacle1(true);
    return;
  }

  obs1Attempts++;

  if (obs1Attempts === 1) {
    // First click: show error once, disable button for this turn
    obs1ErrSpan.textContent = 'Username already taken';
    obs1Submit.disabled     = true;

    setTimeout(() => {
      obs1ErrSpan.textContent = '';
      obs1CheckingDone        = true;
      obs1Submit.textContent  = 'Continue';
      obs1Submit.disabled     = !obs1PasswordValid();
    }, 2000);
  }
});

// ── Obstacle 2 — nostalgia captcha ───────────────────────────────────────────

let obstacle2Active    = false;
let obs2Attempts       = 0;
let obs2StartTime      = null;
let obs2EverSubmitted  = false; // persists across maze resets

const obs2Overlay = document.getElementById('obstacle2Overlay');
const obs2Submit  = document.getElementById('obs2Submit');
const obs2ErrSpan = document.getElementById('obs2Error');
const captchaGrid = document.getElementById('captchaGrid');

const NOSTALGIA_POOL = [
  { emoji: '📼', label: 'VHS tape'         },
  { emoji: '💾', label: 'floppy disk'      },
  { emoji: '📟', label: 'pager'            },
  { emoji: '📺', label: 'CRT TV'           },
  { emoji: '🕹️', label: 'joystick'         },
  { emoji: '📻', label: 'walkman'          },
  { emoji: '💿', label: 'CD/DVD'           },
  { emoji: '🖥️', label: 'old PC'           },
  { emoji: '📷', label: 'disposable cam'   },
  { emoji: '🎧', label: 'discman'          },
  { emoji: '🖨️', label: 'dot matrix'       },
  { emoji: '📞', label: 'corded phone'     },
  { emoji: '🎮', label: 'game boy'         },
  { emoji: '🖱️', label: 'ball mouse'       },
  { emoji: '📡', label: 'satellite dish'   },
];

const SEPIA_TONES = [
  '#ede8da', '#e5dfd0', '#dbd4c2', '#e8e2d5',
  '#e0d9c8', '#e9e3d6', '#ddd7c6', '#e6e0d2', '#e2dccb',
];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildCaptchaGrid() {
  captchaGrid.innerHTML = '';
  const items = shuffle(NOSTALGIA_POOL).slice(0, 9);
  const tones = shuffle(SEPIA_TONES);

  items.forEach((item, i) => {
    const cell = document.createElement('div');
    cell.className = 'captcha-cell';

    const tile = document.createElement('div');
    tile.className = 'captcha-img';
    tile.style.background = tones[i];
    tile.textContent = item.emoji;

    const lbl = document.createElement('span');
    lbl.className = 'captcha-label';
    lbl.textContent = item.label;

    cell.appendChild(tile);
    cell.appendChild(lbl);
    cell.addEventListener('click', () => tile.classList.toggle('captcha-selected'));
    captchaGrid.appendChild(cell);
  });
}

function showObstacle2() {
  movementPaused  = true;
  obstacle2Active = true;
  obs2Attempts    = 0;
  obs2StartTime   = Date.now();

  obs2ErrSpan.textContent = '';
  obs2Submit.disabled     = false;
  obs2Submit.textContent  = 'Verify';

  buildCaptchaGrid();
  obs2Overlay.classList.remove('hidden');
}

function closeObstacle2(success) {
  obs2Overlay.classList.add('hidden');
  obstacle2Active = false;

  if (success) {
    const timeSpent = Math.round((Date.now() - obs2StartTime) / 100) / 10;
    window.angerData.obstacle2 = { attemptCount: obs2Attempts, timeSpent };
    checkpoints.find(cp => cp.n === 2).cleared = true;
    movementPaused = false;
    console.log('obstacle 2 cleared');
  } else {
    console.log('obstacle 2 abandoned');
    triggerReset();
  }
}

obs2Submit.addEventListener('click', () => {
  obs2Attempts++;

  if (!obs2EverSubmitted) {
    // First time ever — set reset card header then reset the maze
    obs2EverSubmitted = true;
    const resetHeader = document.getElementById('resetHeader');
    resetHeader.textContent = 'dig your memories deeper';
    resetHeader.classList.remove('hidden');
    closeObstacle2(false);
  } else {
    // Second time reaching the captcha — always passes
    closeObstacle2(true);
  }
});

// ── Obstacle 3 — popup ad ─────────────────────────────────────────────────────

let obstacle3Active   = false;
let obs3StartTime     = null;
let obs3ButtonMoves   = 0;
let obs3Locked        = false;
let obs3LockTimer     = null;
let obs3MoveListener  = null;
let obs3CursorListener = null;
let obs3MoveCooldown  = false;
let obs3CurrentCorner = 0;

const obs3CustomCursor = document.getElementById('obs3CustomCursor');

const obs3Overlay  = document.getElementById('obstacle3Overlay');
const obs3CloseBtn = document.getElementById('obs3CloseBtn');

// Four corners: top-right (0), top-left (1), bottom-right (2), bottom-left (3)
const OBS3_CORNERS = [
  { top: '12px', right: '14px', bottom: 'auto', left: 'auto'  },
  { top: '12px', right: 'auto', bottom: 'auto', left: '14px'  },
  { top: 'auto', right: '14px', bottom: '12px', left: 'auto'  },
  { top: 'auto', right: 'auto', bottom: '12px', left: '14px'  },
];

function applyObs3Corner(idx) {
  const c = OBS3_CORNERS[idx];
  obs3CloseBtn.style.top    = c.top;
  obs3CloseBtn.style.right  = c.right;
  obs3CloseBtn.style.bottom = c.bottom;
  obs3CloseBtn.style.left   = c.left;
}

function moveObs3Button() {
  const others = [0, 1, 2, 3].filter(i => i !== obs3CurrentCorner);
  obs3CurrentCorner = others[Math.floor(Math.random() * others.length)];
  applyObs3Corner(obs3CurrentCorner);
  obs3ButtonMoves++;

  // Cooldown prevents rapid-fire moves while cursor lingers in zone
  obs3MoveCooldown = true;
  setTimeout(() => { obs3MoveCooldown = false; }, 300);
}

function showObstacle3() {
  movementPaused    = true;
  obstacle3Active   = true;
  obs3ButtonMoves   = 0;
  obs3Locked        = false;
  obs3MoveCooldown  = false;
  obs3CurrentCorner = 0;
  obs3StartTime     = Date.now();

  applyObs3Corner(0);
  obs3Overlay.classList.remove('hidden');

  // Activate custom cursor
  document.body.classList.add('obs3-active');
  obs3CustomCursor.classList.add('obs3-cursor-visible');

  // Unlock close button after exactly 10 seconds
  obs3LockTimer = setTimeout(() => { obs3Locked = true; }, 10000);

  // Cursor tracker — moves custom cursor div and grows it near the button
  obs3CursorListener = (e) => {
    obs3CustomCursor.style.left = (e.clientX + 1) + 'px';
    obs3CustomCursor.style.top  = (e.clientY + 1) + 'px';

    const rect = obs3CloseBtn.getBoundingClientRect();
    const dist = Math.hypot(
      e.clientX - (rect.left + rect.width  / 2),
      e.clientY - (rect.top  + rect.height / 2)
    );
    obs3CustomCursor.classList.toggle('obs3-cursor-chase', dist < 120);
  };
  document.addEventListener('mousemove', obs3CursorListener);

  // Proximity listener — button escapes when cursor gets within 60px
  obs3MoveListener = (e) => {
    if (obs3Locked || obs3MoveCooldown) return;
    const rect = obs3CloseBtn.getBoundingClientRect();
    const dist = Math.hypot(
      e.clientX - (rect.left + rect.width  / 2),
      e.clientY - (rect.top  + rect.height / 2)
    );
    if (dist < 60) moveObs3Button();
  };
  document.addEventListener('mousemove', obs3MoveListener);
}

function closeObstacle3(success) {
  clearTimeout(obs3LockTimer);
  if (obs3CursorListener) {
    document.removeEventListener('mousemove', obs3CursorListener);
    obs3CursorListener = null;
  }
  if (obs3MoveListener) {
    document.removeEventListener('mousemove', obs3MoveListener);
    obs3MoveListener = null;
  }

  // Restore native cursor
  document.body.classList.remove('obs3-active');
  obs3CustomCursor.classList.remove('obs3-cursor-visible', 'obs3-cursor-chase');

  obs3Overlay.classList.add('hidden');
  obstacle3Active = false;

  if (success) {
    movementPaused = false;
    checkpoints.find(cp => cp.n === 3).cleared = true;
    const timeSpent = Math.round((Date.now() - obs3StartTime) / 100) / 10;
    window.angerData.obstacle3 = {
      timeSpent,
      howManyTimesButtonMoved: obs3ButtonMoves,
    };
    console.log('obstacle 3 cleared');
  } else {
    triggerReset();
  }
}

obs3CloseBtn.addEventListener('click', () => {
  if (!obs3Locked) return; // button still running — can't close yet
  closeObstacle3(true);
});

// ── Reset mechanic ────────────────────────────────────────────────────────────

const resetFlash = document.getElementById('resetFlash');
const resetBox   = document.getElementById('resetBox');

function triggerReset() {
  totalResets++;
  window.angerData.totalResets = totalResets;

  if (totalResets === 1) {
    window.angerData.timeBeforeFirstReset = Date.now() - gameStartTime;
  }

  // Red flash: snap to 0.3 opacity then fade out over 0.5s
  resetFlash.style.display    = 'block';
  resetFlash.style.transition = 'none';
  resetFlash.style.opacity    = '0.3';
  void resetFlash.offsetWidth; // force reflow before transition
  resetFlash.style.transition = 'opacity 0.5s ease';
  resetFlash.style.opacity    = '0';

  setTimeout(() => { resetFlash.style.display = 'none'; }, 550);

  // Show reset message while flash is still fading
  setTimeout(() => { resetBox.classList.remove('hidden'); }, 200);
}

function resetGame() {
  // Return player to start
  player.x = 24;
  player.y = PLAYER_R;

  // Reset all checkpoints to untriggered
  checkpoints.forEach(cp => { cp.hit = false; cp.cleared = false; });

  // Reset obstacle 1 state
  obs1Attempts     = 0;
  obs1CheckingDone = false;

  // Reset obstacle 2 state
  obs2Attempts = 0;
  const resetHeader = document.getElementById('resetHeader');
  resetHeader.textContent = '';
  resetHeader.classList.add('hidden');

  // Reset obstacle 3 state (timer/listener already cleared by closeObstacle3)
  obs3ButtonMoves   = 0;
  obs3Locked        = false;
  obs3MoveCooldown  = false;
  obs3CurrentCorner = 0;

  // Reset maze
  mazeComplete = false;

  // Reset scratch card if it was somehow visible
  document.getElementById('scratchScreen').classList.add('hidden');
  document.getElementById('scratchScreen').classList.remove('fade-out');
  document.getElementById('scratchNext').classList.add('hidden');
  isScratching = false;

  resetBox.classList.add('hidden');
  movementPaused = false;
}

document.getElementById('resetTryAgain').addEventListener('click', resetGame);

document.getElementById('resetQuit').addEventListener('click', () => {
  window.angerData.quitAfterReset = true;
  resetBox.classList.add('hidden');
  console.log('player quit');

  // Determine frustration based on how far the player reached
  frustrationPoints = getFrustrationPoints();
  const total = frustrationPoints; // no scratch card on quit
  updateDebugDisplay(frustrationPoints, null, total);
  saveAngerSession(frustrationPoints, null, total);

  var played = JSON.parse(localStorage.getItem('exchange_played_games') || '[]');
  if (played.indexOf('anger') === -1) played.push('anger');
  localStorage.setItem('exchange_played_games', JSON.stringify(played));

  window.location.href = 'games2.html?ret=1';
});

// ── Finish / scratch card / calibration ──────────────────────────────────────

function calculatePoints() {
  let pts = 100;
  pts -= totalResets * 15;
  return Math.max(10, pts);
}

function onMazeComplete() {
  movementPaused = true;
  console.log('maze complete');

  // Maze completion → 0 frustration + random scratch bonus 50–115
  frustrationPoints  = 0;
  scratchBonusPoints = calculateScratchPoints();
  const total = frustrationPoints + scratchBonusPoints;

  window.angerData.pointsEarned   = total;
  window.angerData.timeToComplete = Date.now() - gameStartTime;

  // Persist to localStorage
  localStorage.setItem('angerPoints', total);
  const existing = parseInt(localStorage.getItem('totalPoints')) || 0;
  localStorage.setItem('totalPoints', existing + total);
  const _ePts = parseInt(localStorage.getItem('exchange_total_pts') || '0', 10);
  localStorage.setItem('exchange_total_pts', _ePts + total);

  updateDebugDisplay(frustrationPoints, scratchBonusPoints, total);

  // Show scratch card
  document.getElementById('scratchPoints').textContent = total;
  initScratchCanvas();
  document.getElementById('scratchScreen').classList.remove('hidden');
}

// ── Scratch canvas ────────────────────────────────────────────────────────────

const scratchCanvas  = document.getElementById('scratchCanvas');
const scratchCtx     = scratchCanvas.getContext('2d', { willReadFrequently: true });
const SCRATCH_W      = 220;
const SCRATCH_H      = 130;
const SCRATCH_BRUSH  = 30;
const SCRATCH_DPR    = window.devicePixelRatio || 1;

let isScratching = false;
let scratchDone  = false;

function initScratchCanvas() {
  scratchDone = false;

  scratchCanvas.width        = SCRATCH_W * SCRATCH_DPR;
  scratchCanvas.height       = SCRATCH_H * SCRATCH_DPR;
  scratchCanvas.style.width  = SCRATCH_W + 'px';
  scratchCanvas.style.height = SCRATCH_H + 'px';

  scratchCtx.setTransform(1, 0, 0, 1, 0, 0);
  scratchCtx.scale(SCRATCH_DPR, SCRATCH_DPR);

  // Dark scratch surface (Figma dark card theme)
  scratchCtx.globalCompositeOperation = 'source-over';
  scratchCtx.fillStyle = '#3a3535';
  scratchCtx.fillRect(0, 0, SCRATCH_W, SCRATCH_H);

  // Hint text on dark surface
  scratchCtx.fillStyle    = '#888880';
  scratchCtx.font         = '300 10px "IBM Plex Mono", monospace';
  scratchCtx.textAlign    = 'center';
  scratchCtx.textBaseline = 'middle';
  scratchCtx.fillText('scratch to reveal', SCRATCH_W / 2, SCRATCH_H / 2);
}

function scratchAt(x, y) {
  scratchCtx.globalCompositeOperation = 'destination-out';
  scratchCtx.beginPath();
  scratchCtx.arc(x, y, SCRATCH_BRUSH, 0, Math.PI * 2);
  scratchCtx.fill();
  scratchCtx.globalCompositeOperation = 'source-over';
  checkScratchProgress();
}

function checkScratchProgress() {
  if (scratchDone) return;

  const imageData = scratchCtx.getImageData(0, 0, scratchCanvas.width, scratchCanvas.height);
  const pixels    = imageData.data;
  let transparent = 0;
  let sampled     = 0;

  // Sample every 4th pixel (step 16 bytes = 4 channels × 4 pixels)
  for (let i = 3; i < pixels.length; i += 16) {
    if (pixels[i] < 128) transparent++;
    sampled++;
  }

  if (transparent / sampled >= 0.6) {
    scratchDone = true;
    scratchCtx.clearRect(0, 0, SCRATCH_W, SCRATCH_H);
    document.getElementById('scratchNext').classList.remove('hidden');
  }
}

scratchCanvas.addEventListener('mousedown', e => {
  isScratching = true;
  const rect = scratchCanvas.getBoundingClientRect();
  scratchAt(e.clientX - rect.left, e.clientY - rect.top);
});

scratchCanvas.addEventListener('mousemove', e => {
  if (!isScratching) return;
  const rect = scratchCanvas.getBoundingClientRect();
  scratchAt(e.clientX - rect.left, e.clientY - rect.top);
});

window.addEventListener('mouseup', () => { isScratching = false; });

document.getElementById('scratchNext').addEventListener('click', () => {
  // Save session now that both frustration (0) and scratch bonus are known
  saveAngerSession(frustrationPoints, scratchBonusPoints, frustrationPoints + scratchBonusPoints);

  const screen = document.getElementById('scratchScreen');
  screen.classList.add('fade-out');
  setTimeout(() => {
    screen.style.display = 'none';
    showCalibration();
  }, 650);
});

function showCalibration() {
  const calScreen = document.getElementById('calibration-screen');
  calScreen.classList.add('visible');

  const label = document.getElementById('cal-label');
  label.textContent = 'calibrating your emotional index...';
  label.classList.add('pulsing');

  // Delay one frame so the transition fires after display:flex takes effect
  setTimeout(() => {
    const fill = document.getElementById('cal-progress-fill');
    fill.style.transition = 'width 6s linear';
    fill.style.width = '100%';
  }, 100);

  setTimeout(() => {
    var played = JSON.parse(localStorage.getItem('exchange_played_games') || '[]');
    if (played.indexOf('anger') === -1) played.push('anger');
    localStorage.setItem('exchange_played_games', JSON.stringify(played));
    window.location.href = 'games2.html?ret=1';
  }, 6500);
}

// ── Update ────────────────────────────────────────────────────────────────────

function update() {
  if (movementPaused) return;

  let dx = 0, dy = 0;
  if (keys.ArrowLeft)  dx -= SPEED;
  if (keys.ArrowRight) dx += SPEED;
  if (keys.ArrowUp)    dy -= SPEED;
  if (keys.ArrowDown)  dy += SPEED;

  if (dx !== 0 && dy !== 0) { dx *= 0.707; dy *= 0.707; }

  // Horizontal movement — with vertical nudge to slide through narrow corridors
  if (dx !== 0) {
    const nx = player.x + dx;
    if (isValidPosition(nx, player.y) && !isBlockedByBarrier(nx, player.y)) {
      player.x = nx;
    } else if (dy === 0) {
      for (const n of [1, -1, 2, -2]) {
        if (isValidPosition(nx, player.y + n) && !isBlockedByBarrier(nx, player.y + n) &&
            isValidPosition(player.x, player.y + n) && !isBlockedByBarrier(player.x, player.y + n)) {
          player.x = nx;
          player.y += n;
          break;
        }
      }
    }
  }

  // Vertical movement — with horizontal nudge to slide through narrow corridors
  if (dy !== 0) {
    const ny = player.y + dy;
    if (isValidPosition(player.x, ny) && !isBlockedByBarrier(player.x, ny)) {
      player.y = ny;
    } else if (dx === 0) {
      for (const n of [1, -1, 2, -2]) {
        if (isValidPosition(player.x + n, ny) && !isBlockedByBarrier(player.x + n, ny) &&
            isValidPosition(player.x + n, player.y) && !isBlockedByBarrier(player.x + n, player.y)) {
          player.x += n;
          player.y = ny;
          break;
        }
      }
    }
  }

  // Checkpoint triggers — fire as soon as player reaches the box line in the corridor
  checkpoints.forEach(cp => {
    if (cp.hit) return;
    const reached =
      (cp.n === 1 && player.y >= cp.y - CP_HALF && player.x >= 8   && player.x <= 48 ) ||
      (cp.n === 2 && player.y >= cp.y - CP_HALF && player.x >= 480 && player.x <= 520) ||
      (cp.n === 3 && player.y >= cp.y - CP_HALF && player.x >= 480 && player.x <= 520);
    if (reached) {
      cp.hit = true;
      console.log(`checkpoint ${cp.n} hit`);
      if (cp.n === 1) showObstacle1();
      if (cp.n === 2) showObstacle2();
      if (cp.n === 3) showObstacle3();
    }
  });

  // Finish trigger
  if (!mazeComplete &&
      player.x >= finish.x && player.x <= finish.x + finish.w &&
      player.y >= finish.y && player.y <= finish.y + finish.h) {
    mazeComplete = true;
    onMazeComplete();
  }
}

// ── Draw ──────────────────────────────────────────────────────────────────────

function drawMaze() {
  // ── Floor ──────────────────────────────────────────────────────────────────
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, W, H);

  // ── Walls (large Figma-style blocks, #2a2a2a) ─────────────────────────────
  ctx.save();
  ctx.shadowColor   = 'rgba(0, 0, 0, 0.55)';
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 3;
  ctx.shadowBlur    = 10;
  ctx.fillStyle = '#2a2a2a';
  walls.forEach(w => ctx.fillRect(w.x, w.y, w.w, w.h));
  ctx.restore();

  // ── Decorative grid texture (drawn over walls so grid shows inside blocks) ─
  ctx.save();
  ctx.strokeStyle = 'rgba(91, 91, 91, 0.30)';
  ctx.lineWidth = 0.5;
  const GRID = 16;
  for (let gx = 0; gx <= W; gx += GRID) {
    ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke();
  }
  for (let gy = 0; gy <= H; gy += GRID) {
    ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
  }
  ctx.restore();

// ── Checkpoints — full-width corridor wall segments, open once cleared ───────
  const CP_CORRIDOR = {
    1: { cx: 8,   cw: 40 },
    2: { cx: 480, cw: 40 },
    3: { cx: 480, cw: 40 },
  };
  checkpoints.forEach(cp => {
    if (cp.cleared) return; // wall open — draw nothing
    if (cp.n === 3) return;  // no wall for CP3 — finish strip serves as visual cue
    const { cx, cw } = CP_CORRIDOR[cp.n];
    ctx.save();
    ctx.shadowColor   = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 3;
    ctx.shadowBlur    = 10;
    ctx.fillStyle = '#8b0000';
    ctx.fillRect(cx, cp.y - 4, cw, 8);
    ctx.restore();
  });


}

function drawPlayer() {
  // Gold dot with warm glow (Figma #fdbd2d player ellipse)
  ctx.save();
  ctx.shadowColor = 'rgba(253, 189, 45, 0.65)';
  ctx.shadowBlur  = 12;
  ctx.beginPath();
  ctx.arc(player.x, player.y, PLAYER_R, 0, Math.PI * 2);
  ctx.fillStyle = '#fdbd2d';
  ctx.fill();
  ctx.restore();
}

// ── Face / head tracking via MediaPipe Face Mesh ─────────────────────────────

let faceBase        = null;   // calibrated nose-tip position {x, y}
let faceMoveActive  = false;  // cooldown flag between moves

function getFaceThreshold() {
  const s = parseInt(document.getElementById('sensitivitySlider').value, 10);
  // sensitivity 1 → 0.030 (large tilt needed)
  // sensitivity 3 → 0.018 (default)
  // sensitivity 5 → 0.006 (small tilt)
  return 0.018 + (3 - s) * 0.006;
}

document.getElementById('sensitivitySlider').addEventListener('input', function () {
  document.getElementById('sensValue').textContent = this.value;
});

// Hidden video for webcam feed
const faceVideo = document.createElement('video');
faceVideo.setAttribute('playsinline', '');
faceVideo.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;top:0;left:0;';
document.body.appendChild(faceVideo);

function initFaceTracking() {
  const faceMesh = new FaceMesh({
    locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
  });

  faceMesh.setOptions({
    maxNumFaces: 1,
    refineLandmarks: false,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });

  faceMesh.onResults(results => {
    if (!results.multiFaceLandmarks || !results.multiFaceLandmarks[0]) return;
    const nose = results.multiFaceLandmarks[0][1]; // landmark 1 = nose tip

    // First detection → calibrate base position
    if (!faceBase) {
      faceBase = { x: nose.x, y: nose.y };
      return;
    }

    if (faceMoveActive || movementPaused) return;

    const threshold = getFaceThreshold();
    const dx = nose.x - faceBase.x; // positive = nose moved right in camera (head moved left)
    const dy = nose.y - faceBase.y; // positive = nose moved down
    const absDx = Math.abs(dx), absDy = Math.abs(dy);

    if (absDx < threshold && absDy < threshold) return; // within dead zone

    // Dominant axis wins; invert X so controls feel mirror-like
    if (absDx >= absDy) {
      if (dx < 0) keys.ArrowRight = true; // nose left in camera = head moved right
      else        keys.ArrowLeft  = true;
    } else {
      if (dy < 0) keys.ArrowUp   = true;
      else        keys.ArrowDown  = true;
    }

    faceBase = { x: nose.x, y: nose.y }; // recalibrate after each move
    faceMoveActive = true;
    setTimeout(() => {
      keys.ArrowUp = keys.ArrowDown = keys.ArrowLeft = keys.ArrowRight = false;
      faceMoveActive = false;
    }, 140);
  });

  const faceCamera = new Camera(faceVideo, {
    onFrame: async () => { await faceMesh.send({ image: faceVideo }); },
    width: 320,
    height: 240,
  });
  faceCamera.start();
}

// Wait for MediaPipe globals to be ready
if (typeof FaceMesh !== 'undefined' && typeof Camera !== 'undefined') {
  initFaceTracking();
} else {
  window.addEventListener('load', initFaceTracking);
}

// ── Game loop ─────────────────────────────────────────────────────────────────

function loop() {
  update();
  drawMaze();
  drawPlayer();
  requestAnimationFrame(loop);
}

loop();
