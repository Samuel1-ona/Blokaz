import { useMemo } from "react";
import { useAccount } from "@starknet-react/core";
import { DenshokanProvider } from "@provable-games/denshokan-sdk/react";
import { createDenshokanClient } from "@provable-games/denshokan-sdk";

const RPC_URL = "https://api.cartridge.gg/x/starknet/sepolia";
const API_URL = "https://denshokan-api-production.up.railway.app";

export function DenshokanWrapper({ children }: { children: React.ReactNode }) {
  const { account } = useAccount();

  // Recreate client when account changes so the SDK can sign write txs
  const client = useMemo(
    () =>
      createDenshokanClient({
        chain: "sepolia",
        rpcUrl: RPC_URL,
        apiUrl: API_URL,
        provider: account ?? undefined,
        primarySource: "rpc",
      }),
    [account],
  );

  return (
    <DenshokanProvider client={client}>
      {children}
    </DenshokanProvider>
  );
}
