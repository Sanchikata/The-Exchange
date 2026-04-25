/* happiness.js — quiz selection + quiz runner + matchmaking + session save */

// ── Constants ────────────────────────────────────────────────────────────────
const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL   = 'claude-sonnet-4-20250514';

const QUIZZES = {
  splitsvilla: {
    title:  'Which Splitsvilla X6 Contestant Are You?',
    topic:  null,
    prefix: 'You are'
  },
  bollywood: {
    title:  'Which Bollywood Era Are You?',
    topic:  null,
    prefix: 'You are'
  },
  srishti: {
    title:  'Who Would You Be Friends With at Srishti, If It Was Computer Coded?',
    topic:  null,
    prefix: 'You are'
  }
};

// ── Srishti quiz — hardcoded questions ───────────────────────────────────────
const SRISHTI_QUESTIONS = [
  {
    text: 'You\'re stuck on a multiple choice question and none of the answers feel obvious. What do you do?',
    options: [
      'Go with the first answer that felt right, instinct is usually correct.',
      'Eliminate the ones that are definitely wrong and work backwards.',
      'Pick the most detailed answer, it\'s usually the most thought through.',
      'Go with the safest middle option when in doubt.'
    ]
  },
  {
    text: 'Your laptop freezes mid-work. What\'s your first move?',
    options: [
      'Restart immediately, simplest fix usually works.',
      'Google the specific error, fix it properly from the root.',
      'Close the heaviest apps first and see if that helps.',
      'Leave it for a few minutes, sometimes it just needs a moment.'
    ]
  },
  {
    text: 'You have a two week deadline for a project. When do you actually start?',
    options: [
      'Day one, spread it out, no stress.',
      'After the first week once you have a clearer head.',
      'A few days before, pressure helps you focus.',
      'The night before, you do your best work under the wire.'
    ]
  },
  {
    text: 'You\'re casually browsing a shopping site and see \'Only 1 left — 47 people have this in their cart\'.',
    options: [
      'Add to cart immediately, that kind of demand means it\'s worth it.',
      'Check if you actually need it first, then decide.',
      'Screenshot it to think about later, but probably buy it.',
      'Scroll past, if it was a real need you\'d have searched for it.'
    ]
  },
  {
    text: 'A group project misses its deadline because one member didn\'t deliver. What\'s your reaction?',
    options: [
      'Address it directly with that person, they need to own it.',
      'Absorb it as a team loss and focus on what\'s next.',
      'Wish someone had said something earlier but move on.',
      'Think about how the group structure could have prevented it.'
    ]
  },
  {
    text: 'You wore a shirt your partner gifted you and aced a major test. Next big test coming up — do you wear it again?',
    options: [
      'Absolutely, why risk breaking something that worked.',
      'No, the result was purely because I prepared well.',
      'Maybe, it can\'t hurt even if it probably means nothing.',
      'Depends on how prepared I feel going in.'
    ]
  }
];

// answer index 0=A, 1=B, 2=C, 3=D
const SRISHTI_BIAS_MAP = [
  ['scarcity',  'optimism',  'social',     'belief'   ],  // Q1
  ['ikea',      'optimism',  'groupthink', 'belief'   ],  // Q2
  ['scarcity',  'social',    'groupthink', 'ikea'     ],  // Q3
  ['belief',    'optimism',  'scarcity',   'groupthink'],  // Q4
  ['optimism',  'belief',    'scarcity',   'groupthink'],  // Q5
  ['social',    'optimism',  'ikea',       'groupthink']   // Q6
];

