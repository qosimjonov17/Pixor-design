import "server-only";
import { revalidatePath } from "next/cache";
import { getPlatform, type Platform } from "@/data/platforms";
import { db } from "./db";
import { env } from "./env";
import { readLinkPreview } from "./mtproto";
import { detectPlatform, extractUrl, normalizeUrl, scrapeUrl, splitTitle } from "./scrape";
import { downloadTelegramFile, escapeHtml, tg, type InlineKeyboard } from "./telegramBot";
import {
  copyRemoteImage,
  deleteImage,
  findWorkBySource,
  getWorkRow,
  insertDraft,
  storeImage,
  updateWork,
  type WorkRow,
} from "./works";

/**
 * Pixora boti:
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
  designer: "👤 Dizayner <b>ismi</b>ni yozing:",
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

/** Kanal posti matni (namunadagi uslub, havolasiz — havola tugmada) */
export function channelCaption(row: WorkRow) {
  const title = escapeHtml(clip(row.title || "Nomsiz ish", 300));
  const designer = escapeHtml(clip(row.designer_name || "Noma'lum dizayner", 120));
  return `🆕 <b>Yangi ish qo'shildi!</b>\n\n📝 ${title}\n👤 ${designer}`;
}

export function channelKeyboard(row: WorkRow): InlineKeyboard {
  return { inline_keyboard: [[{ text: "Pixora'da ko'rish", url: siteWorkUrl(row.id) }]] };
}

function previewCaption(row: WorkRow) {
  const parts = [channelCaption(row), "", "— — —"];
  parts.push(`📄 ${row.description ? escapeHtml(clip(row.description, 350)) : "<i>tavsif yo'q</i>"}`);
  parts.push(`🔗 ${escapeHtml(getPlatform(row.platform).label)}: ${escapeHtml(clip(row.source_url, 120))}`);
  if (!row.image_url) parts.push("\n⚠️ Muqova yo'q — 🖼 Rasm tugmasini bosib, rasm yuboring.");
  parts.push("\nSayt va kanalga chiqarish uchun ✅ ni bosing.");
  return clip(parts.join("\n"), 1000);
}

function previewKeyboard(row: WorkRow): InlineKeyboard {
  return {
    inline_keyboard: [
      [{ text: "✅ Chop etish", callback_data: `p:${row.id}` }],
      [
        { text: "✏️ Nom", callback_data: `e:title:${row.id}` },
        { text: "👤 Dizayner", callback_data: `e:designer:${row.id}` },
      ],
      [
        { text: "📄 Tavsif", callback_data: `e:description:${row.id}` },
        { text: "🖼 Rasm", callback_data: `e:image:${row.id}` },
      ],
      [{ text: "❌ Bekor qilish", callback_data: `x:${row.id}` }],
    ],
  };
}

async function send(chatId: number, text: string, extra: Record<string, unknown> = {}) {
  return tg("sendMessage", { chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true, ...extra });
}

