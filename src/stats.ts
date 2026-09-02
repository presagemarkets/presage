// User stats are computed from Bet events + final market state — without
// touching the contract. P&L = payout entitlement per the contract formula minus
// stake, computed ONLY for settled markets (still-running ones = floating
// money, not counted as profit/loss). Refunds (cancel / empty winning pot)
// count as neutral.

import { decodeEventLog, parseAbiItem, type PublicClient } from "viem";
import { PRESAGE_ADDRESS } from "./presage.ts";
import { STOCKDUEL_ADDRESS } from "./duel.ts";
import { fetchContractLogs } from "./logs.ts";
import { fetchMarkets, type Market } from "./markets.ts";

export interface UserStats {
  address: `0x${string}`;
  volume: bigint; // total USDG staked (all markets)
  bets: number; // number of bet transactions
  wins: number; // settled markets with positive P&L
  losses: number; // settled markets with negative P&L
  pnl: bigint; // realized profit/loss, can be negative
  /** Cumulative P&L (USDG) per settled market, ordered by id — sparkline input */
  history: number[];
  /** stake per market: id -> [NO side, YES side] */
  positions: Map<number, [bigint, bigint]>;
}

export interface Totals {
  players: number;
  bets: number;
  volume: bigint; // total USDG staked, all time
  paidOut: bigint; // winnings/refunds actually claimed (Claimed events)
  fees: bigint; // 2% of losing pots on settled markets
  markets: number;
  settled: number;
  active: number; // open for betting right now
  vol24: bigint; // USDG staked in the last ~24h
  paid24: bigint; // USDG claimed in the last ~24h
}

export interface Stats {
  users: UserStats[]; // sorted highest P&L first
  markets: Market[];
  totals: Totals;
  /** Cumulative platform curves (USDG), chronological — chart inputs */
  series: { volume: number[]; paidOut: number[] };
}

const betEvent = parseAbiItem(
  "event Bet(uint256 indexed id, address indexed user, uint8 side, uint128 amount)"
);
const claimedEvent = parseAbiItem("event Claimed(uint256 indexed id, address indexed user, uint256 payout)");

// StockDuel events — duel results count toward the same leaderboard.
const duelCreatedEvent = parseAbiItem(
  "event DuelCreated(uint256 indexed id, address indexed creator, address poolA, uint128 stake, uint32 duration)"
);
const duelAcceptedEvent = parseAbiItem(
  "event DuelAccepted(uint256 indexed id, address indexed challenger, address poolB, uint64 endTime)"
);
const duelSettledEvent = parseAbiItem("event DuelSettled(uint256 indexed id, address winner, bool draw, uint256 payout)");

let cache: { at: number; data: Stats } | null = null;

