import "server-only";
import type { Platform } from "@/data/platforms";

/**
 * Havoladan ish haqida ma'lumot olish (Open Graph meta teglari).
 * Behance, Dribbble, Dprofile odatda og:title / og:image / og:description beradi.
 * X (Twitter) tizimga kirmaganlarga deyarli hech narsa bermaydi — bot rasmni so'raydi.
 */

export type Scraped = {
  platform: Platform;
  url: string;
  title: string;
  description: string | null;
  image: string | null;
  designerName: string | null;
  designerHandle: string | null;
};

export function detectPlatform(rawUrl: string): Platform | null {
  let host: string;
  try {
    host = new URL(rawUrl).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
  if (host === "behance.net" || host.endsWith(".behance.net")) return "behance";
  if (host === "dribbble.com" || host.endsWith(".dribbble.com")) return "dribbble";
  if (host === "dprofile.ru" || host.endsWith(".dprofile.ru")) return "dprofile";
  if (["x.com", "twitter.com", "mobile.twitter.com", "mobile.x.com"].includes(host)) return "x";
  return null;
}

/** Matndan birinchi http(s) havolani topadi */
export function extractUrl(text: string): string | null {
  const m = text.match(/https?:\/\/[^\s<>"']+/i);
  return m ? m[0].replace(/[).,!?]+$/, "") : null;
}

/** Kuzatuv parametrlarini olib tashlaydi (takrorlarni aniqlash uchun) */
export function normalizeUrl(rawUrl: string): string {
  const u = new URL(rawUrl);
  u.hash = "";
  for (const key of [...u.searchParams.keys()]) {
    if (/^(utm_|ref$|tracking|s$|t$|fbclid|gclid)/i.test(key)) u.searchParams.delete(key);
  }
  u.hostname = u.hostname.replace(/^mobile\./, "");
  if (u.hostname === "twitter.com") u.hostname = "x.com";
  return u.toString().replace(/\/$/, "");
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  "#39": "'",
  nbsp: " ",
  mdash: "—",
  ndash: "–",
  hellip: "…",
  laquo: "«",
  raquo: "»",
};

export function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z#0-9]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m)
    .replace(/\s+/g, " ")
    .trim();
}

/** <meta property|name="..." content="..."> teglarini yig'adi (kalit — kichik harfda) */
export function parseMeta(html: string): Map<string, string> {
  const meta = new Map<string, string>();
  const head = html.slice(0, 400_000);
  for (const tag of head.match(/<meta\b[^>]*>/gi) ?? []) {
    const attr = (name: string) =>
      tag.match(new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`, "i"))?.[1] ??
      tag.match(new RegExp(`\\b${name}\\s*=\\s*'([^']*)'`, "i"))?.[1];
    const key = (attr("property") ?? attr("name") ?? attr("itemprop"))?.toLowerCase();
    const content = attr("content");
    if (key && content && !meta.has(key)) meta.set(key, decodeEntities(content));
  }
  const title = head.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1];
  if (title && !meta.has("html:title")) meta.set("html:title", decodeEntities(title));
  return meta;
}

/** Sarlavhadan platforma dumini va dizayner ismini ajratadi */
export function splitTitle(platform: Platform, raw: string): { title: string; designer: string | null } {
  let title = raw.trim();
  let designer: string | null = null;

  if (platform === "dribbble") {
    // "Banking App by Jane Doe for Studio on Dribbble"
    title = title.replace(/\s+on Dribbble\s*$/i, "");
    const m = title.match(/^(.*)\s+by\s+(.+?)(?:\s+for\s+.+)?$/i);
    if (m) {
      title = m[1];
      designer = m[2];
    }
  } else if (platform === "behance") {
    // "Banking App :: Behance", "Banking App on Behance", "Banking App | Behance"
    title = title.replace(/\s*(::|\||—|-|on)\s*Behance\s*$/i, "");
  } else if (platform === "dprofile") {
    title = title.replace(/\s*(\||—|-|::)\s*Dprofile\s*$/i, "");
    const m = title.match(/^(.*?)\s+(?:—|-|от|by)\s+(.+)$/i);
    if (m && m[2].split(" ").length <= 4) {
      title = m[1];
      designer = m[2];
    }
  } else if (platform === "x") {
    // "Jane Doe on X: \"text\" / X"
    const m = title.match(/^(.+?)\s+on\s+(?:X|Twitter):\s*"?(.*?)"?\s*(?:\/\s*(?:X|Twitter))?$/i);
    if (m) {
      designer = m[1];
      title = m[2];
    }
  }
  return { title: title.trim(), designer: designer?.trim() || null };
}

function handleFromUrl(platform: Platform, url: string): string | null {
  const parts = new URL(url).pathname.split("/").filter(Boolean);
  if (platform === "x" && parts.length >= 1 && parts[0] !== "i") return parts[0];
  if (platform === "dprofile" && parts.length >= 1 && !["case", "work", "project"].includes(parts[0])) {
    return parts[0];
  }
  return null;
}

export function scrapeFromHtml(platform: Platform, url: string, html: string): Scraped {
  const meta = parseMeta(html);
  const get = (...keys: string[]) => keys.map((k) => meta.get(k)).find((v) => v && v.length > 0) ?? null;

  const rawTitle = get("og:title", "twitter:title", "html:title") ?? "";
  const split = splitTitle(platform, rawTitle);

  let image = get("og:image:secure_url", "og:image", "twitter:image", "twitter:image:src");
  if (image) {
    try {
      image = new URL(image, url).toString();
    } catch {
      image = null;
    }
  }

  const author = get("author", "article:author", "twitter:creator", "og:article:author");
  const designerName = split.designer ?? (author && !/^https?:/i.test(author) ? author.replace(/^@/, "") : null);

  const creatorHandle = get("twitter:creator");
  const designerHandle =
    handleFromUrl(platform, url) ?? (creatorHandle?.startsWith("@") ? creatorHandle.slice(1) : null);

  let description = get("og:description", "twitter:description", "description");
  if (description && description.length > 600) description = `${description.slice(0, 597)}…`;

  return {
    platform,
    url,
    title: split.title.slice(0, 200),
    description,
    image,
    designerName,
    designerHandle,
  };
}

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const PREVIEW_UA = "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)";

async function fetchHtml(url: string, ua: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": ua, Accept: "text/html,application/xhtml+xml", "Accept-Language": "en" },
      redirect: "follow",
      signal: AbortSignal.timeout(12_000),
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

/** Havolani ochib ma'lumot oladi. Bir necha "brauzer" bilan urinadi. */
export async function scrapeUrl(url: string): Promise<Scraped | null> {
  const platform = detectPlatform(url);
  if (!platform) return null;

  let best: Scraped | null = null;
  for (const ua of [BROWSER_UA, PREVIEW_UA]) {
    const html = await fetchHtml(url, ua);
    if (!html) continue;
    const data = scrapeFromHtml(platform, url, html);
    if (!best || (data.image && !best.image) || (data.title && !best.title)) best = data;
    if (best.image && best.title) break;
  }
  return best ?? { platform, url, title: "", description: null, image: null, designerName: null, designerHandle: null };
}
