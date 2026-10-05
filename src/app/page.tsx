import CategoryWorks from "@/components/CategoryWorks";
import PageShell from "@/components/PageShell";
import { isCategory } from "@/data/categories";
import { getPlatform, isPlatform } from "@/data/platforms";
import { savedIdsForUser } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getPublishedWorks } from "@/lib/works";

export default async function Home({ searchParams }: PageProps<"/">) {
  const { platform, category, w } = await searchParams;
  const activePlatform = isPlatform(platform) ? platform : null;

  // Kategoriya brauzerda filtrlanadi (HomeWorks) — tab bosilganda serverga borilmaydi
  const [works, user] = await Promise.all([getPublishedWorks(activePlatform), getSession()]);
  const savedIds = await savedIdsForUser(user?.id);

  return (
    <PageShell active={activePlatform ?? "all"} category={isCategory(category) ? category : null}>
      <CategoryWorks
        key={activePlatform ?? "all"}
        works={works}
        emptyPrefix={activePlatform ? getPlatform(activePlatform).label : undefined}
        emptyText={
          activePlatform
            ? `${getPlatform(activePlatform).label} bo'limida hozircha ishlar yo'q.`
            : "Tez orada birinchi ishlar qo'shiladi."
        }
        savedIds={savedIds}
        loggedIn={!!user}
        initialOpenId={typeof w === "string" ? w : undefined}
      />
    </PageShell>
  );
}
