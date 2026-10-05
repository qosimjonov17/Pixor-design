import type { Category } from "./categories";
import type { Platform } from "./platforms";

/**
 * Galereyadagi bitta ish.
 * Ishlar Supabase'dagi "works" jadvalidan keladi (Telegram bot orqali qo'shiladi),
 * ko'rinishga o'tkazish: src/lib/works.ts → toWork().
 */
export type Work = {
  /** works.id (uuid) — "saqlanganlar" shu bilan bog'lanadi */
  id: string;
  title: string;
  platform: Platform;
  /** Asl postga havola (Behance, Dribbble, X yoki Dprofile) */
  url: string;
  /** Ishning preview rasmi. Bo'lmasa kulrang joy ko'rsatiladi. */
  image?: string;
  /** Video (X'dagi video/GIF postlar). image — uning birinchi kadri (poster). */
  video?: { url: string; kind: "animation" | "video" };
  /** Case / UI / Branding (bir nechtasi bo'lishi mumkin) */
  categories: Category[];
  /** Ko'rish oynasidagi qisqa tavsif */
  description?: string;
  designer: {
    name: string;
    /** Platformadagi nik (@ belgisisiz) */
    handle?: string;
    avatar?: string;
    /** Saytdagi dizayner sahifasi: /designers/{slug} */
    slug?: string;
    /** Avatar orqa foni: dizayndagi blue/red/yellow 200 */
    avatarBg: "blue" | "red" | "yellow";
  };
};

/** Ishni tanlagan kurator (ko'rish oynasining pastidagi "Tanladi:" bloki) */
export const CURATOR = {
  name: "Pixor Design",
  handle: "Pixor.design",
  avatar: "/avatars/pixor.png",
  /** "Xda ko'rish" tugmasi olib boradigan manzil */
  url: "https://x.com/",
};
