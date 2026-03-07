import React, { useRef, useState } from 'react';
import { Application, Assets, Sprite, Texture, Container as PixiContainer, Graphics } from 'pixi.js';

import { useGameStore } from '../store/gameStore';

const TILE_SIZE = 64;
const BOARD_SIZE = 9 * TILE_SIZE;

export function GameBoard() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { grid, placeBlock, nextBlocks, selectedBlockIndex, setSelectedBlock } = useGameStore();
  const [app, setApp] = useState<Application | null>(null);

  React.useEffect(() => {
    if (!canvasRef.current) return;

    let isDestroyed = false;
    const pixiApp = new Application();

    // Initialize Pixi Application
    pixiApp.init({
      canvas: canvasRef.current,
      width: BOARD_SIZE,
      height: BOARD_SIZE,
      backgroundAlpha: 0,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    }).then(() => {
      if (isDestroyed) {
        pixiApp.destroy(false, { children: true });
      } else {
        setApp(pixiApp);
      }
    }).catch(console.error);

    return () => {
      isDestroyed = true;
      if (pixiApp.renderer) {
        try {
          pixiApp.destroy(false, { children: true });
        } catch (e) {
          console.warn("Destroy cleanup skipped", e);
        }
      }
    };
  }, []);

  React.useEffect(() => {
    if (!app) return;

    // Clear stage
    app.stage.removeChildren();

    const loadAssets = async () => {
      try {
        const bgTexture = await Assets.load('/grid_empty.png');
        const bgSprite = new Sprite(bgTexture);
        bgSprite.width = BOARD_SIZE;
        bgSprite.height = BOARD_SIZE;
        app.stage.addChild(bgSprite);

        // Load block textures
        const textures: Record<string, Texture> = {
          blue: await Assets.load('/blue_block.png'),
          green: await Assets.load('/green_block.png'),
          orange: await Assets.load('/orange_block.png'),
          purple: await Assets.load('/purple_block.png'),
          red: await Assets.load('/red_block.png'),
        };

        const gridContainer = new PixiContainer();
        app.stage.addChild(gridContainer);

        // Draw placed blocks
        for (let y = 0; y < 9; y++) {
          for (let x = 0; x < 9; x++) {
            const color = grid[y][x];
            if (color && textures[color]) {
              const tex = textures[color];
              const block = new Sprite(tex);
              block.x = x * TILE_SIZE;
              block.y = y * TILE_SIZE;
              block.scale.set(TILE_SIZE / tex.width, TILE_SIZE / tex.height);
              gridContainer.addChild(block);
            }
          }
        }

      } catch (e) {
        console.error("Failed to load Pixi textures", e);

        // Fallback drawing if textures fail
        const graphics = new Graphics();

        // Draw grid lines
        for (let i = 0; i <= 9; i++) {
          graphics.moveTo(i * TILE_SIZE, 0);
          graphics.lineTo(i * TILE_SIZE, BOARD_SIZE);
          graphics.stroke({ width: 1, color: 0x333333 });

          graphics.moveTo(0, i * TILE_SIZE);
          graphics.lineTo(BOARD_SIZE, i * TILE_SIZE);
          graphics.stroke({ width: 1, color: 0x333333 });
        }

        // Draw basic shapes for existing grid
        for (let y = 0; y < 9; y++) {
          for (let x = 0; x < 9; x++) {
            const color = grid[y][x];
            if (color) {
              const hexColor = color === 'red' ? 0xFF0000 :
                               color === 'blue' ? 0x0000FF :
                               color === 'green' ? 0x00FF00 :
                               color === 'orange' ? 0xFFA500 :
                               0x800080; // purple
              graphics.rect(x * TILE_SIZE + 2, y * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4);
              graphics.fill({ color: hexColor });
            }
          }
        }
        app.stage.addChild(graphics);
      }
    };

    loadAssets();

  }, [app, grid]);

  /**
   * Convert a pointer/drop event position (client coords) to board tile [col, row].
   * Returns null if outside the canvas.
   */
  const clientToTile = (clientX: number, clientY: number): [number, number] | null => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return null;

    const scaleX = BOARD_SIZE / rect.width;
    const scaleY = BOARD_SIZE / rect.height;

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    const col = Math.floor(x / TILE_SIZE);
    const row = Math.floor(y / TILE_SIZE);

    if (col < 0 || col >= 9 || row < 0 || row >= 9) return null;
    return [col, row];
  };

  // ── Click-to-place ───────────────────────────────────────────────
  const handleBoardClick = (e: React.MouseEvent) => {
    if (selectedBlockIndex === null) return;

    const tile = clientToTile(e.clientX, e.clientY);
    if (!tile) return;

    const [col, row] = tile;
    const success = placeBlock(selectedBlockIndex, col, row);
    if (!success) {
      // Flash cancel: deselect so user can try elsewhere
      setSelectedBlock(null);
    }
    console.log(`Click-place shape ${selectedBlockIndex} at [${col}, ${row}]: ${success ? 'OK' : 'FAIL'}`);
  };

  // ── Drag-and-drop ────────────────────────────────────────────────
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    try {
      const dataStr = e.dataTransfer.getData('application/json');
      if (!dataStr) return;

      const data = JSON.parse(dataStr);
      const shapeIndex = data.shapeIndex;
      if (typeof shapeIndex !== 'number') return;

      const tile = clientToTile(e.clientX, e.clientY);
      if (!tile) return;

      const [col, row] = tile;

      const success = placeBlock(shapeIndex, col, row);
      console.log(`Drop shape ${shapeIndex} at grid [${col}, ${row}]: ${success ? 'SUCCESS' : 'FAILED'}`);
    } catch (err) {
      console.error("Drop failed:", err);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const isBlockSelected = selectedBlockIndex !== null && nextBlocks[selectedBlockIndex] != null;

  return (
    <div
      className={`relative w-[576px] h-[576px] mx-auto overflow-hidden shadow-[0_0_30px_rgba(0,245,255,0.2)] transition-all
        ${isBlockSelected ? 'cursor-crosshair ring-2 ring-[var(--color-neon-magenta)] shadow-[0_0_30px_rgba(255,0,255,0.4)]' : 'cursor-default'}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onClick={handleBoardClick}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
      />
      {/* Overlay hint when block is selected */}
      {isBlockSelected && (
        <div className="absolute bottom-2 left-0 right-0 flex justify-center pointer-events-none">
          <span className="text-[10px] bg-black/80 text-[var(--color-neon-magenta)] px-3 py-1 rounded font-['Orbitron'] uppercase tracking-widest animate-pulse">
            Click to place
          </span>
        </div>
      )}
    </div>
  );
}
