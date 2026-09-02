// Automated daily rounds + pot seeding.
// Called by cron daily at 13:30 UTC (= US stock market open):
//  - create a "Daily: X up today?" market per flagship stock; closes 1 hour
//    before US market close, settled at market close (contract LOCK_GAP = 1 hour).
//  - Monday: add a "Weekly duel" NVDA vs TSLA, settled Friday at market close.
//  - the bot wallet immediately bets SEED_USDG on both sides so the pot is
//    never empty (the lesson from UpVsDown's death).
// Idempotent: the question contains the date; if it already exists, skip.
// Bot wallet = RESOLVER_KEY (one wallet for create-seed-resolve).

import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { robinhoodChain, server, USDG } from "../../../src/chain.ts";
import { PRESAGE_ADDRESS, TWAP_RESOLVER_ADDRESS, presageAbi, twapResolverAbi, erc20Abi } from "../../../src/presage.ts";
import { fetchMarkets } from "../../../src/markets.ts";
import { STOCKS } from "../../../src/stocks.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DAILY = ["AAPL", "NVDA", "TSLA", "SPY"];
const DUEL: [string, string] = ["NVDA", "TSLA"];
const OPEN_TO_CLOSE = 19_800; // 5.5 hours: US market open -> 1 hour before close
const LOCK_GAP = 3_600;

export async function GET() {
  if (!PRESAGE_ADDRESS || !TWAP_RESOLVER_ADDRESS)
    return Response.json({ error: "contracts not deployed" }, { status: 503 });
  const key = (process.env.RESOLVER_KEY ?? "").trim() as `0x${string}`;
  if (!key) return Response.json({ error: "set RESOLVER_KEY" }, { status: 503 });

  const pub = server();
  const existing = new Set((await fetchMarkets(pub)).map((m) => m.question));
  const wallet = createWalletClient({
    account: privateKeyToAccount(key),
    chain: robinhoodChain,
    transport: http(process.env.EVM_RPC_URL ?? "https://rpc.mainnet.chain.robinhood.com"),
  });

  const seed = BigInt(Math.round(Number(process.env.SEED_USDG ?? "10") * 1e6));
  const balance = await pub.readContract({ address: USDG, abi: erc20Abi, functionName: "balanceOf", args: [wallet.account.address] });
  let seedBudget = balance;

  const nowS = Math.floor(Date.now() / 1000);
  const dateTag = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  const results: Record<string, string | number> = {};

  const create = async (q: string, data: Parameters<typeof wallet.writeContract>[0]) => {
    const hash = await wallet.writeContract(data);
    await pub.waitForTransactionReceipt({ hash });
    // ponytail: id taken from marketCount-1 — safe while this bot is the only
    // scheduled creator; if it gets busy later, switch to parsing MarketCreated events.
    const id = (await pub.readContract({ address: PRESAGE_ADDRESS, abi: presageAbi, functionName: "marketCount" })) - 1n;
    results[q] = Number(id);
    // Seed both sides if the bot's USDG balance suffices; rounds are created even without seed.
    if (seedBudget >= seed * 2n && seed > 0n) {
      const allowance = await pub.readContract({ address: USDG, abi: erc20Abi, functionName: "allowance", args: [wallet.account.address, PRESAGE_ADDRESS] });
      if (allowance < seed * 2n) {
        const a = await wallet.writeContract({ address: USDG, abi: erc20Abi, functionName: "approve", args: [PRESAGE_ADDRESS, 2n ** 256n - 1n] });
        await pub.waitForTransactionReceipt({ hash: a });
      }
      for (const side of [0, 1] as const) {
        const b = await wallet.writeContract({ address: PRESAGE_ADDRESS, abi: presageAbi, functionName: "bet", args: [id, side, seed] });
        await pub.waitForTransactionReceipt({ hash: b });
      }
      seedBudget -= seed * 2n;
      results[q] = `${Number(id)} (seeded 2x${Number(seed) / 1e6} USDG)`;
    }
    return id;
  };

  for (const sym of DAILY) {
    const stock = STOCKS.find((s) => s.symbol === sym)!;
    const q = `Daily: ${sym} up today? (${dateTag})`;
    if (existing.has(q)) continue;
    try {
      await create(q, {
        address: TWAP_RESOLVER_ADDRESS,
        abi: twapResolverAbi,
        functionName: "createUpDown",
        args: [stock.pool, BigInt(nowS + OPEN_TO_CLOSE), BigInt(nowS + OPEN_TO_CLOSE + LOCK_GAP), q],
      });
    } catch (e) {
      results[q] = `failed: ${e instanceof Error ? e.message.split("\n")[0].slice(0, 80) : "unknown"}`;
    }
  }

  if (new Date().getUTCDay() === 1) {
    const [a, b] = DUEL.map((sym) => STOCKS.find((s) => s.symbol === sym)!);
    const q = `Weekly duel: ${DUEL[0]} outperforms ${DUEL[1]}? (${dateTag}, tie = ${DUEL[1]})`;
    if (!existing.has(q)) {
      const weekClose = nowS + 4 * 86_400 + OPEN_TO_CLOSE; // Monday open -> Friday 1 hour before close
      try {
        await create(q, {
          address: TWAP_RESOLVER_ADDRESS,
          abi: twapResolverAbi,
          functionName: "createDuel",
          args: [a.pool, b.pool, BigInt(weekClose), BigInt(weekClose + LOCK_GAP), q],
        });
      } catch (e) {
        results[q] = `failed: ${e instanceof Error ? e.message.split("\n")[0].slice(0, 80) : "unknown"}`;
      }
    }
  }

  return Response.json({ created: results, seedBalanceLeft: Number(seedBudget) / 1e6 });
}

