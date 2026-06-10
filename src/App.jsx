import { useRef, useMemo, useState, useEffect } from 'react';
import useSnakeGame from './useSnakeGame';
import useInputControls from './useInputControls';
import { GRID_COLS, GRID_ROWS, CELL_SIZE, BOARD_W, BOARD_H, BORDER, SVG_W, SVG_H, THEMES } from './constants';

const THEME_KEY = 'strait-theme';
const LEADERS_KEY = 'strait-leaderboard';
const MAX_LEADERS = 10;

function getLocalBoard() {
  try {
    return JSON.parse(localStorage.getItem(LEADERS_KEY)) || [];
  } catch { return []; }
}

function saveLocalBoard(board) {
  try { localStorage.setItem(LEADERS_KEY, JSON.stringify(board)); } catch {}
}

async function fetchLeaderboard() {
  try {
    const res = await fetch('/api/leaderboard');
    if (res.ok) {
      const board = await res.json();
      saveLocalBoard(board);
      return board;
    }
  } catch {}
  return getLocalBoard();
}

async function postScore(name, score) {
  const entry = { name: name.slice(0, 12), score, date: new Date().toISOString().slice(0, 10) };
  try {
    const res = await fetch('/api/leaderboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: entry.name, score }),
    });
    if (res.ok) {
      const board = await res.json();
      saveLocalBoard(board);
      return board;
    }
  } catch {}
  const local = getLocalBoard();
  local.push(entry);
  local.sort((a, b) => b.score - a.score);
  const trimmed = local.slice(0, MAX_LEADERS);
  saveLocalBoard(trimmed);
  return trimmed;
}

function isTopScore(score, board) {
  if (score <= 0) return false;
  if (board.length < MAX_LEADERS) return true;
  return score > board[board.length - 1].score;
}

function parseHex(hex) {
  const c = hex.replace('#', '');
  return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)];
}

function lerpRgb(a, b, t) {
  return [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * t));
}

function lerpColor(a, b, t) {
  const [r, g, bl] = lerpRgb(parseHex(a), parseHex(b), t);
  return `rgb(${r},${g},${bl})`;
}

function shade(hexA, hexB, t, towardBlack) {
  const mixed = lerpRgb(parseHex(hexA), parseHex(hexB), t);
  const target = towardBlack ? [0, 0, 0] : [255, 255, 255];
  const [r, g, b] = lerpRgb(mixed, target, 0.35);
  return `rgb(${r},${g},${b})`;
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
      <circle cx={cx} cy={cy} r={r + 1} fill="#0006" transform="translate(2,3)" />
      <image href="/trump-head.png" x={cx - r} y={cy - r} width={r * 2} height={r * 2}
        clipPath="url(#head-clip)" preserveAspectRatio="xMidYMid slice" />
      <circle cx={cx} cy={cy} r={r + 1} fill="none" stroke="url(#gold-ring)" strokeWidth={3} />
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
  const edge = shade(colors.bodyStart, colors.bodyEnd, t, true);
  return (
    <g>
      <rect x={cx - size / 2 + 2} y={cy - size / 2 + 3} width={size} height={size} rx={size * 0.3} fill="#0005" />
      <rect x={cx - size / 2} y={cy - size / 2} width={size} height={size} rx={size * 0.3}
        fill={color} stroke={edge} strokeWidth={1.5} strokeOpacity={0.4} />
      <ellipse cx={cx - size * 0.18} cy={cy - size * 0.22} rx={size * 0.28} ry={size * 0.16}
        fill="#ffffff" opacity={0.18} />
    </g>
  );
}

function OilDrop({ x, y, colors }) {
  const cx = x * CELL_SIZE + CELL_SIZE / 2;
  const cy = y * CELL_SIZE + CELL_SIZE / 2;
  return (
    <g transform={`translate(${cx}, ${cy}) scale(2.5)`}>
      <g>
        <animateTransform attributeName="transform" type="translate"
          values="0 0; 0 -1.5; 0 0" dur="1.6s" repeatCount="indefinite" />
        <ellipse cx={0} cy={7.5} rx={5} ry={1.4} fill="#000" opacity={0.25} />
        <path d="M0,-8 C-1,-6 -5,0 -5,3 A5,5 0 0,0 5,3 C5,0 1,-6 0,-8Z"
          fill="url(#oil-grad)" stroke={colors.oilStroke} strokeWidth={0.8} />
        <ellipse cx={-1.8} cy={1} rx={1.3} ry={2.4} fill="#ffffff" opacity={0.35} transform="rotate(-15 -1.8 1)" />
        <circle cx={1.6} cy={-2.5} r={0.7} fill="#ffffff" opacity={0.3} />
      </g>
    </g>
  );
}

