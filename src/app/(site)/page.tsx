import type { Metadata } from "next";
import HomeView from "@/components/HomeView";

export const metadata: Metadata = {
  title: "Phoenix of War 973 — PHW",
  description:
    "Phoenix of War 973 (PHW) — alliance family hub: guides, rules, and everything members need in one place.",
};

export default function HomePage() {
  return <HomeView />;
}
