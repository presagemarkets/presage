// Company logos via our own origin (HoodStock pattern): one same-origin
// request the browser can cache, sources swappable here. Only catalog
// tickers are served — an open image relay = a disguised open redirect.

import { STOCKS } from "../../../src/stocks.ts";

export const runtime = "nodejs";

const KNOWN = new Set(STOCKS.map((s) => s.symbol));
const DAY = 60 * 60 * 24;
const SOURCES = [
  (s: string) => `https://assets.parqet.com/logos/symbol/${s}?format=png&size=96`,
  (s: string) => `https://financialmodelingprep.com/image-stock/${s}.png`,
];

export async function GET(req: Request) {
  const symbol = (new URL(req.url).searchParams.get("symbol") ?? "").toUpperCase();
  if (!KNOWN.has(symbol)) return new Response("Unknown token", { status: 404 });

  for (const source of SOURCES) {
    try {
      const upstream = await fetch(source(symbol), { cache: "no-store", signal: AbortSignal.timeout(3500) });
      if (!upstream.ok || !upstream.body) continue;
      const type = upstream.headers.get("content-type") ?? "";
      if (!type.startsWith("image/")) continue;
      return new Response(upstream.body, {
        headers: {
          "content-type": type,
          "cache-control": `public, max-age=${DAY}, s-maxage=${DAY * 30}, immutable`,
        },
      });
    } catch {
      /* source slow/dead — try the next one */
    }
  }
  return new Response("No logo", { status: 404 });
}
