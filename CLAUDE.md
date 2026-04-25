# CLAUDE.md — The Exchange (EmotionalExchange)

## Project Overview

A concept web app that gamifies emotion-driven stock trading. Users earn "emotional points" through games and spend them trading fictional emotional indices and Indian company stocks. The core idea: emotions have market value.

**Stack:** Vanilla HTML/CSS/JS — no frameworks, no build step, no package.json. Runs directly in the browser via `file://` or any static server.

---

## Folder Structure

```
/
├── index.html          Landing page (scroll narrative + entry CTA)
├── market.html         Main trading dashboard (the primary UI)
├── games.html          Stub — empty, no logic yet
├── portfolio.html      Stub — empty, no logic yet
├── css/
│   ├── style.css       Global reset + base styles (15 lines only)
│   ├── market.css      All market page styles (~500 lines)
│   ├── games.css       Empty
│   └── portfolio.css   Empty
├── js/
│   ├── main.js         Global: window.exchangePoints, Exchange.addPoints()
│   ├── market.js       All market page logic (~350 lines)
│   ├── games.js        Empty
│   └── portfolio.js    Empty
└── assets/
    └── images/
        └── campacola.png   News card image (nostalgia story)
```

---

## Common Commands

No build system. Open files directly:

```bash
open index.html           # macOS — landing page
open market.html          # macOS — main dashboard

# Or serve with any static server:
python3 -m http.server 8080
npx serve .
```

No tests, no linter, no CI configured.

---

## Code Conventions

**HTML:** Semantic tags, classes only (no IDs for styling). Script tags at bottom of `<body>`. Pages load `main.js` first, then their page-specific JS.

**CSS:**
- BEM-adjacent naming: `.panel`, `.panel-header`, `.panel-title`, `.hm-block`, `.co-name`, etc.
- All colors are hex literals — no CSS variables. Core palette:
  - Background: `#0a0a0a` / panels: `#0f0f0f`
  - Text: `#e8e8e0` (primary), `#c8c8c0` (secondary), `#888880` (muted)
  - Borders: `#222222` (outer), `#1a1a1a` (inner)
  - Gold accent: `#c4a45a` (points, active states, gamezone)
  - Green: `#5a9c6a` (positive), Red: `#c45a5a` (negative)
  - Purple: `#7a5ac4` (envy), Blue: `#378add` (trust)
- Font: IBM Plex Mono everywhere, weights 300 and 400 only
- Borders: `0.5px solid` (thin hairlines throughout)
- Border-radius: `2px` (nearly square, consistent everywhere)

**JS:**
- Global state via `window.exchangePoints` (shared across pages)
- All data is hardcoded in `market.js` (INDEXES, COMPANIES, EMOTIONS_DATA, VALUES_DATA)
- Real-time simulation: 3 intervals — heatmap (4s), indexes (5s), companies (3s)
- Canvas sparklines use DPR correction: always read `canvas.getAttribute('width')` not `offsetWidth`
- Animation restart pattern: `el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls)`
- No event delegation — listeners attached directly in render functions

**Heatmap layout:** Treemap via nested flex. Outer grid is `flex-direction: column`, rows are `flex-direction: row`. Block sizes are `flex` values, animated every 4s with small random nudges.

---

## Important Context

- **games.html and portfolio.html are empty stubs.** They have nav/topbar HTML but no content or JS logic. This is intentional — not bugs.
- **No persistence.** `window.exchangePoints` resets on every page load. There is no localStorage, session storage, or backend.
- **`main.js` must load before page-specific JS.** It defines `window.exchangePoints`. All pages follow the pattern `<script src="js/main.js"></script>` then `<script src="js/[page].js"></script>`.
- **The landing page (`index.html`) has all its styles and JS inline** — there is no `index.css` or `index.js`. Do not try to extract them unless specifically asked.
- **Campa Cola image** must exist at `assets/images/campacola.png` — the file is present (150KB).
- **Emotion-to-color map** is defined in `EMOTION_COLOR` in `market.js` and also duplicated as `.emotion-pill.[name]` CSS classes in `market.css`. Both must stay in sync if emotions are added.
- The sidebar icon for the current page gets class `active` (gold color). Market page has index 0 active.