async function sendPreview(chatId: number, row: WorkRow) {
  const caption = previewCaption(row);
  const reply_markup = previewKeyboard(row);
  if (row.image_url) {
    try {
      return await tg("sendPhoto", { chat_id: chatId, photo: row.image_url, caption, parse_mode: "HTML", reply_markup });
    } catch (err) {
      console.error("[bot] preview rasmi yuborilmadi:", err);
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
          ? "\n✅ Siz adminsiz. Behance, Dribbble, Dprofile yoki X havolasini yuboring — ishni tayyorlab beraman."
          : "\nBotni boshqarish uchun bu ID'ni Vercel'dagi <code>TELEGRAM_ADMIN_IDS</code> ga qo'shing.",
      ].join("\n"),
    );
  }

  if (!isAdmin(userId)) return; // begonalarga javob bermaymiz

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
    const fields: Partial<WorkRow> =
      state.awaiting === "title"
        ? { title: value }
        : state.awaiting === "designer"
          ? { designer_name: value }
          : { description: value === "-" ? null : value };
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
    return send(chatId, `✅ Bu ish allaqachon saytda bor:\n${siteWorkUrl(existing.id)}`);
  }
  if (existing?.status === "draft" && existing.image_url && existing.title) {
    await send(chatId, "Bu havola qoralamada turibdi, mana u:");
    return sendPreview(chatId, existing);
  }

  await send(chatId, "⏳ Ma'lumot olinmoqda…");
  // Ikki manba parallel: Telegram yasagan preview (bloklanmaydi) va saytning o'zi
  const [tgp, scraped] = await Promise.all([readLinkPreview(chatId, messageId, url), scrapeUrl(url)]);
  const site = scraped?.data;
  const notes = [tgp.note, ...(scraped?.notes ?? [])];
  const p = tgp.preview;
  const split = p?.title ? splitTitle(platform, p.title) : null;

  const data = {
    title: split?.title || site?.title || "",
    description: p?.description || site?.description || null,
    designerName: split?.designer || site?.designerName || p?.author || null,
    designerHandle: site?.designerHandle ?? null,
  };

  let image: { url: string; path: string } | null = null;
  if (p?.image) {
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

  return saveDraftAndPreview({ chatId, userId, url, platform, existing, data, image, notes });
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
};

/** Qoralamani saqlaydi va adminga preview (tugmalar bilan) yuboradi */
async function saveDraftAndPreview({ chatId, userId, url, platform, existing, data, image, notes }: DraftInput) {
  const fields = {
    platform,
    title: data.title,
    description: data.description,
    designer_name: data.designerName ?? "",
    designer_handle: data.designerHandle,
    image_url: image?.url ?? null,
    image_path: image?.path ?? null,
    created_by_tg: userId,
    status: "draft" as const,
  };

  let row: WorkRow;
  if (existing) {
    // Oldin bekor qilingan yoki chala qolgan havola qayta yuborildi
    await clearState(userId);
    await deleteImage(existing.image_path);
    row = await updateWork(existing.id, fields);
  } else {
    row = await insertDraft({ source_url: url, ...fields });
  }

  await sendPreview(chatId, row);

  const missing = [!row.image_url && "muqova", !row.title && "nom", !row.designer_name && "dizayner ismi"].filter(Boolean);
  const why = missing.length && notes.length ? `\n<i>(tekshiruv: ${escapeHtml(notes.join(" → "))})</i>` : "";
  if (!row.image_url) {
    await setState(userId, row.id, "image");
    await send(chatId, `⚠️ ${missing.join(", ")} topilmadi. Muqova rasmini shu yerga yuboring.${why}`);
  } else if (missing.length) {
    await send(chatId, `ℹ️ ${missing.join(", ")} topilmadi — tugmalar orqali qo'shing.${why}`);
  }
  return row;
}

export type BrowserCapture = {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  designer?: string;
};

/**
 * Brauzer tugmachasi (bookmarklet) orqali kelgan ma'lumot: sahifa admin brauzerida
 * o'qilgan, shuning uchun Behance bloklay olmaydi. Natija adminga botda preview bo'lib boradi.
 */
