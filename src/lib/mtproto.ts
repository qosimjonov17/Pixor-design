import "server-only";
import { Api, TelegramClient, sessions } from "telegram";
import type { LogLevel } from "telegram/extensions/Logger";

const { StringSession } = sessions;
import { db } from "./db";
import { env } from "./env";

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

/** Bot bilan chatdagi xabarning havola preview'ini qaytaradi (ko'pi bilan 25 soniya kutadi) */
export async function readLinkPreview(messageId: number): Promise<Result> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<Result>((resolve) => {
    timer = setTimeout(() => resolve({ preview: null, note: "tg-preview vaqt tugadi" }), 25_000);
  });
  try {
    return await Promise.race([readLinkPreviewInner(messageId), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

async function readLinkPreviewInner(messageId: number): Promise<Result> {
  if (!mtprotoEnabled()) return { preview: null, note: "tg-preview o'chiq" };

  const saved = await loadSession().catch(() => "");
  const client = new TelegramClient(
    new StringSession(saved),
    Number(process.env.TELEGRAM_API_ID),
    process.env.TELEGRAM_API_HASH!,
    { connectionRetries: 2, useWSS: false },
  );
  client.setLogLevel("error" as LogLevel);

  try {
    await client.start({ botAuthToken: env.botToken });
    const now = (client.session as InstanceType<typeof StringSession>).save();
    if (now && now !== saved) await saveSession(now);

    // Telegram preview'ni biroz kechikib to'ldirishi mumkin — bir necha marta so'raymiz
    for (let attempt = 0; attempt < 4; attempt++) {
      const res = await client.invoke(
        new Api.messages.GetMessages({ id: [new Api.InputMessageID({ id: messageId })] }),
      );
      const msg = "messages" in res ? res.messages[0] : undefined;
      const media = msg instanceof Api.Message ? msg.media : undefined;
      if (!(media instanceof Api.MessageMediaWebPage)) return { preview: null, note: "tg-preview yo'q" };

      const page = media.webpage;
      if (page instanceof Api.WebPage) {
        let image: LinkPreview["image"] = null;
        if (page.photo instanceof Api.Photo) {
          const bytes = await client.downloadMedia(media, {});
          if (Buffer.isBuffer(bytes) && bytes.length > 0) image = { bytes, type: "image/jpeg" };
        }
        return {
          preview: {
            title: page.title ?? null,
            description: page.description ?? null,
            author: page.author ?? null,
            siteName: page.siteName ?? null,
            image,
          },
          note: "tg-preview ok",
        };
      }
      if (page instanceof Api.WebPageEmpty) return { preview: null, note: "tg-preview bo'sh" };
      await sleep(1500); // WebPagePending
    }
    return { preview: null, note: "tg-preview kutish tugadi" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[mtproto] xato:", err);
    return { preview: null, note: `tg-preview xato: ${msg.slice(0, 80)}` };
  } finally {
    await client.destroy().catch(() => {});
  }
}
