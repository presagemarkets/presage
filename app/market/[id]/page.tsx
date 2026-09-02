"use client";

import { use, useCallback, useEffect, useState } from "react";
import { encodeFunctionData } from "viem";
import { USDG } from "../../../src/chain.ts";
import { PRESAGE_ADDRESS, presageAbi, erc20Abi } from "../../../src/presage.ts";
import {
  browser,
  estimatePayout,
  fmtTime,
  fmtUSDG,
  impliedYes,
  parseUSDG,
  status,
  STATUS_LABEL,
  type Market,
} from "../../../src/markets.ts";
import { useWallet, friendly } from "../../wallet.ts";
import { Countdown } from "../../countdown.tsx";
import { tickerOf, tickersOf, ClockIcon, VolIcon } from "../../ui.tsx";
import { StockLogo } from "../../logo.tsx";
import { StockChart } from "../../chart.tsx";

interface NewsItem {
  title: string;
  link: string;
  date: string;
  source: string;
  image?: string;
}

function rulesFor(m: Market): { headline: string; bullets: string[] } {
  const q = m.question;
  const base = [
    "Betting closes 1 hour before settlement — the anti-sniping gap.",
    "Anyone can trigger settlement once the time is reached; the app also does it automatically.",
    "Winners split the losing pot in proportion to their stake, minus a 2% fee.",
    "If the market is canceled or one side is empty, everyone is refunded in full.",
  ];
  if (/above \$/.test(q))
    return {
      headline:
        "Resolves YES if the stock's 30-minute average on-chain price (TWAP, read from its own Uniswap pool) is strictly above the strike at settlement. Exactly at the strike resolves NO.",
      bullets: base,
    };
  if (/outperforms/.test(q))
    return {
      headline:
        "Compares each stock's price move (30-minute TWAP) from market creation to settlement. The stock with the higher move wins; a tie resolves to the second stock, as written in the question.",
      bullets: base,
    };
  return {
    headline:
      "Resolves YES if the stock's 30-minute average on-chain price (TWAP) at settlement is above its level when the market was created — read from the stock's own Uniswap pool, no judges.",
    bullets: base,
  };
}

