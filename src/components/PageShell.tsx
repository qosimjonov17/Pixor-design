import FancyButton from "@/components/FancyButton";
import Sidebar, { MobileNav, type NavSection } from "@/components/Sidebar";

/**
 * Barcha asosiy sahifalar uchun umumiy karkas:
 * chap menyu, "Bepul boshlang!" tugmasi va sarlavha.
 */
export default function PageShell({
  active,
  children,
}: {
  active: NavSection;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-[1440px] items-start gap-4 p-4">
      <div className="hidden lg:block">
        <Sidebar active={active} />
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
            <MobileNav active={active} />
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}
