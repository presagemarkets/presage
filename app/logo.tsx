"use client";

import { useState } from "react";

/** Real stock logo; if both sources fail, fall back to a ticker-letter tile. */
export function StockLogo({ symbol, size = 44 }: { symbol: string | null; size?: number }) {
  const [failed, setFailed] = useState(false);
  if (!symbol || failed) {
    return (
      <span className="ticker" style={{ width: size, height: size, fontSize: size >= 44 ? 12 : 10 }}>
        {symbol ?? "◇"}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/api/logo?symbol=${symbol}`}
      alt={symbol}
      width={size}
      height={size}
      onError={() => setFailed(true)}
      style={{
        borderRadius: 12,
        background: "#ffffff",
        objectFit: "contain",
        padding: 5,
        flexShrink: 0,
        border: "1px solid var(--border-strong)",
      }}
    />
  );
}
