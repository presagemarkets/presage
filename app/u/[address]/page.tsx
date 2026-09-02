import Link from "next/link";
import { server } from "../../../src/chain.ts";
import { PRESAGE_ADDRESS } from "../../../src/presage.ts";
import { fmtUSDG, status, STATUS_LABEL } from "../../../src/markets.ts";
import { buildStats, type UserStats } from "../../../src/stats.ts";
import { Avatar, nameOf } from "../../avatar.tsx";
import { Sparkline } from "../../sparkline.tsx";
import { StockLogo } from "../../logo.tsx";
import { tickerOf } from "../../ui.tsx";

export const revalidate = 30;

const GREEN = "#4ade80";
const RED = "#f87171";
const signed = (v: bigint) => (v >= 0n ? `+${fmtUSDG(v)}` : `−${fmtUSDG(-v)}`);
const handle = (a: string) => "@" + nameOf(a).toLowerCase().replace(" ", "_");

function Stat({ label, value, color }: { label: string; value: React.ReactNode; color?: string }) {
  return (
    <div className="glow-card" style={{ flex: 1, minWidth: 150, padding: 20 }}>
      <p className="label" style={{ marginBottom: 8 }}>{label}</p>
      <p className="num" style={{ fontSize: 20, fontWeight: 700, color }}>{value}</p>
    </div>
  );
}

export default async function Profile({ params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) return <p className="card err">Not a valid address.</p>;

  let u: UserStats | undefined;
  let markets: Awaited<ReturnType<typeof buildStats>>["markets"] = [];
  if (PRESAGE_ADDRESS) {
    try {
      const stats = await buildStats(server());
      markets = stats.markets;
      u = stats.users.find((x) => x.address.toLowerCase() === address.toLowerCase());
    } catch {
      /* chain unreadable */
    }
  }

  const mById = new Map(markets.map((m) => [m.id, m]));
  const settled = u ? u.wins + u.losses : 0;
  const rate = settled > 0 ? Math.round(((u?.wins ?? 0) / settled) * 100) : null;
  const up = (u?.pnl ?? 0n) >= 0n;

  return (
    <main>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}>
        <Avatar address={address} size={56} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <h1 style={{ fontSize: 24, marginBottom: 2 }}>{nameOf(address)}</h1>
          <p className="muted num" style={{ fontSize: 13 }}>
            {handle(address)} · <span style={{ fontFamily: "ui-monospace, monospace", wordBreak: "break-all" }}>{address}</span>
          </p>
        </div>
      </div>

      {!u ? (
        <p className="card muted">No bets from this address yet.</p>
      ) : (
        <>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 16 }}>
            <Stat label="Volume" value={`${fmtUSDG(u.volume)} USDG`} />
            <Stat label="Bets" value={u.bets} />
            <Stat label="Win rate" value={rate === null ? "—" : `${rate}%`} color={rate !== null && rate >= 50 ? GREEN : undefined} />
            <Stat label="Realized P&L" value={`${signed(u.pnl)} USDG`} color={up ? GREEN : RED} />
          </div>

          {u.history.length >= 2 && (
            <div className="glow-card" style={{ marginBottom: 16 }}>
              <p className="label" style={{ marginBottom: 12 }}>P&L over settled markets</p>
              <Sparkline points={u.history} color={up ? GREEN : RED} w={560} h={130} fill />
              <div className="muted num" style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginTop: 6 }}>
                <span>first settled bet</span>
                <span style={{ color: up ? GREEN : RED, fontWeight: 600 }}>{signed(u.pnl)} USDG</span>
              </div>
            </div>
          )}

          <>
              <h2 style={{ fontSize: 16, margin: "10px 0 12px" }}>Positions</h2>
              <div style={{ display: "grid", gap: 12 }}>
                {[...u.positions.entries()]
                  .sort((a, b) => b[0] - a[0])
                  .map(([id, [s0, s1]]) => {
                    const m = mById.get(id);
                    if (!m) return null;
                    const st = status(m);
                    return (
                      <Link key={id} href={`/market/${id}`} className="glow-card" style={{ padding: 18 }}>
                        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                          <StockLogo symbol={tickerOf(m.question)} size={36} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 3 }}>{m.question}</p>
                            <p className="muted num" style={{ fontSize: 12 }}>
                              YES {fmtUSDG(s1)} · NO {fmtUSDG(s0)} USDG
                              {m.resolved && !m.canceled && (
                                <>
                                  {" "}· result:{" "}
                                  <strong style={{ color: m.winner === 1 ? GREEN : RED }}>{m.winner === 1 ? "YES" : "NO"}</strong>
                                </>
                              )}
                            </p>
                          </div>
                          <span className={`chip ${st}`}>{STATUS_LABEL[st]}</span>
                        </div>
                      </Link>
                    );
                  })}
              </div>
            </>
        </>
      )}
    </main>
  );
}
