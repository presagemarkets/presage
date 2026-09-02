// Contract event logs via Blockscout REST v2.
//
// Why not eth_getLogs: this chain mints a block every 100ms (~864k blocks/day)
// and public RPCs reject ranged getLogs over windows that wide. Blockscout's
// paginated address-logs endpoint is the reliable path here (a lesson already
// paid for in the launchpad research).

export interface RawLog {
  topics: `0x${string}`[];
  data: `0x${string}`;
  txHash: `0x${string}`;
  block: number;
}

const BASE = "https://robinhoodchain.blockscout.com/api/v2/addresses";
const TTL_MS = 30_000;
const MAX_PAGES = 25; // 50 logs/page — raise when volume outgrows it

// Keyed by contract address — the stats engine reads both Presage and StockDuel.
const cache = new Map<string, { at: number; logs: RawLog[] }>();

export async function fetchContractLogs(address: string): Promise<RawLog[]> {
  const hit = cache.get(address.toLowerCase());
  if (hit && Date.now() - hit.at < TTL_MS) return hit.logs;

  const out: RawLog[] = [];
  let qs = "";
  for (let page = 0; page < MAX_PAGES; page++) {
    // Browser-like headers: Cloudflare challenges the default undici fingerprint
    // (403 "Just a moment") but passes with a normal UA. Verified 2026-09-01.
    const r = await fetch(`${BASE}/${address}/logs${qs}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
      headers: {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36",
        accept: "application/json",
        "accept-language": "en-US,en;q=0.9",
      },
    });
    if (!r.ok) break;
    const j = (await r.json()) as {
      items?: {
        topics: (`0x${string}` | null)[];
        data: `0x${string}`;
        transaction_hash?: `0x${string}`;
        tx_hash?: `0x${string}`;
        block_number?: number;
      }[];
      next_page_params?: Record<string, unknown> | null;
    };
    for (const it of j.items ?? []) {
      const txHash = it.transaction_hash ?? it.tx_hash;
      if (!txHash) continue;
      out.push({
        topics: it.topics.filter((t): t is `0x${string}` => t !== null),
        data: it.data,
        txHash,
        block: it.block_number ?? 0,
      });
    }
    if (!j.next_page_params) break;
    qs = "?" + new URLSearchParams(Object.entries(j.next_page_params).map(([k, v]) => [k, String(v)])).toString();
  }

  cache.set(address.toLowerCase(), { at: Date.now(), logs: out });
  return out;
}
