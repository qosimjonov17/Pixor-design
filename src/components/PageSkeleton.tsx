import { Suspense } from "react";
import Sidebar, { MobileNav } from "./Sidebar";
import { MobileNavAuto, SidebarAuto } from "./SidebarAuto";

/**
 * Sahifa yuklanayotganda darhol ko'rinadigan skelet (loading.tsx fayllari uchun).
 * Menyu va sarlavha joyida turadi, faqat kartalar o'rnida kulrang bloklar.
 */
export default function PageSkeleton({
  hero = true,
  variant = "works",
}: {
  hero?: boolean;
  variant?: "works" | "designers" | "none";
}) {
  return (
    <div
      className="mx-auto flex max-w-[2880px] items-start gap-4 p-4"
      aria-busy="true"
    >
      <div className="sticky top-4 hidden self-start lg:block">
        <Suspense fallback={<Sidebar active={null} />}>
          <SidebarAuto />
        </Suspense>
      </div>

      <main
        className={`flex min-w-0 flex-1 flex-col items-end py-4 ${hero ? "gap-[50px]" : "gap-8"}`}
      >
        <header className="flex w-full flex-col items-end gap-8">
          <div className="h-10 w-10 animate-pulse rounded-full bg-placeholder" />
          {hero && (
            <div className="flex w-full flex-col items-center gap-4 text-center">
              <h1 className="text-[26px] leading-[1.25] font-medium text-ink sm:text-[32px]">
                <span className="font-bold text-brand">Soatlab qidirmang</span>
                <span className="text-brand">.</span>
                <br />
                Eng yaxshisini shu yerdan toping
              </h1>
              <p className="max-w-[424px] font-helvetica text-[14px] leading-[1.4] text-subtle">
                Global dizayn hamjamiyatining eng top ishlari sizning
                qulayligingiz uchun bitta toza va saralangan lentada.
              </p>
            </div>
          )}
          <div className="w-full lg:hidden">
            <Suspense fallback={<MobileNav active={null} />}>
              <MobileNavAuto />
            </Suspense>
          </div>
        </header>

        {variant === "works" && (
          <div className="flex w-full flex-col gap-6">
            {hero && (
              <div className="flex w-full gap-2 sm:w-[450px]">
                {[0, 1, 2, 3].map((j) => (
                  <div
                    key={j}
                    className="h-[34px] flex-1 animate-pulse rounded-lg bg-placeholder"
                  />
                ))}
              </div>
            )}
            <div className="grid w-full grid-cols-1 gap-x-3 gap-y-5 sm:grid-cols-2 lg:grid-cols-3 3xl:grid-cols-4">
              {Array.from({ length: 9 }, (_, i) => (
                <div key={i} className="flex flex-col gap-2">
                  <div className="aspect-[362/270] w-full animate-pulse rounded-[32px] bg-placeholder" />
                  <div className="flex items-center gap-3">
                    <div className="size-10 shrink-0 animate-pulse rounded-full bg-placeholder" />
                    <div className="flex flex-1 flex-col gap-1.5">
                      <div className="h-3.5 w-1/3 animate-pulse rounded bg-placeholder" />
                      <div className="h-3 w-2/3 animate-pulse rounded bg-placeholder" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {variant === "designers" && (
          <div className="grid w-full grid-cols-1 gap-x-3 gap-y-4 sm:grid-cols-2 lg:grid-cols-3 3xl:grid-cols-4">
            {Array.from({ length: 6 }, (_, i) => (
              <div
                key={i}
                className="flex flex-col gap-3.5 rounded-3xl border border-placeholder bg-surface p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="size-[52px] shrink-0 animate-pulse rounded-full bg-placeholder" />
                  <div className="flex flex-1 flex-col gap-1.5">
                    <div className="h-4 w-1/2 animate-pulse rounded bg-placeholder" />
                    <div className="h-3 w-1/3 animate-pulse rounded bg-placeholder" />
                  </div>
                </div>
                <div className="flex gap-1.5">
                  {[0, 1, 2].map((j) => (
                    <div
                      key={j}
                      className="aspect-[110/80] flex-1 animate-pulse rounded-[10px] bg-thumb"
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
