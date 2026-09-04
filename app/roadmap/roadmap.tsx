"use client";

// Standalone Roadmap page — its own full-bleed page + nav, same phased-timeline
// design as the roadmap artifact. Kept separate from the technical docs.

import { useEffect } from "react";

const APP = "https://app.presagemarkets.org";

type Status = "ship" | "prog" | "plan" | "expl";
const STATUS_LABEL: Record<Status, string> = { ship: "Shipped", prog: "In progress", plan: "Planned", expl: "Exploring" };

const ROADMAP: {
  tag: string;
  future?: boolean;
  head: [string, string];
  sub: string;
  feats: { t: string; d: string; s: Status }[];
}[] = [
  {
    tag: "Phase 01 · Done",
    head: ["The ", "protocol"],
    sub: "The on-chain foundation — the part that can never lie, freeze, or be argued with.",
    feats: [
      { t: "Parimutuel core (HoodBet)", d: "One vault escrows every stake, tracks each side, and settles claims. Odds move with the crowd — no house book.", s: "ship" },
      { t: "30-minute TWAP settlement", d: "Every market reads the stock's own Uniswap v3 price — a time-weighted average immune to last-second manipulation.", s: "ship" },
      { t: "Three market templates", d: "Up / down, over / under, and stock duel — all permissionless, all self-resolving.", s: "ship" },
      { t: "Showdown duels (StockDuel)", d: "A separate 1v1 escrow: champion stock vs. rival, winner takes the pot.", s: "ship" },
      { t: "Deployed on Robinhood Chain", d: "Five contracts live on EVM 4663, settled in USDG, with an anti-manipulation cardinality & lock-gap guard.", s: "ship" },
    ],
  },
  {
    tag: "Phase 02 · Done",
    head: ["The ", "app"],
    sub: "A venue built around the protocol — everything you need to read, wager, and track, in one place.",
    feats: [
      { t: "Markets & live betting", d: "Browse markets, open a detail view with chart, news and chance bars, and place a bet in one click.", s: "ship" },
      { t: "Showdown arena", d: "Create, accept and settle 1v1 duels with a full head-to-head UI.", s: "ship" },
      { t: "Stock swap", d: "Trade USDG and tokenized stocks on the same pools that settle the markets — live mid-price, slippage-guarded.", s: "ship" },
      { t: "Leaderboard, live stats & profiles", d: "Every bet, win and dollar of P&L read straight from the chain, with deterministic identities and avatars.", s: "ship" },
      { t: "Daily rounds", d: "Fresh markets appear every session and settle at U.S. market close, so there's always something live.", s: "ship" },
      { t: "Bettors list & wallet key export", d: "See who's on each side of a market, and export your embedded-wallet key any time.", s: "ship" },
      { t: "Landing, docs & one-tap sign-in", d: "A marketing home, a full technical docs site, and Privy sign-in that mints a wallet from a Google login.", s: "ship" },
    ],
  },
  {
    tag: "Phase 03 · Now building",
    head: ["Depth & ", "reliability"],
    sub: "Make the venue faster, stickier, and hands-off — the polish that turns a launch into a habit.",
    feats: [
      { t: "Automated resolution", d: "A keeper that settles every market and duel the moment its window closes — no one has to trigger it.", s: "prog" },
      { t: "On-chain names & synced profiles", d: "Publish a portable handle through ProfileRegistry and carry your photo across devices.", s: "prog" },
      { t: "Faster reads & caching", d: "Cache on-chain data so pages open instantly, not after a network round-trip.", s: "prog" },
      { t: "Notifications", d: "Get pinged when your market closes, your duel is accepted, or your winnings are claimable.", s: "plan" },
      { t: "Referrals & invites", d: "Bring a friend, share a fee cut — growth that pays the people who drive it.", s: "plan" },
      { t: "More market shapes", d: "Range and milestone markets on top of up/down, over/under and duel.", s: "plan" },
    ],
  },
  {
    tag: "Phase 04 · Horizon",
    future: true,
    head: ["Beyond ", "stocks"],
    sub: "Where Presage goes once the core is humming — new markets, new rails, real ownership.",
    feats: [
      { t: "New asset classes", d: "Indices, crypto and commodities — anything with a deep on-chain pool becomes a market.", s: "plan" },
      { t: "Rewards & hold-to-earn", d: "Liquidity incentives and buyback rewards that pay the most active traders.", s: "expl" },
      { t: "Token utility & governance", d: "Put the community in charge of fees, listings and the treasury.", s: "expl" },
      { t: "Public API & SDK", d: "Let anyone spin up markets on Presage rails from their own app.", s: "expl" },
      { t: "Seasons, tournaments & a mobile app", d: "Competitive ladders with prize pools, and a native app for calling the market on the go.", s: "expl" },
    ],
  },
];

