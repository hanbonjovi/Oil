const btnStyle = {
  width: 56,
  height: 56,
  borderRadius: 8,
  background: '#1a1a1a',
  border: '2px solid #e0c050',
  color: '#e0c050',
  fontSize: 22,
  cursor: 'pointer',
  touchAction: 'none',
  userSelect: 'none',
  WebkitUserSelect: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  outline: 'none',
};

const spacer = { width: 56, height: 56 };

export default function DPad({ onDirection }) {
  const btn = (dir, symbol) => (
    <button
      style={btnStyle}
      onTouchStart={(e) => { e.preventDefault(); onDirection(dir); }}
      onMouseDown={(e) => { e.preventDefault(); onDirection(dir); }}
    >
      {symbol}
    </button>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, marginTop: 16 }}>
      <div>{btn('UP', '▲')}</div>
      <div style={{ display: 'flex', gap: 4 }}>
        {btn('LEFT', '◀')}
        <div style={spacer} />
        {btn('RIGHT', '▶')}
      </div>
      <div>{btn('DOWN', '▼')}</div>
    </div>
  );
}
