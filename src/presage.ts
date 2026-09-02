/** Presage (core market) contract ABIs and addresses. Set via env after deploy. */

export const PRESAGE_ADDRESS = (process.env.NEXT_PUBLIC_PRESAGE_ADDRESS ?? "") as `0x${string}`;
export const TWAP_RESOLVER_ADDRESS = (process.env.NEXT_PUBLIC_TWAP_RESOLVER_ADDRESS ?? "") as `0x${string}`;
export const ADMIN_RESOLVER_ADDRESS = (process.env.NEXT_PUBLIC_ADMIN_RESOLVER_ADDRESS ?? "") as `0x${string}`;

export const presageAbi = [
  { type: "function", name: "marketCount", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  {
    type: "function",
    name: "getMarket",
    stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [
      { name: "resolver", type: "address" },
      { name: "closeTime", type: "uint64" },
      { name: "resolveTime", type: "uint64" },
      { name: "resolved", type: "bool" },
      { name: "canceled", type: "bool" },
      { name: "winner", type: "uint8" },
      { name: "poolNo", type: "uint128" },
      { name: "poolYes", type: "uint128" },
      { name: "question", type: "string" },
    ],
  },
  {
    type: "function",
    name: "stakes",
    stateMutability: "view",
    inputs: [{ type: "uint256" }, { type: "address" }, { type: "uint256" }],
    outputs: [{ type: "uint128" }],
  },
  {
    type: "function",
    name: "claimed",
    stateMutability: "view",
    inputs: [{ type: "uint256" }, { type: "address" }],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "bet",
    stateMutability: "nonpayable",
    inputs: [
      { name: "id", type: "uint256" },
      { name: "side", type: "uint8" },
      { name: "amount", type: "uint128" },
    ],
    outputs: [],
  },
  { type: "function", name: "resolve", stateMutability: "nonpayable", inputs: [{ name: "id", type: "uint256" }], outputs: [] },
  { type: "function", name: "claim", stateMutability: "nonpayable", inputs: [{ name: "id", type: "uint256" }], outputs: [] },
] as const;

export const twapResolverAbi = [
  {
    type: "function",
    name: "createOverUnder",
    stateMutability: "nonpayable",
    inputs: [
      { name: "pool", type: "address" },
      { name: "strikeTick", type: "int24" },
      { name: "closeTime", type: "uint64" },
      { name: "resolveTime", type: "uint64" },
      { name: "question", type: "string" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "createUpDown",
    stateMutability: "nonpayable",
    inputs: [
      { name: "pool", type: "address" },
      { name: "closeTime", type: "uint64" },
      { name: "resolveTime", type: "uint64" },
      { name: "question", type: "string" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "createDuel",
    stateMutability: "nonpayable",
    inputs: [
      { name: "poolA", type: "address" },
      { name: "poolB", type: "address" },
      { name: "closeTime", type: "uint64" },
      { name: "resolveTime", type: "uint64" },
      { name: "question", type: "string" },
    ],
    outputs: [{ type: "uint256" }],
  },
] as const;

/**
 * Price → tick for over/under strikes.
 * Uniswap v3: price(token1 per token0) = 1.0001^tick, times a decimals adjustment.
 * Stocks have 18 decimals, USDG 6. If stock is token0: raw = price * 10^(6-18).
 * If stock is token1: raw = 1/price * 10^(18-6). Tick = log(raw) / log(1.0001).
 */
export function priceToTick(priceUsd: number, stockIsToken0: boolean): number {
  const raw = stockIsToken0 ? priceUsd * 1e-12 : (1 / priceUsd) * 1e12;
  return Math.round(Math.log(raw) / Math.log(1.0001));
}

/** Inverse of priceToTick — to display the current price from a pool tick. */
export function tickToPrice(tick: number, stockIsToken0: boolean): number {
  const raw = Math.pow(1.0001, tick);
  return stockIsToken0 ? raw * 1e12 : 1e12 / raw;
}

export const erc20Abi = [
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [{ type: "address" }, { type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [{ type: "address" }, { type: "uint256" }],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [{ type: "address" }, { type: "uint256" }],
    outputs: [{ type: "bool" }],
  },
] as const;

export const poolAbi = [
  { type: "function", name: "token0", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  {
    type: "function",
    name: "slot0",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { type: "uint160" }, { type: "int24" }, { type: "uint16" },
      { type: "uint16" }, { type: "uint16" }, { type: "uint8" }, { type: "bool" },
    ],
  },
] as const;


