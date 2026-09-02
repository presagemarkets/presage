"use client";

// One duel, full screen: the character-select moment for exactly this bet.
// Open -> pick your champion and accept; active -> countdown + settle;
// finished -> the result.

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { encodeFunctionData } from "viem";
import { USDG } from "../../../src/chain.ts";
import { erc20Abi } from "../../../src/presage.ts";
import { STOCKDUEL_ADDRESS, stockDuelAbi } from "../../../src/duel.ts";
import { browser, fmtUSDG } from "../../../src/markets.ts";
import { STOCKS } from "../../../src/stocks.ts";
import { Avatar, nameOf } from "../../avatar.tsx";
import { Countdown } from "../../countdown.tsx";
import { Select } from "../../select.tsx";
import { StockLogo } from "../../logo.tsx";
import { useWallet, friendly } from "../../wallet.ts";
import { StockChart } from "../../chart.tsx";
import { mapDuel, symOf, ZERO, type Duel } from "../shared.ts";

const GREEN = "#4ade80";

/** Number that counts up to its target — the little dopamine hit of a prize reveal. */
function CountUp({ value }: { value: number }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setV(value);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const dur = 900;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      setV(value * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{v.toLocaleString("en-US", { maximumFractionDigits: 2 })}</>;
}

function Fighter({
  sym,
  name,
  tag,
  dim,
  crowned,
  children,
}: {
  sym: string | null;
  name?: string;
  tag: string;
  dim?: boolean;
  crowned?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="fighter" style={{ opacity: dim ? 0.45 : 1, position: "relative" }}>
      {crowned && <span style={{ position: "absolute", top: 8, fontSize: 22 }}>👑</span>}
      {sym ? (
        <span className="fighter-logo">
          <StockLogo symbol={sym} size={96} />
        </span>
      ) : (
        <span className="mystery-logo">?</span>
      )}
      <strong style={{ fontSize: 19 }}>{sym ?? "???"}</strong>
      {name && <span className="muted" style={{ fontSize: 12 }}>{name}</span>}
      <span className="label" style={{ color: crowned ? GREEN : undefined }}>{tag}</span>
      {children}
    </div>
  );
}

export default function DuelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const duelId = Number(id);
  const w = useWallet();

  const [d, setD] = useState<Duel | null>(null);
  const [pick, setPick] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    if (!STOCKDUEL_ADDRESS) {
      setD(null);
      return;
    }
    const client = browser();
    const count = Number(await client.readContract({ address: STOCKDUEL_ADDRESS, abi: stockDuelAbi, functionName: "duelCount" }));
    if (duelId >= count) {
      setD(null);
      return;
    }
    const raw = await client.readContract({ address: STOCKDUEL_ADDRESS, abi: stockDuelAbi, functionName: "getDuel", args: [BigInt(duelId)] });
    setD(mapDuel(raw, duelId));
  }, [duelId]);

  useEffect(() => {
    void load().catch(() => setNote({ ok: false, text: "Couldn't read the chain." }));
    const t = setInterval(() => void load().catch(() => {}), 12_000);
    return () => clearInterval(t);
  }, [load]);

  const act = useCallback(
    async (fn: () => Promise<void>) => {
      setBusy(true);
      setNote(null);
      try {
        if (!w.address) {
          await w.connect();
          return;
        }
        await fn();
        setNote({ ok: true, text: "Transaction sent — updating in a few seconds." });
        setTimeout(() => void load().catch(() => {}), 2500);
      } catch (e) {
        setNote({ ok: false, text: friendly(e) });
      } finally {
        setBusy(false);
      }
    },
    [w, load]
  );

  if (!d) {
    return (
      <main style={{ maxWidth: 640, margin: "0 auto" }}>
        <p className="muted">{note ? note.text : "Duel not found."}</p>
        <Link href="/showdown" style={{ textDecoration: "underline", fontSize: 14 }}>â† All challenges</Link>
      </main>
    );
  }

  const symA = symOf(d.poolA);
  const mine = w.address?.toLowerCase() === d.creator.toLowerCase();
  const now = Date.now() / 1000;
  const myPick = pick ?? STOCKS.find((s) => s.symbol !== symA)!.symbol;
  const pot = d.stake * 2n;

  const acceptDuel = () =>
    void act(async () => {
      const stock = STOCKS.find((s) => s.symbol === myPick)!;
      const client = browser();
      const allowance = await client.readContract({ address: USDG, abi: erc20Abi, functionName: "allowance", args: [w.address!, STOCKDUEL_ADDRESS] });
      if (allowance < d.stake) {
        await w.send({ to: USDG, data: encodeFunctionData({ abi: erc20Abi, functionName: "approve", args: [STOCKDUEL_ADDRESS, d.stake] }) });
      }
      await w.send({ to: STOCKDUEL_ADDRESS, data: encodeFunctionData({ abi: stockDuelAbi, functionName: "accept", args: [BigInt(d.id), stock.pool] }) });
    });

  const simpleTx = (fn: "cancel" | "settle") =>
    void act(async () => {
      await w.send({ to: STOCKDUEL_ADDRESS, data: encodeFunctionData({ abi: stockDuelAbi, functionName: fn, args: [BigInt(d.id)] }) });
    });

  const symB = d.state === 0 ? (mine ? null : myPick) : symOf(d.poolB) === "?" ? null : symOf(d.poolB);

  return (
    <main style={{ maxWidth: 880, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <Link href="/showdown" className="muted" style={{ fontSize: 13 }}>â† All challenges</Link>
        <span style={{ flex: 1 }} />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
        <Avatar address={d.creator} size={30} />
        <span style={{ fontSize: 14, fontWeight: 600 }}>{nameOf(d.creator)}</span>
        <span className="muted" style={{ fontSize: 13 }}>
          {d.state === 0 ? "is waiting for a rival" : d.state === 1 ? "is in battle" : "fought"}
        </span>
      </div>

      <div className="glow-card green border-run" style={{ display: "grid", gap: 20 }}>
        <div className="matchup">
          <Fighter
            sym={symA}
            name={nameOf(d.creator)}
            tag={d.state === 0 ? "their champion" : "champion A"}
            dim={d.state === 2 && !d.draw && d.winner.toLowerCase() !== d.creator.toLowerCase()}
            crowned={d.state === 2 && !d.draw && d.winner.toLowerCase() === d.creator.toLowerCase()}
          />
          <span className="vs-badge">VS</span>
          {d.state === 0 ? (
            <Fighter sym={mine ? null : myPick} tag={mine ? "waiting for a rival" : "your champion"} />
          ) : (
            <Fighter
              sym={symOf(d.poolB)}
              name={d.challenger === ZERO ? undefined : nameOf(d.challenger)}
              tag="champion B"
              dim={d.state === 2 && !d.draw && d.winner.toLowerCase() !== d.challenger.toLowerCase()}
              crowned={d.state === 2 && !d.draw && d.winner.toLowerCase() === d.challenger.toLowerCase()}
            />
          )}
        </div>

        {d.state === 0 && !mine && (
          <div className="fade-in" style={{ display: "grid", gap: 8 }}>
            <p className="label" style={{ textAlign: "center" }}>Pick your champion</p>
            <Select
              value={myPick}
              options={STOCKS.filter((s) => s.symbol !== symA).map((s) => s.symbol)}
              onChange={setPick}
              render={(v) => (
                <>
                  <StockLogo symbol={v} size={22} />
                  <span style={{ fontWeight: 600 }}>{v}</span>
                </>
              )}
            />
          </div>
        )}

        <div className="pot-banner">
          <span className="pot-trophy">ðŸ†</span>
          <span className="pot-value num">
            $<CountUp value={Number(pot) / 1e6} />
          </span>
          <span className="label">total prize pool · winner takes all</span>
          <div className="pot-chips">
            <span className="chip">â± {Math.round(d.duration / 86_400)}D window</span>
            <span className="chip">2% house fee</span>
            {d.state === 1 && (
              <span className="chip" style={{ color: GREEN, borderColor: GREEN }}>
                {now < d.endTime ? <Countdown until={d.endTime} /> : "time's up — settle it"}
              </span>
            )}
          </div>
        </div>

        {d.state === 0 &&
          (mine ? (
            <button className="btn ghost" disabled={busy} onClick={() => simpleTx("cancel")}>
              {busy ? "Sending…" : "Cancel my challenge"}
            </button>
          ) : (
            <button className="btn green" style={{ padding: "13px 18px", fontSize: 14 }} disabled={busy} onClick={acceptDuel}>
              {busy ? "Sending…" : w.address ? `⚔ Accept with ${myPick} — stake $${fmtUSDG(d.stake)}` : "Sign in to accept"}
            </button>
          ))}

        {d.state === 1 && now >= d.endTime && (
          <button className="btn green" disabled={busy} onClick={() => simpleTx("settle")}>
            {busy ? "Sending…" : "Settle duel"}
          </button>
        )}

        {d.state === 2 && (
          <p className="num" style={{ textAlign: "center", fontSize: 15, fontWeight: 600 }}>
            {d.draw ? "Draw — both sides refunded" : (
              <span style={{ color: GREEN }}>ðŸ† {nameOf(d.winner)} won ${fmtUSDG((pot * 9800n) / 10_000n)}</span>
            )}
          </p>
        )}
        {d.state === 3 && <p className="muted" style={{ textAlign: "center", fontSize: 14 }}>Canceled — stake refunded.</p>}

        {note && <p className={note.ok ? "ok" : "err"} style={{ textAlign: "center" }}>{note.text}</p>}
        {w.error && <p className="err">{w.error}</p>}
      </div>

      {/* ---- champion charts: real on-chain price history, side by side ---- */}
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", marginTop: 16 }}>
        {symA !== "?" && (
          <div className="glow-card">
            <p className="label" style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
              <StockLogo symbol={symA} size={20} /> {symA} · {d.state === 0 ? "their champion" : "champion A"}
            </p>
            <StockChart symbol={symA} />
          </div>
        )}
        {symB && (
          <div key={symB} className="glow-card fade-in">
            <p className="label" style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
              <StockLogo symbol={symB} size={20} /> {symB} · {d.state === 0 ? "your pick" : "champion B"}
            </p>
            <StockChart symbol={symB} />
          </div>
        )}
      </div>
    </main>
  );
}
