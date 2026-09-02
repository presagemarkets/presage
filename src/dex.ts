// Uniswap v3 on Robinhood Chain — swap engine constants and guards, ported
// from HoodStock's battle-tested implementation.
//
// The addresses were verified there by check-swap.mjs: every contract holds
// code and SwapRouter02.factory() matches the factory our pools came from.
// This chain is littered with look-alike routers (Rob0SwapRouter,
// HoodlumSwapRouterV2_1, InSwapRouter) — never replace an address here on the
// strength of its name.

export const V3_FACTORY = "0x1f7d7550B1b028f7571E69A784071F0205FD2EfA" as const;
export const SWAP_ROUTER_02 = "0xcaf681a66d020601342297493863e78c959e5cb2" as const;
export const QUOTER_V2 = "0x33e885ed0ec9bf04ecfb19341582aadcb4c8a9e7" as const;

export const STOCK_DECIMALS = 18;

/** How much price movement a trade tolerates before it reverts. */
export const DEFAULT_SLIPPAGE_BPS = 50; // 0.5%
export const MAX_SLIPPAGE_BPS = 500; // 5% — past this a user is being farmed

/** Above this, a trade is eating the pool rather than trading against it. */
export const MAX_IMPACT = 0.15;
/** Above this, the trade still goes through but the user is warned first. */
export const WARN_IMPACT = 0.03;

/**
 * The floor an output must clear, or the swap reverts. Computed server-side
 * from the quote — a client that could set its own amountOutMinimum could be
 * talked into zero, which is exactly the shape of a sandwich attack.
 */
export function minOut(quoted: bigint, slippageBps: number): bigint {
  const bps = Math.min(Math.max(Math.round(slippageBps), 0), MAX_SLIPPAGE_BPS);
  return (quoted * BigInt(10_000 - bps)) / 10_000n;
}

/**
 * How much worse the full trade prices than a dust-sized one on the same
 * route. Slippage tolerance cannot catch this: it only checks the fill against
 * the quote, and a quote that already drains the pool is a bad quote honoured
 * exactly. Returns 0 when the reference is unusable.
 */
export function priceImpact(smallIn: bigint, smallOut: bigint, fullIn: bigint, fullOut: bigint): number {
  if (smallIn <= 0n || smallOut <= 0n || fullIn <= 0n || fullOut <= 0n) return 0;
  const smallRate = Number(smallOut) / Number(smallIn);
  const fullRate = Number(fullOut) / Number(fullIn);
  if (!Number.isFinite(smallRate) || !Number.isFinite(fullRate) || smallRate <= 0) return 0;
  return Math.max(0, 1 - fullRate / smallRate);
}

/** Transactions that sit unmined past this are stale; 20 minutes is the Uniswap norm. */
export const deadlineFrom = (nowMs: number) => BigInt(Math.floor(nowMs / 1000) + 20 * 60);

export const quoterAbi = [
  {
    type: "function",
    name: "quoteExactInputSingle",
    stateMutability: "nonpayable",
    inputs: [
      {
        type: "tuple",
        components: [
          { name: "tokenIn", type: "address" },
          { name: "tokenOut", type: "address" },
          { name: "amountIn", type: "uint256" },
          { name: "fee", type: "uint24" },
          { name: "sqrtPriceLimitX96", type: "uint160" },
        ],
      },
    ],
    outputs: [
      { name: "amountOut", type: "uint256" },
      { name: "sqrtPriceX96After", type: "uint160" },
      { name: "initializedTicksCrossed", type: "uint32" },
      { name: "gasEstimate", type: "uint256" },
    ],
  },
] as const;

export const routerAbi = [
  {
    type: "function",
    name: "exactInputSingle",
    stateMutability: "payable",
    inputs: [
      {
        type: "tuple",
        components: [
          { name: "tokenIn", type: "address" },
          { name: "tokenOut", type: "address" },
          { name: "fee", type: "uint24" },
          { name: "recipient", type: "address" },
          { name: "amountIn", type: "uint256" },
          { name: "amountOutMinimum", type: "uint256" },
          { name: "sqrtPriceLimitX96", type: "uint160" },
        ],
      },
    ],
    outputs: [{ type: "uint256" }],
  },
  // The deadline overload, named explicitly — the router carries three.
  {
    type: "function",
    name: "multicall",
    stateMutability: "payable",
    inputs: [
      { name: "deadline", type: "uint256" },
      { name: "data", type: "bytes[]" },
    ],
    outputs: [{ type: "bytes[]" }],
  },
] as const;
