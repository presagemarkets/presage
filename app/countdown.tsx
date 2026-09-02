"use client";

import { useEffect, useState } from "react";
import { fmtCountdown } from "../src/markets.ts";

/** Live countdown — ticks every second on the client, initial render from the server. */
export function Countdown({ until }: { until: number }) {
  const [, force] = useState(0);
  useEffect(() => {
    const t = setInterval(() => force((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);
  return <span className="num">{fmtCountdown(until)}</span>;
}