function Overlay({ children, colors }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, background: colors.overlay,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      zIndex: 10, overflowY: 'auto',
    }}>
      {children}
    </div>
  );
}

function Leaderboard({ board, colors, highlight }) {
  if (board.length === 0) return null;
  return (
    <div style={{ width: '80%', maxWidth: 300, marginTop: 16 }}>
      <div style={{ fontSize: 'clamp(12px, 3.5vw, 16px)', color: colors.gold, marginBottom: 8, textAlign: 'center', fontWeight: 'bold' }}>
        TOP BARRELS
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'clamp(10px, 2.8vw, 14px)' }}>
        <tbody>
          {board.map((entry, i) => {
            const isHighlighted = highlight != null && i === highlight;
            return (
              <tr key={i} style={{
                color: isHighlighted ? colors.gold : colors.text,
                fontWeight: isHighlighted ? 'bold' : 'normal',
              }}>
                <td style={{ padding: '3px 6px', textAlign: 'right', width: 24, opacity: 0.6 }}>{i + 1}.</td>
                <td style={{ padding: '3px 6px' }}>{entry.name}</td>
                <td style={{ padding: '3px 6px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{entry.score}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function App() {
  const { snake, food, score, highScore, gameState, startGame, changeDirection } = useSnakeGame();
  const gameContainerRef = useRef(null);
  const nameInputRef = useRef(null);
  useInputControls(changeDirection, gameContainerRef);

  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem(THEME_KEY) || 'dark'; } catch { return 'dark'; }
  });
  const colors = THEMES[theme];

  const [leaderboard, setLeaderboard] = useState([]);
  const [nameEntry, setNameEntry] = useState('');
  const [needsName, setNeedsName] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(null);

  // Load leaderboard on mount
  useEffect(() => {
    fetchLeaderboard().then(setLeaderboard);
  }, []);

  // When game ends, check if score qualifies
  const prevGameState = useRef(gameState);
  useEffect(() => {
    if (prevGameState.current === 'playing' && gameState === 'gameover') {
      fetchLeaderboard().then((board) => {
        setLeaderboard(board);
        if (isTopScore(score, board)) {
          setNeedsName(true);
          setNameEntry('');
          setHighlightIdx(null);
          setTimeout(() => nameInputRef.current?.focus(), 100);
        } else {
          setNeedsName(false);
          setHighlightIdx(null);
        }
      });
    }
    prevGameState.current = gameState;
  }, [gameState, score]);

  const submitName = async () => {
    const name = nameEntry.trim() || 'ANON';
    const updated = await postScore(name, score);
    if (updated) {
      const idx = updated.findIndex((e) => e.name === name.slice(0, 12) && e.score === score);
      setLeaderboard(updated);
      setHighlightIdx(idx >= 0 ? idx : null);
    }
    setNeedsName(false);
  };

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    try { localStorage.setItem(THEME_KEY, next); } catch {}
  };

  useEffect(() => {
    document.body.style.background = colors.border;
    document.documentElement.style.background = colors.border;
  }, [colors.border]);

  const bigBtnStyle = {
    padding: '14px 36px', fontSize: 22, fontWeight: 'bold',
    background: 'transparent', border: `2px solid ${colors.gold}`,
    color: colors.text, cursor: 'pointer', borderRadius: 6,
    touchAction: 'none', fontFamily: "'Courier New', monospace",
  };

  const gridLines = useMemo(() => {
    const lines = [];
    for (let i = 0; i <= GRID_COLS; i++) {
      const pos = i * CELL_SIZE;
      lines.push(<line key={`v${i}`} x1={pos} y1={0} x2={pos} y2={BOARD_H} stroke={colors.gridLine} strokeWidth={0.5} strokeOpacity={0.6} />);
    }
    for (let i = 0; i <= GRID_ROWS; i++) {
      const pos = i * CELL_SIZE;
      lines.push(<line key={`h${i}`} x1={0} y1={pos} x2={BOARD_W} y2={pos} stroke={colors.gridLine} strokeWidth={0.5} strokeOpacity={0.6} />);
    }
    return lines;
  }, [colors.gridLine]);

  const bodySegments = [];
  for (let i = snake.length - 1; i >= 1; i--) {
    bodySegments.push(
      <BodySegment key={i} seg={snake[i]} index={i} total={snake.length} colors={colors} />
    );
  }

  const handleStart = () => {
    setHighlightIdx(null);
    startGame();
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      height: '100dvh', background: colors.border, overflow: 'hidden',
    }}>
      <div style={{ width: '100%', maxWidth: 600, flexShrink: 0 }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '10px 14px', fontSize: 'clamp(14px, 4vw, 18px)',
          color: '#3a2200', fontWeight: 'bold', letterSpacing: 1,
          background: `linear-gradient(${lerpColor(colors.border, '#ffffff', 0.15)}, ${colors.border})`,
          textShadow: '0 1px 0 rgba(255,255,255,0.3)',
        }}>
          <span>BARRELS: {score}</span>
          <button onClick={toggleTheme} style={{
            background: 'transparent', border: 'none', fontSize: 20,
            cursor: 'pointer', padding: 0,
          }}>
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <span>BEST: {highScore}</span>
        </div>
      </div>
      <div ref={gameContainerRef} style={{
        position: 'relative', width: '100%', maxWidth: 600, touchAction: 'none',
        flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column',
      }}>
        <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} style={{ width: '100%', flex: 1, minHeight: 0, display: 'block' }}>
          <defs>
            <linearGradient id="water-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lerpColor(colors.board, '#ffffff', 0.10)} />
              <stop offset="55%" stopColor={colors.board} />
              <stop offset="100%" stopColor={lerpColor(colors.board, '#000000', 0.18)} />
            </linearGradient>
            <linearGradient id="sand-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lerpColor(colors.border, '#ffffff', 0.15)} />
              <stop offset="100%" stopColor={lerpColor(colors.border, '#000000', 0.18)} />
            </linearGradient>
            <linearGradient id="gold-ring" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fff3b0" />
              <stop offset="45%" stopColor={colors.gold} />
              <stop offset="100%" stopColor="#9a7b1c" />
            </linearGradient>
            <radialGradient id="oil-grad" cx="35%" cy="30%" r="80%">
              <stop offset="0%" stopColor="#4a4a4a" />
              <stop offset="45%" stopColor="#151515" />
              <stop offset="100%" stopColor="#000000" />
            </radialGradient>
            <pattern id="waves" width="120" height="70" patternUnits="userSpaceOnUse">
              <path d="M0 20 Q 15 12, 30 20 T 60 20 T 90 20 T 120 20" fill="none"
                stroke="#ffffff" strokeOpacity="0.08" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M-15 55 Q 0 47, 15 55 T 45 55 T 75 55 T 105 55 T 135 55" fill="none"
                stroke="#ffffff" strokeOpacity="0.05" strokeWidth="2.5" strokeLinecap="round" />
            </pattern>
            <pattern id="sand-speckles" width="36" height="36" patternUnits="userSpaceOnUse">
              <circle cx="6" cy="8" r="1.3" fill="#000" opacity="0.10" />
              <circle cx="22" cy="4" r="1" fill="#000" opacity="0.08" />
              <circle cx="30" cy="20" r="1.4" fill="#fff" opacity="0.12" />
              <circle cx="12" cy="26" r="1.1" fill="#000" opacity="0.09" />
              <circle cx="26" cy="32" r="1" fill="#fff" opacity="0.10" />
            </pattern>
          </defs>

          {/* land border */}
          <rect width={SVG_W} height={SVG_H} fill="url(#sand-grad)" />
          <rect width={SVG_W} height={SVG_H} fill="url(#sand-speckles)" />

          {/* ocean */}
          <rect x={BORDER} y={BORDER} width={BOARD_W} height={BOARD_H} fill="url(#water-grad)" />
          <rect x={BORDER} y={BORDER} width={BOARD_W} height={BOARD_H} fill="url(#waves)" />

          {/* coastline: dark wet-sand edge + foam line */}
          <rect x={BORDER - 2} y={BORDER - 2} width={BOARD_W + 4} height={BOARD_H + 4} fill="none"
            stroke={lerpColor(colors.border, '#000000', 0.35)} strokeWidth={4} rx={3} />
          <rect x={BORDER + 2} y={BORDER + 2} width={BOARD_W - 4} height={BOARD_H - 4} fill="none"
            stroke="#ffffff" strokeOpacity={0.25} strokeWidth={2} rx={2} />

          <g transform={`translate(${BORDER},${BORDER})`}>
            {gridLines}
            <OilDrop x={food.x} y={food.y} colors={colors} />
            {bodySegments}
            {snake.length > 0 && <SnakeHead x={snake[0].x} y={snake[0].y} colors={colors} />}
          </g>
        </svg>

        {gameState === 'idle' && (
          <Overlay colors={colors}>
            <h1 style={{
              fontSize: 'clamp(18px, 6vw, 32px)', textTransform: 'uppercase',
              color: colors.gold, textShadow: `0 0 10px ${colors.gold}, 0 0 20px ${colors.gold}80`,
              textAlign: 'center', lineHeight: 1.3, marginBottom: 12, padding: '0 16px',
            }}>
              OPEN THE FUCKIN&apos; STRAIT
            </h1>
            <div style={{ fontSize: 'clamp(11px, 3vw, 14px)', color: colors.text, opacity: 0.5, marginBottom: 16 }}>
              Swipe to steer
            </div>
            <button style={bigBtnStyle} onClick={handleStart}
              onTouchEnd={(e) => { e.preventDefault(); handleStart(); }}>
              START
            </button>
            <Leaderboard board={leaderboard} colors={colors} highlight={highlightIdx} />
          </Overlay>
        )}

        {gameState === 'gameover' && (
          <Overlay colors={colors}>
            {needsName ? (
              <>
                <div style={{ fontSize: 'clamp(20px, 5vw, 28px)', marginBottom: 6, color: colors.gold, fontWeight: 'bold' }}>
                  GAME OVER
                </div>
                <div style={{ fontSize: 'clamp(14px, 4vw, 20px)', marginBottom: 12, color: colors.text }}>
                  BARRELS GOBBLED: {score}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                  <div style={{ fontSize: 'clamp(12px, 3.5vw, 16px)', color: colors.gold }}>
                    NEW TOP SCORE!
                  </div>
                  <input
                    ref={nameInputRef}
                    type="text"
                    maxLength={12}
                    placeholder="Enter name"
                    value={nameEntry}
                    onChange={(e) => setNameEntry(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') submitName(); }}
                    style={{
                      background: 'transparent', border: `2px solid ${colors.gold}`,
                      color: colors.text, padding: '8px 12px', fontSize: 18,
                      fontFamily: "'Courier New', monospace", textAlign: 'center',
                      borderRadius: 4, outline: 'none', width: 200,
                    }}
                  />
                  <button style={{ ...bigBtnStyle, padding: '10px 28px', fontSize: 18 }} onClick={submitName}>
                    SAVE
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 'clamp(20px, 5vw, 28px)', marginBottom: 6, color: colors.gold, fontWeight: 'bold' }}>
                  GAME OVER
                </div>
                <div style={{ fontSize: 'clamp(14px, 4vw, 20px)', marginBottom: 12, color: colors.text }}>
                  BARRELS GOBBLED: {score}
                </div>
                <Leaderboard board={leaderboard} colors={colors} highlight={highlightIdx} />
                <button style={{ ...bigBtnStyle, marginTop: 16 }} onClick={handleStart}
                  onTouchEnd={(e) => { e.preventDefault(); handleStart(); }}>
                  PLAY AGAIN
                </button>
              </>
            )}
          </Overlay>
        )}
      </div>
    </div>
  );
}
