"use client";

// Presage technical docs — docs.presagemarkets.org. Full-bleed, its own chrome,
// same monochrome + green identity as the landing. Prose + hand-drawn SVG
// diagrams of the on-chain mechanisms (parimutuel, TWAP, lifecycle, duels).

import { useEffect, useState } from "react";
import { Socials } from "../socials.tsx";

const APP = "https://app.presagemarkets.org";

const TOC: { group: string; items: { id: string; label: string }[] }[] = [
  {
    group: "Start",
    items: [
      { id: "overview", label: "Overview" },
      { id: "architecture", label: "Architecture" },
    ],
  },
  {
    group: "Mechanics",
    items: [
      { id: "parimutuel", label: "Parimutuel pools" },
      { id: "templates", label: "Market templates" },
      { id: "twap", label: "TWAP resolution" },
      { id: "lifecycle", label: "Market lifecycle" },
      { id: "integrity", label: "Anti-manipulation" },
    ],
  },
  {
    group: "Games",
    items: [
      { id: "showdown", label: "Showdown 1v1" },
      { id: "rounds", label: "Daily rounds" },
    ],
  },
  {
    group: "Protocol",
    items: [
      { id: "fees", label: "Fees & payout" },
      { id: "identity", label: "On-chain identity" },
      { id: "reference", label: "Reference" },
    ],
  },
];

const CONTRACTS = [
  ["HoodBet", "Parimutuel escrow + accounting", "0xfcfbb9365ffb00d153ba73162c178916855f8b3b"],
  ["TwapResolver", "Automated price templates", "0x9249c9EeDdd5188eaC6E86c804a1255249F1CEc3"],
  ["StockDuel", "1v1 Showdown duels", "0x646c1bf51d20ce0d794fbaebdb9bc17a110c9d9f"],
  ["AdminResolver", "Manual resolution fallback", "0x6fc7dbbd27039d77f4f22d10e67938e4bddb4d31"],
  ["ProfileRegistry", "Optional on-chain names", "0x47c9908766ef11f69caf120134f6e9c6ab23201b"],
];

const CONSTANTS = [
  ["TWAP_WINDOW", "30 minutes", "Averaging window for every price read"],
  ["LOCK_GAP", "1 hour", "Minimum gap between betting close and resolution"],
  ["FEE_BPS", "200 (2%)", "House fee — losing pot (markets) / whole pot (duels)"],
  ["MIN_CARDINALITY", "100", "Minimum pool observation history to be tradable"],
  ["MIN_DURATION / MAX_DURATION", "1 hour / 30 days", "Showdown duel length bounds"],
];

/* ---------------- diagrams ---------------- */

