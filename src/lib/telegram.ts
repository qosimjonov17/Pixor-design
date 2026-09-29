import "server-only";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { env } from "./env";

/**
 * "Log In With Telegram" — standart OpenID Connect (Authorization Code + PKCE).
 * Manzillar: https://oauth.telegram.org/.well-known/openid-configuration
 */
// TELEGRAM_OIDC_BASE faqat lokal sinov uchun (soxta server). Vercel'da O'RNATILMAYDI.
const BASE = process.env.TELEGRAM_OIDC_BASE ?? "https://oauth.telegram.org";

export const TELEGRAM_OIDC = {
  issuer: BASE,
  authorize: `${BASE}/auth`,
  token: `${BASE}/token`,
  jwks: `${BASE}/.well-known/jwks.json`,
};

export const CALLBACK_PATH = "/auth/telegram/callback";

/** Kirish jarayoni davomida state/nonce/PKCE saqlanadigan qisqa muddatli cookie */
export const FLOW_COOKIE = "pixora_tg_flow";

export function redirectUri() {
  return `${env.siteUrl}${CALLBACK_PATH}`;
}

const jwks = createRemoteJWKSet(new URL(TELEGRAM_OIDC.jwks));

function base64url(bytes: Uint8Array) {
  return Buffer.from(bytes).toString("base64url");
}

export function randomToken(size = 32) {
  return base64url(crypto.getRandomValues(new Uint8Array(size)));
}

export async function pkceChallenge(verifier: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64url(new Uint8Array(digest));
}

export function authorizeUrl(opts: { state: string; nonce: string; codeChallenge: string }) {
  const url = new URL(TELEGRAM_OIDC.authorize);
  url.search = new URLSearchParams({
    client_id: env.telegramClientId,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: "openid profile",
    state: opts.state,
    nonce: opts.nonce,
    code_challenge: opts.codeChallenge,
    code_challenge_method: "S256",
  }).toString();
  return url.toString();
}

/** Telegram bergan "code"ni id_token'ga almashtiradi (client_secret_basic) */
export async function exchangeCode(code: string, codeVerifier: string): Promise<string> {
  const basic = Buffer.from(`${env.telegramClientId}:${env.telegramClientSecret}`).toString("base64");
  const res = await fetch(TELEGRAM_OIDC.token, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri(),
      code_verifier: codeVerifier,
    }),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as { id_token?: string; error?: string };
  if (!res.ok || !json.id_token) {
    throw new Error(`Telegram token xatosi: ${res.status} ${json.error ?? ""}`.trim());
  }
  return json.id_token;
}

export type TelegramClaims = {
  sub: string;
  name?: string;
  preferred_username?: string;
  picture?: string;
  nonce?: string;
};

/** id_token imzosini, issuer, audience, muddat va nonce'ni tekshiradi */
export async function verifyIdToken(idToken: string, expectedNonce: string): Promise<TelegramClaims> {
  const { payload } = await jwtVerify(idToken, jwks, {
    issuer: TELEGRAM_OIDC.issuer,
    // Telegram hujjatiga ko'ra aud = bot ID. Odatda Client ID bilan bir xil;
    // farq qilsa, Vercel'da TELEGRAM_BOT_ID ni ham kiritish mumkin.
    audience: [env.telegramClientId, process.env.TELEGRAM_BOT_ID].filter(Boolean) as string[],
  });
  if (payload.nonce !== expectedNonce) throw new Error("nonce mos kelmadi");
  if (!payload.sub) throw new Error("sub yo'q");
  return payload as unknown as TelegramClaims;
}
