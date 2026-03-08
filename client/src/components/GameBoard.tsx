import React, { useRef, useState, useCallback, useContext } from 'react';
import { useGameStore } from '../store/gameStore';
import { GameActionsContext } from '../contexts/GameActionsContext';

const BOARD = 9;

const BLOCK_IMG: Record<string, string> = {
  blue:   '/blue_block.png',
  green:  '/green_block.png',
  orange: '/orange_block.png',
  purple: '/purple_block.png',
  red:    '/red_block.png',
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
    clearedRows,
    clearedCols,
    clearSnapshot,
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

            // Check if this cell is on a cleared row or column
            const isFlashRow = clearedRows.includes(y);
            const isFlashCol = clearedCols.includes(x);
            const isFlashing = isFlashRow || isFlashCol;
            // Stagger delay: sweep left-to-right for rows, top-to-bottom for cols
            const flashDelay = isFlashRow
              ? `${x * 28}ms`
              : isFlashCol
                ? `${y * 28}ms`
                : '0ms';

            return (
              <div
                key={`${y}-${x}`}
                style={{
                  backgroundColor: isGhost
                    ? 'transparent'
                    : filled ? 'transparent' : '#151a35',
                  borderRadius: filled ? '3px' : '2px',
                  boxShadow: isGhost
                    ? (ghostValid
                        ? '0 0 10px rgba(255,255,255,0.3)'
                        : '0 0 10px rgba(255,60,60,0.5)')
                    : filled
                      ? `0 0 8px ${COLOR_GLOW[color!]}`
                      : 'none',
                  border: isGhost
                    ? ghostBorder
                    : (isGhost && filled) ? '2px solid rgba(255,60,60,0.9)' : 'none',
                  position: 'relative',
                  overflow: 'visible',
                  transition: isGhost
                    ? 'none'
                    : 'box-shadow 0.12s ease',
                }}
              >
                {/* Filled block — render the color PNG */}
                {filled && !isGhost && (
                  <img
                    src={BLOCK_IMG[color!]}
                    alt={color!}
                    draggable={false}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                      pointerEvents: 'none',
                    }}
                  />
                )}
                {/* Ghost overlay */}
                {isGhost && (
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundColor: ghostColor,
                    borderRadius: '4px',
                  }} />
                )}
                {/* Line-clear flash overlay — renders the old block image then bursts */}
                {isFlashing && (
                  <div
                    className="line-clear-flash"
                    style={{
                      position: 'absolute',
                      inset: '-1px',
                      animationDelay: flashDelay,
                    }}
                  >
                    {/* Show the original block image underneath the neon burst */}
                    {(() => {
                      const snapColor = clearSnapshot?.[y]?.[x];
                      return snapColor ? (
                        <img
                          src={BLOCK_IMG[snapColor]}
                          alt=""
                          draggable={false}
                          style={{
                            position: 'absolute',
                            inset: 0,
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            pointerEvents: 'none',
                            opacity: 0.6,
                          }}
                        />
                      ) : null;
                    })()}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ── "Click to place" hint ── */}
      {isBlockSelected && ghostOrigin === null && (
        <div className="absolute bottom-2 left-0 right-0 flex justify-center pointer-events-none z-10">
          <span className="text-[12px] bg-black/80 text-[var(--color-neon-magenta)] px-3 py-1 rounded font-['Rajdhani'] font-semibold uppercase tracking-widest animate-pulse">
            Click or drag to place
          </span>
        </div>
      )}

      {/* ── Ghost validity badge ── */}
      {ghostOrigin !== null && ghostCells.length > 0 && (
        <div className="absolute top-2 left-0 right-0 flex justify-center pointer-events-none z-10">
          <span
            className="text-[12px] font-semibold tracking-widest"
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
            className="text-[12px] px-4 py-2 rounded font-['Rajdhani'] font-semibold uppercase tracking-widest animate-pulse"
            style={{ color: '#00F5FF', textShadow: '0 0 10px rgba(0,245,255,0.8)' }}
          >
            {pendingMessage}
          </span>
        </div>
      )}
    </div>
  );
}
