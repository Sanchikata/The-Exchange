// main.js — global session tracking and shared utilities

window.exchangePoints = parseInt(localStorage.getItem('exchange_total_pts') || '0', 10);

// In-memory session state — sid and trades survive only for this page load.
// sid is re-seeded from the URL on each navigation so it threads through pages.
window.ExchangeSession = {
  sid:    new URLSearchParams(window.location.search).get('sid') || null,
  trades: [],
};

const Exchange = {
  session: {
    startTime: Date.now(),
    points: 0,
  },

  addPoints(n) {
    this.session.points += n;
    window.exchangePoints += n;
    localStorage.setItem('exchange_total_pts', window.exchangePoints);
  },
};
