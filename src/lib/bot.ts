import "server-only";
import { revalidatePath, revalidateTag } from "next/cache";
import { CATEGORIES, categoryLabel, defaultCategories, isCategory, normalizeCategories } from "@/data/categories";
import { getPlatform, type Platform } from "@/data/platforms";
import { db } from "./db";
import { env } from "./env";
import {
  designerLinks,
  findAllByName,
  getDesignerById,
  profileFromUrl,
  recentDesigners,
  resolveDesigner,
  updateDesignerProfile,
  type DesignerRow,
} from "./designers";
import { readLinkPreview } from "./mtproto";
import { fetchXPost, type XPost } from "./x";
import { designerFromDescription, detectPlatform, extractUrl, normalizeUrl, scrapeUrl, splitTitle } from "./scrape";
import { copyImageViaTelegram } from "./telegramMedia";
import { downloadTelegramFile, escapeHtml, tg, tgUpload, type InlineButton, type InlineKeyboard } from "./telegramBot";
import {
  copyRemoteImage,
  copyRemoteVideo,
  deleteImage,
  findWorkBySource,
  getWorkRow,
  insertDraft,
  storeImage,
  updateWork,
  WORKS_TAG,
  type WorkRow,
} from "./works";

/**
 * Pixor boti:
 *  1) Admin havola yuboradi → bot nom, tavsif, muqova, dizaynerni oladi → qoralama + preview.
 *  2) Tugmalar: ✅ Chop etish (sayt + kanal), ✏️ tahrirlash, ❌ bekor qilish.
 */

type TgUser = { id: number; first_name?: string };
type TgPhoto = { file_id: string; width: number; height: number };
type TgMessage = {
  message_id: number;
  chat: { id: number; type: string };
  from?: TgUser;
  text?: string;
  caption?: string;
  photo?: TgPhoto[];
  document?: { file_id: string; mime_type?: string };
};
type TgCallback = { id: string; from: TgUser; data?: string; message?: TgMessage };
export type TgUpdate = { update_id: number; message?: TgMessage; callback_query?: TgCallback };

type Field = "title" | "designer" | "description" | "image";

const FIELD_PROMPTS: Record<Field, string> = {
  title: "✏️ Yangi <b>nom</b>ni yozing:",
  designer: "👤 Dizayner <b>ismi</b>ni yozing (shu nomdagi dizayner bo'lsa, ishi unga qo'shiladi):",
  description: "📄 Yangi <b>tavsif</b>ni yozing (o'chirish uchun <code>-</code> yuboring):",
  image: "🖼 Muqova uchun <b>rasm</b> yuboring (rasm sifatida, fayl emas):",
};

function isAdmin(userId: number | undefined) {
  return userId !== undefined && env.botAdminIds.has(String(userId));
}

function siteWorkUrl(id: string) {
  return `${env.siteUrl}/?w=${id}`;
}