function ArchDiagram() {
  return (
    <div className="diagram">
      <svg viewBox="0 0 720 372" role="img" aria-label="Contract architecture">
        {/* user */}
        <rect className="dg-box accent" x="290" y="14" width="140" height="42" rx="9" />
        <text className="dg-t" x="360" y="35" fontSize="13" textAnchor="middle">Trader (EOA)</text>
        <text className="dg-t dim" x="360" y="49" fontSize="10.5" textAnchor="middle">signs USDG bets</text>

        {/* entry layer */}
        <rect className="dg-box" x="70" y="108" width="170" height="52" rx="9" />
        <text className="dg-t" x="155" y="130" fontSize="13" textAnchor="middle">TwapResolver</text>
        <text className="dg-t dim" x="155" y="147" fontSize="10.5" textAnchor="middle">up/down · over/under · duel</text>

        <rect className="dg-box" x="275" y="108" width="170" height="52" rx="9" />
        <text className="dg-t" x="360" y="130" fontSize="13" textAnchor="middle">StockDuel</text>
        <text className="dg-t dim" x="360" y="147" fontSize="10.5" textAnchor="middle">1v1 Showdown escrow</text>

        <rect className="dg-box" x="480" y="108" width="170" height="52" rx="9" />
        <text className="dg-t" x="565" y="130" fontSize="13" textAnchor="middle">AdminResolver</text>
        <text className="dg-t dim" x="565" y="147" fontSize="10.5" textAnchor="middle">manual fallback</text>

        {/* core */}
        <rect className="dg-box accent" x="180" y="214" width="360" height="56" rx="10" />
        <text className="dg-t" x="360" y="238" fontSize="14" textAnchor="middle">HoodBet — parimutuel core</text>
        <text className="dg-t dim" x="360" y="256" fontSize="10.5" textAnchor="middle">holds every pool + stake · pays fee to owner · settles claims</text>

        {/* pools */}
        <rect className="dg-box" x="150" y="316" width="230" height="44" rx="9" />
        <text className="dg-t" x="265" y="338" fontSize="12.5" textAnchor="middle">Uniswap v3 stock/USDG pools</text>
        <text className="dg-t dim" x="265" y="353" fontSize="10" textAnchor="middle">30-min TWAP = the oracle</text>

        <rect className="dg-box" x="410" y="316" width="160" height="44" rx="9" />
        <text className="dg-t" x="490" y="338" fontSize="12.5" textAnchor="middle">Owner / treasury</text>
        <text className="dg-t dim" x="490" y="353" fontSize="10" textAnchor="middle">receives 2% fee</text>

        {/* arrows */}
        <g strokeWidth="1.4">
          <path className="dg-line" d="M330 56 L170 106" markerEnd="url(#ar)" />
          <path className="dg-line" d="M360 56 L360 106" markerEnd="url(#ar)" />
          <path className="dg-line" d="M392 56 L560 106" markerEnd="url(#ar)" />
          <path className="dg-line grn" d="M170 160 L300 212" markerEnd="url(#arg)" />
          <path className="dg-line grn" d="M360 160 L360 212" markerEnd="url(#arg)" />
          <path className="dg-line" d="M560 160 L430 212" markerEnd="url(#ar)" />
          <path className="dg-line dash" d="M300 270 L270 314" markerEnd="url(#ar)" />
          <path className="dg-line dash" d="M440 270 L480 314" markerEnd="url(#ar)" />
        </g>
        <defs>
          <marker id="ar" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto"><path d="M0 0L6 3.5L0 7z" fill="#2e2e2e" /></marker>
          <marker id="arg" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto"><path d="M0 0L6 3.5L0 7z" fill="#22c55e" /></marker>
        </defs>
      </svg>
      <p className="dg-cap">Traders touch the resolvers; only HoodBet holds funds. Prices come from the same pools you can swap on.</p>
    </div>
  );
}

