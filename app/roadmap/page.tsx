import type { Metadata } from "next";
import { Roadmap } from "./roadmap.tsx";

export const metadata: Metadata = {
  title: "Roadmap — what's next for Presage",
  description: "Presage feature roadmap: shipped, in progress, and planned across four phases.",
};

export default function RoadmapPage() {
  return <Roadmap />;
}
