export const GRID_SIZE = 12;
export const CELL_SIZE = 50;
export const BOARD_PX = GRID_SIZE * CELL_SIZE; // 600
export const TICK_MS = 120;

export const THEMES = {
  dark: {
    bg: '#0d0d0d',
    board: '#111111',
    gold: '#e0c050',
    bodyStart: '#8B4513',
    bodyEnd: '#D2B48C',
    gridLine: '#1a1a1a',
    text: '#e0c050',
    overlay: 'rgba(0,0,0,0.85)',
    oilFill: '#1a1a1a',
    oilStroke: '#e0c050',
    oilHighlight: '#e0c050',
    btnBg: '#1a1a1a',
    btnBorder: '#e0c050',
    btnText: '#e0c050',
  },
  light: {
    bg: '#f0ebe0',
    board: '#e8e0d0',
    gold: '#b8860b',
    bodyStart: '#8B4513',
    bodyEnd: '#D2B48C',
    gridLine: '#d4cbb8',
    text: '#3a2a0a',
    overlay: 'rgba(240,235,224,0.9)',
    oilFill: '#222',
    oilStroke: '#b8860b',
    oilHighlight: '#b8860b',
    btnBg: '#e8e0d0',
    btnBorder: '#b8860b',
    btnText: '#3a2a0a',
  },
};

export const DIRECTIONS = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
};

export const SWIPE_THRESHOLD = 30;
export const HIGH_SCORE_KEY = 'strait-high-score';
