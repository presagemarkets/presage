"use client";

// One door for creating everything: the three prediction-market templates
// (TwapResolver) plus the Showdown 1v1 challenge (StockDuel contract).

import { useCallback, useEffect, useMemo, useState } from "react";
import { encodeFunctionData } from "viem";
import { useRouter } from "next/navigation";
import { USDG } from "../../src/chain.ts";
import { TWAP_RESOLVER_ADDRESS, twapResolverAbi, priceToTick, tickToPrice, poolAbi, erc20Abi } from "../../src/presage.ts";
import { STOCKDUEL_ADDRESS, stockDuelAbi } from "../../src/duel.ts";
import { browser, fmtTime, parseUSDG } from "../../src/markets.ts";
import { STOCKS } from "../../src/stocks.ts";
import { useWallet, friendly } from "../wallet.ts";
import { StockLogo } from "../logo.tsx";
import { ClockIcon } from "../ui.tsx";
import { Select } from "../select.tsx";

type Kind = "updown" | "overunder" | "duel" | "showdown";

const DURATIONS = [
  { label: "1 hour", s: 3600 },
  { label: "6 hours", s: 6 * 3600 },
  { label: "1 day", s: 86400 },
  { label: "3 days", s: 3 * 86400 },
  { label: "1 week", s: 7 * 86400 },
];
const LOCK_GAP = 3600; // mirrors the contract

const icon = (d: string) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d={d} />
  </svg>
);
const KINDS: { key: Kind; label: string; icon: React.ReactNode }[] = [
  { key: "updown", label: "Up / down", icon: icon("M8 17V7m0 0-4 4m4-4 4 4M16 7v10m0 0 4-4m-4 4-4-4") },
  { key: "overunder", label: "Over / under", icon: icon("M3 12h18M12 3v6m0 6v6m7-13-3 4 3 4M5 8l3 4-3 4") },
  { key: "duel", label: "Stock duel", icon: icon("M14 4l6 6-9 9-6-6 9-9ZM5 19l-2 2M19 5l2-2M10 19l5 2-1-5") },
  { key: "showdown", label: "Showdown 1v1", icon: icon("M6 3l12 12M18 3 6 15m-2 6 4-4m10 4-4-4") },
];

