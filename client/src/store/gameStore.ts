import { create } from 'zustand';

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

function getRandomBlockShape(): BlockShape {
  const piece = PIECES[Math.floor(Math.random() * PIECES.length)];
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  return {
    pieceId: piece.id,
    piece,
    matrix: pieceToMatrix(piece),
    color,
  };
}

function getThreeRandomShapes(): [BlockShape | null, BlockShape | null, BlockShape | null] {
  return [getRandomBlockShape(), getRandomBlockShape(), getRandomBlockShape()];
}

// ─────────────────────────────────────────────────────────────────────────────
// GRID SYSTEM — mirrors grid.cairo exactly
// 9×9 bitboard stored as a JS BigInt (u128 analogue).
// bit index = y * 9 + x  (LSB = top-left)
// ─────────────────────────────────────────────────────────────────────────────

const BOARD = 9;
const FULL_ROW = (1n << 9n) - 1n; // 0b111111111

// Build the bitmask for piece placed at board (x, y)
function placePieceMask(piece: Piece, x: number, y: number): bigint {
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
  return mask;
}

// Mirrors can_place()
function canPlace(grid: bigint, piece: Piece, x: number, y: number): boolean {
  if (x + piece.width > BOARD || y + piece.height > BOARD) return false;
  const mask = placePieceMask(piece, x, y);
  return (grid & mask) === 0n;
}

// Mirrors resolve_clears() — returns [newGrid, linesCleared]
function resolveClears(grid: bigint): [bigint, number] {
  let linesCleared = 0;
  let rowsToClear = 0n;
  let colsToClear = 0n;

  // Full rows
  for (let y = 0; y < BOARD; y++) {
    const mask = FULL_ROW << BigInt(y * BOARD);
    if ((grid & mask) === mask) {
      rowsToClear |= mask;
      linesCleared++;
    }
  }

  // Full columns
  let colMask = 0n;
  for (let i = 0; i < BOARD; i++) colMask |= 1n << BigInt(i * BOARD); // bit 0 of each row
  for (let x = 0; x < BOARD; x++) {
    const mask = colMask << BigInt(x);
    if ((grid & mask) === mask) {
      colsToClear |= mask;
      linesCleared++;
    }
  }

  const toClear = rowsToClear | colsToClear;
  const newGrid = grid - toClear; // safe because toClear ⊆ grid
  return [newGrid, linesCleared];
}

// ─────────────────────────────────────────────────────────────────────────────
// COLOUR GRID (derived from bitboard — used by renderer)
// colourGrid[y][x] → colour string or null
// ─────────────────────────────────────────────────────────────────────────────

export type ColourGrid = (BlockColor)[][];

function emptyColourGrid(): ColourGrid {
  return Array.from({ length: BOARD }, () => Array(BOARD).fill(null));
}

// Merge a piece placement into the colour grid
function applyColourPlacement(
  colour: ColourGrid,
  piece: Piece,
  x: number,
  y: number,
  color: Exclude<BlockColor, null>,
): ColourGrid {
  const next = colour.map(r => [...r]);
  for (let py = 0; py < piece.height; py++) {
    for (let px = 0; px < piece.width; px++) {
      const bitIdx = py * piece.width + px;
      if (((piece.layout >> bitIdx) & 1) === 1) {
        next[y + py][x + px] = color;
      }
    }
  }
  return next;
}

