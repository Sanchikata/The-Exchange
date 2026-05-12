// market.js — market page logic

// ════════════════════════════════════════
//  DATA
// ════════════════════════════════════════
const INDEXES = [
  { name: 'Nostalgia Index', ticker: 'NX',  value: 284.2, change: 1.8,  color: '#c4a45a' },
  { name: 'Anger Index',     ticker: 'AX',  value: 198.4, change: 4.2,  color: '#c45a5a' },
  { name: 'Joy Index',       ticker: 'JX',  value: 143.6, change: -2.1, color: '#5a9c6a' },
  { name: 'Envy Index',      ticker: 'EX',  value: 312.8, change: 1.2,  color: '#7a5ac4' },
  { name: 'Anxiety Index',   ticker: 'ANX', value: 245.0, change: 2.8,  color: '#8b2635' },
];

const COMPANIES = [
  { name: 'Amul Dairy Co.',   ticker: 'AMUL',  price: 284.50, change: 2.4,  emotion: 'nostalgia', value: 'trust',     desc: 'Trust index holding steady. Memory capital high despite external pressure.' },
  { name: 'Reliance / Campa', ticker: 'RJC',   price: 412.80, change: -0.8, emotion: 'nostalgia', value: 'belonging', desc: 'Childhood memory capital activated through brand resurrection.' },
  { name: 'Zomato Ltd.',      ticker: 'ZMT',   price: 198.20, change: 5.1,  emotion: 'anger',     value: 'anxiety',   desc: 'Controversy spike driving visibility. Anger-to-anxiety conversion at 3 year high.' },
  { name: 'Tanishq',          ticker: 'TNSQ',  price: 654.10, change: 1.2,  emotion: 'envy',      value: 'anxiety',   desc: 'Aspiration index rising. Status-anxiety correlation confirmed.' },
  { name: 'Cadbury India',    ticker: 'CDRY',  price: 143.60, change: -3.3, emotion: 'happiness', value: 'trust',     desc: 'Joy index volatile. Seasonal dependency flagged. Trust buffer absorbing decline.' },
  { name: 'Doordarshan',      ticker: 'DD.IN', price: 88.40,  change: 0.6,  emotion: 'nostalgia', value: 'loyalty',   desc: 'Low velocity asset. Deep nostalgia index. Loyalty embedded in generational memory.' },
];

const EMOTION_COLOR = {
  nostalgia: '#c4a45a',
  anger:     '#c45a5a',
  happiness: '#5a9c6a',
  envy:      '#7a5ac4',
  trust:     '#378add',
  loyalty:   '#5a9c6a',
  belonging: '#c4a45a',
  anxiety:   '#8b2635',
};

// Sparkline history for company table
const CO_HISTORY = COMPANIES.map(co =>
  Array.from({ length: 20 }, () => co.price + (Math.random() - 0.5) * 8)
);

// ════════════════════════════════════════
//  POINTS DISPLAY
// ════════════════════════════════════════
function refreshPoints() {
  const pts = window.exchangePoints || 0;
  const el = document.getElementById('points-display');
  if (el) el.textContent = pts + ' emotional points';
  const gz = document.getElementById('gamezone-points');
  if (gz) gz.textContent = 'Your points : ' + pts;
}

// On page load: read points passed in URL from games/portfolio pages.
(function () {
  const pts = parseInt(new URLSearchParams(window.location.search).get('pts'), 10) || 0;
  window.exchangePoints = pts;
  refreshPoints();
  if (pts > 0) {
    ['headerPortfolioBtn', 'genPortfolioBtn', 'genPortfolioMiniBtn'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.style.display = id === 'genPortfolioBtn' ? 'flex' : 'inline-block';
    });
    history.replaceState(null, '', location.pathname);
    startTradeTimer();
  }
})();

