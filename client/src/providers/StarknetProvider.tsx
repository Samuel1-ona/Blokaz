import { sepolia } from "@starknet-react/chains";
import type { Chain } from "@starknet-react/chains";
import {
  StarknetConfig,
  jsonRpcProvider,
  cartridge,
} from "@starknet-react/core";
import { ControllerConnector } from "@cartridge/connector";
import type { SessionPolicies } from "@cartridge/presets";

// TODO: Replace with deployed contract address
const BLOKAZ_CONTRACT_ADDRESS =
  "0x0000000000000000000000000000000000000000000000000000000000000000";

const policies: SessionPolicies = {
  contracts: {
    [BLOKAZ_CONTRACT_ADDRESS]: {
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
  },
};

// Create connector OUTSIDE component to avoid re-creation on re-render
const connector = new ControllerConnector({ policies });

const provider = jsonRpcProvider({
  rpc: (_chain: Chain) => ({
    nodeUrl: "https://api.cartridge.gg/x/starknet/sepolia",
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
