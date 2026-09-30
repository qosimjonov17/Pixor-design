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
  if (platform === "behance" && !meta.get("author")) {
    // Behance loyiha egasini sahifadagi JSON ichida saqlaydi
    const owner = html.match(/"owners"\s*:\s*\[\s*\{[^\]]*?"display_name"\s*:\s*"([^"]{1,80})"/)?.[1];
    if (owner) meta.set("author", decodeEntities(owner.replace(/\\u([0-9a-f]{4})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))));
  }
  return scrapeFromMeta(platform, url, meta);
}

export function scrapeFromMeta(platform: Platform, url: string, meta: Map<string, string>): Scraped {
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

const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "Upgrade-Insecure-Requests": "1",
};
// Havola preview qiluvchi botlar — ko'p saytlar ularga ochiq
const BOT_UAS = [
  "TelegramBot (like TwitterBot)",
  "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
  "Twitterbot/1.0",
];

async function fetchHtml(url: string, headers: Record<string, string>): Promise<{ html: string | null; note: string }> {
  try {
    const res = await fetch(url, { headers, redirect: "follow", signal: AbortSignal.timeout(10_000), cache: "no-store" });
    if (!res.ok) return { html: null, note: String(res.status) };
    return { html: await res.text(), note: "ok" };
  } catch (err) {
    return { html: null, note: err instanceof Error && err.name === "TimeoutError" ? "timeout" : "tarmoq" };
  }
}

type Microlink = {
  status?: string;
  data?: { title?: string | null; description?: string | null; author?: string | null; image?: { url?: string } | null };
};

/** Zaxira: Microlink xizmati sahifani haqiqiy brauzerda ochib, ma'lumotini beradi */
async function viaMicrolink(platform: Platform, url: string): Promise<{ data: Scraped | null; note: string }> {
  const key = process.env.MICROLINK_API_KEY;
  const endpoint = `${key ? "https://pro.microlink.io" : "https://api.microlink.io"}/?url=${encodeURIComponent(url)}`;
  try {
    const res = await fetch(endpoint, {
      headers: key ? { "x-api-key": key } : {},
      signal: AbortSignal.timeout(25_000),
      cache: "no-store",
    });
    const json = (await res.json().catch(() => ({}))) as Microlink;
    if (!res.ok || json.status !== "success" || !json.data) return { data: null, note: `microlink ${res.status}` };
    const meta = new Map<string, string>();
    const d = json.data;
    if (d.title) meta.set("og:title", d.title);
    if (d.description) meta.set("og:description", d.description);
    if (d.image?.url) meta.set("og:image", d.image.url);
    if (d.author) meta.set("author", d.author);
    return { data: scrapeFromMeta(platform, url, meta), note: "microlink ok" };
  } catch {
    return { data: null, note: "microlink tarmoq" };
  }
}

const score = (d: Scraped | null) => (d ? (d.title ? 2 : 0) + (d.image ? 2 : 0) + (d.designerName ? 1 : 0) + (d.description ? 1 : 0) : -1);

/**
 * Havolani ochib ma'lumot oladi: avval to'g'ridan-to'g'ri (brauzer va preview-bot sifatida),
 * sayt bloklasa — Microlink orqali. `notes` — nima bo'lganini adminga ko'rsatish uchun.
 */
export async function scrapeUrl(url: string): Promise<{ data: Scraped; notes: string[] } | null> {
  const platform = detectPlatform(url);
  if (!platform) return null;
  const notes: string[] = [];
  let best: Scraped | null = null;
  const consider = (d: Scraped | null) => {
    if (score(d) > score(best)) best = d;
  };

  for (const headers of [BROWSER_HEADERS, ...BOT_UAS.map((ua) => ({ "User-Agent": ua, Accept: "text/html" }))]) {
    const { html, note } = await fetchHtml(url, headers);
    notes.push(note);
    if (html) consider(scrapeFromHtml(platform, url, html));
    if (score(best) >= 5) break;
  }
  if (score(best) < 5) {
    const m = await viaMicrolink(platform, url);
    notes.push(m.note);
    if (best && m.data) {
      // Ikkala manbani birlashtiramiz
      const b: Scraped = best;
      consider({
        ...b,
        title: b.title || m.data.title,
        description: b.description ?? m.data.description,
        image: b.image ?? m.data.image,
        designerName: b.designerName ?? m.data.designerName,
      });
    } else consider(m.data);
  }
  return {
    data: best ?? { platform, url, title: "", description: null, image: null, designerName: null, designerHandle: null },
    notes,
  };
}
