import "server-only";
import { Api, TelegramClient, sessions } from "telegram";
import type { LogLevel } from "telegram/extensions/Logger";

const { StringSession } = sessions;
import { db } from "./db";
import { env } from "./env";
import { tg } from "./telegramBot";

/**
 * Telegram havola preview'ini o'qish.
 *
 * Behance kabi saytlar serverlarni bloklaydi, lekin Telegram'ga ochiq. Admin havola
 * yuborganda Telegram o'zi preview (nom, tavsif, rasm) yasaydi. Oddiy Bot API bu
 * ma'lumotni bermaydi, shuning uchun bot Telegram'ning asosiy protokoli (MTProto)
 * orqali xuddi shu xabarni o'qiydi. Buning uchun my.telegram.org dan olinadigan
 * TELEGRAM_API_ID va TELEGRAM_API_HASH kerak. Bo'lmasa — bu yo'l shunchaki o'tkazib yuboriladi.
 */

export type LinkPreview = {
  title: string | null;
  description: string | null;
  author: string | null;
  siteName: string | null;
  image: { bytes: Buffer; type: string } | null;
};

const SESSION_KEY = "mtproto_session";

export function mtprotoEnabled() {
  return Boolean(process.env.TELEGRAM_API_ID && process.env.TELEGRAM_API_HASH);
}

async function loadSession() {
  const { data } = await db().from("bot_kv").select("value").eq("key", SESSION_KEY).maybeSingle();
  return (data?.value as string | undefined) ?? "";
}

async function saveSession(value: string) {
  const { error } = await db()
    .from("bot_kv")
    .upsert({ key: SESSION_KEY, value, updated_at: new Date().toISOString() });
  if (error) console.error("[mtproto] sessiyani saqlab bo'lmadi:", error.message);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Result = { preview: LinkPreview | null; note: string };
type Client = InstanceType<typeof TelegramClient>;

/**
 * Havola preview'ini qaytaradi (ko'pi bilan 40 soniya). Uch yo'l bilan urinadi:
 *  1) admin yuborgan xabarning preview'i;
 *  2) Telegram'dan shu havola preview'ini to'g'ridan-to'g'ri so'rash;
 *  3) bot havolani o'zi yuboradi, Telegram yasagan preview'ni o'qiydi va xabarni o'chiradi.
 */
export async function readLinkPreview(chatId: number, messageId: number, url: string): Promise<Result> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<Result>((resolve) => {
    timer = setTimeout(() => resolve({ preview: null, note: "tg-preview vaqt tugadi" }), 40_000);
  });
  try {
    return await Promise.race([readLinkPreviewInner(chatId, messageId, url), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

async function toPreview(client: Client, page: InstanceType<typeof Api.WebPage>): Promise<LinkPreview> {
  let image: LinkPreview["image"] = null;
  if (page.photo instanceof Api.Photo) {
    const bytes = await client.downloadMedia(new Api.MessageMediaPhoto({ photo: page.photo }), {}).catch(() => undefined);
    if (Buffer.isBuffer(bytes) && bytes.length > 0) image = { bytes, type: "image/jpeg" };
  }
  return {
    title: page.title ?? null,
    description: page.description ?? null,
    author: page.author ?? null,
    siteName: page.siteName ?? null,
    image,
  };
}

/** Xabardagi preview'ni o'qiydi; Telegram hali tayyorlayotgan bo'lsa, biroz kutadi */
async function pageFromMessage(client: Client, messageId: number, tries: number) {
  for (let attempt = 0; attempt < tries; attempt++) {
    const res = await client.invoke(new Api.messages.GetMessages({ id: [new Api.InputMessageID({ id: messageId })] }));
    const msg = "messages" in res ? res.messages[0] : undefined;
    const media = msg instanceof Api.Message ? msg.media : undefined;
    if (!(media instanceof Api.MessageMediaWebPage)) return "yo'q";
    if (media.webpage instanceof Api.WebPage) return media.webpage;
    if (media.webpage instanceof Api.WebPageEmpty) return "bo'sh";
    await sleep(1500); // WebPagePending
  }
  return "kutish tugadi";
}

const usable = (p: InstanceType<typeof Api.WebPage>) => Boolean(p.title || p.description || p.photo);

async function readLinkPreviewInner(chatId: number, messageId: number, url: string): Promise<Result> {
  if (!mtprotoEnabled()) return { preview: null, note: "tg-preview o'chiq" };

  const saved = await loadSession().catch(() => "");
  const client = new TelegramClient(
    new StringSession(saved),
    Number(process.env.TELEGRAM_API_ID),
    process.env.TELEGRAM_API_HASH!,
    { connectionRetries: 2, useWSS: false },
  );
  client.setLogLevel("error" as LogLevel);
  const notes: string[] = [];

  try {
    await client.start({ botAuthToken: env.botToken });
    const now = (client.session as InstanceType<typeof StringSession>).save();
    if (now && now !== saved) await saveSession(now);

    // 1) Admin xabarining preview'i
    const own = await pageFromMessage(client, messageId, 3);
    if (typeof own !== "string" && usable(own)) return { preview: await toPreview(client, own), note: "tg-preview ok" };
    notes.push(`xabar: ${typeof own === "string" ? own : "bo'sh"}`);

    // 2) To'g'ridan-to'g'ri so'rash (botlarga ruxsat berilmagan bo'lishi mumkin)
    try {
      const res = await client.invoke(new Api.messages.GetWebPage({ url, hash: 0 }));
      if (res.webpage instanceof Api.WebPage && usable(res.webpage)) {
        return { preview: await toPreview(client, res.webpage), note: "tg-preview ok (so'rov)" };
      }
      notes.push("so'rov: bo'sh");
    } catch (err) {
      notes.push(`so'rov: ${err instanceof Error ? err.message.slice(0, 40) : "xato"}`);
    }

    // 3) Bot havolani o'zi yuboradi
    let helperId: number | null = null;
    try {
      const sent = await tg<{ message_id: number }>("sendMessage", {
        chat_id: chatId,
        text: url,
        disable_notification: true,
        link_preview_options: { url, prefer_large_media: true },
      });
      helperId = sent.message_id;
      const page = await pageFromMessage(client, helperId, 8);
      if (typeof page !== "string" && usable(page)) {
        return { preview: await toPreview(client, page), note: "tg-preview ok (bot xabari)" };
      }
      notes.push(`bot xabari: ${typeof page === "string" ? page : "bo'sh"}`);
    } finally {
      if (helperId) await tg("deleteMessage", { chat_id: chatId, message_id: helperId }).catch(() => {});
    }
    return { preview: null, note: `tg-preview: ${notes.join(", ")}` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[mtproto] xato:", err);
    return { preview: null, note: `tg-preview xato: ${msg.slice(0, 80)}${notes.length ? ` (${notes.join(", ")})` : ""}` };
  } finally {
    await client.destroy().catch(() => {});
  }
}
