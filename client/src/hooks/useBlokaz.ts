import { useAccount, useContract, useSendTransaction } from "@starknet-react/core";
import { useCallback, useState } from "react";
import { useDenshokanClient } from "@provable-games/denshokan-sdk/react";
import { RpcProvider, CairoOption, CairoOptionVariant } from "starknet";
import { BLOKAZ_ADDRESS, DENSHOKAN_TOKEN_ADDRESS } from "../utils/contract";
import denshokanAbi from "../abi/denshokan.json";

const provider = new RpcProvider({
  nodeUrl: "https://api.cartridge.gg/x/starknet/sepolia",
});

export function useBlokaz() {
  const { account, address } = useAccount();
  const client = useDenshokanClient();
  const [isPending, setIsPending] = useState(false);

  // Denshokan token contract (for mint)
  const { contract: denshokanContract } = useContract({
    abi: denshokanAbi as any,
    address: DENSHOKAN_TOKEN_ADDRESS as `0x${string}`,
  });

  const { sendAsync } = useSendTransaction({});

  // Mint a new game token using the Denshokan ABI + CairoOption
  const mintToken = useCallback(
    async (playerName = "Player"): Promise<string | null> => {
      if (!address || !denshokanContract) return null;

      const none = <T>() => new CairoOption<T>(CairoOptionVariant.None);
      const some = <T>(val: T) => new CairoOption<T>(CairoOptionVariant.Some, val);

      setIsPending(true);
      try {
        const call = denshokanContract.populate("mint", [
          BLOKAZ_ADDRESS,                    // game_address
          some(playerName),                  // player_name
          some(1),                           // settings_id
          none(),                            // start (None = immediately playable)
          none(),                            // end (None = no expiry)
          none(),                            // objective_id
          none(),                            // context
          none(),                            // client_url
          none(),                            // renderer_address
          none(),                            // skills_address
          address,                           // to
          false,                             // soulbound
          false,                             // paymaster
          0,                                 // salt
          0,                                 // metadata
        ]);

        const result = await sendAsync([call]);
        return result.transaction_hash;
      } finally {
        setIsPending(false);
      }
    },
    [address, denshokanContract, sendAsync],
  );

  // Execute a tx and wait for confirmation before returning
  const executeAndWait = useCallback(
    async (calls: { contractAddress: string; entrypoint: string; calldata: string[] }[]) => {
      if (!account) throw new Error("Wallet not connected");
      const result = await account.execute(calls);
      // Wait for the tx to be accepted on-chain before returning
      await provider.waitForTransaction(result.transaction_hash);
      return result.transaction_hash;
    },
    [account],
  );

  // Start a new game — token_id is felt252, pass as string
  const startGame = useCallback(
    async (tokenId: string) => {
      setIsPending(true);
      try {
        return await executeAndWait([
          {
            contractAddress: BLOKAZ_ADDRESS,
            entrypoint: "start_game",
            calldata: [tokenId],
          },
        ]);
      } finally {
        setIsPending(false);
      }
    },
    [executeAndWait],
  );

  // Place a block on the grid
  const placeBlock = useCallback(
    async (tokenId: string, pieceId: number, x: number, y: number) => {
      setIsPending(true);
      try {
        return await executeAndWait([
          {
            contractAddress: BLOKAZ_ADDRESS,
            entrypoint: "place_block",
            calldata: [tokenId, pieceId.toString(), x.toString(), y.toString()],
          },
        ]);
      } finally {
        setIsPending(false);
      }
    },
    [executeAndWait],
  );

  // Delete a single block from the grid
  const deleteBlock = useCallback(
    async (tokenId: string, x: number, y: number) => {
      setIsPending(true);
      try {
        return await executeAndWait([
          {
            contractAddress: BLOKAZ_ADDRESS,
            entrypoint: "delete_block",
            calldata: [tokenId, x.toString(), y.toString()],
          },
        ]);
      } finally {
        setIsPending(false);
      }
    },
    [executeAndWait],
  );

  // Read game state — EGS reads via SDK, custom state via direct RPC
  // tokenId is the hex string of the packed felt252
  const readGameState = useCallback(
    async (tokenId: string) => {
      const hexTokenId = tokenId.startsWith("0x") ? tokenId : "0x" + BigInt(tokenId).toString(16);

      const [scoreResult, gameOverResult, gridResult, comboResult, blocksResult] =
        await Promise.all([
          client.score(hexTokenId, BLOKAZ_ADDRESS),
          client.gameOver(hexTokenId, BLOKAZ_ADDRESS),
          provider.callContract({
            contractAddress: BLOKAZ_ADDRESS,
            entrypoint: "grid",
            calldata: [tokenId],
          }),
          provider.callContract({
            contractAddress: BLOKAZ_ADDRESS,
            entrypoint: "combo",
            calldata: [tokenId],
          }),
          provider.callContract({
            contractAddress: BLOKAZ_ADDRESS,
            entrypoint: "available_blocks",
            calldata: [tokenId],
          }),
        ]);

      return {
        grid: BigInt(gridResult[0]),
        score: Number(scoreResult),
        combo: Number(comboResult[0]),
        availableBlocks: Number(blocksResult[0]),
        gameOver: gameOverResult,
      };
    },
    [client],
  );

  return {
    mintToken,
    startGame,
    placeBlock,
    deleteBlock,
    readGameState,
    isPending,
    isConnected: !!account,
  };
}
