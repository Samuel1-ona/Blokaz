import { useState } from 'react';

export function WalletConnect() {
  const [connected, setConnected] = useState(false);

  return (
    <div className="mt-8 flex justify-center">
      <button
        onClick={() => setConnected(!connected)}
        className={`
          relative px-6 py-3 font-['Orbitron'] font-bold tracking-widest uppercase overflow-hidden transition-all duration-300
          ${connected 
            ? 'bg-[var(--color-neon-cyan)]/20 border border-[var(--color-neon-cyan)] text-[var(--color-neon-cyan)]' 
            : 'bg-[var(--color-neon-magenta)] text-black hover:shadow-[0_0_20px_rgba(255,43,214,0.6)] hover:scale-105'
          }
        `}
        style={{
          boxShadow: connected ? 'inset 0 0 10px rgba(0, 245, 255, 0.2)' : '0 0 15px rgba(255, 43, 214, 0.4)'
        }}
      >
        <span className="relative z-10">
          {connected ? '0x0123...ABCD' : 'Connect Wallet'}
        </span>
        
        {/* Scanline effect over button */}
        <div className="absolute inset-0 z-0 opacity-20 pointer-events-none" 
             style={{ backgroundImage: 'linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.5) 50%)', backgroundSize: '100% 4px' }}>
        </div>
      </button>
    </div>
  );
}
