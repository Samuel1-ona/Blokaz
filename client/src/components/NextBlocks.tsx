import React from 'react';
import type { BlockShape } from '../store/gameStore';
import { PIECE_NAMES, useGameStore } from '../store/gameStore';

function BlockPreview({
  shape,
  index,
  isSelected,
}: {
  shape: BlockShape | null;
  index: number;
  isSelected: boolean;
}) {
  const { setSelectedBlock, selectedBlockIndex } = useGameStore();

  if (!shape) {
    return (
      <div className="h-24 flex items-center justify-center opacity-30">
        <span className="font-['Orbitron'] text-xs uppercase tracking-widest text-[var(--color-neon-cyan)]">
          Empty
        </span>
      </div>
    );
  }

  const { matrix, color, pieceId } = shape;

  const handleClick = () => {
    setSelectedBlock(selectedBlockIndex === index ? null : index);
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ shapeIndex: index }));
    e.dataTransfer.effectAllowed = 'copyMove';
    setSelectedBlock(index);
  };

  // Determine a sensible preview cell size based on piece dimensions
  const maxDim = Math.max(shape.piece.width, shape.piece.height);
  const cellSize = maxDim >= 5 ? 'w-4 h-4' : maxDim >= 4 ? 'w-5 h-5' : 'w-6 h-6';

  return (
    <div
      draggable
      onClick={handleClick}
      onDragStart={handleDragStart}
      className={`flex flex-col items-center justify-center min-h-20 cursor-pointer hover:scale-110 transition-all rounded-lg gap-1
        ${
          isSelected
            ? 'ring-2 ring-[var(--color-neon-magenta)] shadow-[0_0_20px_rgba(255,0,255,0.6)] scale-105'
            : 'hover:drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]'
        }`}
    >
      {/* Piece name label */}
      <span className="font-['Orbitron'] text-[8px] uppercase tracking-widest text-gray-500 mb-1">
        {PIECE_NAMES[pieceId] ?? `Piece #${pieceId}`}
      </span>

      {/* Grid preview */}
      <div className="flex flex-col gap-0.5">
        {matrix.map((row, y) => (
          <div key={y} className="flex gap-0.5 justify-center">
            {row.map((cell, x) => (
              <div key={x} className={cellSize}>
                {cell && (
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
          <div
            className="absolute inset-0 z-0 opacity-10 pointer-events-none"
            style={{
              backgroundImage: 'linear-gradient(transparent 50%, rgba(0,0,0,0.8) 50%)',
              backgroundSize: '100% 4px',
            }}
          />
          <div className="relative z-10 p-4">
            <BlockPreview shape={shape} index={idx} isSelected={selectedBlockIndex === idx} />
          </div>
        </div>
      ))}
    </div>
  );
}
