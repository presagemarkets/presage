"use client";

// Ranking table with live search: filters by pseudonym name or wallet address
// as you type. Ranks stay global — filtering never renumbers players.

import { useState } from "react";
import Link from "next/link";
import { Avatar, nameOf } from "../avatar.tsx";
import { Sparkline } from "../sparkline.tsx";

export interface RankRow {
  address: string;
  volume: number; // USDG
  bets: number;
  wins: number;
  losses: number;
  pnl: number; // USDG, signed
  history: number[];
}

const GREEN = "#4ade80";
const RED = "#f87171";
const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 });
const signed = (n: number) => (n >= 0 ? `+${fmt(n)}` : `−${fmt(-n)}`);
const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

export function RankingTable({ rows }: { rows: RankRow[] }) {
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();
  const shown = needle
    ? rows.filter(
        (r) => nameOf(r.address).toLowerCase().includes(needle) || r.address.toLowerCase().includes(needle)
      )
    : rows;

  return (
    <div className="card" style={{ padding: 0, overflowX: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 20px", borderBottom: "1px solid var(--border)" }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--dim)" strokeWidth="2" aria-hidden>
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search gambler or address…"
          style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "var(--text)", font: "inherit", fontSize: 14 }}
        />
        {q && (
          <button
            type="button"
            onClick={() => setQ("")}
            style={{ background: "none", border: "none", color: "var(--dim)", cursor: "pointer", font: "inherit", fontSize: 12 }}
          >
            clear
          </button>
        )}
      </div>

      <div className="label" style={{ display: "flex", gap: 16, padding: "16px 26px", borderBottom: "1px solid var(--border)", minWidth: 620 }}>
        <span style={{ width: 26 }}>#</span>
        <span style={{ flex: 1 }}>Player</span>
        <span style={{ width: 90, textAlign: "right" }}>Volume</span>
        <span style={{ width: 46, textAlign: "right" }}>Bets</span>
        <span style={{ width: 70, textAlign: "right" }}>Win rate</span>
        <span style={{ width: 90, textAlign: "right" }}>Trend</span>
        <span style={{ width: 104, textAlign: "right" }}>P&L</span>
      </div>

      {shown.length === 0 && (
        <p className="muted" style={{ padding: "18px 26px", fontSize: 13 }}>No player matches “{q}”.</p>
      )}

      {shown.map((u) => {
        const rank = rows.indexOf(u) + 1;
        const settled = u.wins + u.losses;
        const rate = settled > 0 ? Math.round((u.wins / settled) * 100) : null;
        const up = u.pnl >= 0;
        return (
          <Link
            key={u.address}
            href={`/u/${u.address}`}
            className="lb-row"
            style={{ display: "flex", gap: 16, padding: "16px 26px", fontSize: 14, alignItems: "center", borderBottom: "1px solid var(--border)", minWidth: 620 }}
          >
            <span className="num" style={{ width: 26, textAlign: "center", color: rank <= 3 ? "var(--text)" : "var(--faint)", fontWeight: rank <= 3 ? 700 : 400 }}>
              {rank}
            </span>
            <span style={{ flex: 1, display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
              <Avatar address={u.address} size={32} />
              <span style={{ minWidth: 0 }}>
                <span style={{ display: "block", fontWeight: 600 }}>{nameOf(u.address)}</span>
                <span className="muted num" style={{ display: "block", fontSize: 11, fontFamily: "ui-monospace, monospace" }}>
                  {short(u.address)}
                </span>
              </span>
            </span>
            <span className="num muted" style={{ width: 90, textAlign: "right" }}>{fmt(u.volume)}</span>
            <span className="num muted" style={{ width: 46, textAlign: "right" }}>{u.bets}</span>
            <span className="num" style={{ width: 70, textAlign: "right", color: rate !== null && rate >= 50 ? GREEN : "var(--dim)" }}>
              {rate === null ? "—" : `${rate}%`}
            </span>
            <span style={{ width: 90, display: "flex", justifyContent: "flex-end" }}>
              <Sparkline points={u.history} color={up ? GREEN : RED} />
            </span>
            <span className="num" style={{ width: 104, textAlign: "right", fontWeight: 600, color: up ? GREEN : RED }}>
              {signed(u.pnl)}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