function ParimutuelDiagram() {
  return (
    <div className="diagram">
      <svg viewBox="0 0 720 300" role="img" aria-label="Parimutuel payout">
        {/* pools */}
        <text className="dg-t dim" x="60" y="30" fontSize="11">POOLS AT CLOSE</text>
        <rect className="dg-box accent" x="60" y="42" width="300" height="40" rx="7" />
        <text className="dg-t grn" x="74" y="67" fontSize="13">YES  $600</text>
        <rect className="dg-box warn" x="60" y="92" width="200" height="40" rx="7" />
        <text className="dg-t red" x="74" y="117" fontSize="13">NO  $400</text>

        {/* resolve */}
        <path className="dg-line grn" d="M370 92 L430 92" strokeWidth="1.5" markerEnd="url(#arg2)" />
        <text className="dg-t grn" x="400" y="84" fontSize="10.5" textAnchor="middle">YES wins</text>

        {/* distribution */}
        <text className="dg-t dim" x="452" y="30" fontSize="11">LOSING POT $400 SPLITS</text>
        <rect className="dg-box" x="452" y="42" width="30" height="40" rx="6" />
        <text className="dg-t" x="467" y="67" fontSize="11" textAnchor="middle">2%</text>
        <text className="dg-t dim" x="467" y="98" fontSize="9.5" textAnchor="middle">fee</text>
        <text className="dg-t dim" x="467" y="110" fontSize="9.5" textAnchor="middle">$8</text>

        <rect className="dg-box accent" x="490" y="42" width="180" height="40" rx="6" />
        <text className="dg-t grn" x="580" y="67" fontSize="12" textAnchor="middle">$392 → YES bettors</text>
        <text className="dg-t dim" x="580" y="100" fontSize="9.5" textAnchor="middle">pro-rata to stake, plus their own stake back</text>

        {/* winner formula */}
        <line className="dg-line" x1="60" y1="176" x2="660" y2="176" strokeDasharray="3 4" />
        <text className="dg-t dim" x="60" y="204" fontSize="12">A $150 YES bet (25% of the YES pool) collects:</text>
        <text className="dg-t mono" x="60" y="234" fontSize="13">$150  +  $392 × (150 / 600)  =  $248</text>
        <text className="dg-t dim" x="60" y="262" fontSize="11.5">Odds are just the pool ratio — no house book, no counterparty.</text>
        <defs>
          <marker id="arg2" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto"><path d="M0 0L6 3.5L0 7z" fill="#22c55e" /></marker>
        </defs>
      </svg>
      <p className="dg-cap">Parimutuel: the losing side funds the winners. Empty side ⇒ everyone is refunded in full.</p>
    </div>
  );
}

function TwapDiagram() {
  // jagged spot path vs flat average
  return (
    <div className="diagram">
      <svg viewBox="0 0 720 260" role="img" aria-label="30-minute TWAP">
        {/* axes */}
        <line className="dg-line" x1="60" y1="30" x2="60" y2="196" />
        <line className="dg-line" x1="60" y1="196" x2="680" y2="196" />
        <text className="dg-t dim" x="30" y="40" fontSize="10">price</text>
        <text className="dg-t dim" x="640" y="214" fontSize="10">time</text>

        {/* window highlight */}
        <rect x="430" y="30" width="250" height="166" fill="rgba(34,197,94,0.06)" />
        <text className="dg-t grn" x="555" y="24" fontSize="10.5" textAnchor="middle">30-min window</text>

        {/* spot line */}
        <path className="dg-line" strokeWidth="1.4" d="M60 150 L110 120 L150 165 L200 90 L250 140 L300 70 L350 130 L400 100 L440 155 L480 60 L520 175 L560 95 L600 150 L640 110" />
        {/* twap flat */}
        <line className="dg-line grn" strokeWidth="2" x1="430" y1="120" x2="680" y2="120" />
        <text className="dg-t grn" x="694" y="124" fontSize="11" textAnchor="end">TWAP</text>

        {/* sample points */}
        <circle cx="430" cy="120" r="3.5" fill="#22c55e" />
        <circle cx="680" cy="120" r="3.5" fill="#22c55e" />
        <text className="dg-t dim" x="430" y="188" fontSize="9.5" textAnchor="middle">t − 1800s</text>
        <text className="dg-t dim" x="680" y="188" fontSize="9.5" textAnchor="middle">t</text>

        <text className="dg-t mono" x="60" y="238" fontSize="12.5">avgTick = (tickCumulative[t] − tickCumulative[t−1800]) / 1800</text>
      </svg>
      <p className="dg-cap">Resolution reads a time-weighted average, never the last trade — a one-block spike can&apos;t move it.</p>
    </div>
  );
}