export async function addFromBrowser(input: BrowserCapture): Promise<{ ok: true; message: string } | { ok: false; message: string }> {
  const platform = detectPlatform(input.url);
  if (!platform) return { ok: false, message: "Bu sahifa Behance, Dribbble, Dprofile yoki X emas." };
  const url = normalizeUrl(input.url);
  const adminId = [...env.botAdminIds][0];
  if (!adminId) return { ok: false, message: "TELEGRAM_ADMIN_IDS sozlanmagan." };
  const chatId = Number(adminId);

  const existing = await findWorkBySource(url);
  if (existing?.status === "published") {
    return { ok: false, message: "Bu ish allaqachon saytda bor." };
  }

  const clean = (v: string | undefined, n: number) => {
    const t = (v ?? "").replace(/\s+/g, " ").trim();
    return t ? t.slice(0, n) : null;
  };
  const split = input.title ? splitTitle(platform, input.title) : null;
  const data = {
    title: clean(split?.title, 200) ?? "",
    description: clean(input.description, 1000),
    designerName: clean(input.designer, 120) ?? split?.designer ?? null,
    designerHandle: null,
  };

  let image: { url: string; path: string } | null = null;
  if (input.image && /^https?:\/\//i.test(input.image)) {
    try {
      image = await copyRemoteImage(input.image);
    } catch (err) {
      console.error("[bot] brauzer rasmi to'g'ridan-to'g'ri olinmadi:", err);
      image = await copyImageViaTelegram(chatId, input.image);
    }
  }

  await saveDraftAndPreview({ chatId, userId: chatId, url, platform, existing, data, image, notes: [] });
  return { ok: true, message: "Botga yuborildi — Telegram'da tekshirib, ✅ ni bosing." };
}

/**
 * Zaxira: rasm sayti serverimizni bloklasa, rasmni Telegram o'zi yuklab oladi
 * (sendPhoto URL bilan), keyin biz uni Telegram'dan olib, Storage'ga saqlaymiz.
 */
async function copyImageViaTelegram(chatId: number, imageUrl: string) {
  try {
    const sent = await tg<{ message_id: number; photo?: TgPhoto[] }>("sendPhoto", {
      chat_id: chatId,
      photo: imageUrl,
      disable_notification: true,
    });
    const fileId = sent.photo?.at(-1)?.file_id;
    await tg("deleteMessage", { chat_id: chatId, message_id: sent.message_id }).catch(() => {});
    if (!fileId) return null;
    const file = await downloadTelegramFile(fileId);
    return await storeImage(file.bytes, file.type);
  } catch (err) {
    console.error("[bot] muqovani Telegram orqali ham olib bo'lmadi:", err);
    return null;
  }
}

async function onCallback(cb: TgCallback) {
  const answer = (text?: string, alert = false) =>
    tg("answerCallbackQuery", { callback_query_id: cb.id, text, show_alert: alert }).catch(() => {});

  if (!isAdmin(cb.from.id)) return answer("Ruxsat yo'q", true);
  const chatId = cb.message?.chat.id;
  const [action, a, b] = (cb.data ?? "").split(":");
  const workId = action === "e" ? b : a;
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
    return send(chatId, FIELD_PROMPTS[field]);
  }

  if (action === "x") {
    if (row.status === "published") return answer("Allaqachon chop etilgan", true);
    await deleteImage(row.image_path);
    await updateWork(row.id, { status: "rejected", image_url: null, image_path: null });
    await clearState(cb.from.id);
    await dropKeyboard();
    await answer("Bekor qilindi");
    return send(chatId, "❌ Bekor qilindi.");
  }

  if (action === "p") {
    if (row.status === "published") return answer("Allaqachon chop etilgan", true);
    if (!row.image_url) return answer("Avval muqova rasmini qo'shing (🖼 Rasm)", true);
    if (!row.title) return answer("Avval nom qo'shing (✏️ Nom)", true);
    await answer("Chop etilmoqda…");

    // Avval kanal: u muvaffaqiyatli bo'lsa, saytga ham chiqaramiz (ikkalasi bir xil bo'lsin)
    let channelMessageId: number;
    try {
      const sent = await tg<{ message_id: number }>("sendPhoto", {
        chat_id: env.channelId,
        photo: row.image_url,
        caption: channelCaption(row),
        parse_mode: "HTML",
        reply_markup: channelKeyboard(row),
      });
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
    revalidatePath("/");
    await clearState(cb.from.id);
    await dropKeyboard();
    return send(chatId, `✅ Chop etildi — saytda va kanalda.\n${siteWorkUrl(published.id)}`);
  }

  return answer();
}
