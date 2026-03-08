import { create } from 'zustand';

// ─────────────────────────────────────────────────────────────────────────────
// GAME PHASE STATE MACHINE
// ─────────────────────────────────────────────────────────────────────────────

export type GamePhase =
  | 'DISCONNECTED'   // no wallet
  | 'LOADING'        // wallet connected, fetching tokens
  | 'IDLE'           // has wallet, no active game (may have playable token)
  | 'MINTING'        // mint tx in flight
  | 'AWAITING_MINT'  // mint tx confirmed, polling for new token
  | 'STARTING'       // start_game tx in flight
  | 'PLAYING'        // game active, board accepts input
  | 'PLACING'        // place_block tx in flight, board locked
  | 'GAME_OVER';     // chain says gameOver=true

// ─────────────────────────────────────────────────────────────────────────────
// PIECE SYSTEM — mirrors pieces.cairo exactly
// Layout: bit index = py * width + px, LSB = (0,0) top-left
// ─────────────────────────────────────────────────────────────────────────────

export type BlockColor = 'blue' | 'green' | 'orange' | 'purple' | 'red' | null;

export interface Piece {
  id: number;
  width: number;
  height: number;
  layout: number; // compact bit-field, same as Cairo u32
}

// Convert a Piece's compact layout to a 2-D boolean matrix [row][col]
export function pieceToMatrix(piece: Piece): boolean[][] {
  const matrix: boolean[][] = [];
  for (let py = 0; py < piece.height; py++) {
    const row: boolean[] = [];
    for (let px = 0; px < piece.width; px++) {
      const bitIdx = py * piece.width + px;
      row.push(((piece.layout >> bitIdx) & 1) === 1);
    }
    matrix.push(row);
  }
  return matrix;
}

// All 12 canonical pieces from pieces.cairo (IDs 0–11)
export const PIECES: Piece[] = [
  { id: 0,  width: 1, height: 1, layout: 0b1          }, // Dot
  { id: 1,  width: 2, height: 2, layout: 0b1111        }, // 2×2 Square
  { id: 2,  width: 3, height: 3, layout: 0b111111111   }, // 3×3 Square
  { id: 3,  width: 2, height: 1, layout: 0b11           }, // Horizontal 2
  { id: 4,  width: 3, height: 1, layout: 0b111          }, // Horizontal 3
  { id: 5,  width: 4, height: 1, layout: 0b1111         }, // Horizontal 4
  { id: 6,  width: 5, height: 1, layout: 0b11111        }, // Horizontal 5
  { id: 7,  width: 1, height: 2, layout: 0b11           }, // Vertical 2
  { id: 8,  width: 1, height: 3, layout: 0b111          }, // Vertical 3
  { id: 9,  width: 1, height: 4, layout: 0b1111         }, // Vertical 4
  { id: 10, width: 1, height: 5, layout: 0b11111        }, // Vertical 5
  { id: 11, width: 2, height: 2, layout: 0b1101         }, // L Top-Right
];

export const PIECE_NAMES: Record<number, string> = {
  0: 'Dot',
  1: '2×2 Square',
  2: '3×3 Square',
  3: 'Horiz 2',
  4: 'Horiz 3',
  5: 'Horiz 4',
  6: 'Horiz 5',
  7: 'Vert 2',
  8: 'Vert 3',
  9: 'Vert 4',
  10: 'Vert 5',
  11: 'L Shape',
};

export const COLORS: Exclude<BlockColor, null>[] = [
  'blue', 'green', 'orange', 'purple', 'red',
];

export interface BlockShape {
  pieceId: number;   // 0–11, matching Cairo piece IDs
  piece: Piece;
  matrix: boolean[][];
  color: Exclude<BlockColor, null>;
}

// ─────────────────────────────────────────────────────────────────────────────
// GRID HELPERS — used for ghost preview (canPlaceBlock) and rendering
// ─────────────────────────────────────────────────────────────────────────────

const BOARD = 9;

