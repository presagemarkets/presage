// Bettors for one market — read server-side (Blockscout logs need a browser UA
// and publicnode rejects eth_getLogs), so the client fetches this instead.

import { fetchBettors } from "../../../src/markets.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!Number.isInteger(id) || id < 0) return Response.json({ bettors: [] });
  try {
    const list = await fetchBettors(id);
    return Response.json({
      bettors: list.map((b) => ({ address: b.address, side: b.side, amount: b.amount.toString() })),
    });
  } catch {
    return Response.json({ bettors: [] });
  }
}
