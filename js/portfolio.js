// portfolio.js — session setup and data wiring

document.addEventListener('DOMContentLoaded', () => {

  const params = new URLSearchParams(window.location.search);

  const nostalgiaIndex = parseFloat(params.get('ni')) || 0;
  localStorage.setItem('nostalgiaIndex', nostalgiaIndex);

  const nos = nostalgiaIndex;
  const valueDelta = nos > 40 ? {
    belonging: +(nos * 0.60).toFixed(1),
    trust:     +(nos * 0.30).toFixed(1),
    loyalty:   +(nos * 0.10).toFixed(1),
    anxiety:   -(nos * 0.15).toFixed(1),
  } : { belonging: 0, trust: 0, loyalty: 0, anxiety: 0 };

  localStorage.setItem('valueDelta', JSON.stringify(valueDelta));

  const sessionId = params.get('sid') || (window.ExchangeSession && window.ExchangeSession.sid) || null;
  if (sessionId && window.ExchangeSession) window.ExchangeSession.sid = sessionId;

});
