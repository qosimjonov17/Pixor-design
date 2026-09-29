import { after, NextResponse, type NextRequest } from "next/server";
import { handleUpdate, type TgUpdate } from "@/lib/bot";
import { webhookSecret } from "@/lib/telegramBot";

// Havolani ochish + rasmni ko'chirish biroz vaqt olishi mumkin
export const maxDuration = 60;

/** Telegram botga kelgan har bir xabarni shu manzilga yuboradi */
export async function POST(request: NextRequest) {
  if (request.headers.get("x-telegram-bot-api-secret-token") !== webhookSecret()) {
    return new NextResponse("forbidden", { status: 403 });
  }
  const update = (await request.json().catch(() => null)) as TgUpdate | null;
  if (!update) return NextResponse.json({ ok: true });

  // Telegram'ga darhol "qabul qildim" deymiz, ishni esa javobdan keyin bajaramiz
  after(() => handleUpdate(update));
  return NextResponse.json({ ok: true });
}
