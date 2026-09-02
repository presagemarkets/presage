import Link from "next/link";
import { server } from "../../src/chain.ts";
import { PRESAGE_ADDRESS } from "../../src/presage.ts";
import { fmtUSDG } from "../../src/markets.ts";
import { buildStats, type Stats, type UserStats } from "../../src/stats.ts";
import { Avatar, nameOf } from "../avatar.tsx";
import { Countdown } from "../countdown.tsx";
import { RankingTable, type RankRow } from "./table.tsx";
import { MyPortfolio } from "./myrow.tsx";

export const revalidate = 30;

const signed = (v: bigint) => (v >= 0n ? `+${fmtUSDG(v)}` : `−${fmtUSDG(-v)}`);
const handle = (a: string) => "@" + nameOf(a).toLowerCase().replace(" ", "_");

const GREEN = "#4ade80";
const RED = "#f87171";
const BLUE = "#60a5fa";

function StatCol({ label, value, color }: { label: string; value: React.ReactNode; color?: string }) {
  return (
    <span>
      <span className="label" style={{ display: "block", marginBottom: 6 }}>{label}</span>
      <span className="num" style={{ fontSize: 15, fontWeight: 700 }}>{value}</span>
      <span style={{ display: "block", width: 22, height: 2, borderRadius: 2, marginTop: 6, background: color ?? "var(--border-strong)" }} />
    </span>
  );
}

function bar(w: number, h = 12) {
  return <span className="skel" style={{ width: w, height: h }} />;
}

function SkeletonPodium({ rank }: { rank: number }) {
  const medal = ["🏆", "🥈", "🥉"][rank - 1];
  return (
    <div className="card" style={{ flex: 1, minWidth: 250, padding: 26, borderColor: rank === 1 ? "var(--border-strong)" : "var(--border)" }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 24 }}>
        <span className="skel circle" style={{ width: 40, height: 40 }} />
        <span style={{ flex: 1, minWidth: 0, display: "grid", gap: 6 }}>
          {bar(110, 13)}
          {bar(70, 10)}
        </span>
        <span style={{ fontSize: 22, opacity: 0.3 }}>{medal}</span>
      </div>
      <div style={{ display: "flex", gap: 32 }}>
        {["Win rate", "P&L", "Volume"].map((l) => (
          <span key={l}>
            <span className="label" style={{ display: "block", marginBottom: 8 }}>{l}</span>
            {bar(44, 14)}
          </span>
        ))}
      </div>
    </div>
  );
}

function SkeletonTable() {
  return (
    <div className="card" style={{ padding: 0, overflowX: "auto" }}>
      <div className="label" style={{ display: "flex", gap: 16, padding: "16px 26px", borderBottom: "1px solid var(--border)", minWidth: 620 }}>
        <span style={{ width: 26 }}>#</span>
        <span style={{ flex: 1 }}>Player</span>
        <span style={{ width: 90, textAlign: "right" }}>Volume</span>
        <span style={{ width: 46, textAlign: "right" }}>Bets</span>
        <span style={{ width: 70, textAlign: "right" }}>Win rate</span>
        <span style={{ width: 90, textAlign: "right" }}>Trend</span>
        <span style={{ width: 104, textAlign: "right" }}>P&amp;L</span>
      </div>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} style={{ display: "flex", gap: 16, padding: "16px 26px", alignItems: "center", borderBottom: "1px solid var(--border)", minWidth: 620, opacity: 1 - i * 0.13 }}>
          <span className="num" style={{ width: 26, textAlign: "center", color: "var(--faint)" }}>{i + 1}</span>
          <span style={{ flex: 1, display: "flex", alignItems: "center", gap: 12 }}>
            <span className="skel circle" style={{ width: 32, height: 32 }} />
            <span style={{ display: "grid", gap: 5 }}>
              {bar(120, 12)}
              {bar(80, 9)}
            </span>
          </span>
          <span style={{ width: 90, display: "flex", justifyContent: "flex-end" }}>{bar(56, 12)}</span>
          <span style={{ width: 46, display: "flex", justifyContent: "flex-end" }}>{bar(24, 12)}</span>
          <span style={{ width: 70, display: "flex", justifyContent: "flex-end" }}>{bar(40, 12)}</span>
          <span style={{ width: 90, display: "flex", justifyContent: "flex-end" }}>{bar(64, 20)}</span>
          <span style={{ width: 104, display: "flex", justifyContent: "flex-end" }}>{bar(70, 12)}</span>
        </div>
      ))}
    </div>
  );
}

