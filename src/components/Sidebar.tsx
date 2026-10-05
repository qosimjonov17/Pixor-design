import Image from "next/image";
import Link from "next/link";
import { homeHref, type Category } from "@/data/categories";
import { PLATFORMS, type Platform } from "@/data/platforms";

/** Qaysi bo'lim faol: "all" (Barchasi), platforma, yoki alohida sahifa */
export type NavSection = "all" | Platform | "designers" | "leaderboard";

type NavItem = {
  id: NavSection;
  href: string;
  label: string;
  icon: string;
  /** Faol holatdagi ikonka (dizaynda ba'zilari rangi o'zgaradi) */
  activeIcon?: string;
  /** "Barchasi" tugmasi dizaynda 48px (qator balandligi 1.25), qolganlari 49px */
  compact?: boolean;
};

const PLATFORM_ITEMS: NavItem[] = [
  {
    id: "all",
    href: "/",
    label: "Barchasi",
    icon: "/icons/grid-muted.svg",
    activeIcon: "/icons/grid.svg",
    compact: true,
  },
  ...PLATFORMS.map((p) => ({ id: p.id, href: `/?platform=${p.id}`, label: p.label, icon: p.icon })),
];

/** Platforma tugmalari tanlangan kategoriyani (Case/UI/Branding) tashlab yubormasin */
function platformItems(category: Category | null | undefined): NavItem[] {
  if (!category) return PLATFORM_ITEMS;
  return PLATFORM_ITEMS.map((item) => ({
    ...item,
    href: homeHref(item.id === "all" ? null : (item.id as Platform), category),
  }));
}

const PAGE_ITEMS: NavItem[] = [
  {
    id: "designers",
    href: "/designers",
    label: "Dizaynerlar Profili",
    icon: "/icons/users.svg",
    activeIcon: "/icons/users-active.svg",
  },
  {
    id: "leaderboard",
    href: "/leaderboard",
    label: "Yetakchilar",
    icon: "/icons/trophy.svg",
    activeIcon: "/icons/trophy-active.svg",
  },
];

function NavButton({ item, active }: { item: NavItem; active: boolean }) {
  const icon = active && item.activeIcon ? item.activeIcon : item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={
        "flex w-full items-center gap-3 p-3 text-[18px] transition-colors " +
        (item.compact ? "rounded-lg leading-[1.25] " : "rounded-xl leading-[1.4] ") +
        (active
          ? "bg-line font-semibold text-ink"
          : "font-medium text-muted hover:bg-line/60 hover:text-ink")
      }
    >
      <Image src={icon} alt="" width={24} height={24} className="size-6 shrink-0 object-contain" />
      <span className="whitespace-nowrap">{item.label}</span>
    </Link>
  );
}

export default function Sidebar({ active, category }: { active: NavSection | null; category?: Category | null }) {
  return (
    <nav
      aria-label="Bo'limlar"
      className="flex h-[calc(100dvh-32px)] max-h-[992px] w-[282px] shrink-0 flex-col gap-3 overflow-y-auto rounded-2xl border border-line bg-surface py-5"
    >
      <div className="flex w-full flex-col gap-3">
        <p className="px-4 text-[18px] leading-[1.25] font-medium text-muted">Bo’limlar</p>
        <div className="flex w-full flex-col gap-2.5 px-4">
          {platformItems(category).map((item) => (
            <NavButton key={item.id} item={item} active={active === item.id} />
          ))}
        </div>
      </div>
      <div className="flex w-full flex-col border-t border-line py-3">
        <div className="flex w-full flex-col gap-2.5 px-4">
          {PAGE_ITEMS.map((item) => (
            <NavButton key={item.id} item={item} active={active === item.id} />
          ))}
        </div>
      </div>
    </nav>
  );
}

/** Kichik ekranlar uchun: sidebar o'rniga gorizontal suriladigan menyu */
export function MobileNav({ active, category }: { active: NavSection | null; category?: Category | null }) {
  return (
    <nav aria-label="Bo'limlar" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
      {[...platformItems(category), ...PAGE_ITEMS].map((item) => {
        const isActive = active === item.id;
        const icon = isActive && item.activeIcon ? item.activeIcon : item.icon;
        return (
          <Link
            key={item.id}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={
              "flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-[15px] leading-[1.25] transition-colors " +
              (isActive
                ? "border-line bg-surface font-semibold text-ink"
                : "border-transparent font-medium text-muted hover:text-ink")
            }
          >
            <Image src={icon} alt="" width={20} height={20} className="size-5 object-contain" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
