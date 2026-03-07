import { create } from 'zustand';

export type BlockColor = 'blue' | 'green' | 'orange' | 'purple' | 'red' | null;

export type ShapeMatrix = number[][];

export interface BlockShape {
  id: string;
  matrix: ShapeMatrix;
  color: Exclude<BlockColor, null>;
}

export const SHAPES: Record<string, ShapeMatrix> = {
  L: [
    [1, 0],
    [1, 0],
    [1, 1]
  ],
  T: [
    [1, 1, 1],
    [0, 1, 0]
  ],
  Line: [
    [1, 1, 1, 1]
  ],
  Square: [
    [1, 1],
    [1, 1]
  ],
  Dot: [
    [1]
  ],
  Corner: [
    [1, 1],
    [1, 0]
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1]
  ],
  Bar3: [
    [1, 1, 1]
  ]
};

const COLORS: Exclude<BlockColor, null>[] = ['blue', 'green', 'orange', 'purple', 'red'];

function getRandomShape(): BlockShape {
  const shapeKeys = Object.keys(SHAPES);
  const randomKey = shapeKeys[Math.floor(Math.random() * shapeKeys.length)];
  const randomColor = COLORS[Math.floor(Math.random() * COLORS.length)];
  return {
    id: Math.random().toString(36).substring(2, 9),
    matrix: SHAPES[randomKey],
    color: randomColor
  };
}

function getThreeRandomShapes(): [BlockShape | null, BlockShape | null, BlockShape | null] {
  return [getRandomShape(), getRandomShape(), getRandomShape()];
}

interface GameState {
  grid: BlockColor[][];
  score: number;
  bestScore: number;
  combo: number;
  nextBlocks: [BlockShape | null, BlockShape | null, BlockShape | null];
  selectedBlockIndex: number | null;
  placeBlock: (shapeIndex: number, startX: number, startY: number) => boolean;
  canPlaceBlock: (shapeIndex: number | BlockShape, startX: number, startY: number) => boolean;
  setSelectedBlock: (index: number | null) => void;
  resetGame: () => void;
  checkLineClears: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  grid: Array(9).fill(null).map(() => Array(9).fill(null)),
  score: 0,
  bestScore: parseInt(localStorage.getItem('blockaz_best') || '0', 10),
  combo: 1,
  nextBlocks: getThreeRandomShapes(),
  selectedBlockIndex: null,

  setSelectedBlock: (index) => set({ selectedBlockIndex: index }),

  resetGame: () => set(() => ({
    grid: Array(9).fill(null).map(() => Array(9).fill(null)),
    score: 0,
    combo: 1,
    nextBlocks: getThreeRandomShapes()
  })),

  canPlaceBlock: (shapeOrIndex, startX, startY) => {
    const state = get();
    const shape = typeof shapeOrIndex === 'number' ? state.nextBlocks[shapeOrIndex] : shapeOrIndex;
    if (!shape) return false;

    const { matrix } = shape;
    for (let y = 0; y < matrix.length; y++) {
      for (let x = 0; x < matrix[y].length; x++) {
        if (matrix[y][x] === 1) {
          const boardY = startY + y;
          const boardX = startX + x;
          // Out of bounds
          if (boardY < 0 || boardY >= 9 || boardX < 0 || boardX >= 9) return false;
          // Overlapping
          if (state.grid[boardY][boardX] !== null) return false;
        }
      }
    }
    return true;
  },

  placeBlock: (shapeIndex, startX, startY) => {
    const state = get();
    const shape = state.nextBlocks[shapeIndex];
    if (!shape) return false;

    if (!state.canPlaceBlock(shapeIndex, startX, startY)) return false;

    set((state) => {
      const newGrid = state.grid.map(row => [...row]);
      const { matrix, color } = shape;
      let blocksPlaced = 0;

      for (let y = 0; y < matrix.length; y++) {
        for (let x = 0; x < matrix[y].length; x++) {
          if (matrix[y][x] === 1) {
            newGrid[startY + y][startX + x] = color;
            blocksPlaced++;
          }
        }
      }

      const scoreGain = blocksPlaced * 10 * state.combo;
      
      const newNextBlocks = [...state.nextBlocks] as GameState['nextBlocks'];
      newNextBlocks[shapeIndex] = null;
      
      // If all 3 used, refill
      if (newNextBlocks.every(b => b === null)) {
        newNextBlocks[0] = getRandomShape();
        newNextBlocks[1] = getRandomShape();
        newNextBlocks[2] = getRandomShape();
      }

      return {
        grid: newGrid,
        score: state.score + scoreGain,
        nextBlocks: newNextBlocks,
        selectedBlockIndex: null,
      };
    });

    get().checkLineClears();
    return true;
  },

  checkLineClears: () => {
    set((state) => {
      const newGrid = state.grid.map(row => [...row]);
      const rowsToClear: number[] = [];
      const colsToClear: number[] = [];

      // Check rows
      for (let y = 0; y < 9; y++) {
        if (newGrid[y].every(cell => cell !== null)) {
          rowsToClear.push(y);
        }
      }

      // Check columns
      for (let x = 0; x < 9; x++) {
        let isFull = true;
        for (let y = 0; y < 9; y++) {
          if (newGrid[y][x] === null) {
            isFull = false;
            break;
          }
        }
        if (isFull) {
          colsToClear.push(x);
        }
      }

      // If nothing to clear, reset combo
      if (rowsToClear.length === 0 && colsToClear.length === 0) {
        return { combo: 1 };
      }

      // Clear them
      rowsToClear.forEach(y => {
        for (let x = 0; x < 9; x++) {
          newGrid[y][x] = null;
        }
      });
      colsToClear.forEach(x => {
        for (let y = 0; y < 9; y++) {
          newGrid[y][x] = null;
        }
      });

      const linesCleared = rowsToClear.length + colsToClear.length;
      const comboGain = linesCleared > 1 ? linesCleared : 0;
      const scoreGain = linesCleared * 100 * state.combo;
      const newScore = state.score + scoreGain;
      const newBest = Math.max(newScore, state.bestScore);
      localStorage.setItem('blockaz_best', newBest.toString());

      return {
        grid: newGrid,
        score: newScore,
        bestScore: newBest,
        combo: state.combo + comboGain
      };
    });
  }
}));
