import CategoryTabs from "@/components/CategoryTabs";
import PageShell from "@/components/PageShell";
import WorkGallery from "@/components/WorkGallery";
import { categoryLabel, isCategory } from "@/data/categories";
import { getPlatform, isPlatform } from "@/data/platforms";
import { savedIdsForUser } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getPublishedWorks } from "@/lib/works";

export default async function Home({ searchParams }: PageProps<"/">) {
  const { platform, category, w } = await searchParams;
  const activePlatform = isPlatform(platform) ? platform : null;
  const activeCategory = isCategory(category) ? category : null;

  const [allWorks, user] = await Promise.all([getPublishedWorks(activePlatform), getSession()]);
  const works = activeCategory ? allWorks.filter((work) => work.categories.includes(activeCategory)) : allWorks;
  const savedIds = await savedIdsForUser(user?.id);

  const where = [activePlatform && getPlatform(activePlatform).label, activeCategory && categoryLabel(activeCategory)]
    .filter(Boolean)
    .join(" · ");

  return (
    <PageShell active={activePlatform ?? "all"} category={activeCategory}>
      <section aria-label="Ishlar" className="flex w-full flex-col gap-6">
        <CategoryTabs platform={activePlatform} active={activeCategory} count={works.length} />
        {works.length > 0 ? (
          <WorkGallery
            key={`${activePlatform ?? "all"}-${activeCategory ?? "all"}`}
            works={works}
            savedIds={savedIds}
            loggedIn={!!user}
            initialOpenId={typeof w === "string" ? w : undefined}
          />
        ) : (
          <p className="py-20 text-center text-[15px] text-subtle">
            {where ? `${where} bo'limida hozircha ishlar yo'q.` : "Tez orada birinchi ishlar qo'shiladi."}
          </p>
        )}
      </section>
    </PageShell>
  );
}
