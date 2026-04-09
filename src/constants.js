export const GRID_SIZE = 15;
export const CELL_SIZE = 40;
export const BOARD_PX = GRID_SIZE * CELL_SIZE; // 600
export const TICK_MS = 120;

export const COLORS = {
  bg: '#0d0d0d',
  board: '#111111',
  gold: '#e0c050',
  bodyStart: '#8B4513',
  bodyEnd: '#D2B48C',
  gridLine: '#1a1a1a',
};

export const DIRECTIONS = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
};

export const SWIPE_THRESHOLD = 30;
export const HIGH_SCORE_KEY = 'strait-high-score';
