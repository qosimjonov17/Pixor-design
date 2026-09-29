import "server-only";

/**
 * Server tomonidagi sozlamalar (Vercel → Settings → Environment Variables).
 * Qiymat yo'q bo'lsa, xato aniq nomi bilan chiqadi.
 */
function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Environment variable ${name} o'rnatilmagan`);
  return value;
}

export const env = {
  get siteUrl() {
    return required("NEXT_PUBLIC_SITE_URL").replace(/\/+$/, "");
  },
  get supabaseUrl() {
    return required("NEXT_PUBLIC_SUPABASE_URL");
  },
  get supabaseSecretKey() {
    return required("SUPABASE_SECRET_KEY");
  },
  get sessionSecret() {
    return required("AUTH_SESSION_SECRET");
  },
  get telegramClientId() {
    return required("TELEGRAM_CLIENT_ID");
  },
  get telegramClientSecret() {
    return required("TELEGRAM_CLIENT_SECRET");
  },
  /** @BotFather → API Token */
  get botToken() {
    return required("TELEGRAM_BOT_TOKEN");
  },
  /** Kanal: @nik yoki -100... raqami */
  get channelId() {
    return required("TELEGRAM_CHANNEL_ID");
  },
  /** Botni boshqara oladigan haqiqiy Telegram ID'lar (vergul bilan) */
  get botAdminIds(): Set<string> {
    return new Set(
      (process.env.TELEGRAM_ADMIN_IDS ?? "")
        .split(/[,\s]+/)
        .map((s) => s.trim())
        .filter(Boolean),
    );
  },
};

/** Saytdagi admin sahifalar uchun (kirishdagi Telegram ID — users.telegram_id) */
export const SITE_ADMIN_SUBS = new Set(["4342440248141532524"]);
