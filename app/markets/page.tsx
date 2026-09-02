import Link from "next/link";
import { server } from "../../src/chain.ts";
import { PRESAGE_ADDRESS } from "../../src/presage.ts";
import { fetchCreators, fetchMarkets, status, type Market } from "../../src/markets.ts";
import { fetchOpenDuels, type OpenDuel } from "../../src/duel.ts";
import { Banner, DuelCard, MarketCard } from "../ui.tsx";
import { Slider } from "../slider.tsx";

export const revalidate = 10;

const TABS = [
  { key: "all", label: "All" },
  { key: "rounds", label: "Daily rounds" },
  { key: "duels", label: "Duels" },
  { key: "open", label: "Open" },
  { key: "settled", label: "Settled" },
] as const;
type Tab = (typeof TABS)[number]["key"];

function filter(markets: Market[], tab: Tab): Market[] {
  switch (tab) {
    case "rounds":
      return markets.filter((m) => m.question.startsWith("Daily:"));
    case "duels":
      return markets.filter((m) => /duel|outperform/i.test(m.question));
    case "open":
      return markets.filter((m) => status(m) === "open");
    case "settled":
      return markets.filter((m) => m.resolved || m.canceled);
    default:
      return markets;
  }
}

export default async function Markets({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const tabParam = (await searchParams).tab;
  const tab: Tab = (TABS.find((t) => t.key === tabParam)?.key ?? "all") as Tab;

  let markets: Market[] = [];
  let broken = false;
  let creators = new Map<number, `0x${string}`>();
  let duels: OpenDuel[] = [];
  try {
    const client = server();
    markets = await fetchMarkets(client);
    creators = await fetchCreators(client);
    duels = await fetchOpenDuels(client);
  } catch {
    broken = true;
  }
  const shownDuels = duels;
  const shown = filter(markets, tab);
  const isAuto = (m: Market) => m.question.startsWith("Daily:") || m.question.startsWith("Weekly");
  const rounds = shown.filter(isAuto);
  // Canceled markets only belong in the Settled tab — keep them out of the main view.
  const community = shown.filter((m) => !isAuto(m) && (tab === "settled" || !m.canceled));

  return (
      <main>
        <Banner />

        {!PRESAGE_ADDRESS ? (
          <p className="card muted">Contracts not deployed yet. Run contracts/deploy.ps1, then restart the server.</p>
        ) : broken ? (
          <p className="card err">Couldn&apos;t read the chain — try reloading.</p>
        ) : markets.length === 0 ? (
          <p className="card muted">
            No markets yet. <Link href="/create" style={{ textDecoration: "underline" }}>Create the first one</Link>.
          </p>
        ) : (
          <>
            <div className="tabs">
              {TABS.map((t) => (
                <Link key={t.key} href={t.key === "all" ? "/markets" : `/markets?tab=${t.key}`} className={`tab ${tab === t.key ? "on" : ""}`}>
                  {t.label}
                </Link>
              ))}
            </div>
            {shown.length === 0 ? (
              <p className="card muted">Nothing here yet.</p>
            ) : (
              <>
                {rounds.length > 0 && (
                  <Slider
                    title={<span className="label" style={{ color: "#4ade80" }}>⚙ Daily rounds</span>}
                    note="auto-created · settle at U.S. market close"
                  >
                    {rounds.map((m) => (
                      <MarketCard key={m.id} m={m} auto />
                    ))}
                  </Slider>
                )}
                {tab === "all" && shownDuels.length > 0 && (
                  <>
                    <div className="sec-head">
                      <span className="label" style={{ color: "#4ade80" }}>⚔ Showdown challenges</span>
                      <span className="sec-line" />
                      <Link href="/showdown" className="label" style={{ color: "var(--dim)" }}>view all →</Link>
                    </div>
                    <div className="grid-cards" style={{ marginBottom: 34 }}>
                      {shownDuels.slice(0, 3).map((d) => (
                        <DuelCard key={d.id} id={d.id} creator={d.creator} symbol={d.symbol} stake={d.stake} days={d.days} />
                      ))}
                    </div>
                  </>
                )}
                {community.length > 0 && (
                  <>
                    <div className="sec-head">
                      <span className="label">◆ Community markets</span>
                      <span className="sec-line" />
                    </div>
                    <div className="grid-cards">
                      {community.map((m) => (
                        <MarketCard key={m.id} m={m} creator={creators.get(m.id)} />
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </>
        )}
      </main>
  );
}
