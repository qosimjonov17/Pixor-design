import type { Platform } from "./platforms";

/**
 * Galereyadagi bitta ish.
 * Hozircha namuna ma'lumotlar. Keyinchalik bu ro'yxat admin panel
 * yoki ma'lumotlar bazasidan keladi — sahifa kodi o'zgarmaydi.
 */
export type Work = {
  /** Doimiy identifikator — "saqlanganlar" bazada shu bilan bog'lanadi, o'zgartirmang */
  id: string;
  title: string;
  platform: Platform;
  /** Asl postga havola (Behance, Dribbble, X yoki Dprofile) */
  url: string;
  /** Ishning preview rasmi. Bo'lmasa kulrang joy ko'rsatiladi. */
  image?: string;
  /** Ko'rish oynasidagi qisqa tavsif */
  description?: string;
  designer: {
    name: string;
    /** Platformadagi nik (@ belgisisiz) */
    handle?: string;
    avatar?: string;
    /** Avatar orqa foni: dizayndagi blue/red/yellow 200 */
    avatarBg: "blue" | "red" | "yellow";
  };
};

const arthur = {
  name: "Abdulloh Qosimjonov",
  handle: "qosimjonov_abdulloh",
  avatar: "/avatars/arthur.png",
  avatarBg: "blue" as const,
};
const nuray = { ...arthur, avatar: "/avatars/nuray.png", avatarBg: "red" as const };
const juma = { ...arthur, avatar: "/avatars/juma.png", avatarBg: "yellow" as const };

const sample = {
  title: "Bright Future App | Mobile App Design",
  description:
    "Bright Future - bu o‘quv markazlari uchun kurslarni boshqarish, o‘zlashtirishni (natijalarni) kuzatib borish va muloqot qilishni osonlashtiruvchi mobil ilova.",
};

export const WORKS: Work[] = [
  { id: "1", ...sample, platform: "behance", url: "https://www.behance.net/", designer: arthur },
  { id: "2", ...sample, platform: "behance", url: "https://www.behance.net/", designer: nuray },
  { id: "3", ...sample, platform: "behance", url: "https://www.behance.net/", designer: juma },
  { id: "4", ...sample, platform: "dribbble", url: "https://dribbble.com/", designer: arthur },
  { id: "5", ...sample, platform: "x", url: "https://x.com/", designer: nuray },
  { id: "6", ...sample, platform: "dprofile", url: "https://dprofile.ru/", designer: juma },
  { id: "7", ...sample, platform: "x", url: "https://x.com/", designer: arthur },
  { id: "8", ...sample, platform: "dribbble", url: "https://dribbble.com/", designer: nuray },
  { id: "9", ...sample, platform: "behance", url: "https://www.behance.net/", designer: juma },
  { id: "10", ...sample, platform: "dprofile", url: "https://dprofile.ru/", designer: arthur },
  { id: "11", ...sample, platform: "x", url: "https://x.com/", designer: nuray },
  { id: "12", ...sample, platform: "dribbble", url: "https://dribbble.com/", designer: juma },
];

export function getWork(id: string): Work | undefined {
  return WORKS.find((w) => w.id === id);
}

/** Ishni tanlagan kurator (ko'rish oynasining pastidagi "Tanladi:" bloki) */
export const CURATOR = {
  name: "Pixor Design",
  handle: "Pixor.design",
  avatar: "/avatars/pixor.png",
  /** "Xda ko'rish" tugmasi olib boradigan manzil */
  url: "https://x.com/",
};
