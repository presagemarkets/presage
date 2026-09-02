// Auto-resolve: finalize markets past their resolveTime, so the TWAP window
// doesn't drift far from the deadline. Called by cron (vercel.json / cron-job.org)
// or manually. Without RESOLVER_KEY, the route only reports markets that are ready.

import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { robinhoodChain, server } from "../../../src/chain.ts";
import { PRESAGE_ADDRESS, presageAbi } from "../../../src/presage.ts";
import { fetchMarkets, status } from "../../../src/markets.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!PRESAGE_ADDRESS) return Response.json({ error: "contract not deployed" }, { status: 503 });

  const markets = await fetchMarkets(server());
  const due = markets.filter((m) => status(m) === "resolvable");
  if (due.length === 0) return Response.json({ due: 0 });

  const key = (process.env.RESOLVER_KEY ?? "").trim() as `0x${string}`;
  if (!key) return Response.json({ due: due.map((m) => m.id), note: "set RESOLVER_KEY to auto-resolve" });

  const wallet = createWalletClient({
    account: privateKeyToAccount(key),
    chain: robinhoodChain,
    transport: http(process.env.EVM_RPC_URL ?? "https://rpc.mainnet.chain.robinhood.com"),
  });

  const results: Record<number, string> = {};
  for (const m of due) {
    try {
      results[m.id] = await wallet.writeContract({
        address: PRESAGE_ADDRESS,
        abi: presageAbi,
        functionName: "resolve",
        args: [BigInt(m.id)],
      });
    } catch (e) {
      // Markets whose resolver refuses (e.g. TWAP not readable yet) are skipped; retried next cron.
      results[m.id] = `failed: ${e instanceof Error ? e.message.split("\n")[0].slice(0, 80) : "unknown"}`;
    }
  }
  return Response.json({ resolved: results });
}

