import { useState, useRef, useCallback, useEffect } from 'react';
import { GRID_COLS, GRID_ROWS, DIRECTIONS, HIGH_SCORE_KEY } from './constants';

const START_TICK = 180;
const MIN_TICK = 80;
const SPEED_STEP = 5;

function placeFood(snake) {
  let x, y;
  do {
    x = Math.floor(Math.random() * GRID_COLS);
    y = Math.floor(Math.random() * GRID_ROWS);
  } while (snake.some((s) => s.x === x && s.y === y));
  return { x, y };
}

const START_Y = Math.floor(GRID_ROWS / 2);

export default function useSnakeGame() {
  const snakeRef = useRef([{ x: 4, y: START_Y }, { x: 3, y: START_Y }, { x: 2, y: START_Y }]);
  const dirRef = useRef(DIRECTIONS.RIGHT);
  const nextDirRef = useRef(null);
  const foodRef = useRef({ x: 8, y: START_Y });
  const intervalRef = useRef(null);
  const tickMsRef = useRef(START_TICK);

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
  }, []);

  const restartInterval = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => tickRef.current(), tickMsRef.current);
  }, []);

  const tick = useCallback(() => {
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

    const ate = newHead.x === foodRef.current.x && newHead.y === foodRef.current.y;
    const newSnake = [newHead, ...snake];

    if (ate) {
      scoreRef.current += 1;
      setScore(scoreRef.current);
      foodRef.current = placeFood(newSnake);

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
    setScore(0);
    foodRef.current = placeFood(snakeRef.current);
    setGameState('playing');

    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => tickRef.current(), START_TICK);
  }, []);

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
    score,
    highScore,
    gameState,
    startGame,
    changeDirection,
  };
}