// Mirrors can_place() — used client-side for ghost preview only
function canPlace(grid: bigint, piece: Piece, x: number, y: number): boolean {
  if (x + piece.width > BOARD || y + piece.height > BOARD) return false;
  let mask = 0n;
  for (let py = 0; py < piece.height; py++) {
    for (let px = 0; px < piece.width; px++) {
      const bitIdx = py * piece.width + px;
      if (((piece.layout >> bitIdx) & 1) === 1) {
        const boardBit = BigInt((y + py) * BOARD + (x + px));
        mask |= 1n << boardBit;
      }
    }
  }
  return (grid & mask) === 0n;
}

// Convert u128 bitboard to colour grid for rendering.
// If an existing colourGrid is provided, colours for already-filled cells are
// preserved (so we don't lose client-side colour info on every chain sync).
// Cells that are now empty on-chain (e.g. cleared lines) are set to null.
export function bitGridToColourGrid(
  grid: bigint,
  existing?: ColourGrid,
): ColourGrid {
  const result: ColourGrid = Array.from({ length: BOARD }, () => Array(BOARD).fill(null));
  for (let y = 0; y < BOARD; y++) {
    for (let x = 0; x < BOARD; x++) {
      const bit = BigInt(y * BOARD + x);
      if ((grid >> bit) & 1n) {
        // Preserve existing client-side colour; fall back to 'blue' for blocks
        // that were placed before colour tracking was introduced.
        result[y][x] = existing?.[y]?.[x] ?? 'blue';
      }
    }
  }
  return result;
}

// Paint a placed block's colour onto a colour grid (returns a new grid).
export function applyBlockToColourGrid(
  colourGrid: ColourGrid,
  shape: BlockShape,
  startX: number,
  startY: number,
): ColourGrid {
  // Deep-clone the grid rows that will be touched
  const result = colourGrid.map(row => [...row]) as ColourGrid;
  shape.matrix.forEach((row, py) =>
    row.forEach((filled, px) => {
      if (filled) {
        const gy = startY + py;
        const gx = startX + px;
        if (gy >= 0 && gy < BOARD && gx >= 0 && gx < BOARD) {
          result[gy][gx] = shape.color;
        }
      }
    }),
  );
  return result;
}

export type ColourGrid = (BlockColor)[][];

function emptyColourGrid(): ColourGrid {
  return Array.from({ length: BOARD }, () => Array(BOARD).fill(null));
}

// ─────────────────────────────────────────────────────────────────────────────
// ZUSTAND STORE — pure view layer, state set from chain reads
// ─────────────────────────────────────────────────────────────────────────────

interface GameState {
  // Game phase
  gamePhase: GamePhase;
  pendingMessage: string | null;

  // Chain state
  bitGrid: bigint;
  colourGrid: ColourGrid;
  score: number;
  bestScore: number;
  combo: number;
  gameOver: boolean;
  nextBlocks: [BlockShape | null, BlockShape | null, BlockShape | null];
  selectedBlockIndex: number | null;

  // Line-clear animation state
  clearedRows: number[];
  clearedCols: number[];
  // Snapshot of the colour grid at the moment lines were cleared (for flash overlay)
  clearSnapshot: ColourGrid | null;
  clearLineFlash: () => void;

  // Phase actions
  setGamePhase: (phase: GamePhase) => void;
  setPendingMessage: (msg: string | null) => void;

  // UI-only actions
  setSelectedBlock: (index: number | null) => void;
  canPlaceBlock: (shapeOrIndex: number | BlockShape, startX: number, startY: number) => boolean;

  // Paint a block's colour optimistically before the tx is confirmed
  applyOptimisticColor: (shape: BlockShape, startX: number, startY: number) => void;

  // Set state from chain reads
  setChainState: (state: {
    bitGrid: bigint;
    score: number;
    combo: number;
    gameOver: boolean;
    nextBlocks: [BlockShape | null, BlockShape | null, BlockShape | null];
  }) => void;

  // Clear everything
  resetGame: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  gamePhase: 'DISCONNECTED',
  pendingMessage: null,
  bitGrid: 0n,
  colourGrid: emptyColourGrid(),
  score: 0,
  bestScore: parseInt(localStorage.getItem('blockaz_best') || '0', 10),
  combo: 0,
  gameOver: false,
  nextBlocks: [null, null, null],
  selectedBlockIndex: null,
  clearedRows: [],
  clearedCols: [],
  clearSnapshot: null,

