import type { Platform } from "./platforms";

export type Category = "case" | "ui" | "branding";

export type CategoryInfo = { id: Category; label: string };

/** Bosh sahifadagi tablar va ko'rish oynasidagi teglar shu tartibda chiqadi */
export const CATEGORIES: CategoryInfo[] = [
  { id: "case", label: "Case" },
  { id: "ui", label: "UI" },
  { id: "branding", label: "Branding" },
];

export function isCategory(value: unknown): value is Category {
  return typeof value === "string" && CATEGORIES.some((c) => c.id === value);
}

export function categoryLabel(id: Category): string {
  return CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

/** Botda oldindan belgilanadigan kategoriya: Behance — uzun keyslar, qolganlari — UI */
export function defaultCategories(platform: Platform): Category[] {
  return platform === "behance" ? ["case"] : ["ui"];
}

/** Kategoriyalarni doim bir xil tartibda qaytaradi, noma'lumlarini tashlaydi */
export function normalizeCategories(list: readonly unknown[] | null | undefined): Category[] {
  const set = new Set((list ?? []).filter(isCategory));
  return CATEGORIES.map((c) => c.id).filter((id) => set.has(id));
}

/** Bosh sahifa manzili: platforma (chap menyu) va kategoriya (tablar) birga saqlanadi */
export function homeHref(platform: Platform | null | undefined, category: Category | null | undefined): string {
  const q = new URLSearchParams();
  if (platform) q.set("platform", platform);
  if (category) q.set("category", category);
  const s = q.toString();
  return s ? `/?${s}` : "/";
}
