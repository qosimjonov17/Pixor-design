import PageShell from "@/components/PageShell";
import WorkGallery from "@/components/WorkGallery";
import { getPlatform, isPlatform } from "@/data/platforms";
import { savedIdsForUser } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getPublishedWorks } from "@/lib/works";

export default async function Home({ searchParams }: PageProps<"/">) {
  const { platform, w } = await searchParams;
  const activePlatform = isPlatform(platform) ? platform : null;

  const [works, user] = await Promise.all([getPublishedWorks(activePlatform), getSession()]);
  const savedIds = await savedIdsForUser(user?.id);

  return (
    <PageShell active={activePlatform ?? "all"}>
      <section aria-label="Ishlar" className="w-full">
        {works.length > 0 ? (
          <WorkGallery
            works={works}
            savedIds={savedIds}
            loggedIn={!!user}
            initialOpenId={typeof w === "string" ? w : undefined}
          />
        ) : (
          <p className="py-20 text-center text-[15px] text-subtle">
            {activePlatform
              ? `${getPlatform(activePlatform).label} bo'limida hozircha ishlar yo'q.`
              : "Tez orada birinchi ishlar qo'shiladi."}
          </p>
        )}
      </section>
    </PageShell>
  );
}
