import PageShell from "@/components/PageShell";
import WorkCard from "@/components/WorkCard";
import { getPlatform, isPlatform } from "@/data/platforms";
import { WORKS } from "@/data/works";

export default async function Home({ searchParams }: PageProps<"/">) {
  const { platform } = await searchParams;
  const activePlatform = isPlatform(platform) ? platform : null;
  const works = activePlatform ? WORKS.filter((w) => w.platform === activePlatform) : WORKS;

  return (
    <PageShell active={activePlatform ?? "all"}>
      <section aria-label="Ishlar" className="w-full">
        {works.length > 0 ? (
          <div className="grid grid-cols-1 gap-x-3 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
            {works.map((work) => (
              <WorkCard key={work.id} work={work} />
            ))}
          </div>
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