function clip(s: string, n: number) {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

const GENERIC_NAMES = /^(behance|dribbble|dprofile|x|twitter)$/i;

/** Kanal posti matni: nom, dizayner, tavsif (iqtibos ko'rinishida). Havola — pastdagi tugmada. */
export function channelCaption(row: WorkRow, descLimit = 550) {
  const title = escapeHtml(clip(row.title || "Nomsiz ish", 200));
  const name = row.designer_name && !GENERIC_NAMES.test(row.designer_name.trim()) ? row.designer_name : "";
  // X postlarida nom bo'lmaydi — faqat muallif va post matni
  const lines = [`🆕 <b>Yangi ish qo'shildi!</b>`, ""];
  if (row.platform !== "x") lines.push(`📝 <b>${title}</b>`);
  if (name) lines.push(`👤 ${escapeHtml(clip(name, 120))}`);
  if (row.description) {
    lines.push("", `<blockquote expandable>${escapeHtml(clip(row.description.trim(), descLimit))}</blockquote>`);
  }
  return lines.join("\n");
}

export function channelKeyboard(row: WorkRow): InlineKeyboard {
  return { inline_keyboard: [[{ text: "Pixor'da ko'rish", url: siteWorkUrl(row.id) }]] };
}

/** Preview = kanal posti bilan bir xil matn; pastda faqat adminga eslatmalar */
function previewCaption(row: WorkRow) {
  const notes: string[] = [];
  if (!row.image_url && !row.video_url) notes.push("⚠️ Muqova yo'q — 🖼 Rasm tugmasini bosib, rasm yuboring.");
  if (!row.designer_name || GENERIC_NAMES.test(row.designer_name.trim())) notes.push("⚠️ Dizayner ismi yo'q — 👤 Dizayner tugmasi.");
  if (row.video_url) {
    notes.push(row.video_kind === "video" ? "🎬 Video (ovozli) — kanalga video bo'lib chiqadi." : "🎬 Video (ovozsiz) — kanalga GIF kabi chiqadi.");
  }
  if (row.categories) notes.push("📂 Kategoriya — pastdagi ☑️ tugmalar (bir nechtasini tanlash mumkin).");
  notes.push("Kanalda pastda «Pixor'da ko'rish» tugmasi bo'ladi. Chiqarish uchun ✅ ni bosing.");
  return `${channelCaption(row, 330)}\n\n— — —\n<i>${notes.join("\n")}</i>`;
}

/** Case / UI / Branding: bosilganda yoqiladi/o'chiriladi (bazada ustun bo'lmasa — ko'rsatilmaydi) */
function categoryRow(row: WorkRow): InlineButton[][] {
  if (!row.categories) return [];
  const on = new Set(normalizeCategories(row.categories));
  return [
    CATEGORIES.map((c) => ({
      text: `${on.has(c.id) ? "☑️" : "⬜"} ${c.label}`,
      callback_data: `c:${c.id}:${row.id}`,
    })),
  ];
}

function previewKeyboard(row: WorkRow): InlineKeyboard {
  return {
    inline_keyboard: [
      [{ text: "✅ Chop etish", callback_data: `p:${row.id}` }],
      ...categoryRow(row),
      [
        { text: "✏️ Nom", callback_data: `e:title:${row.id}` },
        { text: "👤 Dizayner", callback_data: `e:designer:${row.id}` },
      ],
      [
        { text: "📄 Tavsif", callback_data: `e:description:${row.id}` },
        { text: "🖼 Rasm", callback_data: `e:image:${row.id}` },
      ],
      [
        { text: `🔗 ${getPlatform(row.platform).label}'da ochish`, url: row.source_url },
        { text: "❌ Bekor qilish", callback_data: `x:${row.id}` },
      ],
    ],
  };
}

async function send(chatId: number, text: string, extra: Record<string, unknown> = {}) {
  return tg("sendMessage", { chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true, ...extra });
}

const URL_UPLOAD_LIMIT = 20 * 1024 * 1024;

/**
 * Ishni media bilan yuboradi: video bo'lsa — ovozsizi GIF kabi (sendAnimation), ovozlisi video;
 * bo'lmasa rasm. Video yuborilmasa, muqova rasmi bilan yuboriladi.
 */
async function sendWorkMedia(chatId: number | string, row: WorkRow, caption: string, reply_markup: InlineKeyboard) {
  const base = { chat_id: chatId, caption, parse_mode: "HTML", reply_markup };
  if (row.video_url) {
    const isVideo = row.video_kind === "video";
    const method = isVideo ? "sendVideo" : "sendAnimation";
    const field = isVideo ? "video" : "animation";
    const extra = isVideo ? { supports_streaming: true } : {};
    if ((row.video_size ?? 0) <= URL_UPLOAD_LIMIT) {
      try {
        return await tg<{ message_id: number }>(method, { ...base, ...extra, [field]: row.video_url });
      } catch (err) {
        console.error("[bot] videoni havola bilan yuborib bo'lmadi:", err);
      }
    }
    try {
      const res = await fetch(row.video_url, { signal: AbortSignal.timeout(30_000) });
      if (!res.ok) throw new Error(`video o'qilmadi: ${res.status}`);
      const bytes = new Uint8Array(await res.arrayBuffer());
      return await tgUpload<{ message_id: number }>(method, { ...base, ...extra }, {
        field,
        bytes,
        name: "pixor.mp4",
        type: "video/mp4",
      });
    } catch (err) {
      console.error("[bot] videoni fayl sifatida yuborib bo'lmadi:", err);
    }
  }
  if (!row.image_url) throw new Error("Muqova ham, video ham yo'q");
  try {
    return await tg<{ message_id: number }>("sendPhoto", { ...base, photo: row.image_url });
  } catch (err) {
    // Havola orqali o'tmadi (masalan, rasm katta) — fayl sifatida yuklaymiz (10 MB gacha)
    console.error("[bot] rasmni havola bilan yuborib bo'lmadi:", err);
    const res = await fetch(row.image_url, { signal: AbortSignal.timeout(30_000) });
    if (!res.ok) throw err;
    const bytes = new Uint8Array(await res.arrayBuffer());
    const type = (res.headers.get("content-type") ?? "image/jpeg").split(";")[0];
    return tgUpload<{ message_id: number }>("sendPhoto", base, {
      field: "photo",
      bytes,
      name: type === "image/png" ? "pixor.png" : "pixor.jpg",
      type,
    });
  }
}

async function sendPreview(chatId: number, row: WorkRow) {
  const caption = previewCaption(row);
  const reply_markup = previewKeyboard(row);
  if (row.image_url || row.video_url) {
    try {
      return await sendWorkMedia(chatId, row, caption, reply_markup);
    } catch (err) {
      console.error("[bot] preview media yuborilmadi:", err);
    }
  }
  return send(chatId, caption, { reply_markup });
}

// ---------- Suhbat holati (admin keyingi xabarda nimani yuboradi) ----------

async function getState(userId: number): Promise<{ work_id: string; awaiting: Field } | null> {
  const { data } = await db().from("bot_state").select("work_id, awaiting").eq("tg_user_id", userId).maybeSingle();
  return data?.work_id && data?.awaiting ? (data as { work_id: string; awaiting: Field }) : null;
}

async function setState(userId: number, workId: string, awaiting: Field) {
  const { error } = await db()
    .from("bot_state")
    .upsert({ tg_user_id: userId, work_id: workId, awaiting, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}

async function clearState(userId: number) {
  await db().from("bot_state").delete().eq("tg_user_id", userId);
}

// ---------- Dizayner profili: bio va havolalar ----------

type DesignerField = "designer_bio" | "designer_link";

async function getDesignerState(userId: number): Promise<{ designer_id: string; awaiting: DesignerField } | null> {
  const { data, error } = await db()
    .from("bot_state")
    .select("designer_id, awaiting")
    .eq("tg_user_id", userId)
    .maybeSingle();
  if (error) return null; // 007_designer_profile.sql hali ishga tushirilmagan
  const row = data as { designer_id?: string | null; awaiting?: string } | null;
  return row?.designer_id && (row.awaiting === "designer_bio" || row.awaiting === "designer_link")
    ? { designer_id: row.designer_id, awaiting: row.awaiting }
    : null;
}

async function setDesignerState(userId: number, designerId: string, awaiting: DesignerField) {
  const { error } = await db().from("bot_state").upsert({
    tg_user_id: userId,
    work_id: null,
    designer_id: designerId,
    awaiting,
    updated_at: new Date().toISOString(),
  });
  if (error) {
    throw new Error(
      /designer_id|awaiting_check/.test(error.message)
        ? "Supabase'da supabase/007_designer_profile.sql ni ishga tushiring"
        : error.message,
    );
  }
}

function siteDesignerUrl(d: DesignerRow) {
  return `${env.siteUrl}/designers/${d.slug}`;
}

/** Dizayner kartochkasi: nima bor, nima yo'q va tahrirlash tugmalari */
async function sendDesignerCard(chatId: number, d: DesignerRow) {
  const links = designerLinks(d);
  const lines = [
    `👤 <b>${escapeHtml(d.name)}</b>${d.handle ? ` (@${escapeHtml(d.handle)})` : ""}`,
    "",
    links.length
      ? `🔗 ${links.map((l) => `<a href="${escapeHtml(l.url)}">${getPlatform(l.platform).label}</a>`).join(" · ")}`
      : "🔗 Havolalar yo'q",
    d.bio ? `\n<blockquote expandable>${escapeHtml(clip(d.bio, 900))}</blockquote>` : "📝 Bio yo'q",
    "",
    "<i>💡 Avtomatik olish: kompyuterda dizaynerning profil sahifasini ochib, «Pixor'ga qo'shish» tugmachasini bosing.</i>",
  ];
  return send(chatId, lines.join("\n"), {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "📝 Bio", callback_data: `dzb:${d.id}` },
          { text: "🔗 Havola qo'shish", callback_data: `dzl:${d.id}` },
        ],
        ...(d.links && Object.keys(d.links).length
          ? [[{ text: "🧹 Qo'shimcha havolalarni tozalash", callback_data: `dzc:${d.id}` }]]
          : []),
        [{ text: "🌐 Saytda ko'rish", url: siteDesignerUrl(d) }],
      ],
    },
  });
}

