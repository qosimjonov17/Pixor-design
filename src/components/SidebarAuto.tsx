"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { isCategory } from "@/data/categories";
import { isPlatform } from "@/data/platforms";
import Sidebar, { MobileNav, type NavSection } from "./Sidebar";

/** Faol bo'limni manzildan aniqlaydi — sahifa yuklanayotganda ham to'g'ri tugma belgilanib turadi */
function useActiveSection(): NavSection | null {
  const pathname = usePathname();
  const platform = useSearchParams().get("platform");
  if (pathname === "/") return isPlatform(platform) ? platform : "all";
  if (pathname.startsWith("/designers")) return "designers";
  if (pathname.startsWith("/leaderboard")) return "leaderboard";
  return null;
}

function useCategory() {
  const c = useSearchParams().get("category");
  return usePathname() === "/" && isCategory(c) ? c : null;
}

export function SidebarAuto() {
  return <Sidebar active={useActiveSection()} category={useCategory()} />;
}

export function MobileNavAuto() {
  return <MobileNav active={useActiveSection()} category={useCategory()} />;
}