export default function CreatePage() {
  const w = useWallet();
  const router = useRouter();

  const [kind, setKind] = useState<Kind>("updown");
  const [sym, setSym] = useState("AAPL");
  const [symB, setSymB] = useState("NVDA");
  const [strike, setStrike] = useState("");
  const [dur, setDur] = useState(86400);
  const [stake, setStake] = useState("");
  const [duelDays, setDuelDays] = useState<1 | 7>(1);
  const [price, setPrice] = useState<{ value: number; stockIsToken0: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const stock = STOCKS.find((s) => s.symbol === sym)!;
  const stockB = STOCKS.find((s) => s.symbol === symB)!;

  // Current price — context for picking a strike, plus the pool's tick orientation.
  useEffect(() => {
    setPrice(null);
    const client = browser();
    void (async () => {
      const [token0, slot0] = await Promise.all([
        client.readContract({ address: stock.pool, abi: poolAbi, functionName: "token0" }),
        client.readContract({ address: stock.pool, abi: poolAbi, functionName: "slot0" }),
      ]);
      const stockIsToken0 = token0.toLowerCase() !== USDG.toLowerCase();
      setPrice({ value: tickToPrice(slot0[1], stockIsToken0), stockIsToken0 });
    })().catch(() => {});
  }, [stock.pool]);

  const closeTime = useMemo(() => Math.floor(Date.now() / 1000) + dur, [dur]);
  const resolveTime = closeTime + LOCK_GAP;

  const question = useMemo(() => {
    const when = fmtTime(resolveTime);
    if (kind === "updown") return `${sym} up by ${when}?`;
    if (kind === "overunder") return `${sym} above $${strike || "…"} on ${when}?`;
    return `${sym} outperforms ${symB} by ${when}? (tie = ${symB})`;
  }, [kind, sym, symB, strike, resolveTime]);

  const submit = useCallback(async () => {
    setErr(null);
    setBusy(true);
    try {
      if (!w.address) {
        await w.connect();
        return;
      }

      if (kind === "showdown") {
        const amt = parseUSDG(stake);
        if (!amt) throw new Error("Enter a USDG stake first.");
        const client = browser();
        const allowance = await client.readContract({
          address: USDG,
          abi: erc20Abi,
          functionName: "allowance",
          args: [w.address, STOCKDUEL_ADDRESS],
        });
        if (allowance < amt) {
          await w.send({
            to: USDG,
            data: encodeFunctionData({ abi: erc20Abi, functionName: "approve", args: [STOCKDUEL_ADDRESS, amt] }),
          });
        }
        await w.send({
          to: STOCKDUEL_ADDRESS,
          data: encodeFunctionData({ abi: stockDuelAbi, functionName: "create", args: [stock.pool, amt, duelDays * 86_400] }),
        });
        router.push("/showdown");
        return;
      }

      // Recomputed at submit time so the form can't go stale.
      const close = BigInt(Math.floor(Date.now() / 1000) + dur);
      const resolve = close + BigInt(LOCK_GAP);
      let data: `0x${string}`;
      if (kind === "updown") {
        data = encodeFunctionData({ abi: twapResolverAbi, functionName: "createUpDown", args: [stock.pool, close, resolve, question] });
      } else if (kind === "overunder") {
        const p = Number(strike.replace(",", "."));
        if (!Number.isFinite(p) || p <= 0) throw new Error("Enter a sensible strike price.");
        if (!price) throw new Error("Pool price not loaded yet — give it a second.");
        const tick = priceToTick(p, price.stockIsToken0);
        data = encodeFunctionData({ abi: twapResolverAbi, functionName: "createOverUnder", args: [stock.pool, tick, close, resolve, question] });
      } else {
        if (sym === symB) throw new Error("Pick two different stocks.");
        data = encodeFunctionData({ abi: twapResolverAbi, functionName: "createDuel", args: [stock.pool, stockB.pool, close, resolve, question] });
      }
      await w.send({ to: TWAP_RESOLVER_ADDRESS, data });
      router.push("/markets");
    } catch (e) {
      setErr(friendly(e));
    } finally {
      setBusy(false);
    }
  }, [w, kind, stock, stockB, sym, symB, strike, dur, stake, duelDays, price, question, router]);

  const pickStock = (value: string, set: (s: string) => void) => (
    <Select
      value={value}
      options={STOCKS.map((s) => s.symbol)}
      onChange={set}
      render={(v) => (
        <>
          <StockLogo symbol={v} size={22} />
          <span style={{ fontWeight: 600 }}>{v}</span>
        </>
      )}
    />
  );

  const showdown = kind === "showdown";

  return (
    <main>
      <h1 style={{ fontSize: 26, marginBottom: 6 }}>Create a market</h1>
      <p className="muted" style={{ fontSize: 14, marginBottom: 28 }}>
        {showdown
          ? "Publish a 1v1 challenge — a rival answers with their own stock, highest return takes the pot."
          : "Every market comes from a template — the result is read automatically from on-chain prices."}
      </p>

      <div className="create-grid">
        {/* ---- left: controls ---- */}
        <div className="glow-card" style={{ display: "grid", gap: 20 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {KINDS.map((k) => (
              <button key={k.key} className={`btn ${kind === k.key ? "green" : "ghost"}`} style={{ flex: "1 1 40%" }} onClick={() => setKind(k.key)}>
                {k.icon} {k.label}
              </button>
            ))}
          </div>

          <div>
            <p className="label" style={{ marginBottom: 8 }}>{showdown ? "Your champion" : "Stock"}</p>
            {pickStock(sym, setSym)}
          </div>

          {kind === "duel" && (
            <div className="fade-in">
              <p className="label" style={{ marginBottom: 8 }}>Versus</p>
              {pickStock(symB, setSymB)}
            </div>
          )}

          {kind === "overunder" && (
            <div className="fade-in">
              <p className="label" style={{ marginBottom: 8 }}>Strike price (USD)</p>
              <input
                className="input"
                inputMode="decimal"
                placeholder={price ? price.value.toFixed(2) : "250"}
                value={strike}
                onChange={(e) => setStrike(e.target.value)}
              />
            </div>
          )}

          {showdown ? (
            <>
              <div className="fade-in">
                <p className="label" style={{ marginBottom: 8 }}>Stake (USDG, each side)</p>
                <input className="input" inputMode="decimal" placeholder="10" value={stake} onChange={(e) => setStake(e.target.value)} />
              </div>
              <div className="fade-in">
                <p className="label" style={{ marginBottom: 8 }}>Window</p>
                <div style={{ display: "flex", gap: 8 }}>
                  {([1, 7] as const).map((d) => (
                    <button key={d} className={`btn ${duelDays === d ? "green" : "ghost"}`} style={{ flex: 1 }} onClick={() => setDuelDays(d)}>
                      {d}D
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div>
              <p className="label" style={{ marginBottom: 8 }}>Betting stays open for</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {DURATIONS.map((d) => (
                  <button key={d.s} className={`btn ${dur === d.s ? "green" : "ghost"}`} onClick={() => setDur(d.s)}>
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ---- right: live preview ---- */}
        <div className={`glow-card green ${showdown ? "border-run" : ""}`} style={{ display: "grid", gap: 18 }}>
          {showdown ? (
            <>
              <div className="matchup">
                <div className="fighter">
                  <span className="fighter-logo">
                    <StockLogo symbol={sym} size={84} />
                  </span>
                  <strong style={{ fontSize: 17 }}>{sym}</strong>
                  <span className="label" style={{ color: "#4ade80" }}>your champion</span>
                </div>
                <span className="vs-badge" style={{ fontSize: 24 }}>VS</span>
                <div className="fighter">
                  <span className="mystery-logo" style={{ width: 84, height: 84, fontSize: 38 }}>?</span>
                  <strong style={{ fontSize: 17, color: "var(--faint)" }}>???</strong>
                  <span className="label">rival&apos;s pick</span>
                </div>
              </div>
              <div className="muted" style={{ fontSize: 13, display: "grid", gap: 8 }}>
                <span>Stake: <span className="num" style={{ color: "var(--text)" }}>{stake || "—"} USDG each</span></span>
                <span><ClockIcon /> Window: <span className="num" style={{ color: "var(--text)" }}>{duelDays} day{duelDays > 1 ? "s" : ""}</span> — the clock starts when someone accepts.</span>
                <span style={{ fontSize: 12 }}>Winner takes the pot minus 2%. An exact tie refunds both sides.</span>
              </div>
              <button className="btn green" style={{ width: "100%", padding: "13px 18px", fontSize: 14 }} disabled={busy} onClick={() => void submit()}>
                {busy ? "Sending…" : w.address ? "⚔ Publish challenge" : "Sign in first"}
              </button>
            </>
          ) : (
            <>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <span style={{ display: "flex" }}>
                  <StockLogo symbol={sym} size={40} />
                  {kind === "duel" && (
                    <span style={{ marginLeft: -12 }}>
                      <StockLogo symbol={symB} size={40} />
                    </span>
                  )}
                </span>
                {price && (
                  <span>
                    <span className="label" style={{ display: "block" }}>current price</span>
                    <span className="num" style={{ fontSize: 16, fontWeight: 700 }}>${price.value.toFixed(2)}</span>
                  </span>
                )}
              </div>

              <p key={question} className="fade-in" style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.5, minHeight: 52 }}>
                {question}
              </p>

              <div className="muted" style={{ fontSize: 13, display: "grid", gap: 8 }}>
                <span><ClockIcon /> Betting closes: <span className="num" style={{ color: "var(--text)" }}>{fmtTime(closeTime)}</span></span>
                <span><ClockIcon /> Settles: <span className="num" style={{ color: "var(--text)" }}>{fmtTime(resolveTime)}</span></span>
                <span style={{ fontSize: 12 }}>1-hour anti-sniping gap between close and settle.</span>
              </div>

              <button className="btn green" style={{ width: "100%", padding: "13px 18px", fontSize: 14 }} disabled={busy} onClick={() => void submit()}>
                {busy ? "Sending…" : w.address ? "Create market" : "Sign in first"}
              </button>
            </>
          )}
          {err && <p className="err">{err}</p>}
        </div>
      </div>
    </main>
  );
}

