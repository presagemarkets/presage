# Presage

Parimutuel prediction markets and 1v1 duels on tokenized stocks, live on Robinhood Chain.
Every market settles itself from a 30-minute Uniswap v3 TWAP — no oracle feed, no judges, no disputes.

- **App:** https://app.presagemarkets.org
- **Docs:** https://presagemarkets.org/docs

## What it does

- **Up / down** — bet whether a stock closes green or red over a window.
- **Over / under** — bet whether a stock finishes above or below a chosen price.
- **Stock duel** — back the stock you think gains more between two.
- **Showdown 1v1** — post a champion stock + stake; a rival answers with theirs, highest return takes the pot.

Bets are placed in USDG (6-decimal stablecoin). The house fee is a flat 2%, taken only from the losing side.

## Stack

- **Contracts** — Solidity + Foundry. `HoodBet` (parimutuel core), `TwapResolver` (price templates),
  `StockDuel` (duels), `AdminResolver`, `ProfileRegistry`. See `contracts/`.
- **App** — Next.js (App Router) + viem + Privy auth. Plain CSS, no UI framework. See `app/` and `src/`.

## Develop

```bash
npm install
cp .env.example .env   # fill in Privy keys
npm run dev
```

Contracts:

```bash
cd contracts
forge build
forge test
```

## Contracts (Robinhood Chain · EVM 4663)

| Contract | Address |
| --- | --- |
| HoodBet | `0xfcfbb9365ffb00d153ba73162c178916855f8b3b` |
| TwapResolver | `0x9249c9EeDdd5188eaC6E86c804a1255249F1CEc3` |
| StockDuel | `0x646c1bf51d20ce0d794fbaebdb9bc17a110c9d9f` |
| AdminResolver | `0x6fc7dbbd27039d77f4f22d10e67938e4bddb4d31` |
| ProfileRegistry | `0x47c9908766ef11f69caf120134f6e9c6ab23201b` |