function LifecycleDiagram() {
  const S = ({ x, label, sub, cls = "dg-box" }: { x: number; label: string; sub: string; cls?: string }) => (
    <g>
      <rect className={cls} x={x} y={70} width={116} height={54} rx={9} />
      <text className="dg-t" x={x + 58} y={94} fontSize="12.5" textAnchor="middle">{label}</text>
      <text className="dg-t dim" x={x + 58} y={110} fontSize="9.5" textAnchor="middle">{sub}</text>
    </g>
  );
  return (
    <div className="diagram">
      <svg viewBox="0 0 720 220" role="img" aria-label="Market lifecycle">
        <S x={16} label="Created" sub="template + deadlines" />
        <S x={168} label="Open" sub="bet either side" cls="dg-box accent" />
        <S x={320} label="Locked" sub="1h gap · no bets" />
        <S x={472} label="Resolved" sub="anyone calls resolve()" />
        <S x={604} label="Claim" sub="winners withdraw" cls="dg-box accent" />
        <g strokeWidth="1.4">
          <path className="dg-line" d="M132 97 L166 97" markerEnd="url(#arl)" />
          <path className="dg-line" d="M284 97 L318 97" markerEnd="url(#arl)" />
          <path className="dg-line" d="M436 97 L470 97" markerEnd="url(#arl)" />
          <path className="dg-line grn" d="M588 97 L602 97" markerEnd="url(#arlg)" />
        </g>
        <text className="dg-t dim" x="226" y="60" fontSize="9.5" textAnchor="middle">closeTime</text>
        <text className="dg-t dim" x="530" y="60" fontSize="9.5" textAnchor="middle">resolveTime</text>
        {/* cancel branch */}
        <path className="dg-line dash" d="M226 124 L226 168 L360 168" strokeWidth="1.3" markerEnd="url(#arl)" />
        <rect className="dg-box warn" x="360" y="150" width="150" height="38" rx="8" />
        <text className="dg-t red" x="435" y="173" fontSize="11.5" textAnchor="middle">Canceled → full refund</text>
        <defs>
          <marker id="arl" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto"><path d="M0 0L6 3.5L0 7z" fill="#2e2e2e" /></marker>
          <marker id="arlg" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto"><path d="M0 0L6 3.5L0 7z" fill="#22c55e" /></marker>
        </defs>
      </svg>
      <p className="dg-cap">Betting always closes at least an hour before the TWAP is sampled, so no one bets on a half-settled outcome.</p>
    </div>
  );
}

function ShowdownDiagram() {
  return (
    <div className="diagram">
      <svg viewBox="0 0 720 250" role="img" aria-label="Showdown duel flow">
        <rect className="dg-box accent" x="30" y="30" width="180" height="60" rx="10" />
        <text className="dg-t grn" x="120" y="54" fontSize="12.5" textAnchor="middle">Creator</text>
        <text className="dg-t dim" x="120" y="71" fontSize="10" textAnchor="middle">champion stock A</text>
        <text className="dg-t dim" x="120" y="84" fontSize="10" textAnchor="middle">+ stake + duration</text>

        <rect className="dg-box warn" x="510" y="30" width="180" height="60" rx="10" />
        <text className="dg-t red" x="600" y="54" fontSize="12.5" textAnchor="middle">Challenger</text>
        <text className="dg-t dim" x="600" y="71" fontSize="10" textAnchor="middle">rival stock B</text>
        <text className="dg-t dim" x="600" y="84" fontSize="10" textAnchor="middle">matches the stake</text>

        <path className="dg-line" d="M210 60 L508 60" strokeWidth="1.4" strokeDasharray="4 4" markerEnd="url(#ars)" />
        <text className="dg-t dim" x="360" y="50" fontSize="10.5" textAnchor="middle">open challenge</text>

        {/* snapshot */}
        <rect className="dg-box" x="250" y="118" width="220" height="42" rx="9" />
        <text className="dg-t" x="360" y="140" fontSize="12" textAnchor="middle">accept() snapshots both TWAPs</text>
        <text className="dg-t dim" x="360" y="154" fontSize="9.5" textAnchor="middle">refA, refB · clock starts</text>
        <path className="dg-line" d="M120 90 L300 116" markerEnd="url(#ars)" strokeWidth="1.3" />
        <path className="dg-line" d="M600 90 L420 116" markerEnd="url(#ars)" strokeWidth="1.3" />

        {/* settle */}
        <rect className="dg-box accent" x="210" y="192" width="300" height="44" rx="9" />
        <text className="dg-t" x="360" y="214" fontSize="12.5" textAnchor="middle">After duration: bigger log-return wins</text>
        <text className="dg-t grn" x="360" y="229" fontSize="10" textAnchor="middle">winner takes pot − 2% · draw refunds both</text>
        <path className="dg-line grn" d="M360 160 L360 190" markerEnd="url(#arsg)" strokeWidth="1.5" />
        <defs>
          <marker id="ars" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto"><path d="M0 0L6 3.5L0 7z" fill="#2e2e2e" /></marker>
          <marker id="arsg" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto"><path d="M0 0L6 3.5L0 7z" fill="#22c55e" /></marker>
        </defs>
      </svg>
      <p className="dg-cap">Both champions are measured from the same starting instant, so the duel is a pure relative-return race.</p>
    </div>
  );
}