const SRISHTI_RESULTS = {
  scarcity: {
    title: 'You are The Early Access Friend',
    description: 'You move before the moment becomes a movement. At Srishti, you\'d be friends with the person who read the book before it became a TED Talk, wore the label before anyone could spell it, and treats every recommendation like a limited drop. Exclusivity isn\'t snobbery to them — it\'s just taste with a timestamp.'
  },
  optimism: {
    title: 'You are The Perpetual Beta Friend',
    description: 'You see every system as a draft waiting to be improved. At Srishti, your person is always mid-pivot, has three half-finished projects and a strong thesis about why the fourth one\'s different. They don\'t need certainty — they need potential, and they carry it in abundance.'
  },
  social: {
    title: 'You are The Studio Anchor Friend',
    description: 'Every studio has one person who holds the room together — your match is exactly that. They remember everyone\'s brief, suggest the unexpected collab, and make the work feel like it means something because it\'s shared. For you, value lives in the network, not just the node.'
  },
  belief: {
    title: 'You are The Clear Thesis Friend',
    description: 'Your Srishti match has a point of view and doesn\'t apologise for it. They\'ve thought about things longer than most, work from first principles, and have a near-physical discomfort with compromise. The work they make tends to be unmistakably theirs — and you respect that completely.'
  },
  ikea: {
    title: 'You are The Obsessive Maker Friend',
    description: 'Process is the point for your Srishti match — not just the outcome. They\'ve modified, rebuilt, prototyped, and iterated their way through everything they own. You admire the commitment to doing things yourself, the resistance to shortcuts. If they hand you something they made, you know it cost them something real.'
  },
  groupthink: {
    title: 'You are The Room-Reader Friend',
    description: 'Your match always knows what the meta is. They feel the energy of a critique before it\'s said out loud, pick up references that are circulating before they surface, and move in sync with what\'s gaining momentum. In a space that\'s constantly shifting, knowing where the room is headed is its own kind of intelligence.'
  }
};

function getSrishtiResult(answers) {
  const scores = { scarcity: 0, optimism: 0, social: 0, belief: 0, ikea: 0, groupthink: 0 };
  answers.forEach((a, i) => {
    const bias = SRISHTI_BIAS_MAP[i][a.optionIndex];
    if (bias) scores[bias]++;
  });
  const dominant = Object.keys(scores).reduce((a, b) => scores[a] >= scores[b] ? a : b);
  return SRISHTI_RESULTS[dominant];
}

// ── Bollywood quiz — hardcoded questions ─────────────────────────────────────
const BOLLYWOOD_QUESTIONS = [
  {
    text: 'Your friends are planning a trip. What\'s your role?',
    options: [
      'The one who planned everything two weeks ago including a backup plan.',
      'The one who brought the speaker and knows every song.',
      'The one who suggested it spontaneously and made everyone say yes.',
      'The one who almost didn\'t come but ended up having the best time.',
      'The one documenting everything while also somehow being present.'
    ]
  },
  {
    text: 'Pick the party you\'re most likely to actually enjoy:',
    options: [
      'Small gathering, close people, long conversations.',
      'Big loud celebration, dancing, everyone\'s invited.',
      'Rooftop with good music and better company.',
      'Something underground and slightly unconventional.',
      'You\'re hosting it, everything is perfectly curated.'
    ]
  },
  {
    text: 'How do you deal with a problem you can\'t immediately solve?',
    options: [
      'Sit with it, think it through carefully before acting.',
      'Talk it out with someone you trust completely.',
      'Distract yourself and come back to it fresh.',
      'Attack it head on immediately, figure it out as you go.',
      'Reframe it entirely — maybe it\'s not actually a problem.'
    ]
  },
  {
    text: 'What does your ideal film ending look like?',
    options: [
      'Everyone gets what they deserve, justice served.',
      'The couple ends up together after everything.',
      'Bittersweet — real life doesn\'t always wrap up neatly.',
      'Open ended, the audience decides what happens next.',
      'Unexpected, nothing you saw coming but it makes perfect sense.'
    ]
  },
  {
    text: 'Someone wrongs you. What do you do?',
    options: [
      'Confront them directly, you don\'t let things slide.',
      'Forgive eventually, holding grudges costs you more.',
      'Move on quickly, you don\'t have the energy for it.',
      'Process it privately, act unbothered, never fully forget.',
      'Turn it into something — fuel, art, motivation.'
    ]
  }
];

// answer index 0=A, 1=B, 2=C, 3=D, 4=E
const BOLLYWOOD_ERA_MAP = [
  ['80s',   '90s', '2000s', '2010s', '2020s'],  // Q1
  ['2010s', '90s', '2000s', '2020s', '80s'  ],  // Q2
  ['80s',   '90s', '2000s', '2010s', '2020s'],  // Q3
  ['80s',   '90s', '2010s', '2020s', '2000s'],  // Q4
  ['80s',   '90s', '2000s', '2010s', '2020s']   // Q5
];