/** /dizayner — oxirgi dizaynerlar; /dizayner Ism — ism bo'yicha qidirish */
async function onDesignerCommand(chatId: number, query: string) {
  const list = query ? await findAllByName(query) : await recentDesigners(12);
  if (!list.length) {
    return send(chatId, query ? `«${escapeHtml(query)}» topilmadi. Ismni boshqacha yozib ko'ring.` : "Hali dizaynerlar yo'q.");
  }
  if (list.length === 1) return sendDesignerCard(chatId, list[0]);
  return send(chatId, "👤 Qaysi dizayner? (Ism bo'yicha qidirish: <code>/dizayner Ism</code>)", {
    reply_markup: {
      inline_keyboard: list.slice(0, 12).map((d) => [{ text: `👤 ${clip(d.name, 40)}`, callback_data: `dz:${d.id}` }]),
    },
  });
}

/** Bio yoki havola kutilayotgan bo'lsa — shu xabarni o'shanga yozadi. true = ishlandi */
async function onDesignerReply(chatId: number, userId: number, text: string): Promise<boolean> {
  const state = await getDesignerState(userId);
  if (!state || !text || text.startsWith("/")) return false;
  if (state.awaiting === "designer_link") {
    const url = extractUrl(text);
    if (!url || !profileFromUrl(url)) {
      // Bu profil havolasi emas (masalan, ish havolasi) — odatdagidek ishlaymiz
      await clearState(userId);
      return false;
    }
    const d = await updateDesignerProfile(state.designer_id, { addLink: url });
    await clearState(userId);
    await sendDesignerCard(chatId, d);
    return true;
  }
  const d = await updateDesignerProfile(state.designer_id, { bio: text === "-" ? null : text });
  await clearState(userId);
  await sendDesignerCard(chatId, d);
  return true;
}

// ---------- Asosiy ishlov ----------

export async function handleUpdate(update: TgUpdate) {
  try {
    if (update.callback_query) await onCallback(update.callback_query);
    else if (update.message) await onMessage(update.message);
  } catch (err) {
    console.error("[bot] xato:", err);
    const chatId = update.message?.chat.id ?? update.callback_query?.message?.chat.id;
    if (chatId) {
      const msg = err instanceof Error ? err.message : String(err);
      await send(chatId, `⚠️ Xatolik: <code>${escapeHtml(clip(msg, 300))}</code>`).catch(() => {});
    }
  }
}

