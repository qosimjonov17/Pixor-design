import "server-only";
import { normalizeCategories } from "@/data/categories";
import type { Platform } from "@/data/platforms";
import type { Work } from "@/data/works";
import { unstable_cache } from "next/cache";
import { db } from "./db";

/** Bazadagi works qatori */
export type WorkRow = {
  id: string;
  source_url: string;
  platform: Platform;
  title: string;
  description: string | null;
  image_url: string | null;
  image_path: string | null;
  designer_name: string;
  designer_handle: string | null;
  designer_id: string | null;
  video_url?: string | null;
  video_path?: string | null;
  video_kind?: "animation" | "video" | null;
  video_size?: number | null;
  /** 006_categories.sql dan keyin bor */
  categories?: string[] | null;
  status: "draft" | "published" | "rejected";
  created_by_tg: number | null;
  channel_message_id: number | null;
  created_at: string;
  published_at: string | null;
};

const AVATAR_BGS = ["blue", "red", "yellow"] as const;

function bgFor(name: string) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_BGS[h % AVATAR_BGS.length];
}

type DesignerLite = { id: string; slug: string; name: string; handle: string | null; avatar_url: string | null };

/** Bazadagi qatorni saytdagi Work ko'rinishiga o'tkazadi */
export function toWork(row: WorkRow, designer?: DesignerLite): Work {
  const name = designer?.name || row.designer_name || "Noma'lum dizayner";
  return {
    id: row.id,
    // X postlarida nom yo'q — kartada post matnining boshi ko'rinadi
    title:
      (row.platform === "x" && row.description ? row.description.replace(/\s+/g, " ").slice(0, 90) : row.title) ||
      "Nomsiz ish",
    platform: row.platform,
    url: row.source_url,
    image: row.image_url ?? undefined,
    video: row.video_url ? { url: row.video_url, kind: row.video_kind ?? "animation" } : undefined,
    categories: normalizeCategories(row.categories),
    description: row.description ?? undefined,
    designer: {
      name,
      handle: designer?.handle ?? row.designer_handle ?? undefined,
      avatar: designer?.avatar_url ?? undefined,
      slug: designer?.slug,
      avatarBg: bgFor(name),
    },
  };
}

/** Ishlarga dizayner ma'lumotini (avatar, profil manzili) qo'shadi */
async function withDesigners(rows: WorkRow[]): Promise<Work[]> {
  const ids = [...new Set(rows.map((r) => r.designer_id).filter((id): id is string => Boolean(id)))];
  let map = new Map<string, DesignerLite>();
  if (ids.length) {
    const { data, error } = await db().from("designers").select("id, slug, name, handle, avatar_url").in("id", ids);
    if (error) console.error("[works] dizaynerlarni o'qib bo'lmadi:", error.message);
    else map = new Map((data as DesignerLite[]).map((d) => [d.id, d]));
  }
  return rows.map((r) => toWork(r, r.designer_id ? map.get(r.designer_id) : undefined));
}

/** Kesh yorlig'i: bot ish chiqarganda/yangilaganda shu yorliq bo'yicha kesh tozalanadi */
export const WORKS_TAG = "works";

/** Saytda ko'rinadigan (chop etilgan) ishlar, eng yangisi birinchi (bazadan emas, keshdan) */
export const getPublishedWorks = unstable_cache(
  async (platform?: Platform | null, designerId?: string): Promise<Work[]> => {
    try {
      let q = db().from("works").select("*").eq("status", "published").order("published_at", { ascending: false });
      if (platform) q = q.eq("platform", platform);
      if (designerId) q = q.eq("designer_id", designerId);
      const { data, error } = await q.limit(500);
      if (error) throw new Error(error.message);
      return await withDesigners(data as WorkRow[]);
    } catch (err) {
      console.error("[works] ro'yxatni o'qib bo'lmadi:", err);
      return [];
    }
  },
  ["published-works-v1"],
  { tags: [WORKS_TAG], revalidate: 300 },
);

export async function getPublishedWorksByIds(ids: string[]): Promise<Work[]> {
  const valid = ids.filter(isUuid);
  if (valid.length === 0) return [];
  try {
    const { data, error } = await db().from("works").select("*").eq("status", "published").in("id", valid);
    if (error) throw new Error(error.message);
    const works = await withDesigners(data as WorkRow[]);
    const byId = new Map(works.map((w) => [w.id, w]));
    return valid.map((id) => byId.get(id)).filter((w): w is Work => Boolean(w));
  } catch (err) {
    console.error("[works] saqlanganlarni o'qib bo'lmadi:", err);
    return [];
  }
}

export async function isPublishedWork(id: string): Promise<boolean> {
  if (!isUuid(id)) return false;
  const { data } = await db().from("works").select("id").eq("id", id).eq("status", "published").maybeSingle();
  return Boolean(data);
}

export function isUuid(s: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

// ---------- Bot uchun ----------

export async function getWorkRow(id: string): Promise<WorkRow | null> {
  if (!isUuid(id)) return null;
  const { data, error } = await db().from("works").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as WorkRow) ?? null;
}

export async function findWorkBySource(sourceUrl: string): Promise<WorkRow | null> {
  const { data, error } = await db().from("works").select("*").eq("source_url", sourceUrl).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as WorkRow) ?? null;
}

