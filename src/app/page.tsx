import FancyButton from "@/components/FancyButton";
import Sidebar, { MobileFilters } from "@/components/Sidebar";
import WorkCard from "@/components/WorkCard";
import { getPlatform, isPlatform } from "@/data/platforms";
import { WORKS } from "@/data/works";

export default async function Home({ searchParams }: PageProps<"/">) {
  const { platform } = await searchParams;
  const activePlatform = isPlatform(platform) ? platform : null;
  const works = activePlatform ? WORKS.filter((w) => w.platform === activePlatform) : WORKS;

  return (
    <div className="mx-auto flex max-w-[1440px] items-start gap-4 p-4">
      <div className="hidden lg:block">
        <Sidebar activePlatform={activePlatform} />
      </div>

      <main className="flex min-w-0 flex-1 flex-col items-end gap-[50px] py-4">
        <header className="flex w-full flex-col items-end gap-8">
          <FancyButton href="/signup">Bepul boshlang!</FancyButton>

          <div className="flex w-full flex-col items-center gap-4 text-center">
            <h1 className="text-[26px] leading-[1.25] font-medium text-ink sm:text-[32px]">
              <span className="font-bold text-brand">Soatlab qidirmang</span>
              <span className="text-brand">.</span>
              <br />
              Eng yaxshisini shu yerdan toping
            </h1>
            <p className="max-w-[424px] font-helvetica text-[14px] leading-[1.4] text-subtle">
              Global dizayn hamjamiyatining eng top ishlari sizning qulayligingiz uchun bitta toza va
              saralangan lentada.
            </p>
          </div>

          <div className="w-full lg:hidden">
            <MobileFilters activePlatform={activePlatform} />
          </div>
        </header>

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
      </main>
    </div>
  );
}
