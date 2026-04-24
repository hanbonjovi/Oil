export const GRID_COLS = 12;
export const GRID_ROWS = 20;
export const CELL_SIZE = 50;
export const BORDER = 24;
export const BOARD_W = GRID_COLS * CELL_SIZE; // 600
export const BOARD_H = GRID_ROWS * CELL_SIZE; // 1000
export const SVG_W = BOARD_W + BORDER * 2;
export const SVG_H = BOARD_H + BORDER * 2;

export const THEMES = {
  dark: {
    bg: '#0a1628',
    board: '#0e1f3d',
    gold: '#e0c050',
    bodyStart: '#8B4513',
    bodyEnd: '#D2B48C',
    gridLine: '#142a4a',
    text: '#e0c050',
    overlay: 'rgba(10,22,40,0.9)',
    oilFill: '#1a1a1a',
    oilStroke: '#e0c050',
    oilHighlight: '#e0c050',
    border: '#c2a66b',
    btnBg: '#1a1a1a',
    btnBorder: '#e0c050',
    btnText: '#e0c050',
  },
  light: {
    bg: '#87CEEB',
    board: '#a8d8ea',
    gold: '#b8860b',
    bodyStart: '#8B4513',
    bodyEnd: '#D2B48C',
    gridLine: '#92c5d9',
    text: '#2a1a0a',
    overlay: 'rgba(135,206,235,0.92)',
    oilFill: '#222',
    oilStroke: '#b8860b',
    oilHighlight: '#b8860b',
    border: '#c2a66b',
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