async function onMessage(msg: TgMessage) {
  if (msg.chat.type !== "private" || !msg.from) return;
  const userId = msg.from.id;
  const text = (msg.text ?? msg.caption ?? "").trim();

  if (/^\/(start|id|help)\b/.test(text)) {
    const admin = isAdmin(userId);
    return send(
      msg.chat.id,
      [
        `👋 Salom! Sizning Telegram ID: <code>${userId}</code>`,
        admin
          ? "\n✅ Siz adminsiz. Behance, Dribbble, Dprofile yoki X havolasini yuboring — ishni tayyorlab beraman.\n👤 /dizayner — dizayner bio va havolalari."
          : "\nBotni boshqarish uchun bu ID'ni Vercel'dagi <code>TELEGRAM_ADMIN_IDS</code> ga qo'shing.",
      ].join("\n"),
    );
  }

  if (!isAdmin(userId)) return; // begonalarga javob bermaymiz

  const dz = text.match(/^\/(dizayner|designer)(?:@\w+)?\s*([\s\S]*)$/i);
  if (dz) return onDesignerCommand(msg.chat.id, dz[2].trim());
  if (!msg.photo && !msg.document && (await onDesignerReply(msg.chat.id, userId, text))) return;

  // Rasm keldi
  const photo = msg.photo?.at(-1);
  const docImage = msg.document?.mime_type?.startsWith("image/") ? msg.document : undefined;
  if (photo || docImage) {
    const state = await getState(userId);
    if (!state) return send(msg.chat.id, "Bu rasm qaysi ishga? Avval havola yuboring yoki preview'dagi 🖼 Rasm tugmasini bosing.");
    const row = await getWorkRow(state.work_id);
    if (!row) return clearState(userId);
    const file = await downloadTelegramFile((photo ?? docImage)!.file_id);
    const stored = await storeImage(file.bytes, file.type);
    await deleteImage(row.image_path);
    const updated = await updateWork(row.id, { image_url: stored.url, image_path: stored.path });
    await clearState(userId);
    return sendPreview(msg.chat.id, updated);
  }

  const url = extractUrl(text);
  if (url) return onLink(msg.chat.id, userId, url, msg.message_id);

  // Tahrirlash javobi
  const state = await getState(userId);
  if (state && state.awaiting !== "image" && text) {
    const row = await getWorkRow(state.work_id);
    if (!row) return clearState(userId);
    const value = text.slice(0, state.awaiting === "description" ? 1000 : 200);
    let fields: Partial<WorkRow>;
    if (state.awaiting === "designer") {
      // Yozilgan ism: shu nomli dizayner bo'lsa unga bog'lanadi, bo'lmasa yangisi yaratiladi
      const designer = await resolveDesigner({ name: value, platform: row.platform });
      fields = designerFields(designer, value);
    } else {
      fields = state.awaiting === "title" ? { title: value } : { description: value === "-" ? null : value };
    }
    const updated = await updateWork(row.id, fields);
    await clearState(userId);
    return sendPreview(msg.chat.id, updated);
  }

  return send(msg.chat.id, "Ish qo'shish uchun Behance, Dribbble, Dprofile yoki X havolasini yuboring.");
}

async function onLink(chatId: number, userId: number, rawUrl: string, messageId: number) {
  const platform = detectPlatform(rawUrl);
  if (!platform) {
    return send(chatId, "Hozircha faqat <b>Behance, Dribbble, Dprofile va X</b> havolalari qabul qilinadi.");
  }
  const url = normalizeUrl(rawUrl);

  const existing = await findWorkBySource(url);
  if (existing?.status === "published") {
    const fix = existing.categories ? "\n\n📂 Kategoriyasini shu yerda o'zgartirsa bo'ladi:" : "";
    return send(chatId, `✅ Bu ish allaqachon saytda bor:\n${siteWorkUrl(existing.id)}${fix}`, {
      reply_markup: { inline_keyboard: categoryRow(existing) },
    });
  }
  if (existing?.status === "draft" && existing.image_url && existing.title) {
    await send(chatId, "Bu havola qoralamada turibdi, mana u:");
    return sendPreview(chatId, existing);
  }

  await send(chatId, "⏳ Ma'lumot olinmoqda…");
  // Ikki manba parallel: Telegram yasagan preview (bloklanmaydi) va saytning o'zi
  // X — o'zining ochiq manbasidan (matn, muallif, rasm/video); boshqalar — Telegram preview va sahifa
  const x = platform === "x" ? await fetchXPost(url) : null;
  const [tgp, scraped] = x?.post
    ? [{ preview: null, note: x.note }, null]
    : await Promise.all([readLinkPreview(chatId, messageId, url), scrapeUrl(url)]);
  const site = scraped?.data;
  const notes = [...(x && !x.post ? [x.note] : []), tgp.note, ...(scraped?.notes ?? [])];
  const p = tgp.preview;
  const split = p?.title ? splitTitle(platform, p.title) : null;

  const data = x?.post
    ? { title: "", description: x.post.text || null, designerName: x.post.name, designerHandle: x.post.handle }
    : {
        title: split?.title || site?.title || "",
        description: p?.description || site?.description || null,
        designerName: split?.designer || site?.designerName || p?.author || null,
        designerHandle: site?.designerHandle ?? null,
      };

  const xm = x?.post ? await xMedia(x.post, chatId, notes) : null;
  let image: { url: string; path: string } | null = xm?.image ?? null;
  if (!image && p?.image) {
    try {
      image = await storeImage(p.image.bytes, p.image.type);
    } catch (err) {
      console.error("[bot] preview rasmini saqlab bo'lmadi:", err);
    }
  }
  if (!image && site?.image) {
    try {
      image = await copyRemoteImage(site.image);
    } catch (err) {
      console.error("[bot] muqovani to'g'ridan-to'g'ri ko'chirib bo'lmadi:", err);
      image = await copyImageViaTelegram(chatId, site.image);
    }
  }

  const designer = await resolveDesigner({
    name: data.designerName,
    platform,
    profileUrl: site?.designerUrl ?? (data.designerHandle ? `/${data.designerHandle}` : null),
    avatarUrl: x?.post?.avatar ?? site?.designerAvatar,
  }).catch((err) => {
    console.error("[bot] dizaynerni aniqlab bo'lmadi:", err);
    return null;
  });
  return saveDraftAndPreview({ chatId, userId, url, platform, existing, data, image, notes, designer, video: xm?.video });
}

