import type { Platform } from "./platforms";

/**
 * Galereyadagi bitta ish.
 * Hozircha namuna ma'lumotlar. Keyinchalik bu ro'yxat admin panel
 * yoki ma'lumotlar bazasidan keladi — sahifa kodi o'zgarmaydi.
 */
export type Work = {
  id: string;
  title: string;
  platform: Platform;
  /** Asl postga havola (Behance, Dribbble, X yoki Dprofile) */
  url: string;
  /** Ishning preview rasmi. Bo'lmasa kulrang joy ko'rsatiladi. */
  image?: string;
  designer: {
    name: string;
    avatar?: string;
    /** Avatar orqa foni: dizayndagi blue/red/yellow 200 */
    avatarBg: "blue" | "red" | "yellow";
  };
};

const arthur = { name: "Abdulloh Qosimjonov", avatar: "/avatars/arthur.png", avatarBg: "blue" as const };
const nuray = { name: "Abdulloh Qosimjonov", avatar: "/avatars/nuray.png", avatarBg: "red" as const };
const juma = { name: "Abdulloh Qosimjonov", avatar: "/avatars/juma.png", avatarBg: "yellow" as const };

export const WORKS: Work[] = [
  { id: "1", title: "Project title", platform: "behance", url: "https://www.behance.net/", designer: arthur },
  { id: "2", title: "Project title", platform: "behance", url: "https://www.behance.net/", designer: nuray },
  { id: "3", title: "Project title", platform: "behance", url: "https://www.behance.net/", designer: juma },
  { id: "4", title: "Project title", platform: "dribbble", url: "https://dribbble.com/", designer: arthur },
  { id: "5", title: "Project title", platform: "x", url: "https://x.com/", designer: nuray },
  { id: "6", title: "Project title", platform: "dprofile", url: "https://dprofile.ru/", designer: juma },
  { id: "7", title: "Project title", platform: "x", url: "https://x.com/", designer: arthur },
  { id: "8", title: "Project title", platform: "dribbble", url: "https://dribbble.com/", designer: nuray },
  { id: "9", title: "Project title", platform: "behance", url: "https://www.behance.net/", designer: juma },
  { id: "10", title: "Project title", platform: "dprofile", url: "https://dprofile.ru/", designer: arthur },
  { id: "11", title: "Project title", platform: "x", url: "https://x.com/", designer: nuray },
  { id: "12", title: "Project title", platform: "dribbble", url: "https://dribbble.com/", designer: juma },
];
