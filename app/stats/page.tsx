import Link from "next/link";
import { server } from "../../src/chain.ts";
import { PRESAGE_ADDRESS } from "../../src/presage.ts";
import { fmtUSDG } from "../../src/markets.ts";
import { buildStats, type Stats, type Totals } from "../../src/stats.ts";
import { Avatar, nameOf } from "../avatar.tsx";
import { Countdown } from "../countdown.tsx";
import { PixelChart } from "../pixelchart.tsx";

export const revalidate = 15;

const GREEN = "#4ade80";
const RED = "#f87171";
const BLUE = "#60a5fa";

/** Growth over the last 24h relative to the total before it, e.g. "+9.2%". */
function pct24(delta: bigint, total: bigint): string {
  if (delta <= 0n) return "+0.0%";
  const prev = total - delta;
  if (prev <= 0n) return "+100%";
  return `+${((Number(delta) / Number(prev)) * 100).toFixed(1)}%`;
}

function ChartCol({ chart, change, color }: { chart: React.ReactNode; change: string; color: string }) {
  return (
    <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0 }}>
      {chart}
      <span className="num" style={{ fontSize: 12, fontWeight: 600, color }}>
        ▲ {change} <span className="muted" style={{ fontWeight: 400 }}>24h</span>
      </span>
    </span>
  );
}

function Cell({
  label,
  value,
  sub,
  color,
  className = "",
  chart,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  color?: string;
  className?: string;
  chart?: React.ReactNode;
}) {
  return (
    <div className={`cell ${className}`} style={{ display: "flex", alignItems: "center", gap: 18 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p className="label" style={{ marginBottom: 12 }}>{label}</p>
        <p className="big" style={{ color }}>{value}</p>
        {sub && <p className="muted" style={{ fontSize: 13, marginTop: 10, lineHeight: 1.5 }}>{sub}</p>}
      </div>
      {chart}
    </div>
  );
}

export default async function StatsPage() {
  let stats: Stats | null = null;
  if (PRESAGE_ADDRESS) {
    try {
      stats = await buildStats(server());
    } catch {
      /* chain unreadable — fall through to demo */
    }
  }
  const EMPTY: Totals = { players: 0, bets: 0, volume: 0n, paidOut: 0n, fees: 0n, markets: 0, settled: 0, active: 0, vol24: 0n, paid24: 0n };
  const t = stats?.totals ?? EMPTY;
  const series = stats?.series ?? { volume: [], paidOut: [] };
  const top = stats?.users[0];
  const avgBet = t.bets > 0 ? t.volume / BigInt(t.bets) : 0n;
  const now = Math.floor(Date.now() / 1000);
  const nextSettle =
    stats?.markets.filter((m) => !m.resolved && !m.canceled && m.resolveTime > now).sort((a, b) => a.resolveTime - b.resolveTime)[0]
      ?.resolveTime ?? now + 6 * 3600;
  const topUp = top ? top.pnl >= 0n : true;

  return (
    <main>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <span className="dot-live" />
        <h1 style={{ fontSize: 26, letterSpacing: "-0.01em" }}>Live stats</h1>
      </div>
      <p className="muted" style={{ fontSize: 14, marginBottom: 34 }}>
        Everything below is read straight from the chain — nothing self-reported.
      </p>

      <div className="bento">
        {/* Hero: value left, big dot-matrix beside it */}
        <div className="cell bento-hero s2" style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p className="label" style={{ marginBottom: 12 }}>Total volume</p>
            <p className="big num" style={{ color: BLUE }}>${fmtUSDG(t.volume)}</p>
            <p className="muted" style={{ fontSize: 13, marginTop: 12 }}>USDG staked across every market, all time</p>
          </div>
          <ChartCol
            chart={<PixelChart points={series.volume} color={BLUE} cols={18} rows={11} size={7} gap={4} />}
            change={pct24(t.vol24, t.volume)}
            color={BLUE}
          />
        </div>

        <Cell
          className="s2"
          label="Paid out"
          value={`$${fmtUSDG(t.paidOut)}`}
          sub="Winnings and refunds claimed"
          color={GREEN}
          chart={
            <ChartCol
              chart={<PixelChart points={series.paidOut} color={GREEN} cols={13} rows={6} />}
              change={pct24(t.paid24, t.paidOut)}
              color={GREEN}
            />
          }
        />
        <Cell label="Gamblers" value={t.players} sub="Unique wallets" />
        <Cell label="Total bets" value={t.bets} sub="Since launch" />

        <Cell label="Avg bet" value={`$${fmtUSDG(avgBet)}`} sub="USDG per bet" />
        <Cell label="Fees collected" value={`$${fmtUSDG(t.fees)}`} sub="2% of losing pots" />
        <Cell label="Markets" value={`${t.settled} / ${t.markets}`} sub="Settled / created" />
        <Cell label="Open now" value={t.active} sub="Accepting bets" color={GREEN} />

        {top ? (
          <Link href={`/u/${top.address}`} className="cell s2" style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="label" style={{ marginBottom: 12 }}>Top gambler</p>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <Avatar address={top.address} size={44} />
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: "block", fontWeight: 700, fontSize: 18, letterSpacing: "-0.01em" }}>{nameOf(top.address)}</span>
                  <span className="num" style={{ fontSize: 15, fontWeight: 600, color: topUp ? GREEN : RED }}>
                    {topUp ? "+" : "−"}${fmtUSDG(topUp ? top.pnl : -top.pnl)}
                  </span>
                </span>
              </div>
            </div>
            <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0 }}>
              <PixelChart points={top.history} color={topUp ? GREEN : RED} cols={13} rows={6} />
            </span>
          </Link>
        ) : (
          <div className="cell s2">
            <p className="label" style={{ marginBottom: 12 }}>Top gambler</p>
            <p className="muted" style={{ fontSize: 14 }}>No gambler yet — the first winning bet claims this spot.</p>
          </div>
        )}
        <Cell className="s2" label="Next settlement" value={<Countdown until={nextSettle} />} sub="The nearest market resolves in" />
      </div>
    </main>
  );
}

