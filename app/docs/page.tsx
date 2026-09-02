import type { Metadata } from "next";
import { Docs } from "./docs.tsx";

export const metadata: Metadata = {
  title: "Docs — how Presage works",
  description:
    "Technical documentation for Presage: parimutuel pool math, 30-minute Uniswap v3 TWAP resolution, market lifecycle, Showdown duels, fees, and on-chain identity.",
};

export default function DocsPage() {
  return <Docs />;
}
