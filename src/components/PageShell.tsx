import type { Category } from "@/data/categories";
import FancyButton from "@/components/FancyButton";
import { Suspense } from "react";
import Sidebar, { MobileNav, type NavSection } from "@/components/Sidebar";
import { MobileNavAuto, SidebarAuto } from "@/components/SidebarAuto";
import UserMenu from "@/components/UserMenu";
import { getSession } from "@/lib/session";

/**
 * Barcha asosiy sahifalar uchun umumiy karkas:
 * chap menyu, "Bepul boshlang!" tugmasi va sarlavha.
 */
export default async function PageShell({
  active,
  hero = true,
  tight = false,
  category,
  children,
}: {
  /** Bosh sahifada tanlangan kategoriya — menyudagi platforma havolalari uni saqlaydi */
  category?: Category | null;
  /** Menyuda faol bo'lim; null — hech biri (masalan, Saqlanganlar) */
  active: NavSection | null;
  /** Sarlavha ("Soatlab qidirmang...") ko'rsatilsinmi. "Tez kunda" sahifalarida yo'q. */
  hero?: boolean;
  /** Sarlavhasiz, lekin kontent tugmaga yaqin turadigan sahifalar (Saqlanganlar) */
  tight?: boolean;
  children: React.ReactNode;
}) {
  const user = await getSession();

  return (
    <div className="mx-auto flex max-w-[2880px] items-start gap-4 p-4">
      {/* Menyu scroll paytida ekranda qotib turadi (sticky o'rovchi blokda bo'lishi shart) */}
      <div className="sticky top-4 hidden self-start lg:block">
        {/* Tab bosilganda manzil brauzerda o'zgaradi — menyu havolalari ham shundan o'qiydi */}
        <Suspense fallback={<Sidebar active={active} category={category} />}>
          <SidebarAuto />
        </Suspense>
      </div>

      <main
        className={`flex min-w-0 flex-1 flex-col items-end py-4 ${hero ? "gap-[50px]" : tight ? "gap-8" : "gap-16 lg:gap-[150px]"}`}
      >
        <header className="flex w-full flex-col items-end gap-8">
          {user ? <UserMenu user={user} /> : <FancyButton href="/signup">Bepul boshlang!</FancyButton>}

          {hero && (
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
          )}

          <div className="w-full lg:hidden">
            <Suspense fallback={<MobileNav active={active} category={category} />}>
              <MobileNavAuto />
            </Suspense>
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}
