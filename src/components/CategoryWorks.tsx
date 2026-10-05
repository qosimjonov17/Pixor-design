"use client";

import { usePathname, useSearchParams } from "next/navigation";
import CategoryTabs from "@/components/CategoryTabs";
import WorkGallery from "@/components/WorkGallery";
import { categoryLabel, isCategory, type Category } from "@/data/categories";
import type { Work } from "@/data/works";

/**
 * Kategoriya tablari + ishlar to'ri. Kategoriya brauzerning o'zida filtrlanadi
 * (ishlar allaqachon yuklangan) — tab darhol almashadi. Manzildagi ?category=
 * ham yangilanadi: havolani ulashish va "orqaga" tugmasi ishlaydi.
 *
 * title berilsa — Figma'dagi "Saqlangan ishlar": sarlavha chapda, tablar o'ngda.
 * Aks holda — tablar chapda, "Nta ish tanlangan" o'ngda.
 */
export default function CategoryWorks({
  works,
  savedIds,
  loggedIn,
  initialOpenId,
  title,
  emptyText,
  emptyPrefix,
}: {
  works: Work[];
  savedIds: string[];
  loggedIn: boolean;
  initialOpenId?: string;
  title?: string;
  /** Umuman ish bo'lmaganda */
  emptyText: string;
  /** "Behance" → "Behance · UI bo'limida hozircha ishlar yo'q." */
  emptyPrefix?: string;
}) {
  const pathname = usePathname();
  const params = useSearchParams();
  const param = params.get("category");
  const category: Category | null = isCategory(param) ? param : null;

  function hrefFor(next: Category | null) {
    const q = new URLSearchParams(params.toString());
    q.delete("w");
    if (next) q.set("category", next);
    else q.delete("category");
    const s = q.toString();
    return s ? `${pathname}?${s}` : pathname;
  }

  function select(next: Category | null) {
    if (next === category) return;
    window.history.pushState(null, "", hrefFor(next));
  }

  const shown = category ? works.filter((w) => w.categories.includes(category)) : works;
  const where = [emptyPrefix, category && categoryLabel(category)].filter(Boolean).join(" · ");
  const tabs = <CategoryTabs active={category} hrefFor={hrefFor} onSelect={select} />;

  return (
    <section aria-label={title ?? "Ishlar"} className="flex w-full flex-col gap-6">
      {title ? (
        <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-[28px] leading-[1.4] font-medium text-ink">{title}</h1>
          {tabs}
        </div>
      ) : (
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {tabs}
          <p className="shrink-0 font-helvetica text-[14px] leading-[1.4] text-subtle">
            <span className="text-ink">{shown.length}ta</span> ish tanlangan
          </p>
        </div>
      )}
      {shown.length > 0 ? (
        // key yo'q: tab almashganda saqlanganlar holati yo'qolmasin (?w=id faqat birinchi ochilishda ishlaydi)
        <WorkGallery works={shown} savedIds={savedIds} loggedIn={loggedIn} initialOpenId={initialOpenId} />
      ) : (
        <p className="py-20 text-center text-[15px] text-subtle">
          {works.length === 0 ? emptyText : `${where} bo'limida hozircha ishlar yo'q.`}
        </p>
      )}
    </section>
  );
}