// ════════════════════════════════════════
//  HEATMAP
// ════════════════════════════════════════
const EMOTIONS_DATA = [
  { name: 'Nostalgia', color: '#c4a45a', value: 284.2, change: '+1.8%', topCo: 'Amul Dairy Co.', companies: [{ name: 'Amul Dairy', ticker: 'AMUL' }, { name: 'Reliance/Campa', ticker: 'RJC' }, { name: 'Doordarshan', ticker: 'DD.IN' }] },
  { name: 'Anger',     color: '#c45a5a', value: 198.4, change: '+4.2%', topCo: 'Zomato Ltd.',    companies: [{ name: 'Zomato', ticker: 'ZMT' }] },
  { name: 'Happiness', color: '#5a9c6a', value: 143.6, change: '-2.1%', topCo: 'Cadbury India',  companies: [{ name: 'Cadbury India', ticker: 'CDRY' }] },
  { name: 'Envy',      color: '#7a5ac4', value: 312.8, change: '+1.2%', topCo: 'Tanishq',        companies: [{ name: 'Tanishq', ticker: 'TNSQ' }] },
];
const VALUES_DATA = [
  { name: 'Trust',     color: '#378add', value: 220.0, change: '+0.9%', topCo: 'Amul Dairy Co.', companies: [{ name: 'Amul Dairy', ticker: 'AMUL' }, { name: 'Cadbury India', ticker: 'CDRY' }] },
  { name: 'Loyalty',   color: '#5a9c6a', value: 185.3, change: '+2.1%', topCo: 'Doordarshan',    companies: [{ name: 'Doordarshan', ticker: 'DD.IN' }] },
  { name: 'Anxiety',   color: '#8b2635', value: 210.7, change: '+2.8%', topCo: 'Zomato Ltd.',    companies: [{ name: 'Zomato', ticker: 'ZMT' }, { name: 'Tanishq', ticker: 'TNSQ' }] },
  { name: 'Belonging', color: '#c4a45a', value: 248.5, change: '+1.4%', topCo: 'Tanishq',        companies: [{ name: 'Tanishq', ticker: 'TNSQ' }, { name: 'Reliance/Campa', ticker: 'RJC' }] },
];

let currentHmType = 'emotions';

function makeBlock(d, flexVal) {
  const isNeg = d.change.startsWith('-');
  const changeColor = isNeg ? 'rgba(196,90,90,0.95)' : 'rgba(90,156,106,0.95)';
  const coHtml = d.companies.slice(0, 3).map(c =>
    `<div class="hm-co-item"><span class="hm-co-name">${c.name}</span><span class="hm-co-ticker">${c.ticker}</span></div>`
  ).join('');
  const block = document.createElement('div');
  block.className = 'hm-block';
  block.style.flex       = String(flexVal);
  block.style.background = d.color;
  block.innerHTML =
    `<div class="hm-name">${d.name}</div>` +
    `<div class="hm-value">${d.value.toFixed(1)}</div>` +
    `<div class="hm-pct" style="color:${changeColor}">${d.change}</div>` +
    `<div class="hm-companies">${coHtml}</div>`;
  block.addEventListener('mouseenter', e => showTip(e, d));
  block.addEventListener('mousemove',  e => moveTip(e));
  block.addEventListener('mouseleave', hideTip);
  return block;
}

function makeRow(flexVal) {
  const row = document.createElement('div');
  row.className = 'hm-row';
  row.style.flex = String(flexVal);
  return row;
}

function renderHeatmap(type) {
  const grid = document.getElementById('heatmap-grid');
  grid.innerHTML = '';

  if (type === 'emotions') {
    // Nostalgia largest, Envy second, Anger third, Happiness smallest
    // Row 1 (flex:3): Nostalgia(flex:3) | Envy(flex:2)
    // Row 2 (flex:2): Anger(flex:2)     | Happiness(flex:1)
    const nos = EMOTIONS_DATA.find(d => d.name === 'Nostalgia');
    const env = EMOTIONS_DATA.find(d => d.name === 'Envy');
    const ang = EMOTIONS_DATA.find(d => d.name === 'Anger');
    const hap = EMOTIONS_DATA.find(d => d.name === 'Happiness');

    const row1 = makeRow(3);
    row1.appendChild(makeBlock(nos, 3));
    row1.appendChild(makeBlock(env, 2));

    const row2 = makeRow(2);
    row2.appendChild(makeBlock(ang, 2));
    row2.appendChild(makeBlock(hap, 1));

    grid.appendChild(row1);
    grid.appendChild(row2);
  } else {
    // Values: proportional vertical bars sized by traded value
    const total = VALUES_DATA.reduce((s, d) => s + d.value, 0);
    const row = makeRow(1);
    VALUES_DATA.forEach(d => {
      row.appendChild(makeBlock(d, (d.value / total * VALUES_DATA.length).toFixed(3)));
    });
    grid.appendChild(row);
  }
}

function switchHeatmap(type) {
  currentHmType = type;
  document.getElementById('toggle-emotions').classList.toggle('active', type === 'emotions');
  document.getElementById('toggle-values').classList.toggle('active', type === 'values');
  renderHeatmap(type);
}

