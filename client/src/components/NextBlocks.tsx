import type { BlockShape } from '../store/gameStore';
import { useGameStore } from '../store/gameStore';

function BlockPreview({ shape, index, isSelected }: { shape: BlockShape | null; index: number; isSelected: boolean }) {
  const { setSelectedBlock, selectedBlockIndex } = useGameStore();

  if (!shape) {
    return (
      <div className="h-24 flex items-center justify-center opacity-30">
        <span className="font-['Orbitron'] text-xs uppercase tracking-widest text-[var(--color-neon-cyan)]">Empty</span>
      </div>
    );
  }

  const { matrix, color } = shape;

  const handleClick = () => {
    // Toggle: if already selected, deselect
    setSelectedBlock(selectedBlockIndex === index ? null : index);
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ shapeIndex: index }));
    e.dataTransfer.effectAllowed = 'copyMove';
    // Also select it so board knows which block to use
    setSelectedBlock(index);
  };

  return (
    <div
      draggable
      onClick={handleClick}
      onDragStart={handleDragStart}
      className={`flex flex-col items-center justify-center h-24 cursor-pointer hover:scale-110 transition-all rounded-lg
        ${isSelected
          ? 'ring-2 ring-[var(--color-neon-magenta)] shadow-[0_0_20px_rgba(255,0,255,0.6)] scale-105'
          : 'hover:drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]'
        }`}
    >
      <div className="flex flex-col gap-1">
        {matrix.map((row, y) => (
          <div key={y} className="flex gap-1 justify-center">
            {row.map((cell, x) => (
              <div key={x} className="w-6 h-6">
                {cell === 1 && (
                  <img
                    src={`/${color}_block.png`}
                    alt="block"
                    className="w-full h-full object-contain drop-shadow-[0_0_5px_rgba(255,255,255,0.5)] pointer-events-none"
                  />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
      {isSelected && (
        <span className="text-[8px] mt-1 text-[var(--color-neon-magenta)] uppercase tracking-widest font-bold animate-pulse">
          SELECTED • CLICK BOARD
        </span>
      )}
    </div>
  );
}

export function NextBlocks() {
  const { nextBlocks, selectedBlockIndex } = useGameStore();

  return (
    <div className="flex flex-col gap-4">
      {nextBlocks.map((shape, idx) => (
        <div
          key={idx}
          className="bg-[var(--color-bg-primary)] border border-white/10 rounded overflow-hidden relative"
        >
          {/* Scanline overlay */}
          <div className="absolute inset-0 z-0 opacity-10 pointer-events-none"
               style={{ backgroundImage: 'linear-gradient(transparent 50%, rgba(0,0,0,0.8) 50%)', backgroundSize: '100% 4px' }}>
          </div>
          <div className="relative z-10 p-4">
            <BlockPreview shape={shape} index={idx} isSelected={selectedBlockIndex === idx} />
          </div>
        </div>
      ))}
    </div>
  );
}
