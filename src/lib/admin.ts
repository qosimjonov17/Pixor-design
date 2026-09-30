import "server-only";
import { db } from "./db";
import { SITE_ADMIN_SUBS } from "./env";
import { getSession } from "./session";

/** Saytga kirgan foydalanuvchi adminmi (SITE_ADMIN_SUBS ro'yxatida) */
export async function isSiteAdmin() {
  const user = await getSession();
  if (!user) return { user: null, admin: false };
  const { data } = await db().from("users").select("telegram_id").eq("id", user.id).maybeSingle();
  return { user, admin: Boolean(data && SITE_ADMIN_SUBS.has(String(data.telegram_id))) };
}
