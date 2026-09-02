// Instant loading skeletons. Rendered the moment a route is clicked (Next shows
// loading.tsx while the server component fetches on-chain data), so navigation
// feels immediate instead of hanging on the network read.

function Bar({ w, h = 14, r = 6 }: { w: number | string; h?: number; r?: number }) {
  return <span className="skel" style={{ width: w, height: h, borderRadius: r }} />;
}

function CardSkel() {
  return (
    <div className="glow-card" style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span className="skel circle" style={{ width: 44, height: 44 }} />
        <span style={{ flex: 1, display: "grid", gap: 8 }}>
          <Bar w="80%" h={15} />
          <Bar w="50%" h={11} />
        </span>
        <span style={{ display: "grid", gap: 6, justifyItems: "end" }}>
          <Bar w={46} h={22} />
          <Bar w={30} h={9} />
        </span>
      </div>
      <Bar w="100%" h={6} r={999} />
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <Bar w={120} h={26} r={999} />
        <Bar w={80} h={12} />
      </div>
    </div>
  );
}

/** Grid of card skeletons — for markets, stats, leaderboard, showdown. */
export function GridSkeleton({ title = 140, count = 4 }: { title?: number; count?: number }) {
  return (
    <main>
      <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "6px 0 26px" }}>
        <Bar w={title} h={18} />
        <span style={{ flex: 1 }} />
        <Bar w={90} h={30} r={999} />
      </div>
      <div style={{ display: "grid", gap: 18, gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
        {Array.from({ length: count }).map((_, i) => (
          <CardSkel key={i} />
        ))}
      </div>
    </main>
  );
}

/** Single-panel skeleton — for form-style pages like swap and create. */
export function PanelSkeleton() {
  return (
    <main style={{ maxWidth: 460, margin: "0 auto" }}>
      <div style={{ margin: "6px 0 22px" }}>
        <Bar w={160} h={20} />
      </div>
      <div className="glow-card" style={{ display: "grid", gap: 18 }}>
        <Bar w="40%" h={12} />
        <Bar w="100%" h={56} r={12} />
        <Bar w="40%" h={12} />
        <Bar w="100%" h={56} r={12} />
        <Bar w="100%" h={48} r={999} />
      </div>
    </main>
  );
}
