import "server-only";
import { createHash } from "node:crypto";
import { env } from "./env";

/** Telegram Bot API bilan ishlash uchun kichik yordamchi */

// TELEGRAM_API_BASE faqat lokal sinov uchun (soxta server). Vercel'da O'RNATILMAYDI.
const API_BASE = process.env.TELEGRAM_API_BASE ?? "https://api.telegram.org";

export type InlineButton = { text: string; callback_data?: string; url?: string };
export type InlineKeyboard = { inline_keyboard: InlineButton[][] };

export async function tg<T = unknown>(method: string, params: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(`${API_BASE}/bot${env.botToken}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
    signal: AbortSignal.timeout(20_000),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as { ok?: boolean; result?: T; description?: string };
  if (!json.ok) throw new Error(`Telegram ${method}: ${json.description ?? res.status}`);
  return json.result as T;
}

/**
 * Faylni to'g'ridan-to'g'ri yuklab yuborish (multipart). URL orqali Telegram faqat 20 MB gacha
 * oladi, fayl sifatida esa 50 MB gacha.
 */
export async function tgUpload<T = unknown>(
  method: string,
  params: Record<string, unknown>,
  file: { field: string; bytes: Uint8Array; name: string; type: string },
): Promise<T> {
  const form = new FormData();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    form.append(k, typeof v === "string" ? v : JSON.stringify(v));
  }
  form.append(file.field, new Blob([new Uint8Array(file.bytes)], { type: file.type }), file.name);
  const res = await fetch(`${API_BASE}/bot${env.botToken}/${method}`, {
    method: "POST",
    body: form,
    signal: AbortSignal.timeout(55_000),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as { ok?: boolean; result?: T; description?: string };
  if (!json.ok) throw new Error(`Telegram ${method}: ${json.description ?? res.status}`);
  return json.result as T;
}

/** Telegram'ga yuborilgan rasmni (file_id) yuklab oladi */
export async function downloadTelegramFile(fileId: string) {
  const file = await tg<{ file_path?: string }>("getFile", { file_id: fileId });
  if (!file.file_path) throw new Error("Fayl manzili yo'q");
  const res = await fetch(`${API_BASE}/file/bot${env.botToken}/${file.file_path}`, {
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`Faylni yuklab bo'lmadi: ${res.status}`);
  const ext = file.file_path.split(".").pop()?.toLowerCase();
  const type = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
  return { bytes: await res.arrayBuffer(), type };
}

/**
 * Webhook maxfiy kaliti. Telegram har bir so'rovda uni sarlavhada yuboradi —
 * shunda boshqalar botimiz nomidan soxta so'rov yubora olmaydi.
 * Alohida sozlama shart emas: AUTH_SESSION_SECRET dan hosil qilinadi.
 */
export function webhookSecret() {
  return createHash("sha256").update(`tg-webhook:${env.sessionSecret}`).digest("hex").slice(0, 48);
}

export function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
