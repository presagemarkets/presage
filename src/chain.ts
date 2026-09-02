import { createPublicClient, http, type Chain } from "viem";

/** RH Chain mainnet (EVM 4663). Gas in ETH; blocks every 100ms. Identical to HoodStock. */
export const robinhoodChain: Chain = {
  id: 4663,
  name: "RH Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["/api/rpc"] } },
  blockExplorers: {
    default: { name: "Blockscout", url: "https://robinhoodchain.blockscout.com" },
  },
  contracts: {
    multicall3: { address: "0xcA11bde05977b3631167028862bE2a173976CA11" },
  },
};

/** Server-side client — goes straight out, without passing through /api/rpc. */
export const server = () =>
  createPublicClient({
    chain: robinhoodChain,
    transport: http(process.env.EVM_RPC_URL ?? "https://rpc.mainnet.chain.robinhood.com", {
      batch: true,
    }),
  });

/** USDG — the betting currency. BEWARE: 6 decimals, not 18. */
export const USDG = "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168" as const;
export const USDG_DECIMALS = 6;