type StoredVideo = { url: string; path: string; size: number; kind: "animation" | "video" };

/** X postining muqovasi (video kadri yoki rasm) va videosini saqlaydi */
async function xMedia(post: XPost, chatId: number, notes: string[]) {
  let image: { url: string; path: string } | null = null;
  const cover = post.video?.poster ?? post.photo;
  if (cover) {
    try {
      image = await copyRemoteImage(cover);
    } catch {
      image = await copyImageViaTelegram(chatId, cover);
    }
  }
  let video: StoredVideo | null = null;
  if (post.video) {
    try {
      const v = await copyRemoteVideo(post.video.urls);
      video = { url: v.url, path: v.path, size: v.size, kind: post.video.isGif || !v.hasAudio ? "animation" : "video" };
    } catch (err) {
      notes.push(`video: ${err instanceof Error ? err.message : "xato"}`);
    }
  }
  return { image, video };
}

type DraftInput = {
  chatId: number;
  userId: number;
  url: string;
  platform: Platform;
  existing: WorkRow | null;
  data: { title: string; description: string | null; designerName: string | null; designerHandle: string | null };
  image: { url: string; path: string } | null;
  notes: string[];
  designer?: DesignerRow | null;
  video?: StoredVideo | null;
};

function designerFields(designer: DesignerRow | null, fallbackName: string | null): Partial<WorkRow> {
  return designer
    ? { designer_id: designer.id, designer_name: designer.name, designer_handle: designer.handle }
    : { designer_id: null, designer_name: fallbackName ?? "" };
}

/** 006_categories.sql hali ishga tushirilmagan bo'lsa ham bot ishlayversin */
async function withoutMissingCategories<T>(withIt: () => Promise<T>, without: () => Promise<T>): Promise<T> {
  try {
    return await withIt();
  } catch (err) {
    if (err instanceof Error && /categories/.test(err.message)) {
      console.error("[bot] categories ustuni yo'q — supabase/006_categories.sql ni ishga tushiring");
      return without();
    }
    throw err;
  }
}

/** Qoralamani saqlaydi va adminga preview (tugmalar bilan) yuboradi */
async function saveDraftAndPreview({ chatId, userId, url, platform, existing, data, image, notes, designer, video }: DraftInput) {
  const fields = {
    platform,
    title: data.title,
    description: data.description,
    designer_handle: data.designerHandle,
    ...designerFields(designer ?? null, data.designerName),
    image_url: image?.url ?? null,
    image_path: image?.path ?? null,
    video_url: video?.url ?? null,
    video_path: video?.path ?? null,
    video_kind: video?.kind ?? null,
    video_size: video?.size ?? null,
    created_by_tg: userId,
    status: "draft" as const,
  };
  const withCategories = { ...fields, categories: defaultCategories(platform) };

  let row: WorkRow;
  if (existing) {
    // Oldin bekor qilingan yoki chala qolgan havola qayta yuborildi
    await clearState(userId);
    await deleteImage(existing.image_path);
    await deleteImage(existing.video_path ?? null);
    row = await withoutMissingCategories(
      () => updateWork(existing.id, withCategories),
      () => updateWork(existing.id, fields),
    );
  } else {
    row = await withoutMissingCategories(
      () => insertDraft({ source_url: url, ...withCategories }),
      () => insertDraft({ source_url: url, ...fields }),
    );
  }

  await sendPreview(chatId, row);

  const missing = [
    !row.image_url && !row.video_url && "muqova",
    !row.title && row.platform !== "x" && "nom",
    !row.designer_name && "dizayner ismi",
  ].filter(Boolean);
  const why = missing.length && notes.length ? `\n<i>(tekshiruv: ${escapeHtml(notes.join(" → "))})</i>` : "";
  // Behance/Dribbble serverlarni bloklaydi — brauzer tugmachasi ishonchli yo'l
  const hint =
    missing.length && (platform === "behance" || platform === "dribbble")
      ? `\n\n💡 ${getPlatform(platform).label} serverlarga ma'lumot bermaydi. Kompyuterda ish sahifasini ochib, brauzerdagi «Pixor'ga qo'shish» tugmachasini bosing: ${env.siteUrl}/admin/add`
      : "";
  if (!row.image_url && !row.video_url) {
    await setState(userId, row.id, "image");
    await send(chatId, `⚠️ ${missing.join(", ")} topilmadi. Muqova rasmini shu yerga yuboring.${why}${hint}`);
  } else if (missing.length) {
    await send(chatId, `ℹ️ ${missing.join(", ")} topilmadi — tugmalar orqali qo'shing.${why}${hint}`);
  }
  return row;
}

export type BrowserCapture = {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  designer?: string;
  /** Dizaynerning platformadagi profil havolasi */
  designerUrl?: string;
  designerAvatar?: string;
  /** Sahifadagi video (MP4), masalan Dribbble video shot */
  video?: string;
  /** "designer" — tugmacha dizaynerning profil sahifasida bosilgan */
  kind?: "work" | "designer";
  /** Profil sahifasidagi "o'zi haqida" matni */
  bio?: string;
};

