// Shared demo data for leaderboard & profiles — shown while there are no
// real bets yet, always labeled "demo data" in the UI.

export interface DemoRow {
  address: `0x${string}`;
  volume: bigint;
  bets: number;
  wins: number;
  losses: number;
  pnl: bigint;
  history: readonly number[];
}

export const DEMO: readonly DemoRow[] = [
  { address: "0x7fA2c9b1D34e5F60718293aBcD45671890fEdC12", volume: 4_820_000_000n, bets: 61, wins: 38, losses: 19, pnl: 1_264_500_000n, history: [210, 155, 480, 640, 555, 830, 1010, 964, 1264.5] },
  { address: "0x3B91e4F2a6C8d51290AbCdEf3456789012345678", volume: 2_150_000_000n, bets: 34, wins: 21, losses: 11, pnl: 588_200_000n, history: [90, 260, 205, 340, 470, 588.2] },
  { address: "0x5891C24807356164c481DA2D9a85b5EF65f542F7", volume: 1_760_000_000n, bets: 42, wins: 20, losses: 20, pnl: 213_750_000n, history: [120, -40, 85, 30, 180, 213.75] },
  { address: "0x9Cd3f7E8B2a1046573829FeDcBa09876543210Ab", volume: 980_000_000n, bets: 17, wins: 9, losses: 7, pnl: 92_400_000n, history: [30, -15, 60, 92.4] },
  { address: "0x1a2B3c4D5e6F7081920AbCdEf1234567890aBcDe", volume: 3_400_000_000n, bets: 55, wins: 24, losses: 29, pnl: -148_900_000n, history: [60, -80, -20, -148.9] },
  { address: "0x6EeF0a1B2c3D4e5F60718293A4b5C6d7E8f90123", volume: 620_000_000n, bets: 12, wins: 4, losses: 8, pnl: -276_300_000n, history: [-90, -150, -110, -276.3] },
  { address: "0x4dC5b6A7980f1E2d3C4b5A69788796a5B4c3D2e1", volume: 1_120_000_000n, bets: 28, wins: 10, losses: 18, pnl: -455_100_000n, history: [-120, -260, -190, -455.1] },
];

export const demoByAddress = (a: string) => DEMO.find((d) => d.address.toLowerCase() === a.toLowerCase());

/** Demo open duel challenges for the markets page while none exist on-chain. */
export const DEMO_DUELS = [
  { id: 0, creator: DEMO[0].address, symbol: "NVDA", stake: 25_000_000n, days: 1 },
  { id: 1, creator: DEMO[1].address, symbol: "TSLA", stake: 50_000_000n, days: 7 },
  { id: 2, creator: DEMO[3].address, symbol: "GME", stake: 10_000_000n, days: 1 },
] as const;

/** Demo cumulative curves for the stats page charts (USDG). */
export const DEMO_SERIES = {
  volume: [850, 2100, 3400, 4100, 5600, 7200, 8100, 9800, 11250, 12400, 13600, 14850],
  paidOut: [0, 400, 1300, 2100, 3900, 4700, 5900, 7300, 8500, 9437.5],
};

/** Platform-wide demo totals for the stats page (same shape as stats.ts Totals). */
export const DEMO_TOTALS = {
  players: DEMO.length,
  bets: DEMO.reduce((n, u) => n + u.bets, 0),
  volume: DEMO.reduce((n, u) => n + u.volume, 0n),
  paidOut: 9_437_500_000n,
  fees: 297_200_000n,
  markets: 42,
  settled: 31,
  active: 6,
  vol24: 1_250_000_000n,
  paid24: 937_500_000n,
};
