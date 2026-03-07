const mockLeaderboard = [
  { rank: 1, name: 'RYAN', score: 95400 },
  { rank: 2, name: 'VEGA', score: 82100 },
  { rank: 3, name: 'NOVA', score: 79050 },
  { rank: 4, name: 'Z3RO', score: 65200 },
  { rank: 5, name: 'ALEX', score: 54100 },
];

export function Leaderboard() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-between text-xs font-['Orbitron'] text-gray-500 mb-2 px-2">
        <span>RANK</span>
        <span>SCORE</span>
      </div>
      
      {mockLeaderboard.map((player, idx) => (
        <div 
          key={idx} 
          className={`
            flex justify-between items-center p-2 rounded
            ${idx === 0 ? 'bg-[var(--color-neon-magenta)]/20 border border-[var(--color-neon-magenta)]/50 text-[var(--color-neon-magenta)] shadow-[inset_0_0_10px_rgba(255,43,214,0.2)]' : 'text-gray-300'}
            ${idx === 1 ? 'text-[var(--color-neon-orange)]' : ''}
            ${idx === 2 ? 'text-[var(--color-neon-cyan)]' : ''}
          `}
        >
          <div className="flex items-center gap-3">
            <span className="font-['Press_Start_2P'] text-[10px] w-4">{player.rank}</span>
            <span className="font-['Orbitron'] font-bold">{player.name}</span>
          </div>
          <span className="font-['Share_Tech_Mono']">{player.score.toString().padStart(6, '0')}</span>
        </div>
      ))}
    </div>
  );
}