export async function insertDraft(fields: Partial<WorkRow> & { source_url: string; platform: Platform }) {
  const { data, error } = await db()
    .from("works")
    .insert({ ...fields, status: "draft" })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as WorkRow;
}

export async function updateWork(id: string, fields: Partial<WorkRow>) {
  const { data, error } = await db().from("works").update(fields).eq("id", id).select("*").single();
  if (error) throw new Error(error.message);
  return data as WorkRow;
}

// ---------- Rasm saqlash (Supabase Storage, "works" bucket) ----------

const BUCKET = "works";
const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
};

const MAX_IMAGE_SIDE = 2000;

/**
 * Katta rasmni kichraytiradi (eng uzun tomoni 2000px, JPEG/WebP sifatli).
 * Behance "original" muqovalari 4000px+ va bir necha MB bo'ladi — Telegram havola orqali
 * 5 MB dan kattasini olmaydi, sayt uchun ham 2000px yetarli.
 */
async function shrinkImage(bytes: ArrayBuffer | Uint8Array, type: string) {
  if (!type.startsWith("image/") || type === "image/gif") return { bytes, type };
  try {
    const { default: sharp } = await import("sharp");
    const input = Buffer.from(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes));
    const img = sharp(input, { failOn: "none" });
    const meta = await img.metadata();
    const big = Math.max(meta.width ?? 0, meta.height ?? 0) > MAX_IMAGE_SIDE;
    if (!big && input.byteLength <= 1.5 * 1024 * 1024) return { bytes, type };
    const resized = img.rotate().resize({ width: MAX_IMAGE_SIDE, height: MAX_IMAGE_SIDE, fit: "inside", withoutEnlargement: true });
    const out = meta.hasAlpha && type === "image/png"
      ? await resized.png({ compressionLevel: 9, palette: true }).toBuffer()
      : await resized.jpeg({ quality: 86, mozjpeg: true }).toBuffer();
    return { bytes: new Uint8Array(out), type: meta.hasAlpha && type === "image/png" ? "image/png" : "image/jpeg" };
  } catch (err) {
    console.error("[works] rasmni kichraytirib bo'lmadi:", err);
    return { bytes, type };
  }
}

/** Faylni (rasm yoki MP4) saqlash joyiga yuklaydi */
export async function storeImage(rawBytes: ArrayBuffer | Uint8Array, contentType: string) {
  const shrunk = await shrinkImage(rawBytes, contentType);
  const bytes = shrunk.bytes;
  contentType = shrunk.type;
  const type = EXT[contentType] ? contentType : "image/jpeg";
  const path = `${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.${EXT[type]}`;
  const storage = db().storage.from(BUCKET);
  const { error } = await storage.upload(path, bytes, { contentType: type, upsert: false, cacheControl: "31536000" });
  if (error) throw new Error(`Rasmni saqlab bo'lmadi: ${error.message}`);
  return { path, url: storage.getPublicUrl(path).data.publicUrl };
}

export async function deleteImage(path: string | null) {
  if (!path) return;
  await db().storage.from(BUCKET).remove([path]);
}

/** Tashqi rasmni yuklab olib, o'zimizning saqlash joyimizga ko'chiradi */
export async function copyRemoteImage(url: string) {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; PixoraBot/1.0)", Accept: "image/*" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Rasm yuklanmadi: ${res.status}`);
  const type = (res.headers.get("content-type") ?? "image/jpeg").split(";")[0].trim();
  if (!type.startsWith("image/")) throw new Error(`Rasm emas: ${type}`);
  const bytes = await res.arrayBuffer();
  if (bytes.byteLength > 30 * 1024 * 1024) throw new Error("Rasm juda katta (30 MB dan ortiq)");
  return storeImage(bytes, type);
}

// ---------- Video ----------

/** Telegram bot 50 MB gacha yubora oladi — biroz zaxira qoldiramiz */
export const MAX_VIDEO_BYTES = 45 * 1024 * 1024;

/** MP4 ichida ovoz yo'lagi bormi (moov → trak → hdlr "soun") */
export function mp4HasAudio(bytes: Uint8Array) {
  const s = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString("latin1");
  return /hdlr[\s\S]{8}soun/.test(s);
}

/**
 * Tashqi MP4'ni yuklab, saqlash joyimizga ko'chiradi. Bir nechta sifat berilsa,
 * eng yaxshisidan boshlab hajmga sig'adiganini tanlaydi.
 */
export async function copyRemoteVideo(urls: string[]) {
  let lastError = "video topilmadi";
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; PixoraBot/1.0)" },
        signal: AbortSignal.timeout(40_000),
      });
      if (!res.ok) throw new Error(`video yuklanmadi: ${res.status}`);
      const declared = Number(res.headers.get("content-length") ?? 0);
      if (declared > MAX_VIDEO_BYTES) {
        lastError = `video juda katta (${Math.round(declared / 1048576)} MB)`;
        await res.body?.cancel();
        continue;
      }
      const bytes = new Uint8Array(await res.arrayBuffer());
      if (bytes.byteLength > MAX_VIDEO_BYTES) {
        lastError = `video juda katta (${Math.round(bytes.byteLength / 1048576)} MB)`;
        continue;
      }
      const stored = await storeImage(bytes, "video/mp4");
      return { ...stored, size: bytes.byteLength, hasAudio: mp4HasAudio(bytes) };
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }
  throw new Error(lastError);
}
