// marketData.js — hidden company metadata, never displayed to the player

export const companyData = {
  'AMUL':  { nostalgiaScore: 85, emotion: 'Nostalgia', values: ['Trust', 'Belonging'] },
  'RJC':   { nostalgiaScore: 75, emotion: 'Nostalgia', values: ['Belonging', 'Trust'] },
  'DD.IN': { nostalgiaScore: 90, emotion: 'Nostalgia', values: ['Trust', 'Loyalty'] },
  'CDRY':  { nostalgiaScore: 80, emotion: 'Nostalgia', values: ['Trust', 'Belonging'] },
  'ZMT':   { nostalgiaScore: 0,  emotion: 'Anger',     values: ['Loyalty', 'Anxiety'] },
  'TNSQ':  { nostalgiaScore: 0,  emotion: 'Envy',      values: ['Belonging', 'Anxiety'] },
};

window.companyData = companyData;
