import { useRef, useMemo } from 'react';
import useSnakeGame from './useSnakeGame';
import useInputControls from './useInputControls';
import DPad from './DPad';
import { GRID_SIZE, CELL_SIZE, BOARD_PX, COLORS } from './constants';

function lerpColor(a, b, t) {
  const parse = (hex) => {
    const c = hex.replace('#', '');
    return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)];
  };
  const [r1, g1, b1] = parse(a);
  const [r2, g2, b2] = parse(b);
  return `rgb(${Math.round(r1 + (r2 - r1) * t)},${Math.round(g1 + (g2 - g1) * t)},${Math.round(b1 + (b2 - b1) * t)})`;
}

function SnakeHead({ x, y }) {
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
      <circle cx={cx} cy={cy} r={r + 1} fill="none" stroke={COLORS.gold} strokeWidth={2} />
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

function BodySegment({ seg, index, total }) {
  const cx = seg.x * CELL_SIZE + CELL_SIZE / 2;
  const cy = seg.y * CELL_SIZE + CELL_SIZE / 2;
  const taper = 1 - (index / total) * 0.5;
  const size = CELL_SIZE * taper;
  const t = index / Math.max(total - 1, 1);
  const color = lerpColor(COLORS.bodyStart, COLORS.bodyEnd, t);

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

function OilDrop({ x, y }) {
  const cx = x * CELL_SIZE + CELL_SIZE / 2;
  const cy = y * CELL_SIZE + CELL_SIZE / 2;

  return (
    <g transform={`translate(${cx}, ${cy}) scale(2.5)`}>
      <path
        d="M0,-8 C-1,-6 -5,0 -5,3 A5,5 0 0,0 5,3 C5,0 1,-6 0,-8Z"
        fill="#1a1a1a"
        stroke="#e0c050"
        strokeWidth={1}
      />
      <ellipse cx={-1.5} cy={0} rx={1.2} ry={2.5} fill="#e0c050" opacity={0.4} />
      <ellipse cx={1} cy={-2} rx={0.8} ry={1.2} fill="#e0c050" opacity={0.25} />
    </g>
  );
}

function Overlay({ children }) {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: 'rgba(0,0,0,0.85)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      zIndex: 10,
    }}>
      {children}
    </div>
  );
}

const bigBtnStyle = {
  padding: '14px 36px',
  fontSize: 22,
  fontWeight: 'bold',
  background: 'transparent',
  border: `2px solid #e0c050`,
  color: '#e0c050',
  cursor: 'pointer',
  borderRadius: 6,
  touchAction: 'none',
};

export default function App() {
  const { snake, food, score, highScore, gameState, startGame, changeDirection } = useSnakeGame();
  const gameContainerRef = useRef(null);
  useInputControls(changeDirection, gameContainerRef);

  const gridLines = useMemo(() => {
    const lines = [];
    for (let i = 0; i <= GRID_SIZE; i++) {
      const pos = i * CELL_SIZE;
      lines.push(<line key={`h${i}`} x1={0} y1={pos} x2={BOARD_PX} y2={pos} stroke={COLORS.gridLine} strokeWidth={0.5} />);
      lines.push(<line key={`v${i}`} x1={pos} y1={0} x2={pos} y2={BOARD_PX} stroke={COLORS.gridLine} strokeWidth={0.5} />);
    }
    return lines;
  }, []);

  const bodySegments = [];
  for (let i = snake.length - 1; i >= 1; i--) {
    bodySegments.push(
      <BodySegment key={i} seg={snake[i]} index={i} total={snake.length} />
    );
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      minHeight: '100%', padding: '8px 8px 16px',
    }}>
      <h1 style={{
        textAlign: 'center',
        fontSize: 'clamp(16px, 5vw, 28px)',
        textTransform: 'uppercase',
        color: COLORS.gold,
        textShadow: `0 0 10px ${COLORS.gold}, 0 0 20px ${COLORS.gold}80`,
        padding: '8px 8px 4px',
        lineHeight: 1.2,
      }}>
        OPEN THE FUCKIN&apos; STRAIT
      </h1>

      <div style={{
        display: 'flex', justifyContent: 'space-between', width: '100%',
        maxWidth: 600, padding: '4px 0 8px', fontSize: 'clamp(12px, 3.5vw, 18px)',
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
          <rect width={BOARD_PX} height={BOARD_PX} fill={COLORS.board} />
          {gridLines}
          <OilDrop x={food.x} y={food.y} />
          {bodySegments}
          {snake.length > 0 && <SnakeHead x={snake[0].x} y={snake[0].y} />}
        </svg>

        {gameState === 'idle' && (
          <Overlay>
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
          <Overlay>
            <div style={{ fontSize: 'clamp(20px, 5vw, 28px)', marginBottom: 8, color: COLORS.gold }}>GAME OVER</div>
            <div style={{ fontSize: 'clamp(14px, 4vw, 20px)', marginBottom: 20, color: COLORS.gold }}>
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

      {gameState === 'playing' && <DPad onDirection={changeDirection} />}
    </div>
  );
}