export async function buildStats(client: PublicClient): Promise<Stats> {
  if (cache && Date.now() - cache.at < 30_000) return cache.data;

  const markets = await fetchMarkets(client);
  // Blockscout REST, not eth_getLogs — public RPCs reject ranged getLogs on a
  // 100ms-block chain (see src/logs.ts).
  const raw = await fetchContractLogs(PRESAGE_ADDRESS);

  const byUser = new Map<string, UserStats>();
  let paidOut = 0n;
  const betFlows: [number, bigint][] = []; // [block, amount] for the volume curve
  const claimFlows: [number, bigint][] = [];
  for (const log of raw) {
    let dec;
    try {
      dec = decodeEventLog({ abi: [betEvent, claimedEvent], topics: log.topics as [`0x${string}`, ...`0x${string}`[]], data: log.data });
    } catch {
      continue; // some other event of ours
    }
    if (dec.eventName === "Claimed") {
      paidOut += dec.args.payout;
      claimFlows.push([log.block, dec.args.payout]);
      continue;
    }
    const { id, user, side, amount } = dec.args;
    if (id === undefined || !user || side === undefined || amount === undefined) continue;
    betFlows.push([log.block, amount]);
    const key = user.toLowerCase();
    let u = byUser.get(key);
    if (!u) {
      u = { address: user, volume: 0n, bets: 0, wins: 0, losses: 0, pnl: 0n, history: [], positions: new Map() };
      byUser.set(key, u);
    }
    u.volume += amount;
    u.bets += 1;
    const pos = u.positions.get(Number(id)) ?? ([0n, 0n] as [bigint, bigint]);
    pos[side as 0 | 1] += amount;
    u.positions.set(Number(id), pos);
  }

  const userOf = (address: `0x${string}`): UserStats => {
    const key = address.toLowerCase();
    let u = byUser.get(key);
    if (!u) {
      u = { address, volume: 0n, bets: 0, wins: 0, losses: 0, pnl: 0n, history: [], positions: new Map() };
      byUser.set(key, u);
    }
    return u;
  };

  // ---- Showdown duels: results feed the same leaderboard ----
  let duelPaidOut = 0n;
  let duelFees = 0n;
  const duelDeltas = new Map<string, [number, bigint][]>();
  if (STOCKDUEL_ADDRESS) {
    try {
      interface DuelAgg {
        creator?: `0x${string}`;
        challenger?: `0x${string}`;
        stake?: bigint;
        winner?: `0x${string}`;
        draw?: boolean;
        payout?: bigint;
        settled?: boolean;
        block?: number;
      }
      const dmap = new Map<number, DuelAgg>();
      for (const log of await fetchContractLogs(STOCKDUEL_ADDRESS)) {
        let dec;
        try {
          dec = decodeEventLog({
            abi: [duelCreatedEvent, duelAcceptedEvent, duelSettledEvent],
            topics: log.topics as [`0x${string}`, ...`0x${string}`[]],
            data: log.data,
          });
        } catch {
          continue;
        }
        const id = Number(dec.args.id);
        const e = dmap.get(id) ?? {};
        if (dec.eventName === "DuelCreated") {
          e.creator = dec.args.creator;
          e.stake = dec.args.stake;
        } else if (dec.eventName === "DuelAccepted") {
          e.challenger = dec.args.challenger;
        } else {
          e.winner = dec.args.winner;
          e.draw = dec.args.draw;
          e.payout = dec.args.payout;
          e.settled = true;
          e.block = log.block;
        }
        dmap.set(id, e);
      }
      const pushDelta = (addr: `0x${string}`, key: number, delta: bigint) => {
        const k = addr.toLowerCase();
        duelDeltas.set(k, [...(duelDeltas.get(k) ?? []), [key, delta]]);
      };
      for (const [id, e] of dmap) {
        if (!e.creator || e.stake === undefined) continue;
        for (const who of [e.creator, e.challenger]) {
          if (!who) continue;
          const u = userOf(who);
          u.volume += e.stake;
          u.bets += 1;
          betFlows.push([e.block ?? 0, e.stake]);
        }
        if (!e.settled || !e.challenger) continue;
        if (e.draw) {
          duelPaidOut += e.stake * 2n; // both refunded
          continue;
        }
        if (!e.winner || e.payout === undefined) continue;
        const loser = e.winner.toLowerCase() === e.creator.toLowerCase() ? e.challenger : e.creator;
        // Sort key 1e6+id keeps duels after markets in the P&L curve — rough
        // chronology, good enough for a sparkline.
        pushDelta(e.winner, 1_000_000 + id, e.payout - e.stake);
        pushDelta(loser, 1_000_000 + id, -e.stake);
        duelPaidOut += e.payout;
        duelFees += (e.stake * 2n * 200n) / 10_000n;
      }
    } catch {
      /* duel stats are additive — never break the board over them */
    }
  }
  paidOut += duelPaidOut;

  const mById = new Map(markets.map((m) => [m.id, m]));
  for (const u of byUser.values()) {
    const deltas: [number, bigint][] = [];
    for (const [id, [s0, s1]] of u.positions) {
      const m = mById.get(id);
      if (!m || !m.resolved || m.canceled) continue; // not settled / refund → neutral
      const winPool = m.winner === 1 ? m.poolYes : m.poolNo;
      if (winPool === 0n) continue; // no winners → full refund, neutral
      const losePool = m.winner === 1 ? m.poolNo : m.poolYes;
      const myWin = m.winner === 1 ? s1 : s0;
      const prize = (losePool * 9800n) / 10000n; // mirrors the contract's 2% fee
      const payout = myWin + (prize * myWin) / winPool;
      const delta = payout - (s0 + s1);
      u.pnl += delta;
      deltas.push([id, delta]);
      if (delta > 0n) u.wins += 1;
      else if (delta < 0n) u.losses += 1;
    }
    // Merge duel results into the same P&L stream.
    for (const [k, d] of duelDeltas.get(u.address.toLowerCase()) ?? []) {
      deltas.push([k, d]);
      u.pnl += d;
      if (d > 0n) u.wins += 1;
      else if (d < 0n) u.losses += 1;
    }
    deltas.sort((a, b) => a[0] - b[0]);
    let run = 0;
    u.history = deltas.map(([, d]) => (run += Number(d) / 1e6));
  }

  const users = [...byUser.values()].sort((a, b) => (b.pnl === a.pnl ? Number(b.volume - a.volume) : b.pnl > a.pnl ? 1 : -1));

  // Platform-wide totals for the live stats strip.
  let fees = duelFees;
  let settled = 0;
  const now = Date.now() / 1000;
  let active = 0;
  for (const m of markets) {
    if (m.resolved && !m.canceled) {
      settled += 1;
      const winPool = m.winner === 1 ? m.poolYes : m.poolNo;
      const losePool = m.winner === 1 ? m.poolNo : m.poolYes;
      if (winPool > 0n && losePool > 0n) fees += (losePool * 200n) / 10000n;
    }
    if (!m.resolved && !m.canceled && now < m.closeTime) active += 1;
  }
  // Last-24h flows. Block time here is NOT a fixed 100ms, so calibrate
  // seconds-per-block from real timestamps before picking the cutoff block.
  let vol24 = 0n;
  let paid24 = 0n;
  try {
    const head = await client.getBlockNumber();
    const span = head > 100_000n ? 100_000n : head - 1n;
    const [headB, refB] = await Promise.all([
      client.getBlock({ blockNumber: head }),
      client.getBlock({ blockNumber: head - span }),
    ]);
    const secPerBlock = Number(headB.timestamp - refB.timestamp) / Number(span);
    const cutoff = Number(head) - Math.round(86_400 / Math.max(secPerBlock, 0.05));
    for (const [b, v] of betFlows) if (b >= cutoff) vol24 += v;
    for (const [b, v] of claimFlows) if (b >= cutoff) paid24 += v;
  } catch {
    /* change badges simply read 0 */
  }

  const totals: Totals = {
    players: users.length,
    bets: users.reduce((n, u) => n + u.bets, 0),
    volume: users.reduce((n, u) => n + u.volume, 0n),
    paidOut,
    fees,
    markets: markets.length,
    settled,
    active,
    vol24,
    paid24,
  };

  // Cumulative curves, oldest first, thinned to chart-sized arrays.
  const curve = (flows: [number, bigint][]): number[] => {
    flows.sort((a, b) => a[0] - b[0]);
    let run = 0;
    const pts = flows.map(([, v]) => (run += Number(v) / 1e6));
    if (pts.length <= 40) return pts;
    const step = pts.length / 40;
    const thin = Array.from({ length: 40 }, (_, i) => pts[Math.floor(i * step)]);
    thin[thin.length - 1] = pts[pts.length - 1];
    return thin;
  };

  const data = { users, markets, totals, series: { volume: curve(betFlows), paidOut: curve(claimFlows) } };
  cache = { at: Date.now(), data };
  return data;
}