  setGamePhase: (phase) => set({ gamePhase: phase }),
  setPendingMessage: (msg) => set({ pendingMessage: msg }),

  clearLineFlash: () => set({ clearedRows: [], clearedCols: [], clearSnapshot: null }),

  setSelectedBlock: (index) => set({ selectedBlockIndex: index }),

  canPlaceBlock: (shapeOrIndex, startX, startY) => {
    const state = get();
    const shape =
      typeof shapeOrIndex === 'number'
        ? state.nextBlocks[shapeOrIndex]
        : shapeOrIndex;
    if (!shape) return false;
    return canPlace(state.bitGrid, shape.piece, startX, startY);
  },

  applyOptimisticColor: (shape, startX, startY) =>
    set((state) => ({
      colourGrid: applyBlockToColourGrid(state.colourGrid, shape, startX, startY),
    })),

  setChainState: (chainState) => {
    const oldGrid = get().bitGrid;
    const oldColourGrid = get().colourGrid;

    // ── Line-clear detection ─────────────────────────────────────────
    // Cairo clears a row/col in the SAME tx it was completed, so the old
    // bitGrid never shows a "full" row. The correct signal is:
    //   hadOccupied  — the row/col had ≥1 cell filled before the move
    //   nowEmpty     — the row/col is completely absent in the new grid
    // Together these mean: the move completed and cleared this line.
    const clearedRows: number[] = [];
    const clearedCols: number[] = [];

    for (let y = 0; y < BOARD; y++) {
      let rowMask = 0n;
      for (let x = 0; x < BOARD; x++) rowMask |= 1n << BigInt(y * BOARD + x);
      const hadOccupied = (oldGrid & rowMask) !== 0n;  // ≥1 bit was set
      const nowEmpty    = (chainState.bitGrid & rowMask) === 0n;
      if (hadOccupied && nowEmpty) clearedRows.push(y);
    }

    for (let x = 0; x < BOARD; x++) {
      let colMask = 0n;
      for (let y = 0; y < BOARD; y++) colMask |= 1n << BigInt(y * BOARD + x);
      const hadOccupied = (oldGrid & colMask) !== 0n;
      const nowEmpty    = (chainState.bitGrid & colMask) === 0n;
      if (hadOccupied && nowEmpty) clearedCols.push(x);
    }

    // Merge with existing colourGrid so client-side colours survive chain syncs.
    // Cells that are empty on-chain (e.g. after a line clear) will be null.
    const colourGrid = bitGridToColourGrid(chainState.bitGrid, get().colourGrid);
    const newBest = Math.max(chainState.score, get().bestScore);
    if (newBest > get().bestScore) {
      localStorage.setItem('blockaz_best', newBest.toString());
    }

    // Auto-transition game phase based on chain state
    const currentPhase = get().gamePhase;
    let nextPhase = currentPhase;
    if (chainState.gameOver) {
      nextPhase = 'GAME_OVER';
    } else if (currentPhase === 'STARTING' || currentPhase === 'PLACING') {
      nextPhase = 'PLAYING';
    }

    set({
      bitGrid: chainState.bitGrid,
      colourGrid,
      score: chainState.score,
      bestScore: newBest,
      combo: chainState.combo,
      gameOver: chainState.gameOver,
      nextBlocks: chainState.nextBlocks,
      selectedBlockIndex: null,
      gamePhase: nextPhase,
      clearedRows,
      clearedCols,
      clearSnapshot: (clearedRows.length > 0 || clearedCols.length > 0) ? oldColourGrid : null,
    });

    // Auto-expire the flash after the animation completes
    if (clearedRows.length > 0 || clearedCols.length > 0) {
      setTimeout(() => get().clearLineFlash(), 750);
    }
  },

  resetGame: () =>
    set({
      bitGrid: 0n,
      colourGrid: emptyColourGrid(),
      score: 0,
      combo: 0,
      gameOver: false,
      nextBlocks: [null, null, null],
      selectedBlockIndex: null,
      clearedRows: [],
      clearedCols: [],
    }),
}));
