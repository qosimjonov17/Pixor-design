import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { env } from "./env";

/** Saytga kirgan foydalanuvchi haqida cookie'da saqlanadigan ma'lumot */
export type SessionUser = {
  /** Supabase'dagi users.id */
  id: string;
  name: string;
  username: string | null;
  picture: string | null;
};

const COOKIE = "pixora_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 kun

function key() {
  return new TextEncoder().encode(env.sessionSecret);
}

export async function createSession(user: SessionUser) {
  const token = await new SignJWT({ name: user.name, username: user.username, picture: user.picture })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(key());

  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

/** Joriy foydalanuvchi yoki null (kirmagan / cookie buzilgan / sozlama yo'q) */
export async function getSession(): Promise<SessionUser | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token || !process.env.AUTH_SESSION_SECRET) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    if (!payload.sub) return null;
    return {
      id: payload.sub,
      name: String(payload.name ?? ""),
      username: (payload.username as string | null) ?? null,
      picture: (payload.picture as string | null) ?? null,
    };
  } catch {
    return null;
  }
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

/** Kirishdan keyin qaytiladigan manzil — faqat o'z saytimiz ichidagi yo'l */
export function safeNext(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/";
  return next;
}
