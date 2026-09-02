"use client";

// Swap USDG <-> tokenized stocks, live. Quotes come from the server route
// (QuoterV2 + price-impact guard + server-computed slippage floor); this page
// only signs what the server prepared: approve (exact amount) then the swap.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { encodeFunctionData, type Address } from "viem";
import { USDG } from "../../src/chain.ts";
import { erc20Abi } from "../../src/presage.ts";
import { browser } from "../../src/markets.ts";
import { STOCKS } from "../../src/stocks.ts";
import { Select } from "../select.tsx";
import { StockLogo } from "../logo.tsx";
import { useWallet, friendly } from "../wallet.ts";

interface Quote {
  amountIn: string;
  amountOutFormatted: string;
  minOutFormatted: string;
  slippageBps: number;
  impact: number;
  warning: string | null;
  tx: { to: Address; data: `0x${string}` };
  approval: { token: Address; spender: Address; amount: string };
}

const fmt = (n: number, d = 6) => n.toLocaleString("en-US", { maximumFractionDigits: d });
// Preview-only recipient before a wallet connects; the real quote re-runs on connect.
const PREVIEW = "0x0000000000000000000000000000000000000001";

function TokenPanel({ label, token, children }: { label: string; token: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="tok-panel">
      <p className="label" style={{ marginBottom: 10 }}>{label}</p>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ flex: 1, minWidth: 0 }}>{children}</span>
        {token}
      </div>
    </div>
  );
}

