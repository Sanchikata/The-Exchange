// games.js — The Exchange: Games page logic

(function () {
  'use strict';

  window.participantData = window.participantData || {};

  const entryScreen = document.getElementById('entry-screen');
  const gameWrapper  = document.getElementById('game-wrapper');
  const entryBtn     = document.getElementById('entry-btn');
  const stopwatch    = document.getElementById('stopwatch');

  let elapsed = 0;

  function formatTime(s) {
    const h   = String(Math.floor(s / 3600)).padStart(2, '0');
    const m   = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
    const sec = String(s % 60).padStart(2, '0');
    return `${h}:${m}:${sec}`;
  }

  function startStopwatch() {
    stopwatch.classList.add('visible');
    setInterval(function () {
      elapsed++;
      stopwatch.textContent = formatTime(elapsed);
    }, 1000);
  }

  function showGameShell() {
    entryScreen.classList.add('fade-out');
    setTimeout(function () {
      entryScreen.style.display = 'none';
      gameWrapper.classList.add('visible');
      startStopwatch();
      initGame1();
    }, 650);
  }

  entryBtn.addEventListener('click', showGameShell);

  function showCalibrationScreen() {
    const screen = document.getElementById('calibration-screen');
    screen.classList.add('visible');

    const label = document.getElementById('cal-label');
    label.textContent = 'calibrating your emotional index...';
    setTimeout(function () { label.classList.add('pulsing'); }, 500);

    const fill = document.getElementById('cal-progress-fill');
    fill.style.transition = 'width 6s linear';
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { fill.style.width = '100%'; });
    });

    const g1 = window.participantData.game1 || {};
    const g2 = window.participantData.game2 || {};

    var nostalgiaPoints = 0;
    if (g1.gotItRight) nostalgiaPoints += 350;
    nostalgiaPoints -= (g1.wrongClicks || 0) * 100;
    var shalakalaSec = (g2.shakalaka_time_ms || 0) / 1000;
    nostalgiaPoints += (shalakalaSec >= 3 && shalakalaSec <= 7) ? 50 : 20;
    console.log('[nostalgia_index] points:', nostalgiaPoints, '| divisor: 50');
    var nostalgiaIndex = nostalgiaPoints / 50;

    function heartbeatTier(ni) {
      if (ni >= 70) return 'high';
      if (ni >= 40) return 'moderate';
      return 'low';
    }

    const payload = {
      dvd_time_ms:       g1.timeToCorrectClick  || null,
      dvd_attempts:      (g1.wrongClicks || 0)  + (g1.gotItRight ? 1 : 0),
      shakalaka_choice:  window.participantData.shakalaka_choice        || null,
      shakalaka_changed: g2.shakalaka_changed !== undefined ? g2.shakalaka_changed : null,
      shakalaka_time_ms: g2.shakalaka_time_ms  || null,
      nostalgia_points:  nostalgiaPoints,
      nostalgia_index:   nostalgiaIndex,
      heartbeat_tier:    heartbeatTier(nostalgiaIndex),
    };

    const savePromise = window.DB.saveSession(payload).catch(function (err) {
      console.error('Session save failed:', err);
      return null;
    });

    const animPromise = new Promise(function (resolve) { setTimeout(resolve, 6000); });

    Promise.all([savePromise, animPromise]).then(function () {
      if (typeof Exchange !== 'undefined') Exchange.addPoints(nostalgiaPoints);
      var played = JSON.parse(localStorage.getItem('exchange_played_games') || '[]');
      if (played.indexOf('nostalgia') === -1) played.push('nostalgia');
      localStorage.setItem('exchange_played_games', JSON.stringify(played));
      window.location.href = 'games2.html';
    });
  }


  // ─── Shakalaka Boom Boom: Design 1 entry screen ───────────────────────────

  function showShakalaka() {
    const screen = document.createElement('div');
    screen.id = 'shakalaka-screen';
    screen.className = 'shakalaka-screen';
    screen.innerHTML =
      '<div class="sk-pencil-wrap">' +
        '<div class="sk-pencil-rot">' +
          '<div class="sk-pencil-clip">' +
            '<img class="sk-pencil" src="assets/images/shakalaka-pencil.png" alt="">' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="sk-win98-window">' +
        '<div class="sk-win98-titlebar">' +
          '<div class="sk-win98-titlebar-left">' +
            '<span class="sk-win98-folder">&#128193;</span>' +
            '<span class="sk-win98-title-text">SHAKALAKA BOOM BOOM.exe</span>' +
          '</div>' +
          '<div class="sk-win98-titlebar-btns">' +
            '<button class="sk-win98-winbtn" tabindex="-1">&#x2013;</button>' +
            '<button class="sk-win98-winbtn" tabindex="-1">&#x25A1;</button>' +
            '<button class="sk-win98-winbtn" tabindex="-1">&#xD7;</button>' +
          '</div>' +
        '</div>' +
        '<div class="sk-container">' +
          '<div class="sk-box sk-box--a"></div>' +
          '<div class="sk-box sk-box--b"></div>' +
          '<div class="sk-inner">' +
            '<p class="sk-prompt">Choose to draw your fondest memory!</p>' +
            '<div class="sk-buttons">' +
              '<button class="sk-btn">Beyblade</button>' +
              '<button class="sk-btn">Paper Boat</button>' +
              '<button class="sk-btn">Pikachu</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="sk-win98-statusbar">' +
          '<span class="sk-win98-status-text">8 object(s)</span>' +
        '</div>' +
      '</div>';

    document.body.appendChild(screen);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        screen.classList.add('visible');
      });
    });

    screen.querySelectorAll('.sk-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        window.participantData.shakalaka_choice     = btn.textContent.trim();
        window.participantData.shakalaka_start_time = Date.now();
        showShakalakaDraw(btn.textContent.trim(), screen);
      });
    });
  }

  function showShakalakaDraw(word, screen) {
    // Fade out the selection UI
    var inner = screen.querySelector('.sk-inner');
    inner.style.transition    = 'opacity 0.25s ease';
    inner.style.opacity       = '0';
    inner.style.pointerEvents = 'none';

    // Hide pencil image
    var pencilWrap = screen.querySelector('.sk-pencil-wrap');
    if (pencilWrap) { pencilWrap.style.transition = 'opacity 0.25s ease'; pencilWrap.style.opacity = '0'; }

    setTimeout(function () {
      if (pencilWrap) pencilWrap.remove();

      // Swap Win98 file-explorer window → MS Paint window
      var win = screen.querySelector('.sk-win98-window');
      win.className         = 'sk-paint-window';
      win.style.opacity     = '0';
      win.style.transition  = 'opacity 0.3s ease';

      var PALETTE = [
        '#000000','#808080','#800000','#808000','#008000','#008080','#000080','#800080',
        '#808040','#004040','#0040c0','#4000c0','#800040','#c04000',
        '#ffffff','#c0c0c0','#ff0000','#ffff00','#00ff00','#00ffff','#0000ff','#ff00ff',
        '#ffff80','#80ff80','#80ffff','#8080ff','#ff80ff','#ff8040'
      ];

      var colorCells = PALETTE.map(function (c) {
        var active = c === '#000000' ? ' active' : '';
        return '<button class="sk-paint-color' + active + '" data-color="' + c + '" style="background:' + c + '" title="' + c + '"></button>';
      }).join('');

      // Tool definitions: [id, label, svgContent]
      var TOOLS = [
        ['select-free','Free-Form Select','<svg viewBox="0 0 14 14" fill="none"><path d="M2 7 Q4 2 7 3 Q10 4 11 7 Q10 10 7 11 Q4 12 2 7" stroke="#000" stroke-width="1" stroke-dasharray="2,1.5"/></svg>'],
        ['select-rect','Select','<svg viewBox="0 0 14 14" fill="none"><rect x="2" y="2" width="10" height="10" stroke="#000" stroke-width="1" stroke-dasharray="2,1.5"/></svg>'],
        ['eraser','Eraser','<svg viewBox="0 0 14 14" fill="none"><rect x="1" y="7" width="12" height="6" fill="#ffaaaa" stroke="#000" stroke-width="1"/><rect x="1" y="7" width="6" height="6" fill="#fff" stroke="#000" stroke-width="1"/></svg>'],
        ['fill','Fill With Color','<svg viewBox="0 0 14 14" fill="none"><path d="M3 11 L6 3 L8 5 L11 2 L12 3 L9 6 Z" fill="#000"/><circle cx="11.5" cy="11.5" r="1.8" fill="#ff0" stroke="#000" stroke-width="0.6"/></svg>'],
        ['picker','Pick Color','<svg viewBox="0 0 14 14" fill="none"><path d="M4 12 L2 12 L2 10 L8 4 L10 6 Z" fill="#000"/><path d="M10 6 L12 4 Q13 2 11 2 Q10 1 9 2 L8 4 Z" fill="#aaa"/><circle cx="3" cy="11" r="1" fill="#888"/></svg>'],
        ['zoom','Magnifier','<svg viewBox="0 0 14 14" fill="none"><circle cx="6" cy="6" r="3.5" stroke="#000" stroke-width="1.2"/><line x1="9" y1="9" x2="13" y2="13" stroke="#000" stroke-width="1.5"/><line x1="4.5" y1="6" x2="7.5" y2="6" stroke="#000" stroke-width="0.8"/><line x1="6" y1="4.5" x2="6" y2="7.5" stroke="#000" stroke-width="0.8"/></svg>'],
        ['pencil','Pencil','<svg viewBox="0 0 14 14" fill="none"><path d="M10 2 L12 4 L5 11 L2 12 L3 9 Z" fill="#f4d060" stroke="#000" stroke-width="0.8"/><path d="M3 9 L5 11" stroke="#000" stroke-width="0.8"/><path d="M10 2 L12 4" stroke="#555" stroke-width="0.8"/><path d="M3.5 10.5 Q3 11.5 2.5 11.5" stroke="#888" stroke-width="0.8"/></svg>'],
        ['brush','Brush','<svg viewBox="0 0 14 14" fill="none"><rect x="6" y="1" width="3" height="7" rx="1" fill="#8B4513" stroke="#000" stroke-width="0.6"/><path d="M5.5 8 Q7.5 12 9.5 8" fill="#000080" stroke="#000" stroke-width="0.5"/></svg>'],
        ['airbrush','Airbrush','<svg viewBox="0 0 14 14" fill="none"><rect x="1" y="5" width="7" height="8" rx="1" fill="#c0c0c0" stroke="#000" stroke-width="0.8"/><line x1="8" y1="8" x2="12" y2="6" stroke="#000" stroke-width="1"/><circle cx="12" cy="5" r="1.2" fill="#888"/><circle cx="10" cy="3" r="0.5" fill="#888"/><circle cx="12" cy="2.5" r="0.5" fill="#888"/><circle cx="11" cy="2" r="0.5" fill="#888"/></svg>'],
        ['text','Text','<svg viewBox="0 0 14 14"><text x="2" y="11" font-size="11" font-family="serif" font-weight="bold" fill="#000">A</text></svg>'],
        ['line','Line','<svg viewBox="0 0 14 14" fill="none"><line x1="2" y1="12" x2="12" y2="2" stroke="#000" stroke-width="1.5"/></svg>'],
        ['curve','Curve','<svg viewBox="0 0 14 14" fill="none"><path d="M2 10 Q7 2 12 10" stroke="#000" stroke-width="1.5"/></svg>'],
        ['rect','Rectangle','<svg viewBox="0 0 14 14" fill="none"><rect x="2" y="3" width="10" height="8" stroke="#000" stroke-width="1.2"/></svg>'],
        ['polygon','Polygon','<svg viewBox="0 0 14 14" fill="none"><polygon points="7,2 12,5 10,11 4,11 2,5" stroke="#000" stroke-width="1"/></svg>'],
        ['ellipse','Ellipse','<svg viewBox="0 0 14 14" fill="none"><ellipse cx="7" cy="7" rx="5" ry="4" stroke="#000" stroke-width="1.2"/></svg>'],
        ['roundrect','Rounded Rect','<svg viewBox="0 0 14 14" fill="none"><rect x="2" y="3" width="10" height="8" rx="3" stroke="#000" stroke-width="1.2"/></svg>']
      ];

      var toolBtns = TOOLS.map(function (t) {
        var extraClass = (t[0] === 'pencil' ? ' sk-paint-tool--active' : '') + (t[0] === 'eraser' ? ' sk-paint-eraser' : '');
        return '<button class="sk-paint-tool' + extraClass + '" data-tool="' + t[0] + '" title="' + t[1] + '">' + t[2] + '</button>';
      }).join('');

      win.innerHTML =
        '<div class="sk-paint-titlebar">' +
          '<div class="sk-paint-titlebar-left">' +
            '<span class="sk-paint-icon">&#127912;</span>' +
            '<span class="sk-paint-title">Paint</span>' +
          '</div>' +
          '<div class="sk-win98-titlebar-btns">' +
            '<button class="sk-win98-winbtn" tabindex="-1">&#x2013;</button>' +
            '<button class="sk-win98-winbtn" tabindex="-1">&#x25A1;</button>' +
            '<button class="sk-win98-winbtn" tabindex="-1">&#xD7;</button>' +
          '</div>' +
        '</div>' +
        '<div class="sk-paint-menubar">' +
          '<span class="sk-paint-menu">File</span>' +
          '<span class="sk-paint-menu">Edit</span>' +
          '<span class="sk-paint-menu">View</span>' +
          '<span class="sk-paint-menu">Image</span>' +
          '<span class="sk-paint-menu">Colors</span>' +
          '<span class="sk-paint-menu">Help</span>' +
        '</div>' +
        '<div class="sk-paint-body">' +
          '<div class="sk-paint-toolbar">' + toolBtns + '</div>' +
          '<div class="sk-paint-canvas-area">' +
            '<div class="sk-paint-word-bar">' + word + '</div>' +
            '<div class="sk-paint-canvas-wrapper">' +
              '<div class="sk-box sk-box--a"></div>' +
              '<div class="sk-box sk-box--b"></div>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="sk-paint-palette">' +
          '<div class="sk-paint-active-colors">' +
            '<div class="sk-paint-bg-color"></div>' +
            '<div class="sk-paint-fg-color"></div>' +
          '</div>' +
          '<div class="sk-paint-colors">' + colorCells + '</div>' +
        '</div>' +
        '<div class="sk-paint-statusbar">' +
          '<span class="sk-paint-status-text">draw your fondest memory</span>' +
          '<button class="sk-end-btn">Done</button>' +
        '</div>';

      requestAnimationFrame(function () {
        requestAnimationFrame(function () { win.style.opacity = '1'; });
      });

      // Size and inject canvas after layout is painted
      requestAnimationFrame(function () {
        var wrapper = win.querySelector('.sk-paint-canvas-wrapper');
        var canvas  = document.createElement('canvas');
        canvas.className = 'sk-draw-canvas';
        wrapper.appendChild(canvas);

        var dpr = window.devicePixelRatio || 1;
        var cw  = wrapper.clientWidth;
        var ch  = wrapper.clientHeight;
        canvas.setAttribute('width',  cw * dpr);
        canvas.setAttribute('height', ch * dpr);
        canvas.style.width  = cw + 'px';
        canvas.style.height = ch + 'px';
        var ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);

        var endBtn = win.querySelector('.sk-end-btn');
        enableDrawing(canvas, ctx, win, endBtn);
      });
    }, 300);
  }

  function enableDrawing(canvas, ctx, win, endBtn) {
    var drawing         = false;
    var activeColor     = '#000000';
    var erasing         = false;
    var colorChoices    = ['#000000'];
    var eraserUsed      = false;
    var drawStartTime   = Date.now();
    var firstStrokeTime = null;
    var totalDrawMs     = 0;
    var strokeStart     = null;
    var lastPt          = null;

    ctx.lineCap  = 'round';
    ctx.lineJoin = 'round';
    canvas.style.cursor = 'none';

    // Pencil cursor element
    // Element: 40×62px, rotated 45° CW, transform-origin center (20,31).
    // Tip = bottom-center of image = (20,62), from origin: (0,31).
    // After 45° CW: offset = (31·sin45°, 31·cos45°) ≈ (21.9, 21.9).
    // Tip screen pos = (left+20+21.9, top+31+21.9) ≈ (left+42, top+53).
    // So to place tip at (cx,cy): left = cx-42, top = cy-53.
    var pencilCursor = document.createElement('div');
    pencilCursor.className = 'sk-pencil-cursor';
    var pencilCursorImg = document.createElement('img');
    pencilCursorImg.src = 'assets/images/shakalaka-pencil.png';
    pencilCursorImg.alt = '';
    pencilCursor.appendChild(pencilCursorImg);
    document.body.appendChild(pencilCursor);

    function placePencil(cx, cy) {
      pencilCursor.style.left = (cx + 6) + 'px';
      pencilCursor.style.top  = (cy - 159) + 'px';
    }

    function showPencilCursor() {
      canvas.style.cursor = 'none';
      pencilCursor.style.opacity = '1';
    }

    function hidePencilCursor() {
      pencilCursor.style.opacity = '0';
    }

    function canvasPos(e) {
      var r   = canvas.getBoundingClientRect();
      var clX = e.touches ? e.touches[0].clientX : e.clientX;
      var clY = e.touches ? e.touches[0].clientY : e.clientY;
      return { x: clX - r.left, y: clY - r.top, cx: clX, cy: clY };
    }

    function drawSegment(x1, y1, x2, y2) {
      if (erasing) {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = 'rgba(0,0,0,1)';
        ctx.lineWidth   = 20;
        ctx.globalAlpha = 1;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = activeColor;
        ctx.lineWidth   = 2;
        ctx.globalAlpha = 0.72;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        ctx.lineWidth   = 1;
        ctx.globalAlpha = 0.16;
        ctx.beginPath(); ctx.moveTo(x1 + 0.9, y1 + 0.5); ctx.lineTo(x2 + 0.9, y2 + 0.5); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x1 - 0.5, y1 - 0.9); ctx.lineTo(x2 - 0.5, y2 - 0.9); ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }

    canvas.addEventListener('pointerenter', function (e) {
      if (!erasing) { placePencil(e.clientX, e.clientY); showPencilCursor(); }
    });

    canvas.addEventListener('pointermove', function (e) {
      if (!erasing) placePencil(e.clientX, e.clientY);
      if (!drawing) return;
      var p = canvasPos(e);
      if (lastPt) drawSegment(lastPt.x, lastPt.y, p.x, p.y);
      lastPt = p;
    });

    canvas.addEventListener('pointerleave', function () {
      hidePencilCursor();
      if (drawing && strokeStart) totalDrawMs += Date.now() - strokeStart;
      drawing = false; lastPt = null; strokeStart = null;
    });

    canvas.addEventListener('pointerdown', function (e) {
      drawing = true;
      if (!firstStrokeTime) firstStrokeTime = Date.now() - drawStartTime;
      strokeStart = Date.now();
      if (!erasing && colorChoices.indexOf(activeColor) === -1) colorChoices.push(activeColor);
      lastPt = canvasPos(e);
    });

    canvas.addEventListener('pointerup', function () {
      if (drawing && strokeStart) totalDrawMs += Date.now() - strokeStart;
      drawing = false; lastPt = null; strokeStart = null;
    });

    // Palette color clicks
    var fgIndicator = win.querySelector('.sk-paint-fg-color');
    win.querySelectorAll('.sk-paint-color').forEach(function (btn) {
      btn.addEventListener('click', function () {
        erasing = false;
        activeColor = btn.dataset.color;
        if (fgIndicator) fgIndicator.style.background = activeColor;
        win.querySelectorAll('.sk-paint-color').forEach(function (el) { el.classList.remove('active'); });
        win.querySelector('.sk-paint-eraser').classList.remove('active', 'sk-paint-tool--active');
        btn.classList.add('active');
        win.querySelector('[data-tool="pencil"]').classList.add('sk-paint-tool--active');
        canvas.style.cursor = 'none';
      });
    });

    // Eraser tool button
    var eraserBtn = win.querySelector('.sk-paint-eraser');
    if (eraserBtn) {
      eraserBtn.addEventListener('click', function () {
        erasing = true; eraserUsed = true;
        hidePencilCursor();
        win.querySelectorAll('.sk-paint-color').forEach(function (el) { el.classList.remove('active'); });
        win.querySelector('[data-tool="pencil"]').classList.remove('sk-paint-tool--active');
        eraserBtn.classList.add('active', 'sk-paint-tool--active');
        canvas.style.cursor = 'cell';
      });
    }

    // Done button — capture data and hand off to calibration
    endBtn.addEventListener('click', function () {
      pencilCursor.remove();
      var imgData = canvas.toDataURL('image/png');
      window.participantData = window.participantData || {};
      window.participantData.game2 = {
        drawing:           imgData,
        timeToFirstStroke: firstStrokeTime !== null ? firstStrokeTime : null,
        totalDrawingTime:  totalDrawMs,
        colorChoices:      colorChoices,
        eraserUsed:        eraserUsed,
        shakalaka_changed: eraserUsed,
        shakalaka_time_ms: window.participantData.shakalaka_start_time
          ? Date.now() - window.participantData.shakalaka_start_time
          : totalDrawMs,
      };
      console.log('[game2 end] game2SelectionTime (s):', (window.participantData.game2.shakalaka_time_ms / 1000).toFixed(2));
      console.log('[game2 end] game2Changed:', window.participantData.game2.shakalaka_changed);
      localStorage.setItem('game2SelectionTime', (window.participantData.game2.shakalaka_time_ms / 1000) || 0);
      localStorage.setItem('game2Changed',       window.participantData.game2.switched || false);
      showCalibrationScreen();
    });
  }

  // ─── GAME 1: DVD Corner Watch ──────────────────────────────────────────────

  const HUE_STEPS = [0, 60, 120, 180, 240, 300];

  function randomOtherHue(current) {
    const opts = HUE_STEPS.filter(h => h !== current);
    return opts[Math.floor(Math.random() * opts.length)];
  }

  function applyFilter(el, hue) {
    el.style.filter = `sepia(1) saturate(4) hue-rotate(${hue}deg)`;
  }

  function placeLogo(el, cx, cy, lw, lh) {
    el.style.left = (cx - lw / 2) + 'px';
    el.style.top  = (cy - lh / 2) + 'px';
  }

  function initGame1() {
    const container = document.getElementById('game-container');

    const card = document.createElement('div');
    card.className = 'game-card game1-card';
    card.innerHTML =
      '<div class="game1-arena" id="game1-arena">' +
        '<p class="game1-instruction">One of these keeps hitting the corner.<br>Find out which one.</p>' +
        '<div class="game1-points" id="game1-points">0 pts</div>' +
        '<div class="game1-attempts" id="game1-attempts">0 misses</div>' +
        '<button class="game1-end-btn" id="game1-end">end</button>' +
      '</div>';
    container.appendChild(card);

    requestAnimationFrame(() => requestAnimationFrame(() => card.classList.add('visible')));

    setTimeout(() => {
      const arena  = document.getElementById('game1-arena');
      const endBtn = document.getElementById('game1-end');
      runDVDGame(arena, endBtn, card);
    }, 60);
  }

  function runDVDGame(arena, endBtn, card) {
    const W = arena.clientWidth  || window.innerWidth;
    const H = arena.clientHeight || window.innerHeight;
    console.log('[DVD] start — W:', W, 'H:', H);

    const LOGO_W       = 72;
    const LOGO_H       = 32;
    const COUNT        = 6;
    const AVOID_MARGIN = 50;
    const MIN_DIST     = 80;

    const riggedId = Math.floor(Math.random() * COUNT);
    console.log('[DVD] riggedId:', riggedId);

    // Corner = logo center when it simultaneously touches both walls.
    // glowLeft/glowTop center the 200×200 game1-corner-glow div on the arena corner.
    // showCornerHit adds +20 offset to center the smaller 160×160 flash div.
    const EFFECTIVE_CORNERS = [
      { x: LOGO_W / 2,       y: LOGO_H / 2,       glowLeft: -100,    glowTop: -100    },
      { x: W - LOGO_W / 2,   y: LOGO_H / 2,       glowLeft: W - 100, glowTop: -100    },
      { x: LOGO_W / 2,       y: H - LOGO_H / 2,   glowLeft: -100,    glowTop: H - 100 },
      { x: W - LOGO_W / 2,   y: H - LOGO_H / 2,   glowLeft: W - 100, glowTop: H - 100 }
    ];

    let wrongClicks = 0;
    let points      = 0;
    const gameStart = performance.now();

    const pointsEl   = document.getElementById('game1-points');
    const attemptsEl = document.getElementById('game1-attempts');
    function updatePoints()   { pointsEl.textContent   = points + ' pts'; }
    function updateAttempts() { attemptsEl.textContent = wrongClicks + (wrongClicks === 1 ? ' miss' : ' misses'); }

    // ── Rigged logo state machine ─────────────────────────────────────────────
    // 'roaming'   — normal physics, behaves like every other logo
    // 'targeting' — three-phase approach guarantees corner arrival:
    //   Phase 1 (dist > 80px): direct velocity override at 1.8× speed
    //   Phase 2 (dist ≤ 80px): position lerp — mathematically cannot overshoot,
    //                           bypasses physics entirely, guaranteed convergence
    //   Phase 3 (dist < 4px):  snap to corner, fire visible flash, return to roaming
    let riggedState        = 'roaming';
    let riggedTargetCorner = null;
    // First trigger at 8–12 s; subsequent idle period is 10–15 s after each hit,
    // giving a total hit period of ~13–20 s (travel time is ≤ 6 s).
    let nextTriggerTime    = gameStart + 8000 + Math.random() * 4000;


    // ── Spread logos across a 3×2 grid with slight jitter ────────────────────
    const zones = [];
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 3; col++) {
        zones.push({ cx: (col + 0.5) * (W / 3), cy: (row + 0.5) * (H / 2) });
      }
    }
    zones.sort(() => Math.random() - 0.5);

    const huePool = HUE_STEPS.slice().sort(() => Math.random() - 0.5);
    const logos   = [];

    for (let i = 0; i < COUNT; i++) {
      const zone = zones[i];
      let sx = zone.cx + (Math.random() - 0.5) * 60;
      let sy = zone.cy + (Math.random() - 0.5) * 40;
      sx = Math.max(LOGO_W / 2, Math.min(W - LOGO_W / 2, sx));
      sy = Math.max(LOGO_H / 2, Math.min(H - LOGO_H / 2, sy));

      const angle = Math.random() * 2 * Math.PI;
      const speed = 2.5 + (Math.random() - 0.5) * 0.5;   // 2.25–2.75 px/frame
      const hue   = huePool[i];

      const el = document.createElement('img');
      el.src       = 'assets/images/Dvd-Logo.png';
      el.className = 'dvd-logo';
      el.style.width  = LOGO_W + 'px';
      el.style.height = LOGO_H + 'px';
      el.draggable = false;
      applyFilter(el, hue);
      placeLogo(el, sx, sy, LOGO_W, LOGO_H);
      arena.appendChild(el);

      // Click area matches the visible logo rectangle exactly (LOGO_W × LOGO_H).
      // The IIFE captures logoId and imgEl so the handler references the correct logo.
      (function (logoId, imgEl) {
        imgEl.addEventListener('pointerdown', function (e) {
          e.stopPropagation();
          if (!running) return;

          console.log('[DVD] click logoId:', logoId, '| riggedId:', riggedId, '| correct:', logoId === riggedId);
          if (logoId === riggedId) {
            // Correct — celebrate
            points += 350;
            updatePoints();
            running = false;
            endBtn.disabled = true;
            window.participantData.totalPoints = points;
            window.participantData.game1 = {
              wrongClicks:        wrongClicks,
              timeToCorrectClick: Math.round(performance.now() - gameStart),
              gotItRight:         true
            };
            console.log('game1 data:', window.participantData.game1);
            console.log('[game1 correct] totalPoints:', window.participantData.totalPoints);
            console.log('[game1 correct] game1Right:', window.participantData.game1.gotItRight);
            console.log('[game1 correct] game1WrongClicks:', window.participantData.game1.wrongClicks);
            localStorage.setItem('totalPoints',      window.participantData.totalPoints || 0);
            localStorage.setItem('game1Right',       window.participantData.game1.gotItRight);
            localStorage.setItem('game1WrongClicks', window.participantData.game1.wrongClicks || 0);
            triggerCelebration(logos[logoId]);
          } else {
            // Wrong — deduct, red flash, shake
            wrongClicks++;
            points -= 100;
            updatePoints();
            updateAttempts();
            console.log('[DVD wrong click] wrongClicks:', wrongClicks, '| points after deduction:', points);

            // Floating -100 label at click position
            var floatEl = document.createElement('div');
            floatEl.textContent = '-100';
            floatEl.style.cssText = 'position:absolute;font-family:"IBM Plex Mono",monospace;font-size:13px;color:#c45a5a;pointer-events:none;transition:opacity 0.6s ease,transform 0.6s ease;opacity:1;transform:translateY(0);z-index:99;';
            var arenaRect = arena.getBoundingClientRect();
            floatEl.style.left = (e.clientX - arenaRect.left) + 'px';
            floatEl.style.top  = (e.clientY - arenaRect.top)  + 'px';
            arena.appendChild(floatEl);
            requestAnimationFrame(function () {
              requestAnimationFrame(function () {
                floatEl.style.opacity   = '0';
                floatEl.style.transform = 'translateY(-28px)';
              });
            });
            setTimeout(function () { floatEl.remove(); }, 650);

            imgEl.style.filter = 'sepia(1) saturate(6) hue-rotate(-40deg) brightness(1.6)';
            setTimeout(function () { applyFilter(imgEl, logos[logoId].hue); }, 280);

            imgEl.classList.remove('wrong-shake');
            void imgEl.offsetWidth;
            imgEl.classList.add('wrong-shake');
          }
        });
      }(i, el));

      logos.push({
        id: i, x: sx, y: sy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        speed, hue, el, isRigged: i === riggedId
      });
    }

    // ── Physics loop ──────────────────────────────────────────────────────────
    let running = true;

    function tick() {
      if (!running) return;

      const now = performance.now();

      // Activate rigged logo targeting
      if (riggedState === 'roaming' && now >= nextTriggerTime) {
        riggedTargetCorner = EFFECTIVE_CORNERS[Math.floor(Math.random() * 4)];
        riggedState        = 'targeting';
        console.log('[DVD] targeting started → corner', riggedTargetCorner.x.toFixed(0), riggedTargetCorner.y.toFixed(0));
      }

      for (let i = 0; i < logos.length; i++) {
        const logo = logos[i];
        let { x, y, vx, vy } = logo;

        // ── Rigged logo in targeting state — isolated path, no physics ───────
        if (logo.isRigged && riggedState === 'targeting') {
          const dx   = riggedTargetCorner.x - x;
          const dy   = riggedTargetCorner.y - y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 4) {
            // ── Phase 3: arrived — snap, roam ────────────────────────────────
            console.log('[DVD] CORNER HIT at', Math.round((now - gameStart) / 1000) + 's');
            x = riggedTargetCorner.x;
            y = riggedTargetCorner.y;
            // Color change so it looks like a normal bounce
            logo.hue = randomOtherHue(logo.hue);
            applyFilter(logo.el, logo.hue);
            // Return to roaming; next hit 10–15 s from now
            riggedState     = 'roaming';
            nextTriggerTime = now + 10000 + Math.random() * 5000;
            // Kick away from corner at a natural angle
            const kickAngle = Math.atan2(y - H / 2, x - W / 2) + (Math.random() - 0.5) * 1.2;
            vx = Math.cos(kickAngle) * logo.speed;
            vy = Math.sin(kickAngle) * logo.speed;

          } else if (dist <= 80) {
            // ── Phase 2: close-in lerp — bypasses physics, cannot overshoot ──
            // New position is always between current and target; stays in bounds
            // because target is on the wall boundary (LOGO_W/2, LOGO_H/2, etc.)
            x += dx * 0.18;
            y += dy * 0.18;
            vx = x - logo.x;   // store delta as velocity for physics continuity
            vy = y - logo.y;

          } else {
            // ── Phase 1: far away — direct velocity toward corner ─────────────
            vx = (dx / dist) * logo.speed * 1.8;
            vy = (dy / dist) * logo.speed * 1.8;
            x += vx;
            y += vy;
            // Wall bounce during approach (re-aim fires next frame)
            let bounced = false;
            if (x - LOGO_W / 2 < 0)  { x = LOGO_W / 2;     vx =  Math.abs(vx); bounced = true; }
            if (x + LOGO_W / 2 > W)  { x = W - LOGO_W / 2; vx = -Math.abs(vx); bounced = true; }
            if (y - LOGO_H / 2 < 0)  { y = LOGO_H / 2;     vy =  Math.abs(vy); bounced = true; }
            if (y + LOGO_H / 2 > H)  { y = H - LOGO_H / 2; vy = -Math.abs(vy); bounced = true; }
            if (bounced) { logo.hue = randomOtherHue(logo.hue); applyFilter(logo.el, logo.hue); }
          }

          logo.x = x; logo.y = y; logo.vx = vx; logo.vy = vy;
          placeLogo(logo.el, x, y, LOGO_W, LOGO_H);
          continue;   // skip normal physics block for this logo this frame
        }

        // ── Normal physics (all logos while roaming, non-rigged always) ───────

        // Corner avoidance — keeps normal logos away from corners
        for (let c = 0; c < EFFECTIVE_CORNERS.length; c++) {
          const ec  = EFFECTIVE_CORNERS[c];
          const ddx = x - ec.x;
          const ddy = y - ec.y;
          const d   = Math.sqrt(ddx * ddx + ddy * ddy);
          if (d < AVOID_MARGIN && d > 0) {
            const push = (AVOID_MARGIN - d) / AVOID_MARGIN * 0.5;
            vx += (ddx / d) * push;
            vy += (ddy / d) * push;
          }
        }

        // Logo-logo repulsion (velocity only, no position pushback)
        for (let j = 0; j < logos.length; j++) {
          if (j === i) continue;
          const other = logos[j];
          const ddx   = x - other.x;
          const ddy   = y - other.y;
          const d     = Math.sqrt(ddx * ddx + ddy * ddy);
          if (d < MIN_DIST && d > 0) {
            const push = (MIN_DIST - d) / MIN_DIST * 0.35;
            vx += (ddx / d) * push;
            vy += (ddy / d) * push;
          }
        }

        // Renormalize to constant speed (with unstick guard)
        const s = Math.sqrt(vx * vx + vy * vy);
        if (s > 0.1) {
          vx = (vx / s) * logo.speed;
          vy = (vy / s) * logo.speed;
        } else {
          const a = Math.random() * 2 * Math.PI;
          vx = Math.cos(a) * logo.speed;
          vy = Math.sin(a) * logo.speed;
        }

        // Move
        x += vx;
        y += vy;

        // Wall bounce + clamp
        let bounced = false;
        if (x - LOGO_W / 2 < 0)  { x = LOGO_W / 2;     vx =  Math.abs(vx); bounced = true; }
        if (x + LOGO_W / 2 > W)  { x = W - LOGO_W / 2; vx = -Math.abs(vx); bounced = true; }
        if (y - LOGO_H / 2 < 0)  { y = LOGO_H / 2;     vy =  Math.abs(vy); bounced = true; }
        if (y + LOGO_H / 2 > H)  { y = H - LOGO_H / 2; vy = -Math.abs(vy); bounced = true; }
        if (bounced) {
          logo.hue = randomOtherHue(logo.hue);
          applyFilter(logo.el, logo.hue);
        }

        logo.x = x; logo.y = y; logo.vx = vx; logo.vy = vy;
        placeLogo(logo.el, x, y, LOGO_W, LOGO_H);
      }

      requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);

    // ── Celebration (correct click) ───────────────────────────────────────────
    function triggerCelebration(riggedLogo) {
      logos.forEach(function (logo) {
        if (logo.id !== riggedId) logo.el.style.opacity = '0.12';
      });

      let nearestCorner = EFFECTIVE_CORNERS[0];
      let minDist = Infinity;
      EFFECTIVE_CORNERS.forEach(function (c) {
        const d = Math.sqrt((riggedLogo.x - c.x) * (riggedLogo.x - c.x) +
                            (riggedLogo.y - c.y) * (riggedLogo.y - c.y));
        if (d < minDist) { minDist = d; nearestCorner = c; }
      });

      riggedLogo.el.style.transition = 'left 0.5s ease-in, top 0.5s ease-in';
      placeLogo(riggedLogo.el, nearestCorner.x, nearestCorner.y, LOGO_W, LOGO_H);

      setTimeout(function () {
        riggedLogo.el.style.filter = '';
        riggedLogo.el.classList.add('gold-burst');

        const glow = document.createElement('div');
        glow.className = 'game1-corner-glow';
        glow.style.left = nearestCorner.glowLeft + 'px';
        glow.style.top  = nearestCorner.glowTop  + 'px';
        arena.appendChild(glow);
        requestAnimationFrame(() => requestAnimationFrame(() => glow.classList.add('visible')));

        setTimeout(function () {
          const overlay = document.createElement('div');
          overlay.className = 'game1-result-overlay';

          const popup = document.createElement('div');
          popup.className = 'game1-popup';
          popup.innerHTML =
            '<p class="game1-popup-title">you found it.</p>' +
            '<p class="game1-popup-sub">your instincts are noted.</p>' +
            '<div class="game1-popup-btns">' +
              '<button class="game1-btn-secondary" id="game1-play-again">play again</button>' +
              '<button class="game1-btn-primary"   id="game1-next">next</button>' +
            '</div>';

          overlay.appendChild(popup);
          card.appendChild(overlay);
          requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add('visible')));

          document.getElementById('game1-play-again').addEventListener('click', function () {
            card.classList.remove('visible');
            setTimeout(function () {
              card.remove();
              initGame1();
            }, 400);
          });

          document.getElementById('game1-next').addEventListener('click', function () {
            card.classList.remove('visible');
            setTimeout(function () {
              card.style.display = 'none';
              showShakalaka();
            }, 650);
          });
        }, 400);
      }, 500);
    }

    // ── End button (bail out) ─────────────────────────────────────────────────
    endBtn.addEventListener('click', function () {
      running = false;

      window.participantData.game1 = {
        wrongClicks:        wrongClicks,
        timeToCorrectClick: Math.round(performance.now() - gameStart),
        gotItRight:         false
      };
      console.log('game1 data:', window.participantData.game1);
      console.log('[game1 end btn] totalPoints:', window.participantData.totalPoints);
      console.log('[game1 end btn] game1Right:', window.participantData.game1.gotItRight);
      console.log('[game1 end btn] game1WrongClicks:', window.participantData.game1.wrongClicks);
      localStorage.setItem('totalPoints',      window.participantData.totalPoints || 0);
      localStorage.setItem('game1Right',       window.participantData.game1.gotItRight);
      localStorage.setItem('game1WrongClicks', window.participantData.game1.wrongClicks || 0);

      card.classList.remove('visible');
      setTimeout(function () {
        card.style.display = 'none';
        showShakalaka();
      }, 650);
    });
  }

})();
