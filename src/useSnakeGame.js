import { useState, useRef, useCallback, useEffect } from 'react';
import { GRID_COLS, GRID_ROWS, DIRECTIONS, HIGH_SCORE_KEY } from './constants';

const START_TICK = 216;
const MIN_TICK = 80;
const SPEED_STEP = 5;
const GOLD_CHANCE = 0.16;
const GOLD_LIFETIME_MS = 6000;
const GOLD_POINTS = 3;
const TANKER_SCORES = [6, 14, 24, 36];
const TANKER_LEN = 3;

const START_Y = Math.floor(GRID_ROWS / 2);

function isBlocked(x, y, snake, obstacleCells, food) {
  if (snake.some((s) => s.x === x && s.y === y)) return true;
  if (obstacleCells.some((o) => o.x === x && o.y === y)) return true;
  if (food && food.x === x && food.y === y) return true;
  return false;
}

function placeFood(snake, obstacleCells, score) {
  let x, y;
  do {
    x = Math.floor(Math.random() * GRID_COLS);
    y = Math.floor(Math.random() * GRID_ROWS);
  } while (isBlocked(x, y, snake, obstacleCells, null));
  const gold = score >= 3 && Math.random() < GOLD_CHANCE;
  return { x, y, gold, expiresAt: gold ? Date.now() + GOLD_LIFETIME_MS : null };
}

function placeTanker(snake, obstacleCells, food) {
  const head = snake[0];
  for (let attempt = 0; attempt < 60; attempt++) {
    const horizontal = Math.random() < 0.5;
    const maxX = horizontal ? GRID_COLS - TANKER_LEN : GRID_COLS - 1;
    const maxY = horizontal ? GRID_ROWS - 1 : GRID_ROWS - TANKER_LEN;
    const x0 = Math.floor(Math.random() * (maxX + 1));
    const y0 = Math.floor(Math.random() * (maxY + 1));
    const cells = [];
    for (let i = 0; i < TANKER_LEN; i++) {
      cells.push({ x: x0 + (horizontal ? i : 0), y: y0 + (horizontal ? 0 : i) });
    }
    // keep tankers a few cells away from the head so they never spawn on top of the player
    const ok = cells.every((c) =>
      !isBlocked(c.x, c.y, snake, obstacleCells, food) &&
      Math.abs(c.x - head.x) + Math.abs(c.y - head.y) >= 4
    );
    if (ok) return { cells, horizontal };
  }
  return null;
}

