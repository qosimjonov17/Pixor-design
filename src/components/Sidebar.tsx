import Image from "next/image";
import Link from "next/link";
import { PLATFORMS, type Platform } from "@/data/platforms";

type NavItem = {
  href: string;
  label: string;
  icon: string;
  active: boolean;
};

function NavButton({ href, label, icon, active }: NavItem) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={
        "flex w-full items-center gap-3 p-3 transition-colors " +
        (active
          ? "rounded-lg bg-line text-[18px] leading-[1.25] font-semibold text-ink"
          : "rounded-xl text-[18px] leading-[1.4] font-medium text-muted hover:bg-line/60 hover:text-ink")
      }
    >
      <Image src={icon} alt="" width={24} height={24} className="size-6 shrink-0 object-contain" />
      <span className="whitespace-nowrap">{label}</span>
    </Link>
  );
}

export default function Sidebar({ activePlatform }: { activePlatform: Platform | null }) {
  const platformItems: NavItem[] = [
    { href: "/", label: "Barchasi", icon: "/icons/grid.svg", active: activePlatform === null },
    ...PLATFORMS.map((p) => ({
      href: `/?platform=${p.id}`,
      label: p.label,
      icon: p.icon,
      active: activePlatform === p.id,
    })),
  ];

  const pageItems: NavItem[] = [
    { href: "/designers", label: "Dizaynerlar Profili", icon: "/icons/users.svg", active: false },
    { href: "/leaderboard", label: "Yetakchilar", icon: "/icons/trophy.svg", active: false },
  ];

  return (
    <nav
      aria-label="Bo'limlar"
      className="sticky top-4 flex h-[calc(100dvh-32px)] max-h-[992px] w-[282px] shrink-0 flex-col gap-3 overflow-y-auto rounded-2xl border border-line bg-surface py-5"
    >
      <div className="flex w-full flex-col gap-3">
        <p className="px-4 text-[18px] leading-[1.25] font-medium text-muted">Bo’limlar</p>
        <div className="flex w-full flex-col gap-2.5 px-4">
          {platformItems.map((item) => (
            <NavButton key={item.href} {...item} />
          ))}
        </div>
      </div>
      <div className="flex w-full flex-col border-t border-line py-3">
        <div className="flex w-full flex-col gap-2.5 px-4">
          {pageItems.map((item) => (
            <NavButton key={item.href} {...item} />
          ))}
        </div>
      </div>
    </nav>
  );
}

/** Kichik ekranlar uchun: sidebar o'rniga gorizontal filtr qatori */
export function MobileFilters({ activePlatform }: { activePlatform: Platform | null }) {
  const items = [
    { href: "/", label: "Barchasi", icon: "/icons/grid.svg", active: activePlatform === null },
    ...PLATFORMS.map((p) => ({
      href: `/?platform=${p.id}`,
      label: p.label,
      icon: p.icon,
      active: activePlatform === p.id,
    })),
  ];

  return (
    <nav aria-label="Platformalar" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item.active ? "page" : undefined}
          className={
            "flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-[15px] leading-[1.25] transition-colors " +
            (item.active
              ? "border-line bg-surface font-semibold text-ink"
              : "border-transparent font-medium text-muted hover:text-ink")
          }
        >
          <Image src={item.icon} alt="" width={20} height={20} className="size-5 object-contain" />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
