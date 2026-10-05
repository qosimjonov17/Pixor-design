"use client";

import { useSearchParams } from "next/navigation";
import CategoryTabs from "@/components/CategoryTabs";
import WorkGallery from "@/components/WorkGallery";
import { categoryLabel, homeHref, isCategory, type Category } from "@/data/categories";
import { getPlatform, type Platform } from "@/data/platforms";
import type { Work } from "@/data/works";

/**
 * Bosh sahifadagi tablar + ishlar. Kategoriya brauzerning o'zida filtrlanadi
 * (ishlar allaqachon yuklangan), shuning uchun tab darhol almashadi.
 * Manzil (?category=) ham yangilanadi — havolani ulashish va "orqaga" ishlaydi.
 */
export default function HomeWorks({
  works,
  platform,
  savedIds,
  loggedIn,
  initialOpenId,
}: {
  works: Work[];
  platform: Platform | null;
  savedIds: string[];
  loggedIn: boolean;
  initialOpenId?: string;
}) {
  const param = useSearchParams().get("category");
  const category: Category | null = isCategory(param) ? param : null;

  function select(next: Category | null) {
    if (next === category) return;
    window.history.pushState(null, "", homeHref(platform, next));
  }

  const shown = category ? works.filter((w) => w.categories.includes(category)) : works;
  const where = [platform && getPlatform(platform).label, category && categoryLabel(category)]
    .filter(Boolean)
    .join(" · ");

  return (
    <section aria-label="Ishlar" className="flex w-full flex-col gap-6">
      <CategoryTabs platform={platform} active={category} count={shown.length} onSelect={select} />
      {shown.length > 0 ? (
        // key yo'q: tab almashganda saqlanganlar holati yo'qolmasin (?w=id faqat birinchi ochilishda ishlaydi)
        <WorkGallery works={shown} savedIds={savedIds} loggedIn={loggedIn} initialOpenId={initialOpenId} />
      ) : (
        <p className="py-20 text-center text-[15px] text-subtle">
          {where ? `${where} bo'limida hozircha ishlar yo'q.` : "Tez orada birinchi ishlar qo'shiladi."}
        </p>
      )}
    </section>
  );
}
