import "server-only";
import type { Platform } from "@/data/platforms";
import type { Work } from "@/data/works";
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

/** Bazadagi qatorni saytdagi Work ko'rinishiga o'tkazadi */
export function toWork(row: WorkRow): Work {
  const name = row.designer_name || "Noma'lum dizayner";
  return {
    id: row.id,
    title: row.title || "Nomsiz ish",
    platform: row.platform,
    url: row.source_url,
    image: row.image_url ?? undefined,
    description: row.description ?? undefined,
    designer: {
      name,
      handle: row.designer_handle ?? undefined,
      avatarBg: bgFor(name),
    },
  };
}

/** Saytda ko'rinadigan (chop etilgan) ishlar, eng yangisi birinchi */
export async function getPublishedWorks(platform?: Platform | null): Promise<Work[]> {
  try {
    let q = db().from("works").select("*").eq("status", "published").order("published_at", { ascending: false });
    if (platform) q = q.eq("platform", platform);
    const { data, error } = await q.limit(500);
    if (error) throw new Error(error.message);
    return (data as WorkRow[]).map(toWork);
  } catch (err) {
    console.error("[works] ro'yxatni o'qib bo'lmadi:", err);
    return [];
  }
}

export async function getPublishedWorksByIds(ids: string[]): Promise<Work[]> {
  const valid = ids.filter(isUuid);
  if (valid.length === 0) return [];
  try {
    const { data, error } = await db().from("works").select("*").eq("status", "published").in("id", valid);
    if (error) throw new Error(error.message);
    const byId = new Map((data as WorkRow[]).map((r) => [r.id, toWork(r)]));
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
const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };

export async function storeImage(bytes: ArrayBuffer | Uint8Array, contentType: string) {
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
  if (bytes.byteLength > 10 * 1024 * 1024) throw new Error("Rasm juda katta (10 MB dan ortiq)");
  return storeImage(bytes, type);
}