export default function MarketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const marketId = BigInt(id);
  const w = useWallet();

  const [m, setM] = useState<Market | null>(null);
  const [stake, setStake] = useState<[bigint, bigint]>([0n, 0n]);
  const [claimed, setClaimed] = useState(false);
  const [side, setSide] = useState<0 | 1>(1);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [news, setNews] = useState<NewsItem[]>([]);

  const load = useCallback(async () => {
    const client = browser();
    const [resolver, closeTime, resolveTime, resolved, canceled, winner, poolNo, poolYes, question] =
      await client.readContract({ address: PRESAGE_ADDRESS, abi: presageAbi, functionName: "getMarket", args: [marketId] });
    setM({
      id: Number(marketId),
      resolver,
      closeTime: Number(closeTime),
      resolveTime: Number(resolveTime),
      resolved,
      canceled,
      winner,
      poolNo,
      poolYes,
      question,
    });
    if (w.address) {
      const [s0, s1, cl] = await client.multicall({
        contracts: [
          { address: PRESAGE_ADDRESS, abi: presageAbi, functionName: "stakes", args: [marketId, w.address, 0n] },
          { address: PRESAGE_ADDRESS, abi: presageAbi, functionName: "stakes", args: [marketId, w.address, 1n] },
          { address: PRESAGE_ADDRESS, abi: presageAbi, functionName: "claimed", args: [marketId, w.address] },
        ],
        allowFailure: false,
      });
      setStake([s0, s1]);
      setClaimed(cl);
    }
  }, [marketId, w.address]);

  useEffect(() => {
    void load().catch(() => setNote({ ok: false, text: "Couldn't read the chain." }));
    const t = setInterval(() => void load().catch(() => {}), 10_000);
    return () => clearInterval(t);
  }, [load]);

  const ticker = m ? tickerOf(m.question) : null;
  useEffect(() => {
    if (!ticker) return;
    void fetch(`/api/news?symbol=${ticker}`)
      .then((r) => r.json())
      .then((d: { items?: NewsItem[] }) => setNews(d.items ?? []))
      .catch(() => {});
  }, [ticker]);

  const run = useCallback(
    async (label: string, fn: () => Promise<void>) => {
      setBusy(label);
      setNote(null);
      try {
        await fn();
        setNote({ ok: true, text: "Transaction sent. Numbers update in a few seconds." });
        setTimeout(() => void load().catch(() => {}), 2500);
      } catch (e) {
        setNote({ ok: false, text: friendly(e) });
      } finally {
        setBusy(null);
      }
    },
    [load]
  );

  const placeBet = () => {
    const amt = parseUSDG(amount);
    if (!amt) {
      setNote({ ok: false, text: "Enter a USDG amount first." });
      return;
    }
    void run("bet", async () => {
      if (!w.address) throw new Error("Connect a wallet first");
      const client = browser();
      const allowance = await client.readContract({
        address: USDG,
        abi: erc20Abi,
        functionName: "allowance",
        args: [w.address, PRESAGE_ADDRESS],
      });
      if (allowance < amt) {
        await w.send({
          to: USDG,
          data: encodeFunctionData({ abi: erc20Abi, functionName: "approve", args: [PRESAGE_ADDRESS, 2n ** 256n - 1n] }),
        });
      }
      await w.send({
        to: PRESAGE_ADDRESS,
        data: encodeFunctionData({ abi: presageAbi, functionName: "bet", args: [marketId, side, amt] }),
      });
    });
  };

  if (!m) return <p className="muted">Loading market…</p>;

  const st = status(m);
  const yes = impliedYes(m);
  const pct = yes === null ? null : Math.round(yes * 100);
  const amt = parseUSDG(amount) ?? 0n;
  const myTotal = stake[0] + stake[1];
  const rules = rulesFor(m);
  const tickers = tickersOf(m.question);

  const winPoolEmpty = m.resolved && (m.winner === 1 ? m.poolYes : m.poolNo) === 0n;
  const refund = m.canceled || winPoolEmpty;
  const winStake = m.resolved ? stake[m.winner as 0 | 1] : 0n;
  const claimable = !claimed && (refund ? myTotal > 0n : m.resolved && winStake > 0n);

  return (
    <main>
      {/* ---- header: logos + status on top, then a full-width title so long
             questions wrap cleanly instead of squeezing into a tall column ---- */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={{ display: "flex", flexShrink: 0 }}>
            <StockLogo symbol={tickers[0] ?? null} size={44} />
            {tickers[1] && (
              <span style={{ marginLeft: -13 }}>
                <StockLogo symbol={tickers[1]} size={44} />
              </span>
            )}
          </span>
          <span className={`chip ${st}`} style={{ flexShrink: 0, whiteSpace: "nowrap" }}>{STATUS_LABEL[st]}</span>
        </div>
        <h1 style={{ fontSize: "clamp(19px, 4.8vw, 24px)", lineHeight: 1.25, letterSpacing: "-0.01em", textWrap: "balance" }}>
          {m.question}
        </h1>
        <p className="muted num" style={{ fontSize: 13, marginTop: 8, display: "flex", alignItems: "center", flexWrap: "wrap", gap: 4 }}>
          <VolIcon /> {fmtUSDG(m.poolYes + m.poolNo)} USDG vol · <ClockIcon />{" "}
          <Countdown until={st === "open" ? m.closeTime : m.resolveTime} />
        </p>
      </div>

      <div className="detail-grid">
      {/* ---- main column ---- */}
      <div style={{ display: "grid", gap: 18, alignContent: "start" }}>
        <div className="glow-card">
          <p style={{ marginBottom: 12 }}>
            {m.resolved && !m.canceled ? (
              <span className="num" style={{ fontSize: 24, fontWeight: 700 }}>
                Result: {m.winner === 1 ? "YES" : "NO"}
              </span>
            ) : (
              <>
                <span className="num" style={{ fontSize: 24, fontWeight: 700 }}>{pct === null ? "—" : `${pct}%`}</span>{" "}
                <span className="muted" style={{ fontSize: 13 }}>chance of YES</span>
              </>
            )}
          </p>

          {ticker ? <StockChart symbol={ticker} /> : <p className="muted" style={{ fontSize: 13 }}>No chart for this market.</p>}
        </div>

        {/* ---- Kalshi-style Chance: one row per side, click = pick a betting side ---- */}
        <div className="glow-card">
          <h2 style={{ fontSize: 16, marginBottom: 14 }}>Chance</h2>
          {([1, 0] as const).map((s) => {
            const p = pct === null ? null : s === 1 ? pct : 100 - pct;
            const color = s === 1 ? "#4ade80" : "#f87171";
            const won = m.resolved && !m.canceled && m.winner === s;
            const selected = st === "open" && side === s;
            return (
              <button
                key={s}
                onClick={() => st === "open" && setSide(s)}
                disabled={st !== "open"}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  width: "100%",
                  padding: "13px 14px",
                  marginBottom: s === 1 ? 8 : 0,
                  background: selected ? "rgba(74,222,128,0.06)" : "transparent",
                  border: `1px solid ${selected ? "rgba(74,222,128,0.35)" : "var(--border)"}`,
                  borderRadius: 12,
                  cursor: st === "open" ? "pointer" : "default",
                  font: "inherit",
                  color: "inherit",
                  textAlign: "left",
                  transition: "border-color 160ms ease, background 160ms ease",
                }}
              >
                <span style={{ width: 64, fontWeight: 700, fontSize: 14, color }}>
                  {s === 1 ? "▲ YES" : "▼ NO"}
                </span>
                <span style={{ flex: 1, height: 6, borderRadius: 999, background: "var(--border)", overflow: "hidden" }}>
                  <span
                    style={{
                      display: "block",
                      height: "100%",
                      width: `${p ?? 0}%`,
                      background: color,
                      borderRadius: "inherit",
                      transition: "width 600ms var(--ease-in-out)",
                    }}
                  />
                </span>
                <span className="num" style={{ width: 48, textAlign: "right", fontWeight: 700, fontSize: 15, color }}>
                  {p === null ? "—" : `${p}%`}
                </span>
                <span className="num muted" style={{ width: 110, textAlign: "right", fontSize: 12 }}>
                  {fmtUSDG(s === 1 ? m.poolYes : m.poolNo)} USDG
                </span>
                {won && <span className="chip" style={{ color, borderColor: color }}>winner</span>}
              </button>
            );
          })}
          {pct === null && (
            <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>No bets yet — be the first to set the odds.</p>
          )}
        </div>

        <div className="glow-card">
          <h2 style={{ fontSize: 16, marginBottom: 10 }}>Market rules</h2>
          <p style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 12 }}>{rules.headline}</p>
          <ul className="muted" style={{ fontSize: 13, lineHeight: 1.7, paddingLeft: 18 }}>
            {rules.bullets.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
          <p className="muted num" style={{ fontSize: 12, marginTop: 12 }}>
            Betting closes {fmtTime(m.closeTime)} · settles {fmtTime(m.resolveTime)}
          </p>
        </div>

        {news.length > 0 && (
          <div className="glow-card">
            <h2 style={{ fontSize: 16, marginBottom: 4 }}>Latest news · {ticker}</h2>
            <div>
              {news.map((n, i) => (
                <a
                  key={n.link}
                  href={n.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex",
                    gap: 14,
                    alignItems: "center",
                    padding: "14px 0",
                    borderBottom: i < news.length - 1 ? "1px solid var(--border)" : "none",
                  }}
                >
                  {n.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={n.image}
                      alt=""
                      width={76}
                      height={56}
                      style={{ borderRadius: 10, objectFit: "cover", flexShrink: 0, background: "#111" }}
                      onError={(e) => (e.currentTarget.style.display = "none")}
                    />
                  )}
                  <span style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 14, lineHeight: 1.45 }}>{n.title}</p>
                    <p className="muted" style={{ fontSize: 12, marginTop: 3 }}>
                      {n.source}{n.date ? ` · ${new Date(n.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}
                    </p>
                  </span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ---- betting column ---- */}
      <aside style={{ display: "grid", gap: 16, alignContent: "start", position: "sticky", top: 20 }}>
        {st === "open" && (
          <div className="glow-card green" style={{ display: "grid", gap: 14 }}>
            <p style={{ fontSize: 15, fontWeight: 700 }}>Place your bet</p>
            <div style={{ display: "flex", gap: 8 }}>
              <button className={`btn ${side === 1 ? "green" : "ghost"}`} style={{ flex: 1 }} onClick={() => setSide(1)}>
                ▲ YES {pct !== null ? `${pct}%` : ""}
              </button>
              <button className={`btn ${side === 0 ? "green" : "ghost"}`} style={{ flex: 1 }} onClick={() => setSide(0)}>
                ▼ NO {pct !== null ? `${100 - pct}%` : ""}
              </button>
            </div>
            <input
              className="input"
              inputMode="decimal"
              placeholder="Amount in USDG"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <div className="muted num" style={{ fontSize: 13, display: "grid", gap: 6 }}>
              <span style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Current pot</span>
                <span>{fmtUSDG(side === 1 ? m.poolYes : m.poolNo)} vs {fmtUSDG(side === 1 ? m.poolNo : m.poolYes)} USDG</span>
              </span>
              <span style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Est. payout if {side === 1 ? "YES" : "NO"} wins</span>
                <span style={{ color: "#4ade80", fontWeight: 600 }}>
                  {amt > 0n ? `${fmtUSDG(estimatePayout(m, side, amt))} USDG` : "—"}
                </span>
              </span>
            </div>
            <button className="btn green" style={{ width: "100%", padding: "13px 18px", fontSize: 14 }} disabled={busy !== null} onClick={placeBet}>
              {busy === "bet" ? "Sending…" : `Bet ${side === 1 ? "YES" : "NO"}`}
            </button>
            <p className="muted" style={{ fontSize: 11, lineHeight: 1.5 }}>
              Pots keep moving until betting closes — the payout estimate is not locked in.
            </p>
          </div>
        )}

        {st === "resolvable" && (
          <div className="glow-card" style={{ display: "grid", gap: 12 }}>
            <p className="muted" style={{ fontSize: 13 }}>Time&apos;s up — anyone can settle this market.</p>
            <button
              className="btn green"
              disabled={busy !== null}
              onClick={() =>
                void run("resolve", async () => {
                  await w.send({
                    to: PRESAGE_ADDRESS,
                    data: encodeFunctionData({ abi: presageAbi, functionName: "resolve", args: [marketId] }),
                  });
                })
              }
            >
              {busy === "resolve" ? "Sending…" : "Resolve now"}
            </button>
          </div>
        )}

        {w.address && myTotal > 0n && (
          <div className="glow-card" style={{ display: "grid", gap: 10 }}>
            <p style={{ fontSize: 14, fontWeight: 700 }}>Your position</p>
            <p className="muted num" style={{ fontSize: 13 }}>
              YES {fmtUSDG(stake[1])} · NO {fmtUSDG(stake[0])} USDG
              {claimed && " · already claimed"}
            </p>
            {claimable && (
              <button
                className="btn green"
                disabled={busy !== null}
                onClick={() =>
                  void run("claim", async () => {
                    await w.send({
                      to: PRESAGE_ADDRESS,
                      data: encodeFunctionData({ abi: presageAbi, functionName: "claim", args: [marketId] }),
                    });
                  })
                }
              >
                {busy === "claim" ? "Sending…" : refund ? "Take refund" : "Claim winnings"}
              </button>
            )}
          </div>
        )}

        {note && <p className={note.ok ? "ok" : "err"}>{note.text}</p>}
        {w.error && <p className="err">{w.error}</p>}
      </aside>
      </div>
    </main>
  );
}
