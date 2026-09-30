import "server-only";
import { downloadTelegramFile, tg } from "./telegramBot";
import { storeImage } from "./works";

type TgPhoto = { file_id: string; width: number; height: number };

/**
 * Zaxira: rasm sayti serverimizni bloklasa, rasmni Telegram o'zi yuklab oladi
 * (sendPhoto URL bilan), keyin biz uni Telegram'dan olib, Storage'ga saqlaymiz.
 */
export async function copyImageViaTelegram(chatId: number, imageUrl: string) {
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