const BOLLYWOOD_RESULTS = {
  '80s': {
    title: 'You are The Angry Young Hero',
    description: 'You have conviction and you act on it. You believe in justice, you don\'t wait for permission, and when something is wrong you say so. You\'re the person people rally around even when they\'re not sure why yet.'
  },
  '90s': {
    title: 'You are The Eternal Romantic',
    description: 'Everything means something to you. Friendships, moments, the right song at the right time. You lead with feeling and people feel safe around you because of it. You probably still remember exactly how certain days felt.'
  },
  '2000s': {
    title: 'You are The Cool & Carefree',
    description: 'You make things look easy because for you they usually are. You don\'t overthink, you show up, you make it fun. People gravitate toward your energy without being able to explain exactly why.'
  },
  '2010s': {
    title: 'You are The Realistic Dreamer',
    description: 'You want big things but you\'re not delusional about what it takes. You feel deeply but process quietly. You\'re the person who seems fine until you\'re really not, and even then you handle it better than most would.'
  },
  '2020s': {
    title: 'You are The Experimental Outsider',
    description: 'You don\'t fit neatly into any box and you stopped trying to. You\'re drawn to things that haven\'t been done yet and you\'re comfortable sitting with uncertainty longer than most people can. The mainstream bores you and that\'s not a pose, it\'s just true.'
  }
};

function getBollywoodResult(answers) {
  const eras     = ['80s', '90s', '2000s', '2010s', '2020s'];
  const scores   = {};
  const firstSeen = {};
  eras.forEach(e => { scores[e] = 0; firstSeen[e] = Infinity; });

  answers.forEach((a, i) => {
    const era = BOLLYWOOD_ERA_MAP[i][a.optionIndex];
    if (era) {
      scores[era]++;
      if (firstSeen[era] === Infinity) firstSeen[era] = i;
    }
  });

  const maxScore = Math.max(...eras.map(e => scores[e]));
  const tied     = eras.filter(e => scores[e] === maxScore);
  const dominant = tied.length === 1
    ? tied[0]
    : tied.reduce((a, b) => firstSeen[a] <= firstSeen[b] ? a : b);

  return BOLLYWOOD_RESULTS[dominant];
}

// ── Splitsvilla X6 quiz — hardcoded questions ────────────────────────────────
const SPLITSVILLA_QUESTIONS = [
  {
    text: 'It\'s the first day in the villa. What\'s your move?',
    options: [
      'Observe quietly, you\'ll make your move when you know the room.',
      'Be loud, funny, make everyone laugh immediately.',
      'Find the most attractive person and introduce yourself.',
      'Make a strategic alliance before anyone else does.'
    ]
  },
  {
    text: 'Someone in the villa is clearly playing you. What do you do?',
    options: [
      'Call them out publicly, everyone deserves to know.',
      'Play along until you can use it against them.',
      'Pull them aside privately, give them a chance to explain.',
      'Quietly distance yourself, no drama.'
    ]
  },
  {
    text: 'There\'s a task that could win you immunity but you\'d have to go against your closest ally. You:',
    options: [
      'Win the task, game is game, they\'ll understand.',
      'Let them win, loyalty matters more than immunity.',
      'Find a way to make it look close but let it slide.',
      'Talk to them first and decide together.'
    ]
  },
  {
    text: 'Your ideal villa evening looks like:',
    options: [
      'Deep conversation with one person you actually like.',
      'Group hangout, the more chaotic the better.',
      'Planning your next move while pretending to relax.',
      'Doing something physical, a task, a game, staying sharp.'
    ]
  },
  {
    text: 'Someone new walks into the villa and immediately gets all the attention. Your reaction:',
    options: [
      'Introduce yourself first, establish your presence.',
      'Watch how everyone else reacts before doing anything.',
      'Make a joke about it and keep the energy light.',
      'Feel it but don\'t show it, redirect your energy.'
    ]
  }
];

// answer index 0=A, 1=B, 2=C, 3=D
const SPLITSVILLA_SCORE_MAP = [
  ['Sadhaaf',    'Gullu',    'Tayne',    'Diksha'   ],  // Q1
  ['Chakshdeep', 'Akanksha', 'Yogesh',   'Niharika' ],  // Q2
  ['Diksha',     'Yogesh',   'Anisha',   'Niharika' ],  // Q3
  ['Sadhaaf',    'Gullu',    'Akanksha', 'Chakshdeep'],  // Q4
  ['Tayne',      'Sadhaaf',  'Gullu',    'Ayush'    ]   // Q5
];

