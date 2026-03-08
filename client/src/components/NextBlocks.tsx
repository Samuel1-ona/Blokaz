import React from 'react';
import type { BlockShape } from '../store/gameStore';
import { PIECE_NAMES, useGameStore } from '../store/gameStore';

// Use the actual block PNG assets from /public
const BLOCK_IMG: Record<string, string> = {
  blue:   '/blue_block.png',
  green:  '/green_block.png',
  orange: '/orange_block.png',
  purple: '/purple_block.png',
  red:    '/red_block.png',
};

const COLOR_GLOW: Record<string, string> = {
  blue:   'rgba(58,127,255,0.6)',
  green:  'rgba(46,204,95,0.6)',
  orange: 'rgba(255,140,0,0.6)',
  purple: 'rgba(155,68,255,0.6)',
  red:    'rgba(255,60,60,0.6)',
};

interface BlockPreviewProps {
  shape: BlockShape | null;
  index: number;
  isSelected: boolean;
  cellSize?: number;
}

function BlockPreview({ shape, index, isSelected, cellSize = 22 }: BlockPreviewProps) {
  const { setSelectedBlock, selectedBlockIndex, gamePhase } = useGameStore();
  const isLocked = gamePhase !== 'PLAYING';

  if (!shape) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: 0.25,
        fontFamily: 'Orbitron',
        fontSize: '8px',
        letterSpacing: '0.15em',
        color: '#6b7494',
        minHeight: '60px',
        minWidth: '60px',
      }}>
        EMPTY
      </div>
    );
  }

  const { matrix, color, pieceId } = shape;
  // Scale cell size down for wider/taller pieces
  const maxDim = Math.max(shape.piece.width, shape.piece.height);
  const cs = maxDim >= 5 ? cellSize - 8 : maxDim >= 4 ? cellSize - 4 : cellSize;

  const handleClick = () => {
    if (isLocked) return;
    setSelectedBlock(selectedBlockIndex === index ? null : index);
  };

  const handleDragStart = (e: React.DragEvent) => {
    if (isLocked) { e.preventDefault(); return; }
    e.dataTransfer.setData('application/json', JSON.stringify({ shapeIndex: index }));
    e.dataTransfer.effectAllowed = 'copyMove';
    setSelectedBlock(index);
  };

  return (
    <div
      draggable={!isLocked}
      onClick={handleClick}
      onDragStart={handleDragStart}
      title={PIECE_NAMES[pieceId] ?? `Piece #${pieceId}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        padding: '10px 14px',
        borderRadius: '6px',
        cursor: isLocked ? 'default' : 'pointer',
        opacity: isLocked ? 0.5 : 1,
        transition: 'transform 0.15s, box-shadow 0.15s, opacity 0.2s',
        border: isSelected
          ? '2px solid #FF2BD6'
          : '2px solid transparent',
        boxShadow: isSelected
          ? `0 0 18px rgba(255,43,214,0.55), inset 0 0 12px rgba(255,43,214,0.1)`
          : 'none',
        background: isSelected ? 'rgba(255,43,214,0.08)' : 'transparent',
        transform: isSelected ? 'scale(1.08)' : 'scale(1)',
        userSelect: 'none',
        minWidth: `${cs * 5 + 14 * 2}px`,
      }}
    >
      {/* Piece grid using real block PNGs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {matrix.map((row, y) => (
          <div key={y} style={{ display: 'flex', gap: '2px', justifyContent: 'center' }}>
            {row.map((cell, x) => (
              <div
                key={x}
                style={{
                  width: cs,
                  height: cs,
                  flexShrink: 0,
                }}
              >
                {cell && (
                  <img
                    src={BLOCK_IMG[color]}
                    alt={color}
                    draggable={false}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      display: 'block',
                      filter: `drop-shadow(0 0 4px ${COLOR_GLOW[color]})`,
                      pointerEvents: 'none',
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Selected badge */}
      {isSelected && (
        <span style={{
          fontSize: '7px',
          color: '#FF2BD6',
          fontFamily: 'Orbitron',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          textShadow: '0 0 8px rgba(255,43,214,0.9)',
          animation: 'pulse-glow 1.5s ease-in-out infinite',
        }}>
          SELECTED
        </span>
      )}
    </div>
  );
}

interface NextBlocksProps {
  /** 'horizontal' lays all 3 pieces side-by-side (for below the board).
   *  'vertical' stacks them (legacy right-column layout). */
  layout?: 'horizontal' | 'vertical';
}

export function NextBlocks({ layout = 'vertical' }: NextBlocksProps) {
  const { nextBlocks, selectedBlockIndex } = useGameStore();

  if (layout === 'horizontal') {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'space-evenly',
        alignItems: 'center',
        gap: '8px',
        flexWrap: 'wrap',
      }}>
        {nextBlocks.map((shape, idx) => (
          <div
            key={idx}
            style={{
              background: 'rgba(0,0,0,0.35)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '6px',
              position: 'relative',
              overflow: 'hidden',
              flex: '1 1 0',
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            {/* Scanline */}
            <div style={{
              position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
              backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.07) 3px, rgba(0,0,0,0.07) 4px)',
            }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <BlockPreview shape={shape} index={idx} isSelected={selectedBlockIndex === idx} cellSize={24} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Vertical (stacked) layout
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {nextBlocks.map((shape, idx) => (
        <div
          key={idx}
          style={{
            background: 'rgba(0,0,0,0.35)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '6px',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.07) 3px, rgba(0,0,0,0.07) 4px)',
          }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <BlockPreview shape={shape} index={idx} isSelected={selectedBlockIndex === idx} />
          </div>
        </div>
      ))}
    </div>
  );
}
