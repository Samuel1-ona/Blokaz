import { useCallback, useState } from "react";
import { useAccount } from "@starknet-react/core";
import {
  usePlayerTokens,
} from "@provable-games/denshokan-sdk/react";
import { useBlokaz } from "./useBlokaz";
import { useGameStore, PIECES, pieceToMatrix, COLORS } from "../store/gameStore";
import type { BlockShape, GamePhase } from "../store/gameStore";
import { unpackBlocks, BLOKAZ_GAME_ID } from "../utils/contract";

function pieceIdToBlockShape(pieceId: number): BlockShape {
  const piece = PIECES[pieceId];
  const color = COLORS[pieceId % COLORS.length];
  return {
    pieceId: piece.id,
    piece,
    matrix: pieceToMatrix(piece),
    color,
  };
}

const LOCKED_PHASES: GamePhase[] = ['MINTING', 'AWAITING_MINT', 'STARTING', 'PLACING'];

export function useGameActions() {
  const { account, address } = useAccount();
  const { mintToken, startGame, placeBlock: placeBlockOnchain, readGameState } = useBlokaz();
  const [tokenId, setTokenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const gamePhase = useGameStore((s) => s.gamePhase);
  const setGamePhase = useGameStore((s) => s.setGamePhase);
  const pendingMessage = useGameStore((s) => s.pendingMessage);
  const setPendingMessage = useGameStore((s) => s.setPendingMessage);

  const isLocked = LOCKED_PHASES.includes(gamePhase);

  // Fetch player's existing game tokens via denshokan-sdk
  const {
    data: playerTokensResult,
    isLoading: isLoadingTokens,
    refetch: refetchTokens,
  } = usePlayerTokens(address, { gameId: BLOKAZ_GAME_ID });

  const playerTokens = playerTokensResult?.data ?? [];

  // Read chain state and update the store
  const syncFromChain = useCallback(
    async (tid: string) => {
      try {
        const state = await readGameState(tid);

        const [b1, b2, b3] = unpackBlocks(state.availableBlocks);
        const nextBlocks: [BlockShape | null, BlockShape | null, BlockShape | null] = [
          b1 !== 255 ? pieceIdToBlockShape(b1) : null,
          b2 !== 255 ? pieceIdToBlockShape(b2) : null,
          b3 !== 255 ? pieceIdToBlockShape(b3) : null,
        ];

        useGameStore.getState().setChainState({
          bitGrid: state.grid,
          score: state.score,
          combo: state.combo,
          gameOver: state.gameOver,
          nextBlocks,
        });
      } catch (e) {
        console.error("Failed to sync from chain:", e);
        setError("Failed to read game state from chain");
      }
    },
    [readGameState],
  );

  // Mint a new Denshokan token — poll for confirmation instead of setTimeout
  const handleMintToken = useCallback(
    async (playerName = "Player") => {
      if (!address || !account) {
        setError("Connect wallet first");
        return null;
      }
      setError(null);
      setGamePhase('MINTING');
      setPendingMessage('Minting game token...');
      try {
        const txHash = await mintToken(playerName);
        console.log("Mint tx:", txHash);

        setGamePhase('AWAITING_MINT');
        setPendingMessage('Waiting for confirmation...');

        // Poll for new token: refetch every 2s, up to 15 attempts
        let found = false;
        for (let i = 0; i < 15; i++) {
          await new Promise((r) => setTimeout(r, 2000));
          try {
            const result = await (refetchTokens as () => Promise<any>)();
            const newTokens = result?.data?.data ?? result?.data ?? [];
            if (Array.isArray(newTokens) && newTokens.length > playerTokens.length) {
              found = true;
              break;
            }
          } catch {
            // refetch failed, keep polling
          }
        }

        setGamePhase('IDLE');
        setPendingMessage(null);
        if (!found) {
          setError('Mint confirmed but token not yet indexed. Try refreshing.');
        }

        return txHash;
      } catch (e: any) {
        console.error("Mint failed:", e);
        setError(e.message || "Failed to mint game token");
        setGamePhase('IDLE');
        setPendingMessage(null);
        return null;
      }
    },
    [address, account, mintToken, refetchTokens, playerTokens.length, setGamePhase, setPendingMessage],
  );

  // Resume an existing game — just reads chain state, no start_game tx
  const handleResumeGame = useCallback(
    async (tid: string) => {
      if (!account) {
        setError("Connect wallet first");
        return;
      }
      setError(null);
      setGamePhase('STARTING');
      setPendingMessage('Loading game...');
      try {
        setTokenId(tid);
        await syncFromChain(tid);
        // Phase auto-transitions via setChainState
        setPendingMessage(null);
      } catch (e: any) {
        console.error("Resume game failed:", e);
        setError(e.message || "Failed to load game");
        setGamePhase('IDLE');
        setPendingMessage(null);
      }
    },
    [account, syncFromChain, setGamePhase, setPendingMessage],
  );

  // Start a NEW game — sends start_game tx (resets board), then reads chain state
  const handleStartGame = useCallback(
    async (tid: string) => {
      if (!account) {
        setError("Connect wallet first");
        return;
      }
      setError(null);
      setGamePhase('STARTING');
      setPendingMessage('Starting new game...');
      try {
        await startGame(tid);
        setTokenId(tid);
        await syncFromChain(tid);
        // Phase auto-transitions via setChainState
        setPendingMessage(null);
      } catch (e: any) {
        console.error("Start game failed:", e);
        setError(e.message || "Failed to start game");
        setGamePhase('IDLE');
        setPendingMessage(null);
      }
    },
    [account, startGame, syncFromChain, setGamePhase, setPendingMessage],
  );

  // Place block — sends tx onchain, then reads chain state
  const handlePlaceBlock = useCallback(
    async (shapeIndex: number, startX: number, startY: number) => {
      if (gamePhase !== 'PLAYING') return false;
      if (tokenId === null) return false;

      const shape = useGameStore.getState().nextBlocks[shapeIndex];
      if (!shape) return false;

      // Check locally first (for fast rejection)
      if (!useGameStore.getState().canPlaceBlock(shapeIndex, startX, startY)) return false;

      setError(null);
      setGamePhase('PLACING');
      setPendingMessage('Placing block...');
      try {
        await placeBlockOnchain(tokenId, shape.pieceId, startX, startY);
        await syncFromChain(tokenId);
        // Phase auto-transitions via setChainState
        setPendingMessage(null);
        return true;
      } catch (e: any) {
        console.error("place_block failed:", e);
        setError(e.message || "Transaction failed");
        // Always re-sync to get authoritative chain state
        await syncFromChain(tokenId);
        setPendingMessage(null);
        return false;
      }
    },
    [gamePhase, tokenId, placeBlockOnchain, syncFromChain, setGamePhase, setPendingMessage],
  );

  // Reset game — calls start_game onchain again
  const handleResetGame = useCallback(async () => {
    if (tokenId !== null) {
      setGamePhase('STARTING');
      setPendingMessage('Restarting game...');
      await handleStartGame(tokenId);
    }
  }, [tokenId, handleStartGame, setGamePhase, setPendingMessage]);

  return {
    tokenId,
    gamePhase,
    isLocked,
    pendingMessage,
    error,
    playerTokens,
    isLoadingTokens,

    setTokenId,
    handleResumeGame,
    handleStartGame,
    handlePlaceBlock,
    handleResetGame,
    handleMintToken,
    syncFromChain,
    refetchTokens,
  };
}
