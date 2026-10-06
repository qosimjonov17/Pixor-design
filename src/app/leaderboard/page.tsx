import type { Metadata } from "next";
import ComingSoonSection from "@/components/ComingSoonSection";
import PageShell from "@/components/PageShell";

export const metadata: Metadata = {
  title: "Yetakchilar — Pixor",
};

export default function LeaderboardPage() {
  return (
    <PageShell active="leaderboard" hero={false}>
      <ComingSoonSection description="Yetakchilar sahifasi tez kunda ishga tushadi" />
    </PageShell>
  );
}
