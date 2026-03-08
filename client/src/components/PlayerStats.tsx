import { useContext } from 'react';
import { useGameStore } from '../store/gameStore';
import { motion, AnimatePresence } from 'framer-motion';
import { GameActionsContext } from '../contexts/GameActionsContext';

interface StatBoxProps {
  label: string;
  value: string;
  valueColor: string;
  glowColor: string;
}

function StatBox({ label, value, valueColor, glowColor }: StatBoxProps) {
  return (
    <div style={{
      background: 'rgba(0,0,0,0.4)',
      border: `1px solid ${glowColor}44`,
      borderRadius: '4px',
      padding: '8px 12px',
      boxShadow: `inset 0 0 12px ${glowColor}11`,
    }}>
      <div style={{
        fontFamily: 'Orbitron',
        fontWeight: 700,
        fontSize: '8px',
        letterSpacing: '0.2em',
        color: '#6b7494',
        textTransform: 'uppercase',
        marginBottom: '4px',
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: 'Orbitron',
        fontWeight: 900,
        fontSize: '26px',
        color: valueColor,
        textShadow: `0 0 12px ${glowColor}`,
        lineHeight: 1,
        letterSpacing: '-0.02em',
      }}>
        {value}
      </div>
    </div>
  );
}

export function PlayerStats() {
  const { score, bestScore, combo, gamePhase } = useGameStore();
  const gameActions = useContext(GameActionsContext);

  const showReset = gamePhase === 'PLAYING' || gamePhase === 'GAME_OVER';
  const isLocked = gameActions?.isLocked ?? false;

  const handleReset = () => {
    if (!gameActions) return;
    if (!confirm('Start a new game? Current progress will be lost.')) return;
    gameActions.handleResetGame();
  };

  return (
    <div className="arcade-panel" style={{ overflow: 'hidden' }}>
      <div className="panel-label" style={{ borderRadius: '4px 4px 0 0' }}>
        Player Stats
      </div>
      <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>

        <StatBox
          label="High Score"
          value={bestScore.toLocaleString()}
          valueColor="#FFE000"
          glowColor="rgba(255,224,0,0.8)"
        />

        <StatBox
          label="Current Score"
          value={score.toLocaleString()}
          valueColor="#39FF14"
          glowColor="rgba(57,255,20,0.8)"
        />

        {/* Combo */}
        <div style={{ minHeight: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <AnimatePresence>
            {combo > 1 && (
              <motion.div
                key={combo}
                initial={{ scale: 0.6, opacity: 0, y: 8 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.6, opacity: 0 }}
                style={{
                  background: 'linear-gradient(135deg, rgba(255,43,214,0.2), rgba(255,43,214,0.05))',
                  border: '2px solid #FF2BD6',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  textAlign: 'center',
                  boxShadow: '0 0 20px rgba(255,43,214,0.4)',
                  width: '100%',
                }}
              >
                <div style={{
                  fontFamily: "'Press Start 2P'",
                  fontSize: '9px',
                  color: '#FF2BD6',
                  textShadow: '0 0 8px rgba(255,43,214,0.8)',
                  letterSpacing: '0.05em',
                }}>
                  STREAK x{combo}
                </div>
                <div style={{
                  fontFamily: 'Orbitron',
                  fontSize: '8px',
                  color: '#FF8C00',
                  textShadow: '0 0 6px rgba(255,140,0,0.7)',
                  letterSpacing: '0.15em',
                  marginTop: '2px',
                }}>
                  COMBO!
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {showReset && (
          <button
            onClick={handleReset}
            disabled={isLocked}
            style={{
              width: '100%',
              padding: '7px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '4px',
              color: isLocked ? '#3a4060' : '#4a5270',
              fontFamily: 'Orbitron',
              fontWeight: 700,
              fontSize: '8px',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              cursor: isLocked ? 'not-allowed' : 'pointer',
              opacity: isLocked ? 0.5 : 1,
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              if (isLocked) return;
              (e.target as HTMLButtonElement).style.background = 'rgba(255,60,60,0.15)';
              (e.target as HTMLButtonElement).style.borderColor = 'rgba(255,60,60,0.4)';
              (e.target as HTMLButtonElement).style.color = '#ff6666';
            }}
            onMouseLeave={e => {
              if (isLocked) return;
              (e.target as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)';
              (e.target as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.12)';
              (e.target as HTMLButtonElement).style.color = '#4a5270';
            }}
          >
            {gamePhase === 'STARTING' ? 'RESTARTING...' : 'Reset'}
          </button>
        )}
      </div>
    </div>
  );
}