/** Profil sahifasidan: dizaynerni topadi/yaratadi, bio va avatarni yangilaydi, botga kartochka yuboradi */
async function addDesignerFromBrowser(input: BrowserCapture, chatId: number) {
  const profile = profileFromUrl(input.designerUrl || input.url);
  if (!profile) return { ok: false as const, message: "Bu sahifa dizayner profili emas." };
  let designer = await resolveDesigner({
    name: input.designer || null,
    platform: profile.platform,
    profileUrl: profile.url,
    avatarUrl: input.designerAvatar || null,
  });
  if (!designer) return { ok: false as const, message: "Dizaynerni aniqlab bo'lmadi." };
  const bio = input.bio
    ?.split("\n")
    .map((l) => l.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (bio) designer = await updateDesignerProfile(designer.id, { bio });
  await sendDesignerCard(chatId, designer);
  const got = [
    `ism ${input.designer ? "✓" : "✗"}`,
    `avatar ${designer.avatar_url ? "✓" : "✗"}`,
    `bio ${bio ? "✓" : "✗"}`,
  ].join(", ");
  return {
    ok: true as const,
    message: `👤 ${designer.name} — profil yangilandi (${got}).\nBotda bio va boshqa havolalarni tuzatsa bo'ladi.\n${siteDesignerUrl(designer)}`,
  };
}

/**
 * Brauzer tugmachasi (bookmarklet) orqali kelgan ma'lumot: sahifa admin brauzerida
 * o'qilgan, shuning uchun Behance bloklay olmaydi. Natija adminga botda preview bo'lib boradi.
 */
export async function addFromBrowser(input: BrowserCapture): Promise<{ ok: true; message: string } | { ok: false; message: string }> {
  const adminId = [...env.botAdminIds][0];
  if (!adminId) return { ok: false, message: "TELEGRAM_ADMIN_IDS sozlanmagan." };
  const chatId = Number(adminId);
  if (input.kind === "designer") return addDesignerFromBrowser(input, chatId);

  const platform = detectPlatform(input.url);
  if (!platform) return { ok: false, message: "Bu sahifa Behance, Dribbble, Dprofile yoki X emas." };
  const url = normalizeUrl(input.url);

  const existing = await findWorkBySource(url);
  if (existing?.status === "published") {
    // Tugmacha chiqqan ishda qayta bosildi: dizaynerning avatari/profilini to'ldiramiz, muqovani yangilaymiz
    let designerError = "";
    const designer = await resolveDesigner({
      name: existing.designer_name || input.designer,
      platform,
      profileUrl: input.designerUrl,
      avatarUrl: input.designerAvatar,
    }).catch((err) => {
      designerError = err instanceof Error ? err.message : String(err);
      console.error("[bot] dizaynerni yangilab bo'lmadi:", err);
      return null;
    });
    if (designer && existing.designer_id !== designer.id) {
      await updateWork(existing.id, {
        designer_id: designer.id,
        designer_name: designer.name,
        designer_handle: designer.handle,
      });
    }
    revalidateTag(WORKS_TAG, { expire: 0 });
    revalidatePath("/designers", "layout");
    const cover = await refreshPublishedCover(existing, input.image, chatId);
    return { ok: cover.ok, message: `${cover.message}\n${designerReport(designer, input, designerError)}` };
  }

  const clean = (v: string | undefined, n: number) => {
    const t = (v ?? "").replace(/\s+/g, " ").trim();
    return t ? t.slice(0, n) : null;
  };
  const split = input.title ? splitTitle(platform, input.title) : null;
  // Sahifa sarlavhasidagi muallif ("… by Ism on Dribbble") eng ishonchli. Sahifadan topilgan
  // boshqa ismli profil (masalan, saytga kirgan adminning o'zi) bog'lanmaydi.
  const pageName = clean(input.designer, 120);
  // Dribbble: ism sarlavhada bo'lmasa, tavsifdagi "designed by …" dan olinadi
  if (split && !split.designer && platform === "dribbble") split.designer = designerFromDescription(input.description);
  if (split?.designer && pageName && pageName.toLowerCase() !== split.designer.toLowerCase()) {
    input.designerUrl = undefined;
    input.designerAvatar = undefined;
  }
  const data = {
    title: clean(split?.title, 200) ?? "",
    description: clean(
      platform === "dribbble"
        ? (input.description ?? "").replace(/\s*Connect with them on Dribbble.*$/i, "").replace(/^[^.]{0,200} designed by [^.]{1,120}\.?\s*$/i, "")
        : input.description,
      1000,
    ),
    designerName: split?.designer ?? pageName ?? null,
    designerHandle: null,
  };

  // X: video va to'liq ma'lumot X'ning ochiq manbasidan
  const notes: string[] = [];
  const x = platform === "x" ? await fetchXPost(url) : null;
  if (x?.post) {
    data.description = data.description || x.post.text || null;
    data.designerName = x.post.name || data.designerName;
    input.designerAvatar = input.designerAvatar || x.post.avatar || undefined;
  }
  const xm = x?.post ? await xMedia(x.post, chatId, notes) : null;

  let image: { url: string; path: string } | null = xm?.image ?? null;
  if (!image && input.image && /^https?:\/\//i.test(input.image)) {
    try {
      image = await copyRemoteImage(input.image);
    } catch (err) {
      console.error("[bot] brauzer rasmi to'g'ridan-to'g'ri olinmadi:", err);
      image = await copyImageViaTelegram(chatId, input.image);
    }
  }

  const designer = await resolveDesigner({
    name: data.designerName,
    platform,
    profileUrl: input.designerUrl ?? (platform === "x" || platform === "dprofile" ? input.url : null),
    avatarUrl: input.designerAvatar,
  }).catch((err) => {
    console.error("[bot] dizaynerni aniqlab bo'lmadi:", err);
    return null;
  });
  // Sahifadagi video (Dribbble video shot va h.k.)
  let video = xm?.video ?? null;
  if (!video && input.video && /^https?:\/\//i.test(input.video)) {
    try {
      const v = await copyRemoteVideo([input.video]);
      video = { url: v.url, path: v.path, size: v.size, kind: v.hasAudio ? "video" : "animation" };
    } catch (err) {
      notes.push(`video: ${err instanceof Error ? err.message : "xato"}`);
    }
  }

  await saveDraftAndPreview({ chatId, userId: chatId, url, platform, existing, data, image, notes, designer, video });
  return {
    ok: true,
    message: `Botga yuborildi — Telegram'da tekshirib, ✅ ni bosing.\n${designerReport(designer, input)}`,
  };
}

/** Tugmacha oynasida ko'rinadigan qisqa hisobot: dizayner bo'yicha nima topildi va saqlandi */
function designerReport(designer: DesignerRow | null, input: BrowserCapture, error = "") {
  const found = `sahifadan: ${input.designer ? "ism ✓" : "ism ✗"}, ${input.designerUrl ? "profil ✓" : "profil ✗"}, ${input.designerAvatar ? "avatar ✓" : "avatar ✗"}`;
  const saved = designer
    ? `saqlandi: ${designer.name}${designer.handle ? ` (@${designer.handle})` : ""}, avatar ${designer.avatar_url ? "✓" : "✗"}`
    : "dizayner saqlanmadi";
  return `👤 ${saved} — ${found}${error ? ` — xato: ${error}` : ""}`;
}

/**
 * Saytda turgan ishni tugmacha qayta bosilganda yangilaydi: muqovani almashtiradi
 * (sayt va kanal postida ham). Nom/dizayner o'zgarmaydi.
 */
async function refreshPublishedCover(row: WorkRow, imageUrl: string | undefined, chatId: number) {
  if (!imageUrl || !/^https?:\/\//i.test(imageUrl)) {
    return { ok: false as const, message: "Bu ish allaqachon saytda bor (yangi muqova topilmadi)." };
  }
  let image: { url: string; path: string } | null = null;
  try {
    image = await copyRemoteImage(imageUrl);
  } catch {
    image = await copyImageViaTelegram(chatId, imageUrl);
  }
  if (!image) return { ok: false as const, message: "Yangi muqovani yuklab bo'lmadi." };

  const oldPath = row.image_path;
  const updated = await updateWork(row.id, { image_url: image.url, image_path: image.path });
  await deleteImage(oldPath);
  revalidateTag(WORKS_TAG, { expire: 0 });
    revalidatePath("/");
  revalidatePath("/designers", "layout");

  if (updated.channel_message_id && !updated.video_url) {
    await tg("editMessageMedia", {
      chat_id: env.channelId,
      message_id: updated.channel_message_id,
      media: { type: "photo", media: updated.image_url, caption: channelCaption(updated), parse_mode: "HTML" },
      reply_markup: channelKeyboard(updated),
    }).catch((err) => console.error("[bot] kanal postini yangilab bo'lmadi:", err));
  }
  return { ok: true as const, message: "Bu ish saytda bor edi — muqova va dizayner ma'lumoti yangilandi." };
}

async function onCallback(cb: TgCallback) {
  const answer = (text?: string, alert = false) =>
    tg("answerCallbackQuery", { callback_query_id: cb.id, text, show_alert: alert }).catch(() => {});

  if (!isAdmin(cb.from.id)) return answer("Ruxsat yo'q", true);
  const chatId = cb.message?.chat.id;
  const [action, a, b] = (cb.data ?? "").split(":");

  // Dizayner tanlash (ro'yxatdan) yoki yangi ism yozish
  if (action === "ds" || action === "dn") {
    const state = await getState(cb.from.id);
    const work = state?.awaiting === "designer" ? await getWorkRow(state.work_id) : null;
    if (!work || !chatId) return answer("Avval preview'dagi 👤 Dizayner tugmasini bosing", true);
    if (action === "dn") {
      await answer();
      return send(chatId, FIELD_PROMPTS.designer);
    }
    const designer = await getDesignerById(a ?? "");
    if (!designer) return answer("Dizayner topilmadi", true);
    const updated = await updateWork(work.id, designerFields(designer, null));
    await clearState(cb.from.id);
    await answer(designer.name);
    return sendPreview(chatId, updated);
  }
  if (action === "dz" || action === "dzb" || action === "dzl" || action === "dzc") {
    const d = await getDesignerById(a ?? "");
    if (!d || !chatId) return answer("Dizayner topilmadi", true);
    if (action === "dz") {
      await answer();
      return sendDesignerCard(chatId, d);
    }
    if (action === "dzc") {
      const updated = await updateDesignerProfile(d.id, { clearLinks: true });
      await answer("Tozalandi");
      return sendDesignerCard(chatId, updated);
    }
    await setDesignerState(cb.from.id, d.id, action === "dzb" ? "designer_bio" : "designer_link");
    await answer();
    return send(
      chatId,
      action === "dzb"
        ? `📝 <b>${escapeHtml(d.name)}</b> uchun bio yozing (o'chirish uchun <code>-</code>):`
        : `🔗 <b>${escapeHtml(d.name)}</b>ning boshqa platformadagi profil havolasini yuboring (Behance, X, Dribbble yoki Dprofile):`,
    );
  }

  const workId = action === "e" || action === "c" ? b : a;
  const row = await getWorkRow(workId ?? "");
  if (!row || !chatId) return answer("Ish topilmadi", true);

  const dropKeyboard = () =>
    cb.message
      ? tg("editMessageReplyMarkup", { chat_id: chatId, message_id: cb.message.message_id, reply_markup: { inline_keyboard: [] } }).catch(() => {})
      : Promise.resolve();

  if (action === "e") {
    const field = a as Field;
    if (!(field in FIELD_PROMPTS)) return answer();
    await setState(cb.from.id, row.id, field);
    await answer();
    if (field === "designer") {
      const list = await recentDesigners(8);
      if (list.length) {
        const rows = list.map((d) => [{ text: `👤 ${clip(d.name, 40)}`, callback_data: `ds:${d.id}` }]);
        rows.push([{ text: "✍️ Yangi ism yozish", callback_data: "dn" }]);
        return send(chatId, "👤 Dizaynerni tanlang yoki yangi ism yozing:", { reply_markup: { inline_keyboard: rows } });
      }
    }
    return send(chatId, FIELD_PROMPTS[field]);
  }

  // Kategoriya: yoqish/o'chirish (chop etilgan ishda ham — sayt darhol yangilanadi)
  if (action === "c") {
    if (!isCategory(a) || !row.categories || row.status === "rejected") return answer();
    const current = normalizeCategories(row.categories);
    const on = current.includes(a);
    const next = on ? current.filter((c) => c !== a) : normalizeCategories([...current, a]);
    if (row.status === "published" && next.length === 0) return answer("Kamida bitta kategoriya qolsin", true);
    const updated = await updateWork(row.id, { categories: next });
    if (updated.status === "published") {
      revalidateTag(WORKS_TAG, { expire: 0 });
      revalidatePath("/");
    }
    if (cb.message) {
      const reply_markup =
        updated.status === "draft" ? previewKeyboard(updated) : { inline_keyboard: categoryRow(updated) };
      await tg("editMessageReplyMarkup", { chat_id: chatId, message_id: cb.message.message_id, reply_markup }).catch(() => {});
    }
    return answer(`${categoryLabel(a)} ${on ? "olib tashlandi" : "qo'shildi"}`);
  }

  if (action === "x") {
    if (row.status === "published") return answer("Allaqachon chop etilgan", true);
    await deleteImage(row.image_path);
    await deleteImage(row.video_path ?? null);
    await updateWork(row.id, {
      status: "rejected",
      image_url: null,
      image_path: null,
      video_url: null,
      video_path: null,
      video_kind: null,
      video_size: null,
    });
    await clearState(cb.from.id);
    await dropKeyboard();
    await answer("Bekor qilindi");
    return send(chatId, "❌ Bekor qilindi.");
  }

  if (action === "p") {
    if (row.status === "published") return answer("Allaqachon chop etilgan", true);
    if (!row.image_url && !row.video_url) return answer("Avval muqova rasmini qo'shing (🖼 Rasm)", true);
    if (!row.title && row.platform !== "x") return answer("Avval nom qo'shing (✏️ Nom)", true);
    if (row.categories && normalizeCategories(row.categories).length === 0) {
      return answer("Avval kategoriyani tanlang: Case, UI yoki Branding", true);
    }
    if (row.platform === "x" && !row.designer_name && !row.description) {
      return answer("Avval dizayner yoki post matnini qo'shing (👤 / 📄)", true);
    }
    await answer("Chop etilmoqda…");

    // Avval kanal: u muvaffaqiyatli bo'lsa, saytga ham chiqaramiz (ikkalasi bir xil bo'lsin)
    let channelMessageId: number;
    try {
      const sent = await sendWorkMedia(env.channelId, row, channelCaption(row), channelKeyboard(row));
      channelMessageId = sent.message_id;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return send(
        chatId,
        `⚠️ Kanalga yuborib bo'lmadi, shuning uchun saytga ham chiqarilmadi.\n<code>${escapeHtml(clip(msg, 300))}</code>\n\nBot kanalda admin ekanini va <code>TELEGRAM_CHANNEL_ID</code> to'g'riligini tekshiring.`,
      );
    }

    const published = await updateWork(row.id, {
      status: "published",
      published_at: new Date().toISOString(),
      channel_message_id: channelMessageId,
    });
    revalidateTag(WORKS_TAG, { expire: 0 });
    revalidatePath("/");
    revalidatePath("/designers", "layout");
    await clearState(cb.from.id);
    await dropKeyboard();
    return send(chatId, `✅ Chop etildi — saytda va kanalda.\n${siteWorkUrl(published.id)}`, {
      ...(published.designer_id
        ? { reply_markup: { inline_keyboard: [[{ text: "👤 Dizayner profili (bio, havolalar)", callback_data: `dz:${published.designer_id}` }]] } }
        : {}),
    });
  }

  return answer();
}