const SPLITSVILLA_RESULTS = {
  'Diksha': {
    title: 'You are Diksha Pawar',
    description: 'You play with your head, not your heart. You walk in knowing what you want and you don\'t apologise for going after it. People either respect you or are threatened by you. Usually both.'
  },
  'Yogesh': {
    title: 'You are Yogesh Rawat',
    description: 'You\'re the person everyone trusts and nobody expects to be as sharp as you are. You lead with warmth but you\'re not naive. That combination is rarer than people think.'
  },
  'Sadhaaf': {
    title: 'You are Sadhaaf Shankar',
    description: 'You move quietly and people underestimate you for it. You\'re observant, composed, and when you do make a move it lands harder because nobody saw it coming.'
  },
  'Gullu': {
    title: 'You are Gullu (Kushal Tanwar)',
    description: 'You make the whole room feel lighter just by being in it. Your humour is your armour and also genuinely just who you are. You\'re harder to read than you look.'
  },
  'Akanksha': {
    title: 'You are Akanksha Choudhary',
    description: 'You have a plan and a backup plan. You\'re elegant about it so most people don\'t realise until it\'s already happened. Underestimating you is the most common mistake people make.'
  },
  'Chakshdeep': {
    title: 'You are Chakshdeep Singh',
    description: 'You say what you mean and mean what you say. You don\'t do subtle and you don\'t do fake. People know exactly where they stand with you which is either refreshing or uncomfortable depending on who they are.'
  },
  'Anisha': {
    title: 'You are Anisha Shinde',
    description: 'You understand how you\'re being perceived and you use it well. You\'re self-aware enough to know the camera is always on and sharp enough to use that without it feeling calculated.'
  },
  'Tayne': {
    title: 'You are Tayne De Villiers',
    description: 'You lead with confidence and an open energy that makes people want to be around you. You\'re direct without being aggressive and that\'s genuinely difficult to pull off.'
  },
  'Niharika': {
    title: 'You are Niharika Tiwari',
    description: 'You feel everything but you process quietly. You\'re not drama-free, you\'re just drama-smart. You know when to hold your ground and when to let something go.'
  },
  'Ayush': {
    title: 'You are Ayush Sharma',
    description: 'You\'re the one playing the long game. You don\'t need to win every moment because you\'re thinking about the end. People mistake your calm for passivity and that\'s exactly how you like it.'
  }
};

function getSplitsvillaResult(answers) {
  const contestants = ['Sadhaaf', 'Gullu', 'Tayne', 'Diksha', 'Chakshdeep', 'Akanksha', 'Yogesh', 'Niharika', 'Anisha', 'Ayush'];
  const scores    = {};
  const firstSeen = {};
  contestants.forEach(c => { scores[c] = 0; firstSeen[c] = Infinity; });

  answers.forEach((a, i) => {
    const c = SPLITSVILLA_SCORE_MAP[i][a.optionIndex];
    if (c) {
      scores[c]++;
      if (firstSeen[c] === Infinity) firstSeen[c] = i;
    }
  });

  const maxScore = Math.max(...contestants.map(c => scores[c]));
  const tied     = contestants.filter(c => scores[c] === maxScore);
  const dominant = tied.length === 1
    ? tied[0]
    : tied.reduce((a, b) => firstSeen[a] <= firstSeen[b] ? a : b);

  return SPLITSVILLA_RESULTS[dominant];
}

// ── Top-level participant name (persists across retakes) ─────────────────────
let participantName = '';

// ── Quizzes completed this session (persists across quiz switches) ────────────
// Populated in showResult(); deduped so retakes don't add duplicates.
let quizzesTaken = [];

// ── Per-attempt state (reset on each quiz start / retake) ────────────────────
let S = {};

function resetState(quizId) {
  const retakeKey = 'retake_' + quizId;
  S = {
    quizId,
    questions:      [],
    answers:        [],      // [{ optionIndex, optionText }]
    currentQ:       0,
    selectedOpt:    null,
    qStartTime:     null,
    resultTitle:    '',
    matchedPersona:     null,    // string: "Name — Archetype"
    shareIntent:        null,    // boolean
    satisfactionRating: null,    // 1–5
    tracking: {
      perQ:         [],      // [{ timeMs, answerChanges, firstAnswered }]
      retakeCount:  parseInt(sessionStorage.getItem(retakeKey) || '0')
    }
  };
}

// ── Screen manager ────────────────────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(el => {
    el.classList.toggle('active', el.id === id);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN 0 — Name input
