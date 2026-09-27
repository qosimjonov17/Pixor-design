import type { Platform } from "./platforms";

/**
 * Dizayner profili.
 * Hozircha namuna ma'lumotlar — keyinchalik admin panel / bazadan keladi.
 */
export type Designer = {
  /** Saytdagi profil manzili: /designers/{slug} */
  slug: string;
  name: string;
  /** Asosiy platformadagi nik (@ belgisisiz) */
  handle: string;
  platform: Platform;
  /** Pixora'ga tanlangan ishlari soni */
  picks: number;
  avatar?: string;
  avatarBg: "blue" | "red" | "yellow";
  /** Kartada ko'rinadigan 3 ta ish rasmi. Bo'lmasa kulrang joy ko'rsatiladi. */
  previews: string[];
};

const AVATARS = [
  { avatar: "/avatars/arthur.png", avatarBg: "blue" as const },
  { avatar: "/avatars/nuray.png", avatarBg: "red" as const },
  { avatar: "/avatars/juma.png", avatarBg: "yellow" as const },
];

export const DESIGNERS: Designer[] = Array.from({ length: 12 }, (_, i) => ({
  slug: `qosimjonov_abdulloh_${i + 1}`,
  name: "Abdulloh Qosimjonov",
  handle: "qosimjonov_abdulloh",
  platform: "behance" as const,
  picks: 14,
  ...AVATARS[i % AVATARS.length],
  previews: [],
}));

export function getDesigner(slug: string): Designer | undefined {
  return DESIGNERS.find((d) => d.slug === slug);
}
