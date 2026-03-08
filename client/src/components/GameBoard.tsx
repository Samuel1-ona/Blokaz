import React, { useRef, useState, useCallback, useContext } from 'react';
import { useGameStore } from '../store/gameStore';
import { GameActionsContext } from '../contexts/GameActionsContext';

const BOARD = 9;

const COLOR_HEX: Record<string, string> = {
  blue:   '#3a7fff',
  green:  '#2ecc5f',
  orange: '#ff8c00',
  purple: '#9b44ff',
  red:    '#ff3c3c',
};

const COLOR_GLOW: Record<string, string> = {
  blue:   'rgba(58,127,255,0.75)',
  green:  'rgba(46,204,95,0.75)',
  orange: 'rgba(255,140,0,0.75)',
  purple: 'rgba(155,68,255,0.75)',
  red:    'rgba(255,60,60,0.75)',
};

type GhostCell = { row: number; col: number };

export function GameBoard() {
  const {
    colourGrid,
    canPlaceBlock,
    nextBlocks,
    selectedBlockIndex,
    setSelectedBlock,
    gamePhase,
    pendingMessage,
  } = useGameStore();

  // Use context for onchain placement
  const gameActions = useContext(GameActionsContext);
  const placeBlock = useCallback(
    (shapeIndex: number, col: number, row: number) => {
      if (gameActions) {
        gameActions.handlePlaceBlock(shapeIndex, col, row);
      }
    },
    [gameActions],
  );

  const boardRef = useRef<HTMLDivElement>(null);

  // ── Ghost / preview state ────────────────────────────────────────
  // Which shape is currently being dragged (index into nextBlocks)
  const [ghostShapeIndex, setGhostShapeIndex] = useState<number | null>(null);
  // Top-left tile the piece would be placed at
  const [ghostOrigin, setGhostOrigin] = useState<[number, number] | null>(null);

  // ── Coordinate helper ────────────────────────────────────────────
  const clientToTile = useCallback(
    (clientX: number, clientY: number): [number, number] | null => {
      const rect = boardRef.current?.getBoundingClientRect();
      if (!rect) return null;
      const col = Math.floor(((clientX - rect.left) / rect.width) * BOARD);
      const row = Math.floor(((clientY - rect.top) / rect.height) * BOARD);
      if (col < 0 || col >= BOARD || row < 0 || row >= BOARD) return null;
      return [col, row];
    },
    [],
  );

  // ── Compute ghost cells for the current drag position ────────────
  const getGhostCells = (): { cells: GhostCell[]; valid: boolean } => {
    if (ghostShapeIndex === null || ghostOrigin === null) return { cells: [], valid: false };
    const shape = nextBlocks[ghostShapeIndex];
    if (!shape) return { cells: [], valid: false };

    const [originCol, originRow] = ghostOrigin;
    const cells: GhostCell[] = [];

    shape.matrix.forEach((row, py) =>
      row.forEach((filled, px) => {
        if (filled) cells.push({ row: originRow + py, col: originCol + px });
      }),
    );

    const valid = canPlaceBlock(ghostShapeIndex, originCol, originRow);
    return { cells, valid };
  };

  const { cells: ghostCells, valid: ghostValid } = getGhostCells();

  // Build a Set for O(1) lookup: "r,c"
  const ghostSet = new Set(ghostCells.map(c => `${c.row},${c.col}`));

  const isLocked = gamePhase !== 'PLAYING';

  // ── Click-to-place ───────────────────────────────────────────────
  const handleBoardClick = (e: React.MouseEvent) => {
    if (isLocked) return;
    if (selectedBlockIndex === null) return;
    const tile = clientToTile(e.clientX, e.clientY);
    if (!tile) return;
    const [col, row] = tile;
    if (!canPlaceBlock(selectedBlockIndex, col, row)) {
      setSelectedBlock(null);
      return;
    }
    placeBlock(selectedBlockIndex, col, row);
    setSelectedBlock(null);
  };

  // ── Drag enter/over — update ghost ──────────────────────────────
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';

    const tile = clientToTile(e.clientX, e.clientY);
    if (!tile) {
      setGhostOrigin(null);
      return;
    }

    // The shape index was set in selectedBlockIndex when drag started (NextBlocks sets it)
    if (selectedBlockIndex !== null) {
      setGhostShapeIndex(selectedBlockIndex);
    }
    setGhostOrigin(tile);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear when leaving the board entirely (not crossing child cells)
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) { setGhostOrigin(null); return; }
    const { clientX: x, clientY: y } = e;
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setGhostOrigin(null);
      setGhostShapeIndex(null);
    }
  };

  // ── Drop ────────────────────────────────────────────────────────
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (isLocked) return;
    setGhostOrigin(null);
    setGhostShapeIndex(null);

    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      const shapeIndex: number = data.shapeIndex;
      if (typeof shapeIndex !== 'number') return;
      const tile = clientToTile(e.clientX, e.clientY);
      if (!tile) return;
      const [col, row] = tile;
      placeBlock(shapeIndex, col, row);
    } catch (err) {
      console.error('Drop failed:', err);
    }
  };

  const isBlockSelected = selectedBlockIndex !== null && nextBlocks[selectedBlockIndex] != null;

  // ── Determine ghost colour ───────────────────────────────────────
  const ghostColor = ghostValid ? 'rgba(255,255,255,0.30)' : 'rgba(255,60,60,0.35)';
  const ghostBorder = ghostValid ? '2px solid rgba(255,255,255,0.6)' : '2px solid rgba(255,60,60,0.8)';

  return (
    <div
      ref={boardRef}
      className={`relative w-[576px] h-[576px] mx-auto select-none transition-all rounded-lg overflow-hidden
        shadow-[0_0_30px_rgba(0,245,255,0.2)]
        ${isBlockSelected && !isLocked
          ? 'cursor-crosshair ring-2 ring-[var(--color-neon-magenta)] shadow-[0_0_30px_rgba(255,0,255,0.4)]'
          : 'cursor-default'
        }`}
      style={{
        backgroundColor: '#1a1f3c',
        pointerEvents: isLocked ? 'none' : 'auto',
        opacity: isLocked ? 0.6 : 1,
        transition: 'opacity 0.2s ease',
      }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onClick={handleBoardClick}
    >
      {/* ── Grid ── */}
      <div
        className="absolute inset-0"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${BOARD}, 1fr)`,
          gridTemplateRows: `repeat(${BOARD}, 1fr)`,
          gap: '1px',
          padding: '1px',
          backgroundColor: '#2a3160',
        }}
      >
        {colourGrid.map((row, y) =>
          row.map((color, x) => {
            const filled  = color !== null;
            const isGhost = ghostSet.has(`${y},${x}`);

            let bg = filled ? COLOR_HEX[color!] : '#151a35';
            let shadow = filled
              ? `0 0 8px ${COLOR_GLOW[color!]}, inset 0 1px 0 rgba(255,255,255,0.25)`
              : 'none';
            let border = 'none';
            let borderRadius = filled ? '4px' : '2px';

            if (isGhost && !filled) {
              bg = ghostColor;
              border = ghostBorder;
              borderRadius = '4px';
              shadow = ghostValid
                ? '0 0 10px rgba(255,255,255,0.3)'
                : '0 0 10px rgba(255,60,60,0.5)';
            } else if (isGhost && filled) {
              // Collision cell — flash red border on top of existing block
              border = '2px solid rgba(255,60,60,0.9)';
              shadow = '0 0 12px rgba(255,60,60,0.7)';
            }

            return (
              <div
                key={`${y}-${x}`}
                style={{
                  backgroundColor: bg,
                  borderRadius,
                  boxShadow: shadow,
                  border,
                  transition: isGhost
                    ? 'none'                             // instant ghost update
                    : 'background-color 0.12s ease, box-shadow 0.12s ease',
                }}
              />
            );
          })
        )}
      </div>

      {/* ── "Click to place" hint ── */}
      {isBlockSelected && ghostOrigin === null && (
        <div className="absolute bottom-2 left-0 right-0 flex justify-center pointer-events-none z-10">
          <span className="text-[10px] bg-black/80 text-[var(--color-neon-magenta)] px-3 py-1 rounded font-['Orbitron'] uppercase tracking-widest animate-pulse">
            Click or drag to place
          </span>
        </div>
      )}

      {/* ── Ghost validity badge ── */}
      {ghostOrigin !== null && ghostCells.length > 0 && (
        <div className="absolute top-2 left-0 right-0 flex justify-center pointer-events-none z-10">
          <span
            className="text-[10px] px-3 py-1 rounded font-['Orbitron'] uppercase tracking-widest"
            style={{
              background: ghostValid ? 'rgba(0,200,80,0.85)' : 'rgba(200,0,0,0.85)',
              color: '#fff',
              boxShadow: ghostValid
                ? '0 0 10px rgba(0,255,100,0.5)'
                : '0 0 10px rgba(255,0,0,0.5)',
            }}
          >
            {ghostValid ? '✓ Place here' : '✗ Can\'t place'}
          </span>
        </div>
      )}

      {/* ── Pending overlay ── */}
      {isLocked && pendingMessage && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
          style={{ background: 'rgba(0,0,0,0.4)' }}
        >
          <span
            className="text-[11px] px-4 py-2 rounded font-['Orbitron'] uppercase tracking-widest animate-pulse"
            style={{ color: '#00F5FF', textShadow: '0 0 10px rgba(0,245,255,0.8)' }}
          >
            {pendingMessage}
          </span>
        </div>
      )}
    </div>
  );
}
