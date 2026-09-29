import PageShell from "@/components/PageShell";
import WorkGallery from "@/components/WorkGallery";
import { getPlatform, isPlatform } from "@/data/platforms";
import { WORKS } from "@/data/works";
import { savedIdsForUser } from "@/lib/db";
import { getSession } from "@/lib/session";

export default async function Home({ searchParams }: PageProps<"/">) {
  const { platform } = await searchParams;
  const activePlatform = isPlatform(platform) ? platform : null;
  const works = activePlatform ? WORKS.filter((w) => w.platform === activePlatform) : WORKS;

  const user = await getSession();
  const savedIds = await savedIdsForUser(user?.id);

  return (
    <PageShell active={activePlatform ?? "all"}>
      <section aria-label="Ishlar" className="w-full">
        {works.length > 0 ? (
          <WorkGallery works={works} savedIds={savedIds} loggedIn={!!user} />
        ) : (
          <p className="py-20 text-center text-[15px] text-subtle">
            {activePlatform ? `${getPlatform(activePlatform).label}` : "Bu bo'limda"} hozircha ishlar
            yo&apos;q.
          </p>
        )}
      </section>
    </PageShell>
  );
}