function PodiumCard({ u, rank }: { u: UserStats; rank: number }) {
  const medal = ["🏆", "🥈", "🥉"][rank - 1];
  const settled = u.wins + u.losses;
  const rate = settled > 0 ? Math.round((u.wins / settled) * 100) : 0;
  const up = u.pnl >= 0n;
  return (
    <Link
      href={`/u/${u.address}`}
      className="card"
      style={{ flex: 1, minWidth: 250, padding: 26, borderColor: rank === 1 ? "var(--border-strong)" : "var(--border)" }}
    >
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 24 }}>
        <Avatar address={u.address} size={40} />
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontWeight: 700, fontSize: 15 }}>{nameOf(u.address)}</span>
          <span className="muted" style={{ fontSize: 12 }}>{handle(u.address)}</span>
        </span>
        <span style={{ fontSize: 22, opacity: rank === 1 ? 1 : 0.75 }}>{medal}</span>
      </div>
      <div style={{ display: "flex", gap: 32 }}>
        <StatCol label="Win rate" value={`${rate}%`} color={GREEN} />
        <StatCol label="P&L" value={<span style={{ color: up ? GREEN : RED }}>{signed(u.pnl)}</span>} color={up ? GREEN : RED} />
        <StatCol label="Volume" value={fmtUSDG(u.volume)} color={BLUE} />
      </div>
    </Link>
  );
}

export default async function Leaderboard() {
  let stats: Stats | null = null;
  if (PRESAGE_ADDRESS) {
    try {
      stats = await buildStats(server());
    } catch {
      /* chain unreadable */
    }
  }
  const users = stats?.users ?? [];

  const totalBets = users.reduce((n, u) => n + u.bets, 0);
  const totalVolume = users.reduce((n, u) => n + u.volume, 0n);
  const now = Math.floor(Date.now() / 1000);
  const nextSettle =
    stats?.markets.filter((m) => !m.resolved && !m.canceled && m.resolveTime > now).sort((a, b) => a.resolveTime - b.resolveTime)[0]
      ?.resolveTime ?? now + 6 * 3600;

  const rows = users.slice(0, 50).map(
    (u): RankRow => ({
      address: u.address,
      volume: Number(u.volume) / 1e6,
      bets: u.bets,
      wins: u.wins,
      losses: u.losses,
      pnl: Number(u.pnl) / 1e6,
      history: [...u.history],
    })
  );

  return (
    <main>
      <h1 style={{ fontSize: 26, marginBottom: 8 }}>Leaderboard</h1>
      <p className="muted" style={{ fontSize: 14, marginBottom: 30 }}>
        Ranked by realized profit — open positions count once the market settles.
      </p>

      <MyPortfolio rows={rows} />

      <div style={{ display: "flex", gap: 40, flexWrap: "wrap", marginBottom: 36 }}>
        <StatCol label="Players" value={users.length} />
        <StatCol label="Total bets" value={totalBets} />
        <StatCol label="Volume" value={`${fmtUSDG(totalVolume)} USDG`} color={BLUE} />
        <StatCol label="Next settle" value={<Countdown until={nextSettle} />} color={GREEN} />
      </div>

      {users.length === 0 ? (
        <>
          <p className="muted" style={{ fontSize: 13, marginBottom: 16 }}>No bets settled yet — the board fills up as people play. Be the first to climb it.</p>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 40 }}>
            {[1, 2, 3].map((r) => (
              <SkeletonPodium key={r} rank={r} />
            ))}
          </div>
          <SkeletonTable />
        </>
      ) : (
        <>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 40 }}>
            {users.slice(0, 3).map((u, i) => (
              <PodiumCard key={u.address} u={u} rank={i + 1} />
            ))}
          </div>
          <RankingTable rows={rows} />
        </>
      )}
    </main>
  );
}
