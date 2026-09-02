// Stock price history from the Uniswap v3 pool's own observation buffer —
// one multicall holding N 15-minute TWAP points; points older than the
// buffer's reach fail individually (allowFailure) and are dropped.
// No explorer, no third-party API.

import { server, USDG } from "../../../src/chain.ts";
import { tickToPrice } from "../../../src/presage.ts";
import { STOCKS } from "../../../src/stocks.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RANGES: Record<string, number> = { "1D": 24, "1W": 168, "1M": 720 };
const POINTS = 48;
const WINDOW = 900; // 15-minute TWAP per point
const TTL_MS = 5 * 60_000;

const abi = [
  {
    type: "function", name: "observe", stateMutability: "view",
    inputs: [{ type: "uint32[]" }],
    outputs: [{ type: "int56[]" }, { type: "uint160[]" }],
  },
  { type: "function", name: "token0", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
] as const;

const cache = new Map<string, { at: number; body: unknown }>();

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const symbol = (p.get("symbol") ?? "").toUpperCase();
  const rangeKey = RANGES[p.get("range") ?? ""] ? (p.get("range") as string) : "1D";
  const stock = STOCKS.find((s) => s.symbol === symbol);
  if (!stock) return Response.json({ error: "unknown symbol" }, { status: 404 });

  const key = `${symbol}:${rangeKey}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return Response.json(hit.body);

  const client = server();
  const span = RANGES[rangeKey] * 3600;
  const agos = Array.from({ length: POINTS }, (_, i) => Math.round(((POINTS - 1 - i) / (POINTS - 1)) * span));

  try {
    const token0 = await client.readContract({ address: stock.pool, abi, functionName: "token0" });
    const stockIsToken0 = token0.toLowerCase() !== USDG.toLowerCase();
    const obs = await client.multicall({
      contracts: agos.map((ago) => ({
        address: stock.pool,
        abi,
        functionName: "observe" as const,
        args: [[ago + WINDOW, ago]] as const,
      })),
    });

    const now = Math.floor(Date.now() / 1000);
    const points: { t: number; price: number }[] = [];
    obs.forEach((o, i) => {
      if (o.status !== "success") return;
      const cum = o.result[0] as readonly bigint[];
      const avgTick = Number((cum[1] - cum[0]) / BigInt(WINDOW));
      const price = tickToPrice(avgTick, stockIsToken0);
      if (Number.isFinite(price) && price > 0) points.push({ t: now - agos[i] - WINDOW / 2, price });
    });

    const body = { symbol, range: rangeKey, points };
    if (points.length) cache.set(key, { at: Date.now(), body });
    return Response.json(body);
  } catch {
    return Response.json({ error: "chart unavailable", points: [] }, { status: 503 });
  }
}