// Animate heatmap block sizes every 4 s
setInterval(() => {
  document.querySelectorAll('.hm-row').forEach(row => {
    const cur = parseFloat(row.style.flex);
    row.style.flex = Math.max(0.5, cur + (Math.random() - 0.5) * 0.25).toFixed(3);
  });
  document.querySelectorAll('.hm-block').forEach(b => {
    const cur = parseFloat(b.style.flex);
    b.style.flex = Math.max(0.3, cur + (Math.random() - 0.5) * 0.18).toFixed(3);
  });
}, 4000);

// ── Tooltip ──
const tip = document.getElementById('hm-tooltip');
function showTip(e, d) {
  const isNeg = d.change.startsWith('-');
  tip.innerHTML =
    `<div style="color:#e8e8e0;margin-bottom:3px;font-size:12px">${d.name}</div>` +
    `<div>Index: <span style="color:#c4a45a">${d.value.toFixed(1)}</span></div>` +
    `<div>24h: <span style="color:${isNeg ? '#c45a5a' : '#5a9c6a'}">${d.change}</span></div>` +
    `<div style="color:#666660">Top: ${d.topCo}</div>`;
  tip.style.display = 'block';
  moveTip(e);
}
function moveTip(e) {
  tip.style.left = (e.clientX + 14) + 'px';
  tip.style.top  = (e.clientY - tip.offsetHeight - 10) + 'px';
}
function hideTip() { tip.style.display = 'none'; }

