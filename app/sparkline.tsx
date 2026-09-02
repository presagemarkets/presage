// Smooth P&L curve (Catmull-Rom) — used small in tables, large on profiles.

const smooth = (p: { x: number; y: number }[]): string => {
  let d = `M ${p[0].x.toFixed(1)} ${p[0].y.toFixed(1)}`;
  for (let i = 1; i < p.length; i++) {
    const prev = p[i - 2] ?? p[i - 1];
    const next = p[i + 1] ?? p[i];
    d += ` C ${(p[i - 1].x + (p[i].x - prev.x) / 6).toFixed(1)} ${(p[i - 1].y + (p[i].y - prev.y) / 6).toFixed(1)}, ${(
      p[i].x - (next.x - p[i - 1].x) / 6
    ).toFixed(1)} ${(p[i].y - (next.y - p[i - 1].y) / 6).toFixed(1)}, ${p[i].x.toFixed(1)} ${p[i].y.toFixed(1)}`;
  }
  return d;
};

export function Sparkline({
  points,
  color,
  w = 84,
  h = 26,
  fill = false,
}: {
  points: readonly number[];
  color: string;
  w?: number;
  h?: number;
  fill?: boolean;
}) {
  if (points.length < 2) return <span className="muted" style={{ fontSize: 11 }}>—</span>;
  const min = Math.min(...points, 0);
  const max = Math.max(...points, 0);
  const range = max - min || 1;
  const step = w / (points.length - 1);
  const xy = points.map((v, i) => ({ x: i * step, y: h - 2 - ((v - min) / range) * (h - 4) }));
  const d = smooth(xy);
  const gid = `sg-${color.replace(/[^a-z0-9]/gi, "")}-${w}`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none" style={fill ? { width: "100%", height: "auto" } : undefined} aria-hidden>
      {fill && (
        <>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.2" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`${d} L ${xy[xy.length - 1].x} ${h} L ${xy[0].x} ${h} Z`} fill={`url(#${gid})`} />
        </>
      )}
      <path d={d} stroke={color} strokeWidth={fill ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round" opacity="0.95" />
    </svg>
  );
}
