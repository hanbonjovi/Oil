import { useRef, useMemo, useState, useEffect } from 'react';
import useSnakeGame from './useSnakeGame';
import useInputControls from './useInputControls';
import { GRID_SIZE, CELL_SIZE, BOARD_PX, THEMES } from './constants';

const THEME_KEY = 'strait-theme';

function lerpColor(a, b, t) {
  const parse = (hex) => {
    const c = hex.replace('#', '');
    return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)];
  };
  const [r1, g1, b1] = parse(a);
  const [r2, g2, b2] = parse(b);
  return `rgb(${Math.round(r1 + (r2 - r1) * t)},${Math.round(g1 + (g2 - g1) * t)},${Math.round(b1 + (b2 - b1) * t)})`;
}

function SnakeHead({ x, y, colors }) {
  const cx = x * CELL_SIZE + CELL_SIZE / 2;
  const cy = y * CELL_SIZE + CELL_SIZE / 2;
  const r = CELL_SIZE / 2 - 1;

  return (
    <g>
      <defs>
        <clipPath id="head-clip">
          <circle cx={cx} cy={cy} r={r} />
        </clipPath>
      </defs>
      <circle cx={cx} cy={cy} r={r + 1} fill="none" stroke={colors.gold} strokeWidth={2} />
      <image
        href="/trump-head.png"
        x={cx - r}
        y={cy - r}
        width={r * 2}
        height={r * 2}
        clipPath="url(#head-clip)"
        preserveAspectRatio="xMidYMid slice"
      />
    </g>
  );
}

function BodySegment({ seg, index, total, colors }) {
  const cx = seg.x * CELL_SIZE + CELL_SIZE / 2;
  const cy = seg.y * CELL_SIZE + CELL_SIZE / 2;
  const taper = 1 - (index / total) * 0.5;
  const size = CELL_SIZE * taper;
  const t = index / Math.max(total - 1, 1);
  const color = lerpColor(colors.bodyStart, colors.bodyEnd, t);

  return (
    <rect
      x={cx - size / 2}
      y={cy - size / 2}
      width={size}
      height={size}
      rx={size * 0.25}
      fill={color}
    />
  );
}

function OilDrop({ x, y, colors }) {
  const cx = x * CELL_SIZE + CELL_SIZE / 2;
  const cy = y * CELL_SIZE + CELL_SIZE / 2;

  return (
    <g transform={`translate(${cx}, ${cy}) scale(2.5)`}>
      <path
        d="M0,-8 C-1,-6 -5,0 -5,3 A5,5 0 0,0 5,3 C5,0 1,-6 0,-8Z"
        fill={colors.oilFill}
        stroke={colors.oilStroke}
        strokeWidth={1}
      />
      <ellipse cx={-1.5} cy={0} rx={1.2} ry={2.5} fill={colors.oilHighlight} opacity={0.4} />
      <ellipse cx={1} cy={-2} rx={0.8} ry={1.2} fill={colors.oilHighlight} opacity={0.25} />
    </g>
  );
}

function Overlay({ children, colors }) {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: colors.overlay,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      zIndex: 10,
    }}>
      {children}
    </div>
  );
}

