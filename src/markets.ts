import { createPublicClient, decodeEventLog, http, parseAbiItem, type PublicClient } from "viem";
import { fetchContractLogs } from "./logs.ts";
import { robinhoodChain } from "./chain.ts";
import { PRESAGE_ADDRESS, presageAbi } from "./presage.ts";

export interface Market {
  id: number;
  resolver: `0x${string}`;
  closeTime: number;
  resolveTime: number;
  resolved: boolean;
  canceled: boolean;
  winner: number;
  poolNo: bigint;
  poolYes: bigint;
  question: string;
}

/** Client for browser components — via the /api/rpc proxy (beats ISP blocking). */
export const browser = () =>
  createPublicClient({ chain: robinhoodChain, transport: http("/api/rpc", { batch: true }) });

export async function fetchMarkets(client: PublicClient): Promise<Market[]> {
  if (!PRESAGE_ADDRESS) return [];
  const count = Number(
    await client.readContract({ address: PRESAGE_ADDRESS, abi: presageAbi, functionName: "marketCount" })
  );
  if (count === 0) return [];
  const rows = await client.multicall({
    contracts: Array.from({ length: count }, (_, id) => ({
      address: PRESAGE_ADDRESS,
      abi: presageAbi,
      functionName: "getMarket" as const,
      args: [BigInt(id)] as const,
    })),
    allowFailure: false,
  });
  return rows
    .map((r, id) => {
      const [resolver, closeTime, resolveTime, resolved, canceled, winner, poolNo, poolYes, question] = r;
      return {
        id,
        resolver,
        closeTime: Number(closeTime),
        resolveTime: Number(resolveTime),
        resolved,
        canceled,
        winner,
        poolNo,
        poolYes,
        question,
      };
    })
    .reverse(); // newest first
}

/**
 * Who created each market. The contract stores only the resolver, so the real
 * creator is the sender of the creation transaction — recovered from the
 * MarketCreated log's tx. Immutable once known, hence the permanent cache.
 */
const creatorCache = new Map<number, `0x${string}`>();
const createdEvent = parseAbiItem(
  "event MarketCreated(uint256 indexed id, address indexed resolver, string question, uint64 closeTime, uint64 resolveTime)"
);

export async function fetchCreators(client: PublicClient): Promise<Map<number, `0x${string}`>> {
  if (!PRESAGE_ADDRESS) return creatorCache;
  try {
    // Blockscout REST, not eth_getLogs — see src/logs.ts for why.
    const raw = await fetchContractLogs(PRESAGE_ADDRESS);
    const missing: { id: number; txHash: `0x${string}` }[] = [];
    for (const log of raw) {
      let dec;
      try {
        dec = decodeEventLog({ abi: [createdEvent], topics: log.topics as [`0x${string}`, ...`0x${string}`[]], data: log.data });
      } catch {
        continue; // not a MarketCreated log
      }
      const id = Number(dec.args.id);
      if (!creatorCache.has(id)) missing.push({ id, txHash: log.txHash });
    }
    const txs = await Promise.all(missing.map((x) => client.getTransaction({ hash: x.txHash })));
    missing.forEach((x, i) => creatorCache.set(x.id, txs[i].from));
  } catch {
    /* creator info is decoration — never block the page on it */
  }
  return creatorCache;
}

export interface Bettor {
  address: `0x${string}`;
  side: 0 | 1;
  amount: bigint;
}
const betEvent = parseAbiItem("event Bet(uint256 indexed id, address indexed user, uint8 side, uint128 amount)");

/** Who bet on a market, aggregated per (wallet, side) — heaviest stake first. */
export async function fetchBettors(id: number): Promise<Bettor[]> {
  if (!PRESAGE_ADDRESS) return [];
  try {
    const raw = await fetchContractLogs(PRESAGE_ADDRESS);
    const agg = new Map<string, bigint>(); // key: `${address}:${side}`
    for (const log of raw) {
      let dec;
      try {
        dec = decodeEventLog({ abi: [betEvent], topics: log.topics as [`0x${string}`, ...`0x${string}`[]], data: log.data });
      } catch {
        continue; // not a Bet log
      }
      if (Number(dec.args.id) !== id) continue;
      const key = `${(dec.args.user as string).toLowerCase()}:${dec.args.side}`;
      agg.set(key, (agg.get(key) ?? 0n) + (dec.args.amount as bigint));
    }
    const out: Bettor[] = [];
    for (const [key, amount] of agg) {
      const [address, side] = key.split(":");
      out.push({ address: address as `0x${string}`, side: Number(side) as 0 | 1, amount });
    }
    out.sort((a, b) => (a.amount < b.amount ? 1 : a.amount > b.amount ? -1 : 0));
    return out;
  } catch {
    return [];
  }
}

export type Status = "open" | "locked" | "resolvable" | "resolved" | "canceled";

export function status(m: Market, now = Date.now() / 1000): Status {
  if (m.canceled) return "canceled";
  if (m.resolved) return "resolved";
  if (now < m.closeTime) return "open";
  if (now < m.resolveTime) return "locked";
  return "resolvable";
}

export const STATUS_LABEL: Record<Status, string> = {
  open: "Open for bets",
  locked: "Locked — awaiting result",
  resolvable: "Ready to resolve",
  resolved: "Settled",
  canceled: "Canceled — refunds",
};

/** Implied YES probability from the pot ratio (0..1); null if pots are empty. */
export function impliedYes(m: Market): number | null {
  const total = m.poolYes + m.poolNo;
  if (total === 0n) return null;
  return Number(m.poolYes) / Number(total);
}

/**
 * Estimated payout if side `side` wins, for a bet of `amount` placed RIGHT
 * NOW: stake + share of the opposing pot net of the 2% fee. An estimate — pots still move.
 */
export function estimatePayout(m: Market, side: 0 | 1, amount: bigint): bigint {
  if (amount === 0n) return 0n;
  const myPool = (side === 1 ? m.poolYes : m.poolNo) + amount;
  const otherPool = side === 1 ? m.poolNo : m.poolYes;
  const prize = (otherPool * 9800n) / 10000n;
  return amount + (prize * amount) / myPool;
}

export const fmtUSDG = (raw: bigint) =>
  (Number(raw) / 1e6).toLocaleString("en-US", { maximumFractionDigits: 2 });

export function parseUSDG(s: string): bigint | null {
  const n = Number(s.replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return null;
  return BigInt(Math.round(n * 1e6));
}

export const fmtTime = (unix: number) =>
  new Date(unix * 1000).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });

export function fmtCountdown(untilUnix: number, now = Date.now() / 1000): string {
  let s = Math.max(0, Math.floor(untilUnix - now));
  const d = Math.floor(s / 86400);
  s -= d * 86400;
  const h = Math.floor(s / 3600);
  const mnt = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h left`;
  if (h > 0) return `${h}h ${mnt}m left`;
  return `${mnt}m left`;
}

