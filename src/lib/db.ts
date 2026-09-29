import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env";

let client: SupabaseClient | null = null;

/**
 * Faqat serverda ishlatiladigan Supabase klienti (secret kalit bilan).
 * Jadvallarda RLS yoqilgan va ochiq ruxsatlar yo'q — demak bazaga
 * faqat shu server kodi orqali kirish mumkin.
 */
export function db(): SupabaseClient {
  if (!client) {
    client = createClient(env.supabaseUrl, env.supabaseSecretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

export type TelegramProfile = {
  telegramId: string;
  name: string;
  username: string | null;
  picture: string | null;
};

/** Telegram orqali kirgan foydalanuvchini yaratadi yoki yangilaydi, users.id qaytaradi */
export async function upsertTelegramUser(profile: TelegramProfile): Promise<string> {
  const { data, error } = await db()
    .from("users")
    .upsert(
      {
        telegram_id: profile.telegramId,
        name: profile.name,
        username: profile.username,
        picture: profile.picture,
        last_login_at: new Date().toISOString(),
      },
      { onConflict: "telegram_id" },
    )
    .select("id")
    .single();

  if (error || !data) throw new Error(`Foydalanuvchini saqlab bo'lmadi: ${error?.message}`);
  return data.id as string;
}

export async function getSavedWorkIds(userId: string): Promise<string[]> {
  const { data, error } = await db()
    .from("saved_works")
    .select("work_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => row.work_id as string);
}

export async function setWorkSaved(userId: string, workId: string, saved: boolean) {
  const table = db().from("saved_works");
  const { error } = saved
    ? await table.upsert({ user_id: userId, work_id: workId }, { onConflict: "user_id,work_id" })
    : await table.delete().eq("user_id", userId).eq("work_id", workId);
  if (error) throw new Error(error.message);
}

/** Kirgan foydalanuvchining saqlanganlari; baza tayyor bo'lmasa bo'sh ro'yxat */
export async function savedIdsForUser(userId: string | undefined): Promise<string[]> {
  if (!userId) return [];
  try {
    return await getSavedWorkIds(userId);
  } catch (err) {
    console.error("[saved] ro'yxatni o'qib bo'lmadi:", err);
    return [];
  }
}
