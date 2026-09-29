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
};
