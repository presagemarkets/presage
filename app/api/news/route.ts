// Latest news per stock from the Google News RSS — free, no API key.
// Bare-bones regex parsing is enough for title+link; if the feed changes
// shape or gets blocked, reply empty and the UI hides its section.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TTL_MS = 10 * 60_000;
const cache = new Map<string, { at: number; body: unknown }>();

export async function GET(req: Request) {
  const symbol = (new URL(req.url).searchParams.get("symbol") ?? "").toUpperCase();
  if (!/^[A-Z0-9.]{1,6}$/.test(symbol)) return Response.json({ items: [] });

  const hit = cache.get(symbol);
  if (hit && Date.now() - hit.at < TTL_MS) return Response.json(hit.body);

  try {
    const r = await fetch(
      `https://news.google.com/rss/search?q=${symbol}+stock&hl=en-US&gl=US&ceid=US:en`,
      { cache: "no-store", signal: AbortSignal.timeout(5000) }
    );
    const xml = await r.text();
    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
      .slice(0, 4)
      .map((m) => {
        const block = m[1];
        const pick = (tag: string) =>
          (block.match(new RegExp(`<${tag}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${tag}>`)) ?? [])[1] ?? "";
        return { title: pick("title"), link: pick("link"), date: pick("pubDate"), source: pick("source"), image: "" };
      })
      .filter((i) => i.title && i.link);

    // Thumbnails: the Google News RSS has no images — follow the article
    // redirect and grab og:image. One failure doesn't fail the others.
    await Promise.allSettled(
      items.map(async (item) => {
        const page = await fetch(item.link, {
          cache: "no-store",
          redirect: "follow",
          signal: AbortSignal.timeout(4000),
          headers: { "user-agent": "Mozilla/5.0 (compatible; PresageBot/1.0)" },
        });
        const html = await page.text();
        const og =
          html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ??
          html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
        if (og?.[1]?.startsWith("http")) item.image = og[1];
      })
    );

    const body = { items };
    if (items.length) cache.set(symbol, { at: Date.now(), body });
    return Response.json(body);
  } catch {
    return Response.json({ items: [] });
  }
}

