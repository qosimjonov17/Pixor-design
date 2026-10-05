import "server-only";
import type { Platform } from "@/data/platforms";
import { revalidateTag, unstable_cache } from "next/cache";
import { db } from "./db";
import { env } from "./env";
import { copyImageViaTelegram } from "./telegramMedia";
import { copyRemoteImage, isUuid, WORKS_TAG } from "./works";

/** Bazadagi designers qatori */
export type DesignerRow = {
  id: string;
  slug: string;
  name: string;
  platform: Platform | null;
  profile_url: string | null;
  handle: string | null;
  avatar_url: string | null;
  avatar_path: string | null;
  created_at: string;
  /** 007_designer_profile.sql dan keyin */
  bio?: string | null;
  /** Boshqa platformalardagi profillar: { x: "https://x.com/…", dribbble: "…" } */
  links?: Partial<Record<Platform, string>> | null;
};

/** Profil sahifasidagi tugmalar tartibi (Figma: Behance, X, Dribbble) */
const LINK_ORDER: Platform[] = ["behance", "x", "dribbble", "dprofile"];

/** Asosiy profil + qo'shimcha havolalar, platforma bo'yicha bittadan */
export function designerLinks(d: Pick<DesignerRow, "platform" | "profile_url" | "links">) {
  const map: Partial<Record<Platform, string>> = { ...(d.links ?? {}) };
  if (d.platform && d.profile_url) map[d.platform] = d.profile_url;
  return LINK_ORDER.filter((p) => map[p]).map((p) => ({ platform: p, url: map[p]! }));
}

/** Istalgan profil havolasidan platformani aniqlaydi: x.com/user, behance.net/user ... */
export function profileFromUrl(raw: string): { platform: Platform; url: string; handle: string } | null {
  let host = "";
  try {
    host = new URL(raw).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
  const platform: Platform | null =
    host === "behance.net" || host.endsWith(".behance.net")
      ? "behance"
      : host === "dribbble.com"
        ? "dribbble"
        : host === "x.com" || host === "twitter.com" || host === "mobile.twitter.com"
          ? "x"
          : host === "dprofile.ru"
            ? "dprofile"
            : null;
  if (!platform) return null;
  const p = normalizeProfileUrl(platform, raw);
  return p ? { platform, ...p } : null;
}

const PROFILE_HOSTS: Record<Platform, string> = {
  behance: "https://www.behance.net",
  dribbble: "https://dribbble.com",
  x: "https://x.com",
  dprofile: "https://dprofile.ru",
};

const RESERVED = new Set(["gallery", "shots", "search", "i", "status", "case", "work", "project", "about", "explore"]);

/** Profil havolasini bir xil ko'rinishga keltiradi: https://www.behance.net/username */
export function normalizeProfileUrl(platform: Platform, raw: string | null | undefined) {
  if (!raw) return null;
  try {
    const u = new URL(raw, PROFILE_HOSTS[platform]);
    const first = u.pathname.split("/").filter(Boolean)[0];
    if (!first || RESERVED.has(first.toLowerCase())) return null;
    const handle = decodeURIComponent(first).replace(/^@/, "").toLowerCase();
    if (!/^[a-z0-9._-]{1,60}$/.test(handle)) return null;
    return { url: `${PROFILE_HOSTS[platform]}/${handle}`, handle };
  } catch {
    return null;
  }
}

const CYR: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m",
  н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "kh", ц: "ts", ч: "ch", ш: "sh", щ: "sch",
  ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya", ў: "o", қ: "q", ғ: "g", ҳ: "h",
};

