import type { Metadata } from "next";
import DesignerCard from "@/components/DesignerCard";
import PageShell from "@/components/PageShell";
import { DESIGNERS } from "@/data/designers";

export const metadata: Metadata = {
  title: "Dizaynerlar Profili — Pixora",
};

export default function DesignersPage() {
  return (
    <PageShell active="designers">
      <section aria-label="Dizaynerlar" className="w-full">
        <div className="grid grid-cols-1 gap-x-3 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          {DESIGNERS.map((designer) => (
            <DesignerCard key={designer.slug} designer={designer} />
          ))}
        </div>
      </section>
    </PageShell>
  );
}