// ─────────────────────────────────────────────────────────────────────────────
function submitName() {
  const val = document.getElementById('name-field').value.trim();
  if (!val) {
    document.getElementById('name-hint').textContent = 'Please enter your name to continue.';
    document.getElementById('name-field').focus();
    return;
  }
  document.getElementById('name-hint').textContent = '';
  participantName = val;
  showScreen('quiz-selection');
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN 1 — Quiz selection
// ─────────────────────────────────────────────────────────────────────────────
function exitQuiz() {
  showScreen('quiz-selection');
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN 2 — Quiz runner
// ─────────────────────────────────────────────────────────────────────────────

// ── Claude API ──
async function callClaude(systemPrompt, userPrompt) {
  const key = window.ANTHROPIC_API_KEY;
  if (!key) throw new Error('API key not set — edit js/config.js.');

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    })
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }
  const data = await res.json();
  return data.content[0].text;
}

function parseJSON(raw) {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  return JSON.parse(fenced ? fenced[1] : raw.trim());
}

async function fetchQuestions(quizId) {
  if (quizId === 'splitsvilla') return SPLITSVILLA_QUESTIONS;
  if (quizId === 'bollywood')   return BOLLYWOOD_QUESTIONS;
  if (quizId === 'srishti')     return SRISHTI_QUESTIONS;
  const q = QUIZZES[quizId];
  const raw = await callClaude(
    'You generate fun, surface-level BuzzFeed-style personality quiz questions. Light, playful, relatable — never deep or psychological. Return ONLY valid JSON, no markdown.',
    `Generate exactly 5 fun personality quiz questions for "${q.title}". Topic context: ${q.topic}. Each question must have exactly 4 short, distinct answer options. Breezy and social-media-friendly. Return: {"questions":[{"text":"...","options":["...","...","...","..."]}]}`
  );
  return parseJSON(raw).questions;
}

async function fetchResult(quizId, answers) {
  const q = QUIZZES[quizId];
  const summary = answers.map((a, i) => `Q${i + 1}: ${a.optionText}`).join('\n');
  const raw = await callClaude(
    'You generate fun, specific, witty BuzzFeed-style quiz results. Creative and personal — avoid generic answers. Return ONLY valid JSON, no markdown.',
    `Quiz: "${q.title}"\nAnswers:\n${summary}\n\nGive a fun, specific result. Title must begin with "${q.prefix}". Return: {"title":"${q.prefix} [specific result]","description":"One or two witty sentences personal to this result."}`
  );
  return parseJSON(raw);
}

async function enterQuiz(id) {
  resetState(id);
  showScreen('quiz-run');
  setLoading(true, 'Generating questions...');
  try {
    S.questions = await fetchQuestions(id);
    setLoading(false);
    renderQuestion(0);
  } catch (e) {
    showLoadingError(e.message);
  }
}

function setLoading(on, label) {
  const loadEl = document.getElementById('quiz-loading');
  const bodyEl = document.getElementById('quiz-body');
  loadEl.classList.toggle('visible', on);
  bodyEl.classList.toggle('visible', !on);
  if (label) document.getElementById('quiz-loading-label').textContent = label;
}

function showLoadingError(msg) {
  document.getElementById('quiz-loading').innerHTML = `
    <p class="result-error">${msg}</p>
    <button class="quiz-retake-btn" onclick="exitQuiz()" style="margin-top:16px">&#x2190; Back</button>
  `;
}

function renderQuestion(index) {
  const q    = S.questions[index];
  const wrap = document.getElementById('quiz-question-wrap');
  const n    = S.questions.length;

  document.getElementById('quiz-progress-text').textContent = `${index + 1} / ${n}`;
  document.getElementById('quiz-progress-bar-fill').style.width = `${(index / n) * 100}%`;

  const optionsHTML = q.options
    .map((opt, i) => `<button class="option-btn" onclick="selectOption(this, ${i})">${opt}</button>`)
    .join('');

  wrap.innerHTML = `
    <div class="quiz-question slide-in">
      <span class="question-number">Q${index + 1} of ${n}</span>
      <p class="question-text">${q.text}</p>
      <div class="options-grid">${optionsHTML}</div>
    </div>
  `;

  S.selectedOpt = null;
  S.qStartTime  = Date.now();
  S.tracking.perQ[index] = { timeMs: 0, answerChanges: 0, firstAnswered: false };

  const nextBtn = document.getElementById('quiz-next-btn');
  nextBtn.disabled    = true;
  nextBtn.textContent = (index === n - 1) ? 'See result' : 'Next \u2192';
}

