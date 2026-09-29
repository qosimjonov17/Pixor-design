import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { env, SITE_ADMIN_SUBS } from "@/lib/env";
import { getSession } from "@/lib/session";
import { tg, webhookSecret } from "@/lib/telegramBot";

/**
 * Botni saytga ulash (bir marta). Saytga admin sifatida kirib, shu sahifani oching:
 *   https://SAYT/api/telegram/setup
 */
export async function GET(request: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.redirect(new URL("/signup?next=/api/telegram/setup", request.url));

  const { data } = await db().from("users").select("telegram_id").eq("id", user.id).maybeSingle();
  if (!data || !SITE_ADMIN_SUBS.has(String(data.telegram_id))) {
    return new NextResponse("Ruxsat yo'q", { status: 403 });
  }

  const webhookUrl = `${env.siteUrl}/api/telegram/webhook`;
  const lines: string[] = [];
  try {
    await tg("setWebhook", {
      url: webhookUrl,
      secret_token: webhookSecret(),
      allowed_updates: ["message", "callback_query"],
      drop_pending_updates: true,
    });
    await tg("setMyCommands", { commands: [{ command: "start", description: "ID va yordam" }] });
    const me = await tg<{ username: string }>("getMe");
    lines.push(`✅ Bot ulandi: @${me.username}`, `Webhook: ${webhookUrl}`);

    const channel = await tg<{ title?: string; username?: string }>("getChat", { chat_id: env.channelId }).catch(
      (e: Error) => ({ error: e.message }) as { error: string },
    );
    lines.push(
      "error" in channel
        ? `⚠️ Kanal topilmadi (${channel.error}). TELEGRAM_CHANNEL_ID va botning kanalda admin ekanini tekshiring.`
        : `✅ Kanal: ${channel.title ?? ""} ${channel.username ? `(@${channel.username})` : ""}`,
    );
    lines.push(
      env.botAdminIds.size
        ? `✅ Bot adminlari: ${[...env.botAdminIds].join(", ")}`
        : "⚠️ TELEGRAM_ADMIN_IDS bo'sh — botga /start yozing, ID'ingizni Vercel'ga qo'shing va Redeploy qiling.",
    );
  } catch (err) {
    lines.push(`⚠️ Xato: ${err instanceof Error ? err.message : String(err)}`);
  }
  return new NextResponse(lines.join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