export default function useSnakeGame(onEvent) {
  const snakeRef = useRef([{ x: 4, y: START_Y }, { x: 3, y: START_Y }, { x: 2, y: START_Y }]);
  const dirRef = useRef(DIRECTIONS.RIGHT);
  const nextDirRef = useRef(null);
  const foodRef = useRef({ x: 8, y: START_Y, gold: false, expiresAt: null });
  const intervalRef = useRef(null);
  const tickMsRef = useRef(START_TICK);
  const tankersRef = useRef([]);
  const obstacleCellsRef = useRef([]);
  const tankerIdxRef = useRef(0);

  const eventRef = useRef(onEvent);
  eventRef.current = onEvent;

  const [, setRenderTick] = useState(0);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    try {
      return parseInt(localStorage.getItem(HIGH_SCORE_KEY)) || 0;
    } catch {
      return 0;
    }
  });
  const [gameState, setGameState] = useState('idle');
  const gameStateRef = useRef('idle');
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  const scoreRef = useRef(0);
  const tickRef = useRef(null);

  const gameOver = useCallback(() => {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
    const finalScore = scoreRef.current;
    setHighScore((prev) => {
      const best = Math.max(prev, finalScore);
      try {
        localStorage.setItem(HIGH_SCORE_KEY, best);
      } catch {}
      return best;
    });
    setGameState('gameover');
    if (eventRef.current) eventRef.current({ type: 'gameover', score: finalScore });
  }, []);

  const restartInterval = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => tickRef.current(), tickMsRef.current);
  }, []);

  const tick = useCallback(() => {
    // gold barrel expires: replace with a normal one elsewhere
    if (foodRef.current.gold && Date.now() > foodRef.current.expiresAt) {
      foodRef.current = placeFood(snakeRef.current, obstacleCellsRef.current, 0);
    }

    if (nextDirRef.current) {
      dirRef.current = nextDirRef.current;
      nextDirRef.current = null;
    }

    const snake = snakeRef.current;
    const dir = dirRef.current;
    const newHead = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

    if (newHead.x < 0 || newHead.x >= GRID_COLS || newHead.y < 0 || newHead.y >= GRID_ROWS) {
      gameOver();
      return;
    }

    if (snake.some((s) => s.x === newHead.x && s.y === newHead.y)) {
      gameOver();
      return;
    }

    if (obstacleCellsRef.current.some((o) => o.x === newHead.x && o.y === newHead.y)) {
      gameOver();
      return;
    }

    const food = foodRef.current;
    const ate = newHead.x === food.x && newHead.y === food.y;
    const newSnake = [newHead, ...snake];

    if (ate) {
      const points = food.gold ? GOLD_POINTS : 1;
      scoreRef.current += points;
      setScore(scoreRef.current);
      if (eventRef.current) {
        eventRef.current({ type: 'eat', gold: food.gold, points, x: newHead.x, y: newHead.y });
      }

      while (tankerIdxRef.current < TANKER_SCORES.length && scoreRef.current >= TANKER_SCORES[tankerIdxRef.current]) {
        const tanker = placeTanker(newSnake, obstacleCellsRef.current, null);
        if (tanker) {
          tankersRef.current = [...tankersRef.current, tanker];
          obstacleCellsRef.current = tankersRef.current.flatMap((t) => t.cells);
        }
        tankerIdxRef.current += 1;
      }

      foodRef.current = placeFood(newSnake, obstacleCellsRef.current, scoreRef.current);

      const newTickMs = Math.max(MIN_TICK, tickMsRef.current - SPEED_STEP);
      if (newTickMs !== tickMsRef.current) {
        tickMsRef.current = newTickMs;
        restartInterval();
      }
    } else {
      newSnake.pop();
    }

    snakeRef.current = newSnake;
    setRenderTick((t) => t + 1);
  }, [gameOver, restartInterval]);

  tickRef.current = tick;

  const startGame = useCallback(() => {
    snakeRef.current = [{ x: 4, y: START_Y }, { x: 3, y: START_Y }, { x: 2, y: START_Y }];
    dirRef.current = DIRECTIONS.RIGHT;
    nextDirRef.current = null;
    scoreRef.current = 0;
    tickMsRef.current = START_TICK;
    tankersRef.current = [];
    obstacleCellsRef.current = [];
    tankerIdxRef.current = 0;
    setScore(0);
    foodRef.current = placeFood(snakeRef.current, [], 0);
    setGameState('playing');

    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => tickRef.current(), START_TICK);
  }, []);

  const pauseGame = useCallback(() => {
    if (gameStateRef.current !== 'playing') return;
    clearInterval(intervalRef.current);
    intervalRef.current = null;
    setGameState('paused');
  }, []);

  const resumeGame = useCallback(() => {
    if (gameStateRef.current !== 'paused') return;
    setGameState('playing');
    restartInterval();
  }, [restartInterval]);

  // auto-pause when the tab/app goes to the background
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) pauseGame();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onVisibility);
    };
  }, [pauseGame]);

  const changeDirection = useCallback((dirName) => {
    const newDir = DIRECTIONS[dirName];
    if (!newDir) return;
    const cur = nextDirRef.current || dirRef.current;
    if (newDir.x + cur.x === 0 && newDir.y + cur.y === 0) return;
    nextDirRef.current = newDir;
  }, []);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return {
    snake: snakeRef.current,
    food: foodRef.current,
    tankers: tankersRef.current,
    score,
    highScore,
    gameState,
    startGame,
    resumeGame,
    changeDirection,
  };
}
