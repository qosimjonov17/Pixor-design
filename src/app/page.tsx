import HomeWorks from "@/components/HomeWorks";
import PageShell from "@/components/PageShell";
import { isCategory } from "@/data/categories";
import { isPlatform } from "@/data/platforms";
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
      <HomeWorks
        key={activePlatform ?? "all"}
        works={works}
        platform={activePlatform}
        savedIds={savedIds}
        loggedIn={!!user}
        initialOpenId={typeof w === "string" ? w : undefined}
      />
    </PageShell>
  );
}