function selectOption(el, index) {
  const track = S.tracking.perQ[S.currentQ];
  if (S.selectedOpt === index) return;

  if (track.firstAnswered) {
    track.answerChanges++;
  } else {
    track.firstAnswered = true;
  }

  S.selectedOpt = index;
  document.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
  document.getElementById('quiz-next-btn').disabled = false;
}

function nextQuestion() {
  const i   = S.currentQ;
  const opt = S.selectedOpt;

  S.tracking.perQ[i].timeMs = Date.now() - S.qStartTime;
  S.answers[i] = { optionIndex: opt, optionText: S.questions[i].options[opt] };

  if (i < S.questions.length - 1) {
    const qEl = document.querySelector('.quiz-question');
    if (qEl) {
      qEl.classList.remove('slide-in');
      void qEl.offsetWidth;
      qEl.classList.add('slide-out');
    }
    setTimeout(() => {
      S.currentQ++;
      renderQuestion(S.currentQ);
    }, 180);
  } else {
    if (S.quizId === 'splitsvilla') {
      showResult(getSplitsvillaResult(S.answers));
    } else if (S.quizId === 'bollywood') {
      showResult(getBollywoodResult(S.answers));
    } else if (S.quizId === 'srishti') {
      showResult(getSrishtiResult(S.answers));
    } else {
      setLoading(true, 'Calculating your result...');
      fetchResult(S.quizId, S.answers)
        .then(result => showResult(result))
        .catch(e     => showResultError(e.message));
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN 3 — Result
// ─────────────────────────────────────────────────────────────────────────────
function showResult(result) {
  S.resultTitle = result.title;

  // Record this quiz as completed (reaching the result screen).
  // Deduped by quiz ID so retakes don't create duplicate entries.
  const quizLabel = { splitsvilla: 'quiz1', bollywood: 'quiz2', srishti: 'quiz3' }[S.quizId];
  if (quizLabel && !quizzesTaken.includes(quizLabel)) {
    quizzesTaken.push(quizLabel);
  }

  // Update happiness score display in the top bar
  const rc = S.tracking.retakeCount;
  const pts = rc === 0 ? 100 : -30 + (rc - 1) * 20;
  const scoreEl = document.getElementById('happiness-score-display');
  if (scoreEl) {
    scoreEl.textContent = (pts >= 0 ? '+' : '') + pts + ' happiness pts';
    scoreEl.style.display = 'inline';
  }

  const avgMs   = S.tracking.perQ.reduce((s, p) => s + p.timeMs, 0) / S.tracking.perQ.length;
  const changes = S.tracking.perQ.reduce((s, p) => s + p.answerChanges, 0);

  document.getElementById('result-inner').innerHTML = `
    <span class="result-label">Result</span>
    <h2 class="result-title">${result.title}</h2>
    <p class="result-desc">${result.description}</p>
    <div class="result-divider"></div>
    <p class="result-stats">
      avg. response time ${(avgMs / 1000).toFixed(1)}s
      &nbsp;&middot;&nbsp;
      answer changes ${changes}
      &nbsp;&middot;&nbsp;
      retakes ${S.tracking.retakeCount}
    </p>
    <div class="result-actions">
      <button class="quiz-next-btn" onclick="showSatisfaction()">Continue &#x2192;</button>
      <button class="quiz-retake-btn" onclick="retakeQuiz()">Retake</button>
    </div>
  `;

  showScreen('quiz-result');
}

function showResultError(msg) {
  document.getElementById('result-inner').innerHTML = `
    <span class="result-label">Error</span>
    <p class="result-error">${msg}</p>
    <div class="result-actions">
      <button class="quiz-retake-btn" onclick="exitQuiz()">&#x2190; Back</button>
    </div>
  `;
  showScreen('quiz-result');
}

function retakeQuiz() {
  const retakeKey = 'retake_' + S.quizId;
  const count = parseInt(sessionStorage.getItem(retakeKey) || '0') + 1;
  sessionStorage.setItem(retakeKey, count);
  enterQuiz(S.quizId);
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN 3.5 — Satisfaction
// ─────────────────────────────────────────────────────────────────────────────
function showSatisfaction() {
  // Reset state and UI
  S.satisfactionRating = null;
  document.querySelectorAll('.satisfaction-btn').forEach(b => b.classList.remove('selected'));
  document.getElementById('satisfaction-next-btn').disabled = true;
  showScreen('quiz-satisfaction');
}

function selectSatisfaction(el, value) {
  document.querySelectorAll('.satisfaction-btn').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
  S.satisfactionRating = value;
  document.getElementById('satisfaction-next-btn').disabled = false;
}

function submitSatisfaction() {
  showScreen('quiz-share');
  document.querySelectorAll('#quiz-share .option-btn').forEach(b => b.classList.remove('selected'));
  document.getElementById('share-submit-btn').disabled = true;
  S.shareIntent = null;
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN 5 — Share intent
// ─────────────────────────────────────────────────────────────────────────────
function selectShare(el, value) {
  document.querySelectorAll('#quiz-share .option-btn').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
  S.shareIntent = value;
  document.getElementById('share-submit-btn').disabled = false;
}

async function submitSession() {
  const btn = document.getElementById('share-submit-btn');
  btn.disabled    = true;
  btn.textContent = 'Saving...';

  try {
    await saveHappinessSession();
    showDone();
  } catch (e) {
    // Surface the error inline, re-enable so they can retry
    btn.disabled    = false;
    btn.textContent = 'Submit';
    const wrap = document.querySelector('.share-wrap');
    let errEl = wrap.querySelector('.save-error');
    if (!errEl) {
      errEl = document.createElement('p');
      errEl.className = 'save-error result-error';
      errEl.style.marginTop = '12px';
      wrap.appendChild(errEl);
    }
    errEl.textContent = 'Save failed: ' + e.message;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN 6 — Done
// ─────────────────────────────────────────────────────────────────────────────
function showDone() {
  document.getElementById('done-title').textContent = `Thanks, ${participantName}.`;
  showScreen('quiz-done');
}

function startOver() {
  // Clear name and session-level engagement tracking
  participantName = '';
  quizzesTaken    = [];
  document.getElementById('name-field').value = '';
  document.getElementById('name-hint').textContent = '';
  showScreen('name-input');
}

// ─────────────────────────────────────────────────────────────────────────────
// Supabase — save happiness session
// ─────────────────────────────────────────────────────────────────────────────
async function saveHappinessSession() {
  const db = window.supabaseClient;
  if (!db) throw new Error('Supabase client not available.');

  // Happiness points formula:
  //   0 retakes → +100 | 1 retake → -30 | each after → -30 + (n-1)*20
  const rc = S.tracking.retakeCount;
  const happinessPoints = rc === 0 ? 100 : -30 + (rc - 1) * 20;
  const happinessIndex  = happinessPoints / 70;
  if (typeof Exchange !== 'undefined') Exchange.addPoints(Math.max(0, happinessPoints));
  console.log('[happiness] happinessPoints:', happinessPoints, '| happinessIndex:', happinessIndex);

  const quizSatisfactionCol = {
    splitsvilla: 'quiz_1_satisfaction',
    bollywood:   'quiz_2_satisfaction',
    srishti:     'quiz_3_satisfaction'
  }[S.quizId] || null;

  const payload = {
    participant_name: participantName,
    quiz_topic:       S.quizId,
    retake_count:     S.tracking.retakeCount,
    share_intent:     S.shareIntent,
    matched_persona:  S.matchedPersona,
    happiness_points: happinessPoints,
    happiness_index:  happinessIndex,
    quizzes_taken:    quizzesTaken.join(', '),
    quiz_count:       quizzesTaken.length,
  };
  if (quizSatisfactionCol) {
    payload[quizSatisfactionCol] = S.satisfactionRating;
  }
  console.log('[happiness] INSERT payload:', JSON.stringify(payload, null, 2));

  const { error } = await db
    .from('happiness_sessions')
    .insert(payload);

  if (error) throw new Error(error.message);
}

// ── Points display sync ───────────────────────────────────────────────────────
(function syncPoints() {
  const el = document.getElementById('points-display');
  if (!el) return;
  function update() {
    el.textContent = (window.exchangePoints || 0) + ' emotional points';
  }
  update();
  setInterval(update, 2000);
})();

// ── Init ──────────────────────────────────────────────────────────────────────
showScreen('name-input');
