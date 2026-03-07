import { useGameStore } from '../store/gameStore';
import { motion, AnimatePresence } from 'framer-motion';

export function PlayerStats() {
  const { score, bestScore, combo, linesCleared, resetGame } = useGameStore();

  return (
    <div className="flex flex-col gap-5">
      {/* Score */}
      <div className="text-center">
        <h3 className="text-gray-400 font-['Orbitron'] text-xs uppercase tracking-widest mb-2">
          Score
        </h3>
        <AnimatePresence mode="popLayout">
          <motion.div
            key={score}
            initial={{ scale: 1.2, color: 'var(--color-neon-magenta)' }}
            animate={{ scale: 1, color: 'var(--color-neon-cyan)' }}
            className="font-['Share_Tech_Mono'] text-5xl text-neon-cyan"
          >
            {score.toString().padStart(6, '0')}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Best Score */}
      <div className="text-center">
        <h3 className="text-gray-400 font-['Orbitron'] text-xs uppercase tracking-widest mb-2">
          Best Score
        </h3>
        <div className="font-['Share_Tech_Mono'] text-2xl text-white opacity-80">
          {bestScore.toString().padStart(6, '0')}
        </div>
      </div>

      {/* Lines Cleared */}
      <div className="text-center">
        <h3 className="text-gray-400 font-['Orbitron'] text-xs uppercase tracking-widest mb-1">
          Lines Cleared
        </h3>
        <AnimatePresence mode="popLayout">
          <motion.div
            key={linesCleared}
            initial={{ scale: 1.2, color: 'var(--color-neon-magenta)' }}
            animate={{ scale: 1, color: 'white' }}
            className="font-['Share_Tech_Mono'] text-2xl opacity-90"
          >
            {linesCleared}
          </motion.div>
        </AnimatePresence>
        <p className="text-gray-600 text-[9px] uppercase tracking-widest mt-0.5">
          rows + cols
        </p>
      </div>

      {/* Combo */}
      <div className="text-center h-14">
        <AnimatePresence>
          {combo > 1 && (
            <motion.div
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, opacity: 0 }}
              key={combo}
              className="inline-block px-4 py-2 border-2 border-[var(--color-neon-orange)] bg-[var(--color-neon-orange)]/10 rounded-lg shadow-[0_0_15px_rgba(255,122,0,0.5)]"
            >
              <span className="font-['Press_Start_2P'] text-neon-orange text-sm">
                {combo}X COMBO!
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Reset */}
      <button
        onClick={resetGame}
        className="mt-2 w-full py-2 border border-white/20 bg-white/5 text-gray-400 rounded text-xs uppercase tracking-widest font-['Orbitron'] hover:bg-red-900/30 hover:border-red-500/50 hover:text-red-400 transition-all"
      >
        Reset Board
      </button>
    </div>
  );
}
