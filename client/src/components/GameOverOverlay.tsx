import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { useGameActionsContext } from '../contexts/GameActionsContext';

export function GameOverOverlay() {
  const { score, bestScore } = useGameStore();
  const { handleResetGame, isLocked } = useGameActionsContext();
  const isNewBest = score >= bestScore && score > 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '20px',
        background: 'rgba(0,0,0,0.82)',
        backdropFilter: 'blur(4px)',
        borderRadius: '8px',
      }}
    >
      {/* GAME OVER title */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.15, type: 'spring', stiffness: 200 }}
        style={{
          fontFamily: "'Press Start 2P', system-ui",
          fontSize: '28px',
          color: '#FF3C3C',
          textShadow: '0 0 20px rgba(255,60,60,0.8), 0 0 40px rgba(255,60,60,0.4)',
          letterSpacing: '0.1em',
        }}
      >
        GAME OVER
      </motion.div>

      {/* Final score */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        style={{ textAlign: 'center' }}
      >
        <div style={{
          fontFamily: 'Orbitron',
          fontSize: '10px',
          color: '#6b7494',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          marginBottom: '6px',
        }}>
          Final Score
        </div>
        <div style={{
          fontFamily: 'Orbitron',
          fontWeight: 900,
          fontSize: '42px',
          color: '#39FF14',
          textShadow: '0 0 20px rgba(57,255,20,0.8), 0 0 40px rgba(57,255,20,0.3)',
          lineHeight: 1,
        }}>
          {score.toLocaleString()}
        </div>

        {/* New best indicator */}
        {isNewBest && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5, type: 'spring' }}
            style={{
              marginTop: '8px',
              fontFamily: "'Press Start 2P', system-ui",
              fontSize: '11px',
              color: '#FFE000',
              textShadow: '0 0 12px rgba(255,224,0,0.8)',
              letterSpacing: '0.1em',
            }}
          >
            NEW BEST!
          </motion.div>
        )}
      </motion.div>

      {/* Play Again button */}
      <motion.button
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="btn-glow"
        onClick={handleResetGame}
        disabled={isLocked}
        style={{
          padding: '14px 40px',
          fontSize: '13px',
          opacity: isLocked ? 0.6 : 1,
          cursor: isLocked ? 'not-allowed' : 'pointer',
        }}
      >
        {isLocked ? 'RESTARTING...' : 'PLAY AGAIN'}
      </motion.button>
    </motion.div>
  );
}
