import { NeoBrutalistPanel } from './components/NeoBrutalistPanel';
import { PlayerStats } from './components/PlayerStats';
import { WalletConnect } from './components/WalletConnect';
import { NextBlocks } from './components/NextBlocks';
import { Leaderboard } from './components/Leaderboard';
import { GameBoard } from './components/GameBoard';

function App() {
  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] text-white font-['Orbitron'] overflow-hidden selection:bg-[var(--color-neon-magenta)] selection:text-white flex flex-col pt-8">
      {/* Background Cyber/Grid Effects overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-20"
           style={{
             backgroundImage: 'linear-gradient(rgba(0, 245, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 245, 255, 0.1) 1px, transparent 1px)',
             backgroundSize: '40px 40px'
           }}
      />
      
      {/* Header */}
      <header className="relative z-10 w-full px-8 pb-4 flex justify-between items-center mb-4">
        <div className="flex items-center gap-4">
          <img src="/blockaz-logo.png" alt="Blockaz" className="h-12 object-contain drop-shadow-[0_0_10px_rgba(0,245,255,0.5)]" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          <h1 className="font-['Press_Start_2P'] tracking-wider text-[var(--color-neon-cyan)] text-3xl drop-shadow-[0_0_10px_rgba(0,245,255,0.8)]">
            BLOCKAZ
          </h1>
        </div>
        <WalletConnect />
      </header>

      {/* Main Game Layout */}
      <main className="relative z-10 max-w-7xl mx-auto px-8 grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 w-full pb-8">
        
        {/* Left Column: Stats */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          <NeoBrutalistPanel title="PLAYER STATS" glowColor="cyan" className="flex-none">
            <PlayerStats />
          </NeoBrutalistPanel>
          
          <NeoBrutalistPanel title="DAILY CHALLENGE" glowColor="orange" className="mt-auto">
            <div className="text-center text-sm mb-4 text-gray-400">
              Clear 50 lines today for a reward!
            </div>
            <button className="w-full py-3 bg-[var(--color-neon-orange)] text-black font-bold tracking-widest hover:scale-105 transition-transform shadow-[0_0_15px_rgba(255,122,0,0.5)]">
              JOIN CHALLENGE
            </button>
          </NeoBrutalistPanel>
        </div>

        {/* Center Column: Game Board */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center">
          <NeoBrutalistPanel glowColor="cyan" className="flex items-center justify-center overflow-hidden bg-black/80 w-min h-min !p-2 md:!p-4">
            <GameBoard />
          </NeoBrutalistPanel>
        </div>

        {/* Right Column: Next Blocks & Leaderboard */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          <NeoBrutalistPanel title="NEXT BLOCKS" glowColor="magenta" className="flex-none">
            <NextBlocks />
          </NeoBrutalistPanel>
          
          <NeoBrutalistPanel title="LEADERBOARD" glowColor="cyan" className="flex-1 overflow-auto">
            <Leaderboard />
          </NeoBrutalistPanel>
        </div>
        
      </main>
    </div>
  );
}

export default App;
