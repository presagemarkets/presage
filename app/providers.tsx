"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { robinhoodChain } from "../src/chain.ts";

// Same pattern as HoodStock: the id is validated first because Privy throws
// during prerender if the id is wrong — a bad env only sacrifices the login
// button, not the whole site.
const RAW = (process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "").trim();
const APP_ID = /^[a-z0-9]{20,32}$/i.test(RAW) ? RAW : "";

// Privy needs an absolute RPC the browser can fetch; the shared chain carries "/api/rpc".
function browserChain() {
  const url = new URL("/api/rpc", window.location.origin).toString();
  return { ...robinhoodChain, rpcUrls: { default: { http: [url] } } };
}

export function Providers({ children }: { children: React.ReactNode }) {
  if (!APP_ID) return <>{children}</>;

  const chain = typeof window === "undefined" ? robinhoodChain : browserChain();

  return (
    <PrivyProvider
      appId={APP_ID}
      config={{
        loginMethods: ["email", "google", "wallet"],
        defaultChain: chain,
        supportedChains: [chain],
        // Privy v3: embeddedWallets is nested per chain — flat = wrong shape that fails silently.
        embeddedWallets: { ethereum: { createOnLogin: "users-without-wallets" } },
        appearance: {
          theme: "dark",
          accentColor: "#ffffff",
          logo: undefined,
          walletChainType: "ethereum-only",
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
