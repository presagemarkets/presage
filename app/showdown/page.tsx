"use client";

// Showdown lobby: browse challenges. Picking and accepting happens on each
// duel's own page (/showdown/[id]) — a card here is a door, not a form.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { encodeFunctionData } from "viem";
import { STOCKDUEL_ADDRESS, stockDuelAbi } from "../../src/duel.ts";
import { browser, fmtUSDG } from "../../src/markets.ts";
import { Avatar, nameOf } from "../avatar.tsx";
import { Countdown } from "../countdown.tsx";
import { StockLogo } from "../logo.tsx";
import { useWallet, friendly } from "../wallet.ts";
import { mapDuel, symOf, ZERO, type Duel } from "./shared.ts";

const GREEN = "#4ade80";

function Champion({ pool, size = 30 }: { pool: string; size?: number }) {
  const sym = symOf(pool);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <StockLogo symbol={sym === "?" ? null : sym} size={size} />
      <strong>{sym}</strong>
    </span>
  );
}

const NOT_LIVE = !STOCKDUEL_ADDRESS;

export default function ShowdownPage() {
  const w = useWallet();
  const [duels, setDuels] = useState<Duel[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    if (!STOCKDUEL_ADDRESS) {
      setDuels([]);
      return;
    }
    const client = browser();
    const count = Number(await client.readContract({ address: STOCKDUEL_ADDRESS, abi: stockDuelAbi, functionName: "duelCount" }));
    if (count === 0) {
      setDuels([]);
      return;
    }
    const rows = await client.multicall({
      contracts: Array.from({ length: count }, (_, id) => ({
        address: STOCKDUEL_ADDRESS,
        abi: stockDuelAbi,
        functionName: "getDuel" as const,
        args: [BigInt(id)] as const,
      })),
      allowFailure: false,
    });
    setDuels(rows.map(mapDuel).reverse());
  }, []);

  useEffect(() => {
    void load().catch(() => setNote({ ok: false, text: "Couldn't read the chain." }));
    const t = setInterval(() => void load().catch(() => {}), 12_000);
    return () => clearInterval(t);
  }, [load]);

  const settle = (id: number) => {
    void (async () => {
      setBusy(`settle-${id}`);
      setNote(null);
      try {
        if (!w.address) {
          await w.connect();
          return;
        }
        await w.send({
          to: STOCKDUEL_ADDRESS,
          data: encodeFunctionData({ abi: stockDuelAbi, functionName: "settle", args: [BigInt(id)] }),
        });
        setNote({ ok: true, text: "Transaction sent — updating in a few seconds." });
        setTimeout(() => void load().catch(() => {}), 2500);
      } catch (e) {
        setNote({ ok: false, text: friendly(e) });
      } finally {
        setBusy(null);
      }
    })();
  };

  const now = Date.now() / 1000;
  const open = duels?.filter((d) => d.state === 0) ?? [];
  const active = duels?.filter((d) => d.state === 1) ?? [];
  const done = duels?.filter((d) => d.state >= 2) ?? [];

  return (
    <main>
      <h1 style={{ fontSize: 26, marginBottom: 6 }}>
        ⚔ Showdown {NOT_LIVE && <span className="chip soon" style={{ verticalAlign: "middle", marginLeft: 6 }}>launching soon</span>}
      </h1>
      <p className="muted" style={{ fontSize: 14, marginBottom: 24 }}>
        1v1. Pick your champion stock and an equal stake. A rival answers with theirs — highest return when time runs out takes the pot (2% fee, ties refund both).
      </p>

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 24 }}>
        <Link href="/create" className="btn green" style={{ padding: "10px 16px" }}>⚔ Create a challenge</Link>
      </div>

      {note && <p className={note.ok ? "ok" : "err"} style={{ marginBottom: 20 }}>{note.text}</p>}

      {duels === null ? (
        <p className="muted">Loading duels…</p>
      ) : (
        <>
          <div className="sec-head">
            <span className="label" style={{ color: GREEN }}>⚔ Open challenges</span>
            <span className="sec-line" />
          </div>
          {open.length === 0 && <p className="muted" style={{ fontSize: 13, marginBottom: 26 }}>No open challenges — publish the first one.</p>}
          <div className="grid-cards" style={{ marginBottom: 34 }}>
            {open.map((d) => (
              <Link key={d.id} href={`/showdown/${d.id}`} className="glow-card">
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <Avatar address={d.creator} size={22} />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{nameOf(d.creator)}</span>
                  <span className="muted" style={{ fontSize: 12 }}>is waiting for a rival</span>
                </div>
                <div className="matchup" style={{ marginBottom: 14 }}>
                  <span style={{ display: "grid", justifyItems: "center", gap: 6 }}>
                    <span className="fighter-logo">
                      <StockLogo symbol={symOf(d.poolA) === "?" ? null : symOf(d.poolA)} size={56} />
                    </span>
                    <strong style={{ fontSize: 14 }}>{symOf(d.poolA)}</strong>
                  </span>
                  <span className="vs-badge" style={{ fontSize: 20 }}>VS</span>
                  <span style={{ display: "grid", justifyItems: "center", gap: 6 }}>
                    <span className="mystery-logo" style={{ width: 56, height: 56, fontSize: 26, borderRadius: 14 }}>?</span>
                    <strong style={{ fontSize: 14, color: "var(--faint)" }}>you?</strong>
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                  <span className="num" style={{ fontSize: 18, fontWeight: 700 }}>${fmtUSDG(d.stake)}</span>
                  <span className="muted" style={{ fontSize: 12 }}>each · {Math.round(d.duration / 86_400)}D window</span>
                  <span style={{ flex: 1 }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: GREEN }}>
                    {w.address?.toLowerCase() === d.creator.toLowerCase() ? "Manage →" : "Accept →"}
                  </span>
                </div>
              </Link>
            ))}
          </div>

          <div className="sec-head">
            <span className="label">⏱ Live duels</span>
            <span className="sec-line" />
          </div>
          {active.length === 0 && <p className="muted" style={{ fontSize: 13, marginBottom: 26 }}>No duels running right now.</p>}
          <div className="grid-cards" style={{ marginBottom: 34 }}>
            {active.map((d) => (
              <div key={d.id} className="glow-card">
                <Link href={`/showdown/${d.id}`} style={{ display: "block" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <Champion pool={d.poolA} />
                    <span className="label">vs</span>
                    <Champion pool={d.poolB} />
                  </div>
                  <p className="muted" style={{ fontSize: 12, marginBottom: 12, display: "flex", justifyContent: "space-between" }}>
                    <span>{nameOf(d.creator)}</span>
                    <span>{nameOf(d.challenger)}</span>
                  </p>
                  <p className="num" style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>
                    Pot ${fmtUSDG(d.stake * 2n)} · {now < d.endTime ? <Countdown until={d.endTime} /> : "time's up"}
                  </p>
                </Link>
                {now >= d.endTime && (
                  <button className="btn green" disabled={busy !== null} onClick={() => settle(d.id)}>
                    {busy === `settle-${d.id}` ? "Sending…" : "Settle duel"}
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="sec-head">
            <span className="label">🏁 Finished</span>
            <span className="sec-line" />
          </div>
          {done.length === 0 && <p className="muted" style={{ fontSize: 13 }}>Nothing settled yet.</p>}
          <div className="grid-cards">
            {done.map((d) => (
              <Link key={d.id} href={`/showdown/${d.id}`} className="glow-card" style={{ opacity: 0.85 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <Champion pool={d.poolA} />
                  <span className="label">vs</span>
                  {d.poolB !== ZERO ? <Champion pool={d.poolB} /> : <span className="muted">—</span>}
                </div>
                <p className="num" style={{ fontSize: 14, fontWeight: 600 }}>
                  {d.state === 3 ? (
                    <span className="muted">Canceled</span>
                  ) : d.draw ? (
                    <span>Draw — both refunded</span>
                  ) : (
                    <span style={{ color: GREEN }}>
                      🏆 {nameOf(d.winner)} won ${fmtUSDG((d.stake * 2n * 9800n) / 10000n)}
                    </span>
                  )}
                </p>
              </Link>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
