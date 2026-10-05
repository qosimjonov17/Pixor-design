"use client";

import Link from "next/link";
import { CATEGORIES, homeHref, type Category } from "@/data/categories";
import type { Platform } from "@/data/platforms";

const base =
  "flex h-[34px] min-w-0 flex-1 items-center justify-center overflow-hidden rounded-lg px-3 text-[14px] leading-[normal] font-medium whitespace-nowrap transition-colors";

/** Figma: "Barchasi · Case · UI · Branding" + "23ta ish tanlangan" */
export default function CategoryTabs({
  platform,
  active,
  count,
  onSelect,
}: {
  platform: Platform | null;
  active: Category | null;
  count: number;
  /** Bosilganda serverga bormasdan darhol filtrlash */
  onSelect: (category: Category | null) => void;
}) {
  const tabs: { id: Category | null; label: string }[] = [{ id: null, label: "Barchasi" }, ...CATEGORIES];

  return (
    <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <nav aria-label="Kategoriyalar" className="flex w-full gap-2 sm:w-[450px]">
        {tabs.map((tab) => {
          const isActive = tab.id === active;
          return (
            <Link
              key={tab.label}
              href={homeHref(platform, tab.id)}
              aria-current={isActive ? "page" : undefined}
              onClick={(e) => {
                // Yangi oynada ochish (Ctrl/Cmd/o'rta tugma) odatdagidek ishlasin
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                e.preventDefault();
                onSelect(tab.id);
              }}
              className={
                base +
                (isActive
                  ? " border border-white/12 bg-[#171717] bg-[linear-gradient(180deg,rgba(255,255,255,0.16)_0%,rgba(255,255,255,0)_100%)] text-white shadow-[0px_1px_2px_0px_rgba(27,28,29,0.48),0px_0px_0px_1px_#242628]"
                  : " bg-surface text-muted shadow-[0px_1px_3px_0px_rgba(14,18,27,0.12),0px_0px_0px_1px_#ebebeb] hover:text-ink")
              }
              style={{ fontFeatureSettings: '"calt" 0, "liga" 0' }}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
      <p className="shrink-0 font-helvetica text-[14px] leading-[1.4] text-subtle">
        <span className="text-ink">{count}ta</span> ish tanlangan
      </p>
    </div>
  );
}
