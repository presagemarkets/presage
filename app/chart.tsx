"use client";

// Kalshi-style stock price chart: smooth curve, transparent area fill, color
// follows direction, 1D/7D range tabs, and an interactive crosshair on hover.

import { useEffect, useRef, useState } from "react";

interface Point {
  t: number;
  price: number;
}

const GREEN = "#4ade80";
const RED = "#f87171";
const W = 640;
const H = 220;
const PAD = 6;

function smoothPath(p: { x: number; y: number }[]): string {
  let d = `M ${p[0].x.toFixed(1)} ${p[0].y.toFixed(1)}`;
  for (let i = 1; i < p.length; i++) {
    const prev = p[i - 2] ?? p[i - 1];
    const next = p[i + 1] ?? p[i];
    const c1x = p[i - 1].x + (p[i].x - prev.x) / 6;
    const c1y = p[i - 1].y + (p[i].y - prev.y) / 6;
    const c2x = p[i].x - (next.x - p[i - 1].x) / 6;
    const c2y = p[i].y - (next.y - p[i - 1].y) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p[i].x.toFixed(1)} ${p[i].y.toFixed(1)}`;
  }
  return d;
}

export function StockChart({ symbol }: { symbol: string }) {
  const [range, setRange] = useState<"1D" | "1W" | "1M">("1D");
  const [points, setPoints] = useState<Point[] | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    setPoints(null);
    setHover(null);
    void fetch(`/api/chart?symbol=${symbol}&range=${range}`)
      .then((r) => r.json())
      .then((d: { points?: Point[] }) => setPoints(d.points ?? []))
      .catch(() => setPoints([]));
  }, [symbol, range]);

  if (points === null) return <p className="muted" style={{ fontSize: 13, padding: "40px 0" }}>Loading chart…</p>;
  if (points.length < 2) return <p className="muted" style={{ fontSize: 13, padding: "40px 0" }}>Not enough trade history yet.</p>;

  const prices = points.map((p) => p.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const rangeY = max - min || 1;
  const xy = points.map((p, i) => ({
    x: PAD + (i / (points.length - 1)) * (W - PAD * 2),
    y: PAD + (1 - (p.price - min) / rangeY) * (H - PAD * 2 - 18),
  }));
  const up = prices[prices.length - 1] >= prices[0];
  const color = up ? GREEN : RED;
  const line = smoothPath(xy);
  const last = xy[xy.length - 1];
  const hv = hover !== null ? Math.min(points.length - 1, Math.max(0, hover)) : null;

  const onMove = (e: React.MouseEvent) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const frac = (e.clientX - rect.left) / rect.width;
    setHover(Math.round(frac * (points.length - 1)));
  };

  const fmtT = (t: number) =>
    new Date(t * 1000).toLocaleString("en-US", range === "1D" ? { hour: "numeric", minute: "2-digit" } : { month: "short", day: "numeric" });

  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 6 }}>
        <span className="num" style={{ fontSize: 26, fontWeight: 700, color }}>
          ${(hv !== null ? points[hv].price : prices[prices.length - 1]).toFixed(2)}
        </span>
        <span className="muted num" style={{ fontSize: 13 }}>
          {hv !== null ? fmtT(points[hv].t) : `${symbol} · 15-min TWAP`}
        </span>
        <span style={{ flex: 1 }} />
        {(["1D", "1W", "1M"] as const).map((r) => (
          <button key={r} className={`tab ${range === r ? "on" : ""}`} style={{ padding: "4px 12px", fontSize: 12 }} onClick={() => setRange(r)}>
            {r}
          </button>
        ))}
      </div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: "100%", height: "auto", display: "block", cursor: "crosshair" }}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${line} L ${xy[xy.length - 1].x} ${H} L ${xy[0].x} ${H} Z`} fill="url(#chartFill)" />
        <path d={line} stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {hv !== null ? (
          <>
            <line x1={xy[hv].x} y1={PAD} x2={xy[hv].x} y2={H - 14} stroke="rgba(255,255,255,0.25)" strokeDasharray="3 4" />
            <circle cx={xy[hv].x} cy={xy[hv].y} r="4" fill={color} stroke="#000" strokeWidth="2" />
          </>
        ) : (
          <circle cx={last.x} cy={last.y} r="4" fill={color} stroke="#000" strokeWidth="2" />
        )}
        <text x={PAD} y={H - 2} fill="var(--faint)" fontSize="10" fontFamily="inherit">{fmtT(points[0].t)}</text>
        <text x={W - PAD} y={H - 2} fill="var(--faint)" fontSize="10" textAnchor="end" fontFamily="inherit">{fmtT(points[points.length - 1].t)}</text>
      </svg>
      <div className="muted num" style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
        <span>low ${min.toFixed(2)}</span>
        <span>high ${max.toFixed(2)}</span>
      </div>
    </div>
  );
}
