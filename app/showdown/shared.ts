// Shared between the showdown lobby and the single-duel detail page.

import { STOCKS } from "../../src/stocks.ts";

export interface Duel {
  id: number;
  creator: `0x${string}`;
  challenger: `0x${string}`;
  poolA: `0x${string}`;
  poolB: `0x${string}`;
  stake: bigint;
  duration: number;
  endTime: number;
  state: number; // 0 open 1 active 2 settled 3 canceled
  draw: boolean;
  winner: `0x${string}`;
}

export const ZERO = "0x0000000000000000000000000000000000000000" as `0x${string}`;

export const symOf = (pool: string) => STOCKS.find((s) => s.pool.toLowerCase() === pool.toLowerCase())?.symbol ?? "?";

// Lobby preview while the contract isn't live — every state represented,
// clearly labeled, replaced by chain data the moment real duels exist.
export function demoDuels(): Duel[] {
  const p = (sym: string) => STOCKS.find((s) => s.symbol === sym)!.pool;
  const now = Math.floor(Date.now() / 1000);
  const a = "0x7fA2c9b1D34e5F60718293aBcD45671890fEdC12" as `0x${string}`; // Bold Lynx
  const b = "0x3B91e4F2a6C8d51290AbCdEf3456789012345678" as `0x${string}`; // Crimson Hawk
  const c = "0x9Cd3f7E8B2a1046573829FeDcBa09876543210Ab" as `0x${string}`; // Lunar Whale
  const d = "0x1a2B3c4D5e6F7081920AbCdEf1234567890aBcDe" as `0x${string}`; // Silent Wolf
  return [
    { id: 0, creator: a, challenger: ZERO, poolA: p("NVDA"), poolB: ZERO, stake: 25_000_000n, duration: 86_400, endTime: 0, state: 0, draw: false, winner: ZERO },
    { id: 1, creator: b, challenger: ZERO, poolA: p("TSLA"), poolB: ZERO, stake: 50_000_000n, duration: 7 * 86_400, endTime: 0, state: 0, draw: false, winner: ZERO },
    { id: 2, creator: c, challenger: d, poolA: p("GME"), poolB: p("AAPL"), stake: 20_000_000n, duration: 86_400, endTime: now + 5 * 3600 + 780, state: 1, draw: false, winner: ZERO },
    { id: 3, creator: d, challenger: a, poolA: p("SPY"), poolB: p("MSTR"), stake: 15_000_000n, duration: 86_400, endTime: now - 600, state: 1, draw: false, winner: ZERO },
    { id: 4, creator: a, challenger: b, poolA: p("NVDA"), poolB: p("TSLA"), stake: 40_000_000n, duration: 7 * 86_400, endTime: now - 86_400, state: 2, draw: false, winner: a },
    { id: 5, creator: c, challenger: b, poolA: p("AAPL"), poolB: p("AMD"), stake: 10_000_000n, duration: 86_400, endTime: now - 2 * 86_400, state: 2, draw: true, winner: ZERO },
  ];
}

export function mapDuel(d: {
  creator: `0x${string}`;
  challenger: `0x${string}`;
  poolA: `0x${string}`;
  poolB: `0x${string}`;
  stake: bigint;
  duration: number | bigint;
  endTime: number | bigint;
  state: number | bigint;
  draw: boolean;
  winner: `0x${string}`;
}, id: number): Duel {
  return {
    id,
    creator: d.creator,
    challenger: d.challenger,
    poolA: d.poolA,
    poolB: d.poolB,
    stake: d.stake,
    duration: Number(d.duration),
    endTime: Number(d.endTime),
    state: Number(d.state),
    draw: d.draw,
    winner: d.winner,
  };
}
