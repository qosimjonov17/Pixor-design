import { NextResponse, type NextRequest } from "next/server";
import { upsertTelegramUser } from "@/lib/db";
import { createSession, safeNext } from "@/lib/session";
import { FLOW_COOKIE, exchangeCode, verifyIdToken } from "@/lib/telegram";

type Flow = { state: string; nonce: string; verifier: string; next: string };

/** 2-qadam: Telegram shu manzilga "code" bilan qaytaradi */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const fail = (reason: string) => {
    const res = NextResponse.redirect(new URL(`/signup?error=${reason}`, request.url));
    res.cookies.delete({ name: FLOW_COOKIE, path: "/auth/telegram" });
    return res;
  };

  let flow: Flow | null = null;
  try {
    flow = JSON.parse(request.cookies.get(FLOW_COOKIE)?.value ?? "null");
  } catch {}

  if (params.get("error")) return fail("cancelled");
  const code = params.get("code");
  if (!flow || !code || params.get("state") !== flow.state) return fail("expired");

  try {
    const idToken = await exchangeCode(code, flow.verifier);
    const claims = await verifyIdToken(idToken, flow.nonce);
    const profile = {
      telegramId: claims.sub,
      name: claims.name || claims.preferred_username || "Telegram foydalanuvchisi",
      username: claims.preferred_username ?? null,
      picture: claims.picture ?? null,
    };
    const userId = await upsertTelegramUser(profile);
    await createSession({ id: userId, name: profile.name, username: profile.username, picture: profile.picture });
  } catch (err) {
    console.error("[auth] Telegram orqali kirish xatosi:", err);
    return fail("failed");
  }

  const res = NextResponse.redirect(new URL(safeNext(flow.next), request.url));
  res.cookies.delete({ name: FLOW_COOKIE, path: "/auth/telegram" });
  return res;
}
