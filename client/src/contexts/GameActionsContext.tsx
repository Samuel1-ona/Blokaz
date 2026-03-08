import { createContext, useContext } from "react";
import type { Token } from "@provable-games/denshokan-sdk";
import type { GamePhase } from "../store/gameStore";

interface GameActionsContextValue {
  tokenId: string | null;
  gamePhase: GamePhase;
  isLocked: boolean;
  pendingMessage: string | null;
  error: string | null;
  playerTokens: Token[];
  isLoadingTokens: boolean;
  setTokenId: (id: string | null) => void;
  handleResumeGame: (tokenId: string) => Promise<void>;
  handleStartGame: (tokenId: string) => Promise<void>;
  handlePlaceBlock: (shapeIndex: number, startX: number, startY: number) => Promise<boolean>;
  handleResetGame: () => Promise<void>;
  handleMintToken: (playerName?: string) => Promise<string | null>;
  refetchTokens: () => void;
}

export const GameActionsContext = createContext<GameActionsContextValue | null>(null);

export function useGameActionsContext() {
  const ctx = useContext(GameActionsContext);
  if (!ctx) {
    throw new Error("useGameActionsContext must be used within a GameActionsProvider");
  }
  return ctx;
}