export default function SwapPage() {
  const w = useWallet();
  const [sym, setSym] = useState("AAPL");
  const [buy, setBuy] = useState(true); // true: USDG -> stock
  const [amount, setAmount] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const seq = useRef(0);

  const amt = Number(amount.replace(",", "."));
  const validAmt = Number.isFinite(amt) && amt > 0;

  // Debounced live quote — every keystroke resets the 450ms timer.
  useEffect(() => {
    setQuote(null);
    setErr(null);
    if (!validAmt) return;
    setQuoting(true);
    const mySeq = ++seq.current;
    const t = setTimeout(() => {
      void fetch("/api/quote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ symbol: sym, side: buy ? "buy" : "sell", amount: String(amt), recipient: w.address ?? PREVIEW }),
      })
        .then(async (r) => {
          const j = (await r.json()) as Quote & { error?: string };
          if (seq.current !== mySeq) return;
          if (j.error) setErr(j.error);
          else setQuote(j);
        })
        .catch(() => seq.current === mySeq && setErr("Couldn't reach the quoter — try again."))
        .finally(() => seq.current === mySeq && setQuoting(false));
    }, 450);
    return () => clearTimeout(t);
  }, [sym, buy, amt, validAmt, w.address]);

  const outNum = quote ? Number(quote.amountOutFormatted) : null;
  const rate = useMemo(() => {
    if (!quote || !validAmt || !outNum) return null;
    return buy ? amt / outNum : outNum / amt; // USDG per 1 stock either way
  }, [quote, validAmt, outNum, amt, buy]);

  const swap = useCallback(async () => {
    if (!quote) return;
    setErr(null);
    setNote(null);
    try {
      if (!w.address) {
        await w.connect();
        return;
      }
      const client = browser();
      const need = BigInt(quote.approval.amount);
      setBusy("approve");
      const allowance = await client.readContract({
        address: quote.approval.token,
        abi: erc20Abi,
        functionName: "allowance",
        args: [w.address, quote.approval.spender],
      });
      if (allowance < need) {
        await w.send({
          to: quote.approval.token,
          data: encodeFunctionData({ abi: erc20Abi, functionName: "approve", args: [quote.approval.spender, need] }),
        });
      }
      setBusy("swap");
      await w.send({ to: quote.tx.to, data: quote.tx.data });
      setNote(`Swap sent — you'll receive at least ${quote.minOutFormatted} ${buy ? sym : "USDG"}.`);
      setAmount("");
      setQuote(null);
    } catch (e) {
      setErr(friendly(e));
    } finally {
      setBusy(null);
    }
  }, [quote, w, buy, sym]);

  const stockChip = (
    <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 120 }}>
      <Select
        value={sym}
        options={STOCKS.map((s) => s.symbol)}
        onChange={setSym}
        render={(v) => (
          <>
            <StockLogo symbol={v} size={22} />
            <span style={{ fontWeight: 600 }}>{v}</span>
          </>
        )}
      />
    </span>
  );
  const usdgChip = (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 14px",
        border: "1px solid var(--border-strong)",
        borderRadius: 10,
        fontWeight: 600,
        fontSize: 14,
      }}
    >
      <span className="ticker" style={{ width: 22, height: 22, fontSize: 8 }}>$</span>
      USDG
    </span>
  );

  const label = busy === "approve" ? "Approving…" : busy === "swap" ? "Swapping…" : quoting ? "Quoting…" : !w.address ? "Sign in to swap" : "Swap";

  return (
    <main style={{ maxWidth: 480, margin: "0 auto" }}>
      <h1 style={{ fontSize: 26, marginBottom: 6 }}>Swap</h1>
      <p className="muted" style={{ fontSize: 14, marginBottom: 24 }}>
        Trade USDG and tokenized stocks — the same pools that settle the markets.
      </p>

      <div className="glow-card green fade-in border-run" style={{ display: "grid", gap: 10 }}>
        <div key={`from-${buy}`} className="fade-in">
          <TokenPanel label="From" token={buy ? usdgChip : stockChip}>
            <input
              className="input"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={{ border: "none", background: "transparent", fontSize: 22, fontWeight: 700, padding: 0 }}
            />
          </TokenPanel>
        </div>

        <div style={{ display: "flex", justifyContent: "center", margin: "-4px 0" }}>
          <button className="btn ghost swap-arrow" onClick={() => setBuy(!buy)} aria-label="Flip direction">
            <span className="bob" style={{ display: "inline-flex" }}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ transform: buy ? "none" : "rotate(180deg)", transition: "transform 260ms var(--ease-out)" }}
              >
                <path d="M12 3v18m0 0-6-6m6 6 6-6" />
              </svg>
            </span>
          </button>
        </div>

        <div key={`to-${buy}`} className="fade-in">
          <TokenPanel label="To (estimated)" token={buy ? stockChip : usdgChip}>
            <span className="num" style={{ fontSize: 22, fontWeight: 700, color: outNum ? "var(--text)" : "var(--faint)" }}>
              {quoting ? "…" : outNum ? fmt(outNum, buy ? 6 : 2) : "0.00"}
            </span>
          </TokenPanel>
        </div>

        <div className="muted num" style={{ fontSize: 13, display: "grid", gap: 6 }}>
          <span style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Rate</span>
            <span>{rate ? `1 ${sym} ≈ $${fmt(rate, 2)}` : "—"}</span>
          </span>
          {quote && (
            <>
              <span style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Min received ({(quote.slippageBps / 100).toFixed(1)}% slippage)</span>
                <span>{fmt(Number(quote.minOutFormatted), buy ? 6 : 2)} {buy ? sym : "USDG"}</span>
              </span>
              <span style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Price impact</span>
                <span style={{ color: quote.warning ? "#fbbf24" : "inherit" }}>{(quote.impact * 100).toFixed(2)}%</span>
              </span>
            </>
          )}
        </div>

        {quote?.warning && (
          <p style={{ fontSize: 12, color: "#fbbf24", lineHeight: 1.5 }}>⚠ {quote.warning}</p>
        )}

        <button
          className="btn green"
          style={{ width: "100%", padding: "13px 18px", fontSize: 14 }}
          disabled={busy !== null || quoting || (!quote && !!w.address)}
          onClick={() => void swap()}
        >
          {label}
        </button>
        {err && <p className="err">{err}</p>}
        {note && <p className="ok">{note}</p>}
        {w.error && <p className="err">{w.error}</p>}
      </div>
    </main>
  );
}

