import { sepolia } from "@starknet-react/chains";
import type { Chain } from "@starknet-react/chains";
import {
  StarknetConfig,
  jsonRpcProvider,
  cartridge,
} from "@starknet-react/core";
import { ControllerConnector } from "@cartridge/connector";
import type { SessionPolicies } from "@cartridge/presets";
import { BLOKAZ_ADDRESS, DENSHOKAN_TOKEN_ADDRESS } from "../utils/contract";

const RPC_URL = "https://api.cartridge.gg/x/starknet/sepolia";

const policies: SessionPolicies = {
  contracts: {
    [BLOKAZ_ADDRESS]: {
      description: "Blokaz - Onchain block puzzle game",
      methods: [
        {
          name: "Start Game",
          entrypoint: "start_game",
          description: "Start a new block puzzle game",
        },
        {
          name: "Place Block",
          entrypoint: "place_block",
          description: "Place a block piece on the grid",
        },
        {
          name: "Delete Block",
          entrypoint: "delete_block",
          description: "Remove a block from the grid",
        },
      ],
    },
    [DENSHOKAN_TOKEN_ADDRESS]: {
      description: "Denshokan - Game token management",
      methods: [
        {
          name: "Mint",
          entrypoint: "mint",
          description: "Mint a game token to play",
        },
        {
          name: "Mint Batch",
          entrypoint: "mint_batch",
          description: "Batch mint game tokens",
        },
        {
          name: "Update Game",
          entrypoint: "update_game_batch",
          description: "Sync game state to token",
        },
      ],
    },
  },
};

// Create connector OUTSIDE component to avoid re-creation on re-render
const connector = new ControllerConnector({
  policies,
  rpcUrl: RPC_URL,
  defaultChainId: "0x" + sepolia.id.toString(16),
});

const provider = jsonRpcProvider({
  rpc: (_chain: Chain) => ({
    nodeUrl: RPC_URL,
  }),
});

export function StarknetProvider({ children }: { children: React.ReactNode }) {
  return (
    <StarknetConfig
      autoConnect
      defaultChainId={sepolia.id}
      chains={[sepolia]}
      provider={provider}
      connectors={[connector]}
      explorer={cartridge}
    >
      {children}
    </StarknetConfig>
  );
}
