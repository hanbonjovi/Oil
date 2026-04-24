import { useRef, useMemo, useState, useEffect } from 'react';
import useSnakeGame from './useSnakeGame';
import useInputControls from './useInputControls';
import { GRID_COLS, GRID_ROWS, CELL_SIZE, BOARD_W, BOARD_H, THEMES } from './constants';

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
      <image href="/trump-head.png" x={cx - r} y={cy - r} width={r * 2} height={r * 2}
        clipPath="url(#head-clip)" preserveAspectRatio="xMidYMid slice" />
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
    <rect x={cx - size / 2} y={cy - size / 2} width={size} height={size} rx={size * 0.25} fill={color} />
  );
}

function OilDrop({ x, y, colors }) {
  const cx = x * CELL_SIZE + CELL_SIZE / 2;
  const cy = y * CELL_SIZE + CELL_SIZE / 2;
  return (
    <g transform={`translate(${cx}, ${cy}) scale(2.5)`}>
      <path d="M0,-8 C-1,-6 -5,0 -5,3 A5,5 0 0,0 5,3 C5,0 1,-6 0,-8Z"
        fill={colors.oilFill} stroke={colors.oilStroke} strokeWidth={1} />
      <ellipse cx={-1.5} cy={0} rx={1.2} ry={2.5} fill={colors.oilHighlight} opacity={0.4} />
      <ellipse cx={1} cy={-2} rx={0.8} ry={1.2} fill={colors.oilHighlight} opacity={0.25} />
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
      lines.push(<line key={`v${i}`} x1={pos} y1={0} x2={pos} y2={BOARD_H} stroke={colors.gridLine} strokeWidth={0.5} />);
    }
    for (let i = 0; i <= GRID_ROWS; i++) {
      const pos = i * CELL_SIZE;
      lines.push(<line key={`h${i}`} x1={0} y1={pos} x2={BOARD_W} y2={pos} stroke={colors.gridLine} strokeWidth={0.5} />);
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
      height: '100%', background: colors.border,
    }}>
      <div style={{ width: '100%', maxWidth: 600 }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '8px 14px', fontSize: 'clamp(12px, 3.5vw, 16px)',
          color: colors.gold, fontWeight: 'bold',
          background: colors.border,
          borderLeft: `12px solid ${colors.border}`, borderRight: `12px solid ${colors.border}`,
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
      }}>
        <svg viewBox={`0 0 ${BOARD_W} ${BOARD_H}`} style={{ width: '100%', height: 'auto', display: 'block', borderLeft: `12px solid ${colors.border}`, borderRight: `12px solid ${colors.border}`, borderBottom: `12px solid ${colors.border}` }}>
          <rect width={BOARD_W} height={BOARD_H} fill={colors.board} />
          {gridLines}
          <OilDrop x={food.x} y={food.y} colors={colors} />
          {bodySegments}
          {snake.length > 0 && <SnakeHead x={snake[0].x} y={snake[0].y} colors={colors} />}
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