export function Roadmap() {
  useEffect(() => {
    const els = document.querySelectorAll(".rm-rv");
    if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      els.forEach((e) => e.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && (e.target.classList.add("in"), io.unobserve(e.target))),
      { threshold: 0.12, rootMargin: "-40px" }
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);

  return (
    <div className="docs">
      <nav className="docs-nav">
        <a href="/" className="brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" width={22} height={22} />
          PRESAGE <small>ROADMAP</small>
        </a>
        <span style={{ flex: 1 }} />
        <a href="/docs" className="dn-link">Docs</a>
        <a href={`${APP}/markets`} className="dn-cta">Open market ↗</a>
      </nav>

      <div className="rm-wrap">
        <header className="docs-hero">
          <span className="eyebrow">Product roadmap</span>
          <h1>The road <b>ahead</b></h1>
          <p className="lead">
            Presage is live: self-settling prediction markets and 1v1 duels on tokenized stocks, on Robinhood Chain.
            Here&apos;s everything that&apos;s shipped — and everything we&apos;re building next.
          </p>
          <div className="rm-statband">
            <div className="rm-stat"><div className="n g">28</div><div className="l">Features shipped</div></div>
            <div className="rm-stat"><div className="n">5</div><div className="l">Contracts live</div></div>
            <div className="rm-stat"><div className="n">4</div><div className="l">Phases</div></div>
            <div className="rm-stat"><div className="n">2%</div><div className="l">Flat fee, forever</div></div>
          </div>
          <div className="rm-legend">
            <span className="rm-lg"><span className="rm-dot ship" /> Shipped</span>
            <span className="rm-lg"><span className="rm-dot prog" /> In progress</span>
            <span className="rm-lg"><span className="rm-dot plan" /> Planned</span>
            <span className="rm-lg"><span className="rm-dot expl" /> Exploring</span>
          </div>
        </header>

        <div className="rm-timeline">
          {ROADMAP.map((p, i) => (
            <div key={i} className={`rm-phase rm-rv${p.future ? " future" : ""}`}>
              <div className={`rm-node${p.future ? " future" : ""}`}><i /></div>
              <div className="rm-ptag">{p.tag}</div>
              <div className="rm-h">{p.head[0]}<b>{p.head[1]}</b></div>
              <div className="rm-sub">{p.sub}</div>
              <div className="rm-card">
                {p.feats.map((f, j) => (
                  <div key={j} className="rm-feat">
                    <span className="mk"><span className={`rm-dot ${f.s}`} /></span>
                    <span className="bd">
                      <span className="t" style={{ display: "block" }}>{f.t}</span>
                      <span className="d" style={{ display: "block" }}>{f.d}</span>
                    </span>
                    <span className={`rm-chip ${f.s}`}>{STATUS_LABEL[f.s]}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <footer className="docs-foot" style={{ padding: "38px 0 70px" }}>
          <span>© 2026 PresageMarkets · directional, not a commitment</span>
          <span style={{ display: "flex", gap: 18 }}>
            <a href="/docs">Docs</a>
            <a href={APP}>App</a>
            <a href="https://x.com/PresageMarket" target="_blank" rel="noopener noreferrer">X</a>
          </span>
        </footer>
      </div>
    </div>
  );
}
