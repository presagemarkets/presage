import Link from "next/link";
import { fmtUSDG, impliedYes, status, STATUS_LABEL, type Market } from "../src/markets.ts";
import { STOCKS } from "../src/stocks.ts";
import { Countdown } from "./countdown.tsx";
import { StockLogo } from "./logo.tsx";
import { Avatar, nameOf } from "./avatar.tsx";

/** All stock symbols mentioned in the question, in order of appearance. */
export function tickersOf(question: string): string[] {
  return STOCKS.filter((s) => new RegExp(`\\b${s.symbol}\\b`).test(question))
    .map((s) => s.symbol)
    .sort((a, b) => question.indexOf(a) - question.indexOf(b));
}

export const tickerOf = (q: string): string | null => tickersOf(q)[0] ?? null;

export function ClockIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden style={{ verticalAlign: "-2px" }}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  );
}

export function VolIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden style={{ verticalAlign: "-2px" }}>
      <path d="M4 19V10M10 19V5M16 19v-6M22 19H2" />
    </svg>
  );
}

export function MarketCard({ m, creator, auto }: { m: Market; creator?: `0x${string}`; auto?: boolean }) {
  const st = status(m);
  const yes = impliedYes(m);
  const pct = yes === null ? null : Math.round(yes * 100);
  const tickers = tickersOf(m.question);
  const total = m.poolYes + m.poolNo;

  return (
    <Link href={`/market/${m.id}`} className="glow-card mcard">
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 18 }}>
        <span style={{ display: "flex", flexShrink: 0 }}>
          <StockLogo symbol={tickers[0] ?? null} />
          {tickers[1] && (
            <span style={{ marginLeft: -14 }}>
              <StockLogo symbol={tickers[1]} />
            </span>
          )}
        </span>
        <p className="mcard-q">{m.question}</p>
        <span style={{ textAlign: "right", flexShrink: 0 }}>
          {m.resolved && !m.canceled ? (
            <>
              <span className="num" style={{ fontSize: 24, fontWeight: 700, display: "block" }}>
                {m.winner === 1 ? "YES" : "NO"}
              </span>
              <span className="label">result</span>
            </>
          ) : pct !== null ? (
            <>
              <span className="num" style={{ fontSize: 24, fontWeight: 700, display: "block" }}>
                {pct}%
              </span>
              <span className="label">yes</span>
            </>
          ) : (
            <>
              <span className="num muted" style={{ fontSize: 24, fontWeight: 700, display: "block" }}>
                —
              </span>
              <span className="label">no bets</span>
            </>
          )}
        </span>
      </div>

      <div className="bar" style={{ marginBottom: 14 }}>
        <div style={{ width: `${pct ?? 0}%` }} />
      </div>

      {auto ? (
        <p className="label" style={{ marginBottom: 12, color: "#4ade80" }}>⚙ auto round · settles at U.S. market close</p>
      ) : creator ? (
        <p className="muted num" style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, marginBottom: 12 }}>
          <Avatar address={creator} size={16} />
          <span>by {nameOf(creator)}</span>
          <span style={{ fontFamily: "ui-monospace, monospace", color: "var(--faint)" }}>
            {creator.slice(0, 6)}…{creator.slice(-4)}
          </span>
        </p>
      ) : null}

      <div style={{ display: "flex", gap: 16, fontSize: 12, alignItems: "center" }} className="muted mcard-foot">
        <span className={`chip ${st}`}>{STATUS_LABEL[st]}</span>
        <span style={{ flex: 1 }} />
        <span className="num">
          <VolIcon /> {fmtUSDG(total)} USDG
        </span>
        {st === "open" && (
          <span className="num" style={{ color: "var(--text)" }}>
            <ClockIcon /> <Countdown until={m.closeTime} />
          </span>
        )}
      </div>
    </Link>
  );
}

/** Compact open-challenge teaser for the markets page — deep-links to that duel. */
export function DuelCard({ id, creator, symbol, stake, days }: { id: number; creator: string; symbol: string; stake: bigint; days: number }) {
  return (
    <Link href={`/showdown/${id}`} className="glow-card" style={{ display: "block" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, minWidth: 0 }}>
        <Avatar address={creator} size={26} />
        <span style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>{nameOf(creator)}</span>
        <span className="muted" style={{ fontSize: 12, whiteSpace: "nowrap" }}>fights with</span>
        <StockLogo symbol={symbol === "?" ? null : symbol} size={26} />
        <strong style={{ fontSize: 14 }}>{symbol}</strong>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <span className="num" style={{ fontSize: 20, fontWeight: 700 }}>${fmtUSDG(stake)}</span>
        <span className="muted" style={{ fontSize: 12 }}>each · {days}D window</span>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: "#4ade80" }}>Accept →</span>
      </div>
    </Link>
  );
}

/**
 * Top banner slot — flat black, awaiting a banner design from the user
 * (later, put the image in /public and replace this component's contents).
 */
export function Banner() {
  return (
    <div style={{ borderRadius: 18, overflow: "hidden", border: "1px solid var(--border)", marginBottom: 32, lineHeight: 0 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/banner.png" alt="Presage — foresee the market. Let the chain settle it." style={{ width: "100%", height: "auto", display: "block" }} />
    </div>
  );
}