/** "Rondesignlab ⭐" → "rondesignlab", "Студия Bolditalic" → "studiya-bolditalic" */
export function slugify(s: string) {
  const base = [...s.toLowerCase()]
    .map((ch) => CYR[ch] ?? ch)
    .join("")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[ʻʼ'’`]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return base || "dizayner";
}

function cleanName(s: string) {
  return s.replace(/\s+/g, " ").trim().slice(0, 120);
}

async function uniqueSlug(base: string) {
  for (let i = 0; i < 50; i++) {
    const slug = i === 0 ? base : `${base}-${i + 1}`;
    const { data } = await db().from("designers").select("id").eq("slug", slug).maybeSingle();
    if (!data) return slug;
  }
  return `${base}-${crypto.randomUUID().slice(0, 6)}`;
}

export async function getDesignerById(id: string): Promise<DesignerRow | null> {
  if (!isUuid(id)) return null;
  const { data } = await db().from("designers").select("*").eq("id", id).maybeSingle();
  return (data as DesignerRow) ?? null;
}

export const getDesignerBySlug = unstable_cache(
  async (slug: string): Promise<DesignerRow | null> => {
    const { data, error } = await db().from("designers").select("*").eq("slug", slug).maybeSingle();
    if (error) {
      console.error("[designers] o'qib bo'lmadi:", error.message);
      return null;
    }
    return (data as DesignerRow) ?? null;
  },
  ["designer-by-slug-v1"],
  { tags: [WORKS_TAG], revalidate: 300 },
);

/** Sayt keshini yangilash (dizayner ma'lumoti o'zgarganda) */
function refreshSiteCache() {
  try {
    revalidateTag(WORKS_TAG, { expire: 0 });
  } catch (err) {
    console.error("[designers] keshni yangilab bo'lmadi:", err);
  }
}

/** Ism kaliti: belgilar, emoji va katta-kichik harf hisobga olinmaydi ("Rondesignlab ⭐️" = "rondesignlab") */
export function nameKey(name: string) {
  return name.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
}

/** Shu ismli barcha dizaynerlar (kalit bo'yicha), profillisi birinchi */
export async function findAllByName(name: string): Promise<DesignerRow[]> {
  const key = nameKey(name);
  if (!key) return [];
  // Bazadan taxminiy qidiruv (harflar orasida istalgan belgi), keyin aniq kalit bilan saralaymiz
  const pattern = `%${[...key.slice(0, 16)].map((ch) => ch.replace(/[%_\\]/g, "\\$&")).join("%")}%`;
  const { data } = await db().from("designers").select("*").ilike("name", pattern).limit(50);
  return ((data as DesignerRow[] | null) ?? [])
    .filter((d) => nameKey(d.name) === key)
    .sort((a, b) => Number(Boolean(b.profile_url)) - Number(Boolean(a.profile_url)));
}

async function findByName(name: string): Promise<DesignerRow | null> {
  return (await findAllByName(name))[0] ?? null;
}

/**
 * Profilli dizaynerga uning profilsiz "egizaklari"ni qo'shadi: avval ism bilan qo'lda
 * qo'shilgan yozuvlar. Ularning ishlari shu dizaynerga o'tadi, keraksiz yozuv o'chiriladi.
 */
async function mergeTwins(target: DesignerRow) {
  if (!target.profile_url) return;
  const twins = (await findAllByName(target.name)).filter((d) => d.id !== target.id && !d.profile_url);
  for (const twin of twins) {
    const { error } = await db()
      .from("works")
      .update({ designer_id: target.id, designer_name: target.name, designer_handle: target.handle })
      .eq("designer_id", twin.id);
    if (error) {
      console.error("[designers] ishlarni ko'chirib bo'lmadi:", error.message);
      continue;
    }
    await db().from("designers").delete().eq("id", twin.id);
    refreshSiteCache();
    if (twin.avatar_path) await db().storage.from("works").remove([twin.avatar_path]);
  }
}

/** Bot tugmalari uchun: oxirgi qo'shilgan dizaynerlar */
export async function recentDesigners(limit = 8): Promise<DesignerRow[]> {
  const { data } = await db().from("designers").select("*").order("created_at", { ascending: false }).limit(limit);
  return (data as DesignerRow[] | null) ?? [];
}

export type DesignerInput = {
  name?: string | null;
  platform: Platform;
  profileUrl?: string | null;
  avatarUrl?: string | null;
};

/**
 * Dizaynerni topadi yoki yaratadi.
 * Avval profil havolasi bo'yicha (eng ishonchli), keyin ism bo'yicha qidiradi.
 */
export async function resolveDesigner(input: DesignerInput): Promise<DesignerRow | null> {
  const designer = await resolveDesignerInner(input);
  if (designer?.profile_url) {
    await mergeTwins(designer).catch((err) => console.error("[designers] birlashtirib bo'lmadi:", err));
  }
  return designer;
}

async function resolveDesignerInner(input: DesignerInput): Promise<DesignerRow | null> {
  const profile = normalizeProfileUrl(input.platform, input.profileUrl);
  const name = input.name ? cleanName(input.name) : "";
  if (!profile && !name) return null;

  let found: DesignerRow | null = null;
  if (profile) {
    const { data } = await db().from("designers").select("*").eq("profile_url", profile.url).maybeSingle();
    found = (data as DesignerRow) ?? null;
  }
  if (!found && name) {
    const byName = await findByName(name);
    // Ism bir xil, lekin boshqa profil — boshqa odam bo'lishi mumkin
    if (byName && (!profile || !byName.profile_url)) found = byName;
  }

  if (found) {
    const patch: Partial<DesignerRow> = {};
    if (profile && !found.profile_url) {
      patch.profile_url = profile.url;
      patch.handle = profile.handle;
      patch.platform = input.platform;
    }
    // Oldin faqat nik bilan saqlangan bo'lsa, haqiqiy ismni qo'yamiz
    if (name && found.handle && found.name.toLowerCase() === found.handle.toLowerCase() && name.toLowerCase() !== found.handle.toLowerCase()) {
      patch.name = name;
    }
    if (!found.avatar_url && input.avatarUrl) Object.assign(patch, await copyAvatar(input.avatarUrl));
    if (Object.keys(patch).length) {
      const { data, error } = await db().from("designers").update(patch).eq("id", found.id).select("*").single();
      if (data) {
        found = data as DesignerRow;
        refreshSiteCache();
      } else if (error && profile && /duplicate|unique|23505/i.test(`${error.code} ${error.message}`)) {
        // Bu profil boshqa yozuvda band — o'sha (profilli) dizaynerni ishlatamiz
        const { data: owner } = await db().from("designers").select("*").eq("profile_url", profile.url).maybeSingle();
        if (owner) return owner as DesignerRow;
      } else if (error) {
        throw new Error(`Dizaynerni yangilab bo'lmadi: ${error.message}`);
      }
    }
    return found;
  }

  const row: Partial<DesignerRow> = {
    slug: await uniqueSlug(slugify(profile?.handle ?? name)),
    name: name || profile!.handle,
    platform: input.platform,
    profile_url: profile?.url ?? null,
    handle: profile?.handle ?? null,
    ...(input.avatarUrl ? await copyAvatar(input.avatarUrl) : {}),
  };
  const { data, error } = await db().from("designers").insert(row).select("*").single();
  if (error) throw new Error(`Dizaynerni saqlab bo'lmadi: ${error.message}`);
  return data as DesignerRow;
}

async function copyAvatar(url: string): Promise<{ avatar_url?: string; avatar_path?: string }> {
  if (!/^https?:\/\//i.test(url)) return {};
  try {
    const img = await copyRemoteImage(url);
    return { avatar_url: img.url, avatar_path: img.path };
  } catch (err) {
    console.error("[designers] avatarni to'g'ridan-to'g'ri ko'chirib bo'lmadi:", err);
  }
  // Zaxira: rasmni Telegram yuklab oladi (sayt serverimizni bloklasa)
  const adminId = [...env.botAdminIds][0];
  if (!adminId) return {};
  const img = await copyImageViaTelegram(Number(adminId), url);
  return img ? { avatar_url: img.url, avatar_path: img.path } : {};
}

/** Bio va havolalarni yangilaydi (bot yoki brauzer tugmachasi orqali) */
export async function updateDesignerProfile(
  id: string,
  patch: { bio?: string | null; addLink?: string; clearLinks?: boolean; avatarUrl?: string | null },
): Promise<DesignerRow> {
  const current = await getDesignerById(id);
  if (!current) throw new Error("Dizayner topilmadi");
  const update: Record<string, unknown> = {};
  if (patch.bio !== undefined) update.bio = patch.bio ? patch.bio.trim().slice(0, 1200) : null;
  if (patch.clearLinks) update.links = {};
  if (patch.addLink) {
    const p = profileFromUrl(patch.addLink);
    if (!p) throw new Error("Bu profil havolasi emas (Behance, X, Dribbble yoki Dprofile profili kerak)");
    // Asosiy profil bilan bir xil platforma bo'lsa ham, qo'shimcha havola sifatida saqlanadi
    update.links = { ...((patch.clearLinks ? {} : current.links) ?? {}), [p.platform]: p.url };
  }
  if (patch.avatarUrl) Object.assign(update, await copyAvatar(patch.avatarUrl));
  if (!Object.keys(update).length) return current;
  const { data, error } = await db().from("designers").update(update).eq("id", id).select("*").single();
  if (error) throw new Error(`Dizaynerni yangilab bo'lmadi: ${error.message}`);
  refreshSiteCache();
  return data as DesignerRow;
}

export async function renameDesigner(id: string, name: string) {
  const { data, error } = await db().from("designers").update({ name: cleanName(name) }).eq("id", id).select("*").single();
  if (error) throw new Error(error.message);
  return data as DesignerRow;
}

/** Id bo'yicha dizaynerlar (ishlar ro'yxatiga qo'shish uchun) */
export async function designersByIds(ids: string[]): Promise<Map<string, DesignerRow>> {
  const unique = [...new Set(ids.filter(isUuid))];
  if (unique.length === 0) return new Map();
  const { data, error } = await db().from("designers").select("*").in("id", unique);
  if (error) {
    console.error("[designers] ro'yxatni o'qib bo'lmadi:", error.message);
    return new Map();
  }
  return new Map((data as DesignerRow[]).map((d) => [d.id, d]));
}

export type DesignerSummary = DesignerRow & { picks: number; previews: string[] };

/** Dizaynerlar sahifasi: kamida bitta chop etilgan ishi bor dizaynerlar, eng faoli birinchi */
export const getDesignersWithStats = unstable_cache(loadDesignersWithStats, ["designers-stats-v1"], {
  tags: [WORKS_TAG],
  revalidate: 300,
});

async function loadDesignersWithStats(): Promise<DesignerSummary[]> {
  try {
    const { data, error } = await db()
      .from("works")
      .select("designer_id, image_url, published_at")
      .eq("status", "published")
      .not("designer_id", "is", null)
      .order("published_at", { ascending: false })
      .limit(5000);
    if (error) throw new Error(error.message);
    const stats = new Map<string, { picks: number; previews: string[]; last: string }>();
    for (const w of data as { designer_id: string; image_url: string | null; published_at: string }[]) {
      const s = stats.get(w.designer_id) ?? { picks: 0, previews: [], last: w.published_at };
      s.picks++;
      if (w.image_url && s.previews.length < 3) s.previews.push(w.image_url);
      stats.set(w.designer_id, s);
    }
    const designers = await designersByIds([...stats.keys()]);
    return [...stats.entries()]
      .map(([id, s]) => {
        const d = designers.get(id);
        return d ? { ...d, picks: s.picks, previews: s.previews, _last: s.last } : null;
      })
      .filter((d): d is DesignerSummary & { _last: string } => Boolean(d))
      .sort((a, b) => b.picks - a.picks || (a._last < b._last ? 1 : -1))
      .map(({ _last, ...d }) => {
        void _last;
        return d;
      });
  } catch (err) {
    console.error("[designers] statistikani o'qib bo'lmadi:", err);
    return [];
  }
}
