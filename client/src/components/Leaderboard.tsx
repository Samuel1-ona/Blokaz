import { useEffect, useMemo } from "react";
import { useTokens, useScoreUpdates, useScoreBatch } from "@provable-games/denshokan-sdk/react";
import { BLOKAZ_ADDRESS } from "../utils/contract";

const RANK_COLORS = ['#FFE000', '#C0C0C0', '#CD7F32', '#00F5FF', '#8b95b8'];
const RANK_GLOW = [
  'rgba(255,224,0,0.5)',
  'rgba(192,192,192,0.4)',
  'rgba(205,127,50,0.4)',
  'rgba(0,245,255,0.3)',
  'transparent',
];

function shortenAddress(addr: string): string {
  if (addr.length <= 10) return addr;
  return addr.slice(0, 6) + '...' + addr.slice(-4);
}

export function Leaderboard() {
  const { data: tokensResult, isLoading, refetch } = useTokens({
    gameAddress: BLOKAZ_ADDRESS,
    limit: 5,
  });

  const tokens = tokensResult?.data ?? [];

  // Read scores directly from the Blokaz contract (bypasses stale Denshokan indexer)
  const tokenIds = useMemo(() => tokens.map(t => t.tokenId), [tokens]);
  const { data: liveScores, refetch: refetchScores } = useScoreBatch(
    tokenIds.length > 0 ? tokenIds : undefined,
    BLOKAZ_ADDRESS,
  );

  // Real-time score updates via WebSocket — refetch both tokens and scores
  const { lastEvent } = useScoreUpdates({ enabled: true });

  useEffect(() => {
    if (lastEvent) {
      refetch();
      refetchScores();
    }
  }, [lastEvent, refetch, refetchScores]);

  // Merge live scores into tokens and sort descending
  const sorted = useMemo(() => {
    const merged = tokens.map((token, i) => ({
      ...token,
      liveScore: liveScores ? Number(liveScores[i]) : token.score,
    }));
    return merged.sort((a, b) => b.liveScore - a.liveScore);
  }, [tokens, liveScores]);

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <span style={{ fontFamily: 'Orbitron', fontSize: '9px', color: '#6b7494', letterSpacing: '0.15em' }}>
          LOADING...
        </span>
      </div>
    );
  }

  if (sorted.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <span style={{ fontFamily: 'Orbitron', fontSize: '9px', color: '#6b7494', letterSpacing: '0.15em' }}>
          NO GAMES YET
        </span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {sorted.map((token, idx) => {
        const color = RANK_COLORS[idx] ?? RANK_COLORS[4];
        const glow = RANK_GLOW[idx] ?? RANK_GLOW[4];
        const displayName = token.playerName || shortenAddress(token.owner);

        return (
          <div
            key={token.tokenId}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 8px',
              borderRadius: '4px',
              background: idx === 0
                ? 'linear-gradient(90deg, rgba(255,224,0,0.12), transparent)'
                : 'rgba(255,255,255,0.02)',
              border: `1px solid ${idx < 3 ? color + '33' : 'rgba(255,255,255,0.05)'}`,
              boxShadow: idx === 0 ? `0 0 12px ${glow}` : 'none',
            }}
          >
            {/* Rank badge */}
            <div style={{
              width: '20px',
              height: '20px',
              borderRadius: '3px',
              background: `${color}22`,
              border: `1px solid ${color}66`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <span style={{
                fontFamily: "'Press Start 2P'",
                fontSize: '7px',
                color,
                textShadow: `0 0 6px ${glow}`,
              }}>
                {idx + 1}
              </span>
            </div>

            {/* Name */}
            <span style={{
              fontFamily: 'Orbitron',
              fontWeight: 700,
              fontSize: '10px',
              color,
              textShadow: `0 0 6px ${glow}`,
              flex: 1,
              letterSpacing: '0.05em',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {displayName}
            </span>

            {/* Score */}
            <span style={{
              fontFamily: "'Share Tech Mono', monospace",
              fontSize: '11px',
              color: '#c8d0e8',
            }}>
              {token.liveScore.toLocaleString()}
            </span>
          </div>
        );
      })}
    </div>
  );
}