export default function App() {
  const { snake, food, score, highScore, gameState, startGame, changeDirection } = useSnakeGame();
  const gameContainerRef = useRef(null);
  useInputControls(changeDirection, gameContainerRef);

  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem(THEME_KEY) || 'dark'; } catch { return 'dark'; }
  });
  const colors = THEMES[theme];

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    try { localStorage.setItem(THEME_KEY, next); } catch {}
  };

  useEffect(() => {
    document.body.style.background = colors.bg;
    document.documentElement.style.background = colors.bg;
  }, [colors.bg]);

  const bigBtnStyle = {
    padding: '14px 36px',
    fontSize: 22,
    fontWeight: 'bold',
    background: 'transparent',
    border: `2px solid ${colors.gold}`,
    color: colors.text,
    cursor: 'pointer',
    borderRadius: 6,
    touchAction: 'none',
    fontFamily: "'Courier New', monospace",
  };

  const gridLines = useMemo(() => {
    const lines = [];
    for (let i = 0; i <= GRID_SIZE; i++) {
      const pos = i * CELL_SIZE;
      lines.push(<line key={`h${i}`} x1={0} y1={pos} x2={BOARD_PX} y2={pos} stroke={colors.gridLine} strokeWidth={0.5} />);
      lines.push(<line key={`v${i}`} x1={pos} y1={0} x2={pos} y2={BOARD_PX} stroke={colors.gridLine} strokeWidth={0.5} />);
    }
    return lines;
  }, [colors.gridLine]);

  const bodySegments = [];
  for (let i = snake.length - 1; i >= 1; i--) {
    bodySegments.push(
      <BodySegment key={i} seg={snake[i]} index={i} total={snake.length} colors={colors} />
    );
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      minHeight: '100%', padding: '4px 0 0', background: colors.bg,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        width: '100%', maxWidth: 600, padding: '0 8px',
      }}>
        <h1 style={{
          fontSize: 'clamp(14px, 4.5vw, 24px)',
          textTransform: 'uppercase',
          color: colors.gold,
          textShadow: `0 0 10px ${colors.gold}, 0 0 20px ${colors.gold}80`,
          lineHeight: 1.2,
        }}>
          OPEN THE FUCKIN&apos; STRAIT
        </h1>
        <button
          onClick={toggleTheme}
          style={{
            background: 'transparent', border: 'none',
            fontSize: 20, cursor: 'pointer', padding: 2,
          }}
          title={theme === 'dark' ? 'Switch to day mode' : 'Switch to night mode'}
        >
          {theme === 'dark' ? '\u2600\uFE0F' : '\uD83C\uDF19'}
        </button>
      </div>

      <div style={{
        display: 'flex', justifyContent: 'space-between', width: '100%',
        maxWidth: 600, padding: '2px 8px 4px', fontSize: 'clamp(11px, 3vw, 16px)',
        color: colors.text,
      }}>
        <span>BARRELS: {score}</span>
        <span>BEST: {highScore}</span>
      </div>

      <div ref={gameContainerRef} style={{
        position: 'relative', width: '100%', maxWidth: 600,
        touchAction: 'none',
      }}>
        <svg
          viewBox={`0 0 ${BOARD_PX} ${BOARD_PX}`}
          style={{ width: '100%', height: 'auto', display: 'block' }}
        >
          <rect width={BOARD_PX} height={BOARD_PX} fill={colors.board} />
          {gridLines}
          <OilDrop x={food.x} y={food.y} colors={colors} />
          {bodySegments}
          {snake.length > 0 && <SnakeHead x={snake[0].x} y={snake[0].y} colors={colors} />}
        </svg>

        {gameState === 'idle' && (
          <Overlay colors={colors}>
            <button
              style={bigBtnStyle}
              onClick={startGame}
              onTouchEnd={(e) => { e.preventDefault(); startGame(); }}
            >
              START
            </button>
          </Overlay>
        )}

        {gameState === 'gameover' && (
          <Overlay colors={colors}>
            <div style={{ fontSize: 'clamp(20px, 5vw, 28px)', marginBottom: 8, color: colors.text }}>GAME OVER</div>
            <div style={{ fontSize: 'clamp(14px, 4vw, 20px)', marginBottom: 20, color: colors.text }}>
              BARRELS GOBBLED: {score}
            </div>
            <button
              style={bigBtnStyle}
              onClick={startGame}
              onTouchEnd={(e) => { e.preventDefault(); startGame(); }}
            >
              PLAY AGAIN
            </button>
          </Overlay>
        )}
      </div>

      {gameState === 'idle' && (
        <div style={{ marginTop: 8, fontSize: 'clamp(11px, 3vw, 14px)', color: colors.text, opacity: 0.4, textAlign: 'center' }}>
          Swipe to steer
        </div>
      )}
    </div>
  );
}
