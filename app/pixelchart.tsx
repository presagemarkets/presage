// Dot-matrix chart: columns of pixels lit up to the curve's height.
// Unlit dots stay faintly visible so the whole matrix reads as a grid.

export function PixelChart({
  points,
  color,
  cols = 16,
  rows = 7,
  size = 5,
  gap = 3,
}: {
  points: readonly number[];
  color: string;
  cols?: number;
  rows?: number;
  size?: number;
  gap?: number;
}) {
  if (points.length < 2) return null;
  const vals = Array.from({ length: cols }, (_, i) => points[Math.round((i * (points.length - 1)) / (cols - 1))]);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const w = cols * (size + gap) - gap;
  const h = rows * (size + gap) - gap;

  const cells: React.ReactNode[] = [];
  vals.forEach((v, c) => {
    const level = Math.max(1, Math.round(((v - min) / range) * (rows - 1)) + 1);
    for (let r = 0; r < rows; r++) {
      const lit = r < level;
      cells.push(
        <rect
          key={`${c}-${r}`}
          x={c * (size + gap)}
          y={h - (r + 1) * (size + gap) + gap}
          width={size}
          height={size}
          rx={1.5}
          fill={lit ? color : "rgba(255,255,255,0.07)"}
          opacity={lit ? 0.3 + 0.7 * ((r + 1) / level) : 1}
        />
      );
    }
  });

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden style={{ flexShrink: 0 }}>
      {cells}
    </svg>
  );
}
