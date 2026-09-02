/** StockDuel contract — 1v1 open-challenge stock duels. */

export const STOCKDUEL_ADDRESS = (process.env.NEXT_PUBLIC_STOCKDUEL_ADDRESS ?? "") as `0x${string}`;

const duelTuple = {
  type: "tuple",
  components: [
    { name: "creator", type: "address" },
    { name: "challenger", type: "address" },
    { name: "poolA", type: "address" },
    { name: "poolB", type: "address" },
    { name: "refA", type: "int24" },
    { name: "refB", type: "int24" },
    { name: "aIsToken0", type: "bool" },
    { name: "bIsToken0", type: "bool" },
    { name: "stake", type: "uint128" },
    { name: "duration", type: "uint32" },
    { name: "endTime", type: "uint64" },
    { name: "state", type: "uint8" },
    { name: "draw", type: "bool" },
    { name: "winner", type: "address" },
  ],
} as const;

export const stockDuelAbi = [
  { type: "function", name: "duelCount", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "getDuel", stateMutability: "view", inputs: [{ name: "id", type: "uint256" }], outputs: [duelTuple] },
  {
    type: "function",
    name: "create",
    stateMutability: "nonpayable",
    inputs: [
      { name: "pool", type: "address" },
      { name: "stake", type: "uint128" },
      { name: "duration", type: "uint32" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "accept",
    stateMutability: "nonpayable",
    inputs: [
      { name: "id", type: "uint256" },
      { name: "poolB", type: "address" },
    ],
    outputs: [],
  },
  { type: "function", name: "cancel", stateMutability: "nonpayable", inputs: [{ name: "id", type: "uint256" }], outputs: [] },
  { type: "function", name: "settle", stateMutability: "nonpayable", inputs: [{ name: "id", type: "uint256" }], outputs: [] },
] as const;

export const DUEL_STATE = ["open", "active", "settled", "canceled"] as const;

import type { PublicClient } from "viem";
import { STOCKS } from "./stocks.ts";

export interface OpenDuel {
  id: number;
  creator: `0x${string}`;
  symbol: string;
  stake: bigint;
  days: number;
}

/** Open challenges for the markets page teaser. Empty on any failure. */
export async function fetchOpenDuels(client: PublicClient): Promise<OpenDuel[]> {
  if (!STOCKDUEL_ADDRESS) return [];
  try {
    const count = Number(await client.readContract({ address: STOCKDUEL_ADDRESS, abi: stockDuelAbi, functionName: "duelCount" }));
    if (count === 0) return [];
    const rows = await client.multicall({
      contracts: Array.from({ length: count }, (_, id) => ({
        address: STOCKDUEL_ADDRESS,
        abi: stockDuelAbi,
        functionName: "getDuel" as const,
        args: [BigInt(id)] as const,
      })),
      allowFailure: false,
    });
    return rows
      .map((d, id) => ({ d, id }))
      .filter(({ d }) => Number(d.state) === 0)
      .map(({ d, id }) => ({
        id,
        creator: d.creator,
        symbol: STOCKS.find((s) => s.pool.toLowerCase() === d.poolA.toLowerCase())?.symbol ?? "?",
        stake: d.stake,
        days: Math.round(Number(d.duration) / 86_400),
      }));
  } catch {
    return [];
  }
}
