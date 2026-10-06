import type { Platform } from "./platforms";

/**
 * Dizaynerlar sahifasidagi karta ma'lumoti.
 * Dizaynerlar Supabase'dagi "designers" jadvalidan keladi (bot ish qo'shganda yaratiladi).
 */
export type Designer = {
  /** Saytdagi profil manzili: /designers/{slug} */
  slug: string;
  name: string;
  /** Platformadagi nik (@ belgisisiz) */
  handle?: string;
  platform?: Platform;
  /** Pixor'ga tanlangan ishlari soni */
  picks: number;
  avatar?: string;
  avatarBg: "blue" | "red" | "yellow";
  /** Kartada ko'rinadigan 3 ta ish rasmi. Bo'lmasa kulrang joy ko'rsatiladi. */
  previews: string[];
};

const AVATAR_BGS = ["blue", "red", "yellow"] as const;

export function avatarBgFor(name: string) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_BGS[h % AVATAR_BGS.length];
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => [...p][0] ?? "")
    .filter((c) => /\p{L}|\p{N}/u.test(c))
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
