/** Kartadagi rasm uchun sizes — ko'rish oynasi ham xuddi shu (keshdagi) rasmni darhol ko'rsatishi uchun */
export const CARD_IMAGE_SIZES = "(min-width: 2200px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw";

/**
 * Next.js orqali kichraytirilgan rasm manzili (video poster uchun: <video poster> next/image'ni
 * ishlatolmaydi, asl 2000px muqova esa og'ir). w — next.config'dagi ruxsat etilgan o'lchamlardan.
 */
export function optimizedImageUrl(url: string | undefined, width: 640 | 828 | 1080 | 1200 | 1920 | 2048) {
  if (!url) return undefined;
  if (url.startsWith("/")) return url;
  return `/_next/image?url=${encodeURIComponent(url)}&w=${width}&q=75`;
}