// ════════════════════════════════════════
//  LINE CHART (replaces sparkline)
// ════════════════════════════════════════
function drawSparkline(canvas, history, color) {
  if (!canvas) return;
  // Cache original CSS dimensions before the first write — setting canvas.width
  // updates the attribute, so subsequent getAttribute calls would return the
  // already-scaled value and the canvas would grow with every DPR multiplication.
  if (!canvas.dataset.cssW) {
    canvas.dataset.cssW = canvas.getAttribute('width')  || '60';
    canvas.dataset.cssH = canvas.getAttribute('height') || '20';
  }
  const dpr  = window.devicePixelRatio || 1;
  const cssW = parseInt(canvas.dataset.cssW);
  const cssH = parseInt(canvas.dataset.cssH);
  canvas.width  = cssW * dpr;
  canvas.height = cssH * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  const W = cssW, H = cssH;
  const pad = 2;
  const min = Math.min(...history);
  const max = Math.max(...history);
  const range = max - min || 1;

  const px = i => (i / (history.length - 1)) * W;
  const py = v => H - pad - ((v - min) / range) * (H - pad * 2);

  // Gradient fill under the line
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, color + '55');
  grad.addColorStop(1, color + '00');
  ctx.beginPath();
  history.forEach((v, i) => {
    i === 0 ? ctx.moveTo(px(i), py(v)) : ctx.lineTo(px(i), py(v));
  });
  ctx.lineTo(px(history.length - 1), H);
  ctx.lineTo(px(0), H);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Line
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.2;
  ctx.lineJoin = 'round';
  history.forEach((v, i) => {
    i === 0 ? ctx.moveTo(px(i), py(v)) : ctx.lineTo(px(i), py(v));
  });
  ctx.stroke();

  // Dot at latest point
  const lx = px(history.length - 1);
  const ly = py(history[history.length - 1]);
  ctx.beginPath();
  ctx.arc(lx, ly, 1.8, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

// ════════════════════════════════════════
//  INDEXES
// ════════════════════════════════════════
function renderIndexes() {
  const row = document.getElementById('indexes-row');
  row.innerHTML = '';
  INDEXES.forEach((idx, i) => {
    const card = document.createElement('div');
    card.className = 'index-card';
    const cls  = idx.change >= 0 ? 'pos' : 'neg';
    const sign = idx.change >= 0 ? '+' : '';
    card.innerHTML =
      `<div class="index-name">${idx.name}</div>` +
      `<div class="index-ticker" style="color:${idx.color}">${idx.ticker}</div>` +
      `<div class="index-value" id="iv${i}">${idx.value.toFixed(1)}</div>` +
      `<div class="index-change ${cls}" id="ic${i}">${sign}${idx.change.toFixed(1)}%</div>`;
    row.appendChild(card);
  });
}

// ════════════════════════════════════════
//  COMPANY TABLE
// ════════════════════════════════════════
function renderCompanies() {
  const tbody = document.getElementById('company-tbody');
  tbody.innerHTML = '';
  COMPANIES.forEach((co, i) => {
    const cls  = co.change >= 0 ? 'pos' : 'neg';
    const sign = co.change >= 0 ? '+' : '';
    const row  = document.createElement('tr');
    row.innerHTML =
      `<td class="co-name">${co.name}</td>` +
      `<td class="co-ticker">${co.ticker}</td>` +
      `<td><span class="emotion-pill ${co.emotion}">${co.emotion}</span></td>` +
      `<td><span class="emotion-pill ${co.value}">${co.value}</span></td>` +
      `<td class="co-price" id="cp${i}">&#x20B9;${co.price.toFixed(2)}</td>` +
      `<td class="co-chg ${cls}" id="cc${i}">${sign}${co.change.toFixed(1)}%</td>` +
      `<td><canvas id="cs${i}" width="60" height="20"></canvas></td>`;
    row.addEventListener('click', () => openDetail(i));
    tbody.appendChild(row);
    requestAnimationFrame(() => drawSparkline(document.getElementById('cs' + i), CO_HISTORY[i], EMOTION_COLOR[co.emotion]));
  });
}

// ════════════════════════════════════════
//  SLIDE-IN DETAIL PANEL
// ════════════════════════════════════════
let activeIdx = null;

function openDetail(i) {
  activeIdx = i;
  const co   = COMPANIES[i];
  const cls  = co.change >= 0 ? 'pos' : 'neg';
  const sign = co.change >= 0 ? '+' : '';
  document.getElementById('detail-body').innerHTML =
    `<div class="detail-co-name">${co.name}</div>` +
    `<div class="detail-ticker">${co.ticker}</div>` +
    `<div class="detail-tags">` +
      `<span class="emotion-pill ${co.emotion}">${co.emotion}</span>` +
      `<span class="emotion-pill ${co.value}">${co.value}</span>` +
    `</div>` +
    `<p class="detail-desc">${co.desc}</p>` +
    `<div class="detail-price" id="dp">&#x20B9;${co.price.toFixed(2)}</div>` +
    `<div class="detail-chg ${cls}" id="dc">${sign}${co.change.toFixed(1)}%</div>` +
    `<div class="detail-btns">` +
      `<button class="btn-buy"  onclick="doBuy()">Buy</button>` +
      `<button class="btn-sell" onclick="doSell()">Sell</button>` +
    `</div>` +
    `<div class="trade-cost">cost per trade: 10 emotional points</div>` +
    `<div id="trade-feedback" style="font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:0.08em;margin-top:10px;opacity:0;transition:opacity 0.3s;"></div>`;
  document.getElementById('detail-panel').classList.add('open');
  document.getElementById('detail-overlay').classList.add('open');
}

function closeDetail() {
  activeIdx = null;
  document.getElementById('detail-panel').classList.remove('open');
  document.getElementById('detail-overlay').classList.remove('open');
}

function saveTrade(type) {
  if (activeIdx === null) return;
  const co = COMPANIES[activeIdx];
  const trade = { type, name: co.name, ticker: co.ticker, price: +co.price.toFixed(2), emotion: co.emotion, change: co.change, ts: Date.now() };
  window.ExchangeSession.trades.push(trade);
  localStorage.setItem('exchange_trades', JSON.stringify(window.ExchangeSession.trades));
}

function flashTrade(msg, ok) {
  const el = document.getElementById('trade-feedback');
  if (!el) return;
  el.textContent = msg;
  el.style.color = ok ? '#5a9c6a' : '#c45a5a';
  el.style.opacity = '1';
  clearTimeout(window._tradeFadeTimer);
  window._tradeFadeTimer = setTimeout(() => { el.style.opacity = '0'; }, 1800);
}

function doBuy() {
  if ((window.exchangePoints || 0) < 10) { flashTrade('INSUFFICIENT POINTS', false); return; }
  window.exchangePoints -= 10;
  localStorage.setItem('exchange_total_pts', window.exchangePoints);
  refreshPoints();
  saveTrade('buy');
  flashTrade('BUY CONFIRMED', true);
  refreshPortfolioBtn();
}
function doSell() {
  window.exchangePoints = (window.exchangePoints || 0) + 7;
  localStorage.setItem('exchange_total_pts', window.exchangePoints);
  refreshPoints();
  saveTrade('sell');
  flashTrade('SELL CONFIRMED', true);
  refreshPortfolioBtn();
}

// ════════════════════════════════════════
//  INDEXES — tick every 5 s with flash
// ════════════════════════════════════════
setInterval(() => {
  // Anxiety values heatmap block: ±3.5% per tick (more volatile than others)
  const anx = VALUES_DATA.find(d => d.name === 'Anxiety');
  if (anx) {
    const delta = (Math.random() - 0.5) * anx.value * 0.07; // ±3.5%
    anx.value = Math.max(10, anx.value + delta);
    const pct = (delta / (anx.value - delta)) * 100;
    anx.change = (pct >= 0 ? '+' : '') + pct.toFixed(1) + '%';
  }

  INDEXES.forEach((idx, i) => {
    const prev = idx.value;
    idx.value  = Math.max(10, idx.value + (Math.random() - 0.5) * 2);
    idx.change += (Math.random() - 0.5) * 0.15;

    const valEl = document.getElementById('iv' + i);
    const chgEl = document.getElementById('ic' + i);
    if (valEl) {
      valEl.textContent = idx.value.toFixed(1);
      const fc = idx.value >= prev ? 'flash-pos' : 'flash-neg';
      valEl.classList.remove('flash-pos', 'flash-neg');
      void valEl.offsetWidth; // reflow to restart animation
      valEl.classList.add(fc);
    }
    if (chgEl) {
      const cls = idx.change >= 0 ? 'pos' : 'neg';
      const sign = idx.change >= 0 ? '+' : '';
      chgEl.className = 'index-change ' + cls;
      chgEl.textContent = sign + idx.change.toFixed(1) + '%';
    }
  });
}, 5000);

// ════════════════════════════════════════
//  COMPANIES — tick every 3 s
// ════════════════════════════════════════
setInterval(() => {
  // Companies
  COMPANIES.forEach((co, i) => {
    co.price  = Math.max(1, co.price  + (Math.random() - 0.5) * 2);
    co.change += (Math.random() - 0.5) * 0.15;
    CO_HISTORY[i].push(co.price);
    CO_HISTORY[i].shift();

    const priceEl = document.getElementById('cp' + i);
    const chgEl   = document.getElementById('cc' + i);
    const sparkEl = document.getElementById('cs' + i);
    if (priceEl) priceEl.textContent = '\u20B9' + co.price.toFixed(2);
    if (chgEl) {
      const cls = co.change >= 0 ? 'pos' : 'neg';
      const sign = co.change >= 0 ? '+' : '';
      chgEl.className = 'co-chg ' + cls;
      chgEl.textContent = sign + co.change.toFixed(1) + '%';
    }
    drawSparkline(sparkEl, CO_HISTORY[i], EMOTION_COLOR[co.emotion]);
  });

  // Update open detail panel price
  if (activeIdx !== null) {
    const co = COMPANIES[activeIdx];
    const dp = document.getElementById('dp');
    const dc = document.getElementById('dc');
    if (dp) dp.textContent = '\u20B9' + co.price.toFixed(2);
    if (dc) {
      const cls = co.change >= 0 ? 'pos' : 'neg';
      const sign = co.change >= 0 ? '+' : '';
      dc.className = 'detail-chg ' + cls;
      dc.textContent = sign + co.change.toFixed(1) + '%';
    }
  }
}, 3000);

// ════════════════════════════════════════
//  TIMEFRAME BUTTONS
// ════════════════════════════════════════
function activateTf(btn) {
  document.querySelectorAll('.tf-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

// ════════════════════════════════════════
//  PORTFOLIO NAVIGATION — POST receipt first, then navigate
// ════════════════════════════════════════
function navigateToPortfolio() {
  const sid    = window.ExchangeSession.sid;
  const trades = window.ExchangeSession.trades;
  const params = new URLSearchParams(window.location.search);
  const ni     = params.get('ni') || '';
  const wc     = params.get('wc') || '';
  const gr     = params.get('gr') || '';
  const pts    = params.get('pts') || window.exchangePoints || 0;

  function go(sid) {
    var url = 'portfolio.html?pts=' + pts
      + (ni  ? '&ni=' + ni   : '')
      + (wc  ? '&wc=' + wc   : '')
      + (gr  ? '&gr=' + gr   : '')
      + (sid ? '&sid=' + sid : '');
    window.location.href = url;
  }

  if (sid && trades.length > 0) {
    window.DB.saveReceipt(sid, trades)
      .then(function ()        { go(sid); })
      .catch(function (err) {
        console.error('Receipt save failed:', err);
        go(sid);
      });
  } else {
    go(sid);
  }
}

// ════════════════════════════════════════
//  INIT
// ════════════════════════════════════════
renderHeatmap('emotions');
renderIndexes();
renderCompanies();
refreshPoints();

// Load any trades persisted from a previous page visit in this session
(function () {
  var stored = JSON.parse(localStorage.getItem('exchange_trades') || '[]');
  window.ExchangeSession.trades = stored;
})();

function goToPortfolio() {
  var pts = window.exchangePoints || 0;
  localStorage.setItem('exchange_total_pts', pts);
  window.location.href = 'portfolio.html?pts=' + pts;
}

function refreshPortfolioBtn() {
  // no-op: button visibility is set once on load when ?pts arrives from a game
}

function startTradeTimer() {
  var timerEl  = document.getElementById('headerTimer');
  var display  = document.getElementById('timerDisplay');
  var overlay  = document.getElementById('timeoutOverlay');
  if (!timerEl || !display || !overlay) return;

  timerEl.style.display = 'flex';
  var remaining = 180;

  function tick() {
    var m = Math.floor(remaining / 60);
    var s = remaining % 60;
    display.textContent = m + ':' + (s < 10 ? '0' : '') + s;
    if (remaining <= 30) display.classList.add('urgent');
    if (remaining <= 0) {
      overlay.classList.add('visible');
      return;
    }
    remaining--;
    setTimeout(tick, 1000);
  }
  tick();
}

// ════════════════════════════════════════
//  VALUE DELTA — apply session market impact
// ════════════════════════════════════════
(function applyValueDelta() {
  const delta = JSON.parse(localStorage.getItem('valueDelta') || '{}');
  const nos   = parseInt(localStorage.getItem('nostalgiaIndex')) || 0;

  if (nos <= 40 || !Object.keys(delta).length) return;

  // 1. Price adjustments
  const nostalgiaSet = new Set(['AMUL', 'RJC', 'DD.IN', 'CDRY']);
  const anxietySet   = new Set(['ZMT', 'TNSQ']);
  const priceBoost   = (+(delta.belonging || 0) + +(delta.trust || 0)) / nostalgiaSet.size;
  const priceCut     = Math.abs(+(delta.anxiety || 0)) / anxietySet.size;

  COMPANIES.forEach((co, i) => {
    if (nostalgiaSet.has(co.ticker)) {
      co.price = Math.max(1, co.price + priceBoost);
      const el = document.getElementById('cp' + i);
      if (el) el.textContent = '\u20B9' + co.price.toFixed(2);
    } else if (anxietySet.has(co.ticker)) {
      co.price = Math.max(1, co.price - priceCut);
      const el = document.getElementById('cp' + i);
      if (el) el.textContent = '\u20B9' + co.price.toFixed(2);
    }
  });

  // 2. Flash rows whose value pill is in the affected set
  const affectedValues = new Set(['belonging', 'trust', 'loyalty', 'anxiety']);
  document.querySelectorAll('#company-tbody tr').forEach(row => {
    const pills = row.querySelectorAll('.emotion-pill');
    if (pills.length < 2) return;
    if (!affectedValues.has(pills[1].textContent.trim().toLowerCase())) return;
    row.style.transition = 'background 0s';
    row.style.background = 'rgba(196,164,90,0.18)';
    setTimeout(() => {
      row.style.transition = 'background 1s ease';
      row.style.background = '';
    }, 50);
  });

  // 3. Notification bar
  const notif = document.createElement('div');
  notif.textContent = 'your session has moved the market.';
  Object.assign(notif.style, {
    position:   'fixed',
    top:        '44px',
    left:       '48px',
    right:      '0',
    textAlign:  'center',
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize:   '11px',
    fontWeight: '300',
    color:      '#c4a45a',
    letterSpacing: '0.06em',
    padding:    '5px 0',
    zIndex:     '200',
    opacity:    '1',
    transition: 'opacity 0.8s ease',
    pointerEvents: 'none',
    borderBottom: '0.5px solid #1a1a1a',
  });
  document.body.appendChild(notif);
  setTimeout(() => { notif.style.opacity = '0'; }, 4000);
  setTimeout(() => { notif.remove(); }, 4800);

  // 4. Clear so it doesn't persist across sessions
  localStorage.removeItem('valueDelta');
})();
