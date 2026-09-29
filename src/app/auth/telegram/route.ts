import { NextResponse, type NextRequest } from "next/server";
import { safeNext } from "@/lib/session";
import { FLOW_COOKIE, authorizeUrl, pkceChallenge, randomToken } from "@/lib/telegram";

/** 1-qadam: foydalanuvchini Telegram'ning kirish sahifasiga yuboradi */
export async function GET(request: NextRequest) {
  const next = safeNext(request.nextUrl.searchParams.get("next"));
  const state = randomToken();
  const nonce = randomToken();
  const verifier = randomToken(48);

  let url: string;
  try {
    url = authorizeUrl({ state, nonce, codeChallenge: await pkceChallenge(verifier) });
  } catch (err) {
    console.error("[auth] Telegram sozlamasi yo'q:", err);
    return NextResponse.redirect(new URL(`/signup?error=config`, request.url));
  }

  const res = NextResponse.redirect(url);
  res.cookies.set(FLOW_COOKIE, JSON.stringify({ state, nonce, verifier, next }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/auth/telegram",
    maxAge: 600,
  });
  return res;
}
