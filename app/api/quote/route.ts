// Quotes a USDG <-> stock swap and hands back a ready-to-sign transaction.
// Ported from HoodStock's proven engine, single-hop only.
//
// The calldata is built here, not in the browser, so the slippage floor that
// protects the trade is computed from the quote the server just took. A client
// that could set its own amountOutMinimum could be talked into zero — exactly
// the shape of a sandwich attack.

import { encodeFunctionData, parseUnits, formatUnits, type Address } from "viem";
import { server, USDG, USDG_DECIMALS } from "../../../src/chain.ts";
import {
  QUOTER_V2,
  SWAP_ROUTER_02,
  STOCK_DECIMALS,
  DEFAULT_SLIPPAGE_BPS,
  MAX_SLIPPAGE_BPS,
  MAX_IMPACT,
  WARN_IMPACT,
  minOut,
  priceImpact,
  deadlineFrom,
  quoterAbi,
  routerAbi,
} from "../../../src/dex.ts";
import { STOCKS } from "../../../src/stocks.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Body must be JSON" }, { status: 400 });
  }

  const symbol = String(body.symbol ?? "").toUpperCase();
  const buy = body.side !== "sell"; // buy: USDG -> stock, sell: stock -> USDG
  const amountText = String(body.amount ?? "").trim();
  const recipient = String(body.recipient ?? "") as Address;
  const slippageBps = Math.min(
    Math.max(Number(body.slippageBps ?? DEFAULT_SLIPPAGE_BPS) || DEFAULT_SLIPPAGE_BPS, 1),
    MAX_SLIPPAGE_BPS
  );

  const stock = STOCKS.find((s) => s.symbol === symbol);
  if (!stock) return Response.json({ error: `${symbol || "That stock"} isn't tradable here` }, { status: 400 });
  if (!/^0x[a-fA-F0-9]{40}$/.test(recipient)) return Response.json({ error: "Connect a wallet first" }, { status: 400 });
  if (!/^\d*\.?\d+$/.test(amountText) || Number(amountText) <= 0) {
    return Response.json({ error: "Enter an amount greater than zero" }, { status: 400 });
  }

  const dIn = buy ? USDG_DECIMALS : STOCK_DECIMALS;
  const dOut = buy ? STOCK_DECIMALS : USDG_DECIMALS;
  const tokenIn = (buy ? USDG : stock.token) as Address;
  const tokenOut = (buy ? stock.token : USDG) as Address;

  let amountIn: bigint;
  try {
    amountIn = parseUnits(amountText, dIn);
  } catch {
    return Response.json({ error: "That amount has too many decimals" }, { status: 400 });
  }
  if (amountIn <= 0n) return Response.json({ error: "Enter an amount greater than zero" }, { status: 400 });

  const client = server();
  const quoteAt = async (amt: bigint) => {
    const { result } = await client.simulateContract({
      address: QUOTER_V2,
      abi: quoterAbi,
      functionName: "quoteExactInputSingle",
      args: [{ tokenIn, tokenOut, amountIn: amt, fee: stock.fee, sqrtPriceLimitX96: 0n }],
    });
    return result[0] as bigint;
  };

  let out: bigint;
  try {
    out = await quoteAt(amountIn);
  } catch {
    return Response.json({ error: "The pool can't fill that size right now — try a smaller amount" }, { status: 409 });
  }
  if (out <= 0n) return Response.json({ error: "That size quotes to zero — try a larger amount" }, { status: 409 });

  // Re-quote at a thousandth of the size. Comparing the two unit rates is the
  // only thing that catches an order large enough to drain the pool — the
  // slippage floor would happily honour the terrible price.
  const probe = amountIn / 1000n;
  let impact = 0;
  if (probe > 0n) {
    try {
      impact = priceImpact(probe, await quoteAt(probe), amountIn, out);
    } catch {
      /* a failed probe tells us nothing; don't block the trade on it */
    }
  }
  if (impact > MAX_IMPACT) {
    return Response.json(
      { error: `That size would move the price ${(impact * 100).toFixed(1)}% against you. Try a smaller amount.`, impact },
      { status: 409 }
    );
  }

  const floor = minOut(out, slippageBps);
  const swapData = encodeFunctionData({
    abi: routerAbi,
    functionName: "exactInputSingle",
    args: [{ tokenIn, tokenOut, fee: stock.fee, recipient, amountIn, amountOutMinimum: floor, sqrtPriceLimitX96: 0n }],
  });
  const data = encodeFunctionData({
    abi: routerAbi,
    functionName: "multicall",
    args: [deadlineFrom(Date.now()), [swapData]],
  });

  return Response.json(
    {
      amountIn: amountIn.toString(),
      amountOut: out.toString(),
      amountOutFormatted: formatUnits(out, dOut),
      minOutFormatted: formatUnits(floor, dOut),
      slippageBps,
      impact,
      warning: impact > WARN_IMPACT ? `This trade moves the price ${(impact * 100).toFixed(1)}% against you.` : null,
      tx: { to: SWAP_ROUTER_02, data },
      approval: { token: tokenIn, spender: SWAP_ROUTER_02, amount: amountIn.toString() },
    },
    { headers: { "cache-control": "no-store" } }
  );
}