function IdentityDiagram() {
  return (
    <div className="diagram">
      <svg viewBox="0 0 720 150" role="img" aria-label="Deterministic identity">
        <rect className="dg-box" x="20" y="52" width="220" height="46" rx="9" />
        <text className="dg-t mono" x="130" y="80" fontSize="12" textAnchor="middle">0x5891…42F7</text>
        <path className="dg-line grn" d="M240 75 L300 75" markerEnd="url(#ari)" strokeWidth="1.5" />
        <rect className="dg-box accent" x="300" y="52" width="150" height="46" rx="9" />
        <text className="dg-t" x="375" y="74" fontSize="12" textAnchor="middle">rolling hash</text>
        <text className="dg-t dim" x="375" y="89" fontSize="9.5" textAnchor="middle">h = h·31 + byte</text>
        <path className="dg-line grn" d="M450 75 L510 75" markerEnd="url(#ari)" strokeWidth="1.5" />
        <rect className="dg-box" x="510" y="30" width="190" height="40" rx="9" />
        <text className="dg-t" x="605" y="55" fontSize="12" textAnchor="middle">pseudonym</text>
        <rect className="dg-box" x="510" y="80" width="190" height="40" rx="9" />
        <text className="dg-t" x="605" y="105" fontSize="12" textAnchor="middle">avatar seed</text>
        <defs>
          <marker id="ari" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto"><path d="M0 0L6 3.5L0 7z" fill="#22c55e" /></marker>
        </defs>
      </svg>
      <p className="dg-cap">Same address ⇒ same face and name, on every device, with zero server state.</p>
    </div>
  );
}

/* ---------------- page ---------------- */

function useScrollSpy() {
  const [active, setActive] = useState("overview");
  useEffect(() => {
    const root = document.querySelector(".docs") as HTMLElement | null;
    const secs = Array.from(document.querySelectorAll<HTMLElement>(".docs-sec"));
    if (!secs.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (vis[0]) setActive(vis[0].target.id);
      },
      { root, rootMargin: "-72px 0px -70% 0px", threshold: 0 }
    );
    secs.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);
  return active;
}