// Erase cleared cells from colour grid using the new bitboard
function syncColourGrid(colour: ColourGrid, newGrid: bigint): ColourGrid {
  return colour.map((row, y) =>
    row.map((cell, x) => {
      const bit = BigInt(y * BOARD + x);
      return (newGrid >> bit) & 1n ? cell : null;
    })
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ZUSTAND STORE
// ─────────────────────────────────────────────────────────────────────────────

interface GameState {
  // The authoritative board state (mirrors Cairo u128 grid)
  bitGrid: bigint;
  // Derived colour map for rendering
  colourGrid: ColourGrid;
  score: number;
  bestScore: number;
  linesCleared: number; // total lines (rows + cols) cleared this game
  combo: number;
  nextBlocks: [BlockShape | null, BlockShape | null, BlockShape | null];
  selectedBlockIndex: number | null;

  // Actions
  setSelectedBlock: (index: number | null) => void;
  canPlaceBlock: (shapeOrIndex: number | BlockShape, startX: number, startY: number) => boolean;
  placeBlock: (shapeIndex: number, startX: number, startY: number) => boolean;
  resetGame: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  bitGrid: 0n,
  colourGrid: emptyColourGrid(),
  score: 0,
  bestScore: parseInt(localStorage.getItem('blockaz_best') || '0', 10),
  linesCleared: 0,
  combo: 1,
  nextBlocks: getThreeRandomShapes(),
  selectedBlockIndex: null,

  setSelectedBlock: (index) => set({ selectedBlockIndex: index }),

  resetGame: () =>
    set({
      bitGrid: 0n,
      colourGrid: emptyColourGrid(),
      score: 0,
      linesCleared: 0,
      combo: 1,
      nextBlocks: getThreeRandomShapes(),
      selectedBlockIndex: null,
    }),

  canPlaceBlock: (shapeOrIndex, startX, startY) => {
    const state = get();
    const shape =
      typeof shapeOrIndex === 'number'
        ? state.nextBlocks[shapeOrIndex]
        : shapeOrIndex;
    if (!shape) return false;
    return canPlace(state.bitGrid, shape.piece, startX, startY);
  },

  placeBlock: (shapeIndex, startX, startY) => {
    const state = get();
    const shape = state.nextBlocks[shapeIndex];
    if (!shape) return false;
    if (!canPlace(state.bitGrid, shape.piece, startX, startY)) return false;

    // 1. Place piece on bitboard
    const mask = placePieceMask(shape.piece, startX, startY);
    const placedGrid = state.bitGrid | mask;

    // 2. Apply colour
    let newColour = applyColourPlacement(
      state.colourGrid,
      shape.piece,
      startX,
      startY,
      shape.color,
    );

    // 3. Count placed tiles for score
    const tilesPlaced = shape.piece.layout
      .toString(2)
      .split('')
      .filter(b => b === '1').length;

    // 4. Resolve clears (mirrors resolve_clears)
    const [clearedGrid, linesThisMove] = resolveClears(placedGrid);

    // 5. Re-sync colour grid
    if (linesThisMove > 0) {
      newColour = syncColourGrid(newColour, clearedGrid);
    }

    // 6. Refill next blocks
    const newNextBlocks = [...state.nextBlocks] as GameState['nextBlocks'];
    newNextBlocks[shapeIndex] = null;
    if (newNextBlocks.every(b => b === null)) {
      newNextBlocks[0] = getRandomBlockShape();
      newNextBlocks[1] = getRandomBlockShape();
      newNextBlocks[2] = getRandomBlockShape();
    }

    // 7. Scoring: tiles placed + line clears
    const comboMultiplier = state.combo;
    const tilePts = tilesPlaced * 10;
    const linePts = linesThisMove * 100 * comboMultiplier;
    const scoreGain = tilePts + linePts;
    const newScore = state.score + scoreGain;
    const newBest = Math.max(newScore, state.bestScore);
    if (newBest > state.bestScore) {
      localStorage.setItem('blockaz_best', newBest.toString());
    }

    // Combo: increases when lines are cleared
    const newCombo =
      linesThisMove > 0
        ? state.combo + (linesThisMove > 1 ? linesThisMove : 1)
        : 1;

    set({
      bitGrid: clearedGrid,
      colourGrid: newColour,
      score: newScore,
      bestScore: newBest,
      linesCleared: state.linesCleared + linesThisMove,
      combo: newCombo,
      nextBlocks: newNextBlocks,
      selectedBlockIndex: null,
    });

    return true;
  },
}));
