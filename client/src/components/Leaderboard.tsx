const mockLeaderboard = [
  { rank: 1, name: 'RYAN', score: 95400 },
  { rank: 2, name: 'VEGA', score: 82100 },
  { rank: 3, name: 'NOVA', score: 79050 },
  { rank: 4, name: 'Z3RO', score: 65200 },
  { rank: 5, name: 'ALEX', score: 54100 },
];

const RANK_COLORS = ['#FFE000', '#C0C0C0', '#CD7F32', '#00F5FF', '#8b95b8'];
const RANK_GLOW   = [
  'rgba(255,224,0,0.5)',
  'rgba(192,192,192,0.4)',
  'rgba(205,127,50,0.4)',
  'rgba(0,245,255,0.3)',
  'transparent',
];

export function Leaderboard() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {mockLeaderboard.map((player, idx) => (
        <div
          key={idx}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 8px',
            borderRadius: '4px',
            background: idx === 0
              ? 'linear-gradient(90deg, rgba(255,224,0,0.12), transparent)'
              : 'rgba(255,255,255,0.02)',
            border: `1px solid ${idx < 3 ? RANK_COLORS[idx] + '33' : 'rgba(255,255,255,0.05)'}`,
            boxShadow: idx === 0 ? `0 0 12px ${RANK_GLOW[idx]}` : 'none',
          }}
        >
          {/* Rank badge */}
          <div style={{
            width: '20px',
            height: '20px',
            borderRadius: '3px',
            background: `${RANK_COLORS[idx]}22`,
            border: `1px solid ${RANK_COLORS[idx]}66`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <span style={{
              fontFamily: "'Press Start 2P'",
              fontSize: '7px',
              color: RANK_COLORS[idx],
              textShadow: `0 0 6px ${RANK_GLOW[idx]}`,
            }}>
              {player.rank}
            </span>
          </div>

          {/* Name */}
          <span style={{
            fontFamily: 'Orbitron',
            fontWeight: 700,
            fontSize: '10px',
            color: RANK_COLORS[idx],
            textShadow: `0 0 6px ${RANK_GLOW[idx]}`,
            flex: 1,
            letterSpacing: '0.05em',
          }}>
            {player.name}
          </span>

          {/* Score */}
          <span style={{
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: '11px',
            color: '#c8d0e8',
          }}>
            {player.score.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}