export function Docs() {
  const active = useScrollSpy();
  return (
    <div className="docs">
      <nav className="docs-nav">
        <a href={APP} className="brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" width={22} height={22} />
          PRESAGE <small>DOCS</small>
        </a>
        <span style={{ flex: 1 }} />
        <a href={`${APP}/markets`} className="dn-cta">Open market ↗</a>
      </nav>

      <div className="docs-shell">
        <aside className="docs-side">
          <nav className="docs-toc">
            {TOC.map((g) => (
              <div key={g.group}>
                <div className="toc-group">{g.group}</div>
                {g.items.map((it) => (
                  <a key={it.id} href={`#${it.id}`} className={active === it.id ? "on" : ""}>{it.label}</a>
                ))}
              </div>
            ))}
          </nav>
        </aside>

        <main className="docs-main">
          <header className="docs-hero">
            <span className="eyebrow">Protocol documentation</span>
            <h1>How <b>Presage</b> works</h1>
            <p className="lead">
              Presage is a set of smart contracts for parimutuel prediction markets and 1v1 duels on tokenized
              stocks, live on Robinhood Chain. Every market settles itself from a 30-minute on-chain price average —
              no oracle feed, no judges, no disputes. This is the technical reference.
            </p>
            <div className="docs-chips">
              <span className="docs-chip">Chain <b>Robinhood (EVM 4663)</b></span>
              <span className="docs-chip">Unit <b>USDG · 6 decimals</b></span>
              <span className="docs-chip">Oracle <b>Uniswap v3 TWAP</b></span>
              <span className="docs-chip">Fee <b>2%</b></span>
            </div>
          </header>

          <section id="overview" className="docs-sec">
            <span className="kicker">Overview</span>
            <h2>A market that <b>settles itself</b></h2>
            <p>
              Traditional prediction markets need an oracle or a human to declare the winner. Presage removes that
              trust assumption: each stock already trades against <span className="mono">USDG</span> in a Uniswap v3
              pool on Robinhood Chain, so the market reads the stock&apos;s own on-chain price to decide the outcome.
              Nobody adjudicates — the tape does.
            </p>
            <p>There are two ways to play, sharing one settlement engine:</p>
            <ul>
              <li><strong>Prediction markets</strong> — a shared parimutuel pool where everyone bets YES or NO on where a stock goes.</li>
              <li><strong>Showdown duels</strong> — a private 1v1 wager: your champion stock against a rival&apos;s, highest return wins.</li>
            </ul>
            <div className="docs-note">
              <span className="n-ico">◆</span>
              <p>Everything below is enforced by the contracts — not the front end. The app is just a convenient window onto state anyone can read or write directly.</p>
            </div>
          </section>

          <section id="architecture" className="docs-sec">
            <span className="kicker">Architecture</span>
            <h2>Five contracts, <b>one vault</b></h2>
            <p>
              Funds live in exactly one place. <strong>HoodBet</strong> is the parimutuel core: it escrows every stake,
              tracks who bet which side, pays the fee, and settles claims. It never decides outcomes itself — it asks a
              <em> resolver</em>. <strong>TwapResolver</strong> supplies the automated price templates;
              <strong> AdminResolver</strong> is a manual fallback for edge cases. <strong>StockDuel</strong> runs the
              1v1 Showdown game with its own escrow, and <strong>ProfileRegistry</strong> holds optional on-chain names.
            </p>
            <ArchDiagram />
          </section>

          <section id="parimutuel" className="docs-sec">
            <span className="kicker">Mechanics</span>
            <h2>Parimutuel <b>pools</b></h2>
            <p>
              There is no house taking the other side and no fixed odds. When you call <span className="mono">bet(id, side, amount)</span>,
              your USDG is added to that side&apos;s pool. The implied probability of YES is simply its share of the
              total: <span className="mono">poolYES / (poolYES + poolNO)</span>. As money arrives, the odds move.
            </p>
            <p>
              At resolution the losing pool is handed to the winning side, pro-rata to each winner&apos;s stake, after a
              2% fee. Winners also get their own stake back. If a side is empty, there is nothing to contest and everyone
              is refunded in full.
            </p>
            <div className="docs-formula">
              <span className="cm"># winner payout for a stake s on the winning side w</span><br />
              prize   = poolLOSING × <span className="gr">(1 − 0.02)</span><br />
              payout  = s + prize × ( s / poolWINNING )
            </div>
            <ParimutuelDiagram />
          </section>

          <section id="templates" className="docs-sec">
            <span className="kicker">Mechanics</span>
            <h2>Three market <b>templates</b></h2>
            <p>Anyone can create a market permissionlessly from one of three shapes. All comparisons happen in Uniswap <em>tick</em> space, where one tick is 0.01% of price — so a strike is just a tick, and returns are already logarithmic.</p>
            <h3>Up / down</h3>
            <p>The simplest call. At creation the resolver records the stock&apos;s current TWAP tick as the reference. YES (up) wins if the settlement TWAP is <em>strictly above</em> that reference.</p>
            <h3>Over / under</h3>
            <p>You name a price; the app converts it to a strike tick. YES wins if the stock finishes strictly above the strike. Same math as up/down, but the reference is your chosen level instead of the launch price.</p>
            <h3>Stock duel</h3>
            <p>Two stocks, one window. The resolver snapshots both TWAP ticks at creation and compares their tick deltas (log-returns) at settlement. Side A wins on a strictly larger move; a tie resolves to B, as stated in the market rules.</p>
          </section>

          <section id="twap" className="docs-sec">
            <span className="kicker">Mechanics</span>
            <h2>30-minute <b>TWAP</b> resolution</h2>
            <p>
              Every price the protocol trusts is a <strong>time-weighted average price</strong> over the last 30 minutes,
              read straight from the Uniswap v3 pool&apos;s observation history via <span className="mono">observe([1800, 0])</span>.
              The pool stores a running <em>tick cumulative</em>; the average tick over the window is the difference of two
              samples divided by the elapsed seconds (rounded down, matching Uniswap).
            </p>
            <TwapDiagram />
            <p>
              Because it is an average, not a spot read, an attacker can&apos;t swing the outcome by pushing the price for a
              single block right before resolution — they&apos;d have to hold the price off-market for the whole window, which
              costs far more than any pot. Tick space is then converted to a human price with
              <span className="mono"> price = 1.0001^tick</span>, corrected for whether the stock is token0 or token1 in the pool.
            </p>
          </section>

          <section id="lifecycle" className="docs-sec">
            <span className="kicker">Mechanics</span>
            <h2>Market <b>lifecycle</b></h2>
            <p>
              A market is created with a <span className="mono">closeTime</span> (betting deadline) and a
              <span className="mono"> resolveTime</span>. The contract enforces <span className="mono">resolveTime ≥ closeTime + 1 hour</span> —
              the <strong>lock gap</strong>. Once <span className="mono">resolveTime</span> passes, <em>anyone</em> can call
              <span className="mono"> resolve()</span>; winners are motivated to do it promptly, and the app auto-resolves too.
              Then each winner calls <span className="mono">claim()</span> to withdraw.
            </p>
            <LifecycleDiagram />
          </section>

          <section id="integrity" className="docs-sec">
            <span className="kicker">Mechanics</span>
            <h2>Why it <b>can&apos;t be gamed</b></h2>
            <ul>
              <li><strong>TWAP, not spot</strong> — the 30-minute window makes last-second price pushes worthless.</li>
              <li><strong>Lock gap</strong> — betting ends an hour before the price is sampled, so you can never bet on a half-known result.</li>
              <li><strong>Cardinality floor</strong> — a pool must carry at least <span className="mono">100</span> observations of history to be tradable; thin pools, whose averages are cheap to move, are rejected outright.</li>
              <li><strong>Real-pool check</strong> — a market only lists if the pool is genuinely paired with USDG and holds live liquidity, filtering out dead or out-of-range pools with bogus prices.</li>
              <li><strong>No privileged oracle</strong> — resolution is a pure function of public pool state; there is no feed to bribe or halt.</li>
            </ul>
            <div className="docs-note">
              <span className="n-ico">▲</span>
              <p>The owner key can only cancel a market (triggering full refunds) and collect the 2% fee. It cannot pick a winner or touch a winner&apos;s stake.</p>
            </div>
          </section>

          <section id="showdown" className="docs-sec">
            <span className="kicker">Games</span>
            <h2><b>Showdown</b> — 1v1 duels</h2>
            <p>
              A Showdown is a direct wager. You call <span className="mono">create(pool, stake, duration)</span> with your
              champion stock and the amount you&apos;re risking. A rival answers with <span className="mono">accept(id, poolB)</span>,
              matching your stake with their own stock. At that instant both TWAPs are snapshotted and the clock starts;
              duration runs from 1 hour to 30 days.
            </p>
            <p>
              When the window closes, the contract compares each champion&apos;s log-return from its snapshot. The larger move
              wins the whole pot minus a 2% fee; a genuine tie refunds both sides. Until someone accepts, the creator can
              cancel and reclaim their stake.
            </p>
            <ShowdownDiagram />
          </section>

          <section id="rounds" className="docs-sec">
            <span className="kicker">Games</span>
            <h2>Daily <b>rounds</b></h2>
            <p>
              Alongside user-created markets, a scheduled job publishes fresh up/down rounds each session on deep-pool
              names and settles them at U.S. market close. They&apos;re ordinary HoodBet markets — same pools, same TWAP,
              same claim flow — just created on a cadence so there is always something live to trade.
            </p>
          </section>

          <section id="fees" className="docs-sec">
            <span className="kicker">Protocol</span>
            <h2>Fees & <b>payout</b></h2>
            <p>The fee is a flat 2% (<span className="mono">FEE_BPS = 200</span>), and it only ever applies when there is a real contest with a winner and a loser:</p>
            <ul>
              <li><strong>Markets (HoodBet)</strong> — 2% of the <em>losing</em> pool. Winners split the remaining 98% pro-rata and keep their own stake in full.</li>
              <li><strong>Duels (StockDuel)</strong> — 2% of the whole pot; the winner takes the other 98%. A draw refunds both stakes with no fee.</li>
              <li><strong>Refund cases</strong> — canceled markets, empty-side markets, and tied duels return every stake untouched.</li>
            </ul>
          </section>

          <section id="identity" className="docs-sec">
            <span className="kicker">Protocol</span>
            <h2>On-chain <b>identity</b></h2>
            <p>
              Presage needs no accounts. Your wallet address <em>is</em> your identity: a small rolling hash of the address
              deterministically derives both a readable pseudonym and an avatar seed, so the same address always shows the
              same name and face — on any device, with no database behind it.
            </p>
            <IdentityDiagram />
            <p>
              Two optional layers sit on top: a locally stored display name and photo you control in your browser, and an
              on-chain name claimed through <strong>ProfileRegistry</strong> for anyone who wants a portable, verifiable handle.
            </p>
          </section>

          <section id="reference" className="docs-sec">
            <span className="kicker">Protocol</span>
            <h2><b>Reference</b></h2>
            <h3>Deployed contracts — Robinhood Chain</h3>
            <div className="docs-table-wrap">
              <table className="docs-table">
                <thead><tr><th>Contract</th><th>Role</th><th>Address</th></tr></thead>
                <tbody>
                  {CONTRACTS.map(([name, role, addr]) => (
                    <tr key={addr}>
                      <td className="name">{name}</td>
                      <td>{role}</td>
                      <td><span className="mono">{addr}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <h3>Protocol constants</h3>
            <div className="docs-table-wrap">
              <table className="docs-table">
                <thead><tr><th>Constant</th><th>Value</th><th>Meaning</th></tr></thead>
                <tbody>
                  {CONSTANTS.map(([name, val, note]) => (
                    <tr key={name}>
                      <td className="name"><span className="mono">{name}</span></td>
                      <td>{val}</td>
                      <td>{note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>

      <footer className="docs-foot">
        <span>© 2026 PresageMarkets · settled on-chain, no oracle</span>
        <span style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <a href={`${APP}/markets`} className="dn-cta">Open market ↗</a>
          <Socials />
        </span>
      </footer>
    </div>
  );
}
