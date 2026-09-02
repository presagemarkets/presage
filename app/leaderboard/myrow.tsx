"use client";

// "Your portfolio" banner at the top of the leaderboard — the merged Portfolio
// menu. Finds the signed-in wallet among the ranked rows; zeros when unranked.

import Link from "next/link";
import { useEffect, useState } from "react";
import { Avatar, nameOf } from "../avatar.tsx";
import { Sparkline } from "../sparkline.tsx";
import { useWallet } from "../wallet.ts";
import { loadProfile, type LocalProfile } from "../idstore.ts";
import type { RankRow } from "./table.tsx";

const GREEN = "#4ade80";
const RED = "#f87171";
const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 });

function Col({ label, value, color }: { label: string; value: React.ReactNode; color?: string }) {
  return (
    <span>
      <span className="label" style={{ display: "block", marginBottom: 5 }}>{label}</span>
      <span className="num" style={{ fontSize: 16, fontWeight: 700, color }}>{value}</span>
    </span>
  );
}

export function MyPortfolio({ rows }: { rows: RankRow[] }) {
  const w = useWallet();
  const [profile, setProfile] = useState<LocalProfile>({});

  useEffect(() => {
    if (!w.address) return;
    const sync = () => setProfile(loadProfile(w.address!));
    sync();
    window.addEventListener("presage-profile", sync);
    return () => window.removeEventListener("presage-profile", sync);
  }, [w.address]);

  if (!w.address) {
    return (
      <div className="glow-card green" style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: 30 }}>
        <span style={{ minWidth: 0, flex: 1 }}>
          <span className="label" style={{ display: "block", color: GREEN, marginBottom: 3 }}>Your portfolio</span>
          <span className="muted" style={{ fontSize: 14 }}>Connect your wallet to track your volume, win rate, and P&amp;L here.</span>
        </span>
        <button className="btn green" onClick={() => void w.connect()} disabled={w.busy} style={{ padding: "10px 20px" }}>
          Connect wallet
        </button>
      </div>
    );
  }
  const addr = w.address;
  const idx = rows.findIndex((r) => r.address.toLowerCase() === addr.toLowerCase());
  const row = idx >= 0 ? rows[idx] : null;
  const settled = row ? row.wins + row.losses : 0;
  const rate = settled > 0 ? Math.round(((row?.wins ?? 0) / settled) * 100) : null;
  const up = (row?.pnl ?? 0) >= 0;

  return (
    <div className="glow-card green" style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap", marginBottom: 30 }}>
      {profile.photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={profile.photo} alt="" width={48} height={48} style={{ borderRadius: "50%", objectFit: "cover" }} />
      ) : (
        <Avatar address={addr} size={48} />
      )}
      <span style={{ minWidth: 0 }}>
        <span className="label" style={{ display: "block", color: GREEN, marginBottom: 3 }}>Your portfolio</span>
        <span style={{ fontWeight: 700, fontSize: 16 }}>{profile.name || nameOf(addr)}</span>
        {idx >= 0 && <span className="muted num" style={{ fontSize: 12, marginLeft: 8 }}>Rank #{idx + 1}</span>}
      </span>
      <span style={{ flex: 1 }} />
      <Col label="Volume" value={row ? `$${fmt(row.volume)}` : "$0"} />
      <Col label="Bets" value={row?.bets ?? 0} />
      <Col label="Win rate" value={rate === null ? "—" : `${rate}%`} color={rate !== null && rate >= 50 ? GREEN : undefined} />
      <Col label="P&L" value={row ? `${up ? "+" : "−"}$${fmt(Math.abs(row.pnl))}` : "$0"} color={row ? (up ? GREEN : RED) : undefined} />
      {row && row.history.length >= 2 && <Sparkline points={row.history} color={up ? GREEN : RED} />}
      <Link href={`/u/${addr}`} className="btn ghost" style={{ padding: "8px 14px" }}>
        Open →
      </Link>
    </div>
  );
}

