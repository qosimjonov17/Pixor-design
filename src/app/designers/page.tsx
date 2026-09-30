import type { Metadata } from "next";
import DesignerCard from "@/components/DesignerCard";
import PageShell from "@/components/PageShell";
import { avatarBgFor, type Designer } from "@/data/designers";
import { getDesignersWithStats } from "@/lib/designers";

export const metadata: Metadata = {
  title: "Dizaynerlar Profili — Pixora",
};

export default async function DesignersPage() {
  const designers: Designer[] = (await getDesignersWithStats()).map((d) => ({
    slug: d.slug,
    name: d.name,
    handle: d.handle ?? undefined,
    platform: d.platform ?? undefined,
    picks: d.picks,
    avatar: d.avatar_url ?? undefined,
    avatarBg: avatarBgFor(d.name),
    previews: d.previews,
  }));

  return (
    <PageShell active="designers">
      <section aria-label="Dizaynerlar" className="w-full">
        {designers.length === 0 ? (
          <p className="py-20 text-center text-[16px] leading-[1.4] text-subtle">
            Tez orada birinchi dizaynerlar qo&apos;shiladi.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-x-3 gap-y-4 sm:grid-cols-2 lg:grid-cols-3 3xl:grid-cols-4">
            {designers.map((designer) => (
              <DesignerCard key={designer.slug} designer={designer} />
            ))}
          </div>
        )}
      </section>
    </PageShell>
  );
}
