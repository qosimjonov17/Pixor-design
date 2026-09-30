"use client";

import { usePathname, useSearchParams } from "next/navigation";
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

export function SidebarAuto() {
  return <Sidebar active={useActiveSection()} />;
}

export function MobileNavAuto() {
  return <MobileNav active={useActiveSection()} />;
}
