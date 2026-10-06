import "server-only";

/**
 * X (Twitter) postini o'qish. X sahifalari serverlarga ma'lumot bermaydi, shuning uchun
 * X'ning o'rnatilgan postlar (embed) uchun ochiq manbasidan foydalanamiz, zaxira — fxtwitter.
 * Natija: matn, muallif, rasm yoki video (MP4).
 */

// Faqat lokal sinov uchun (soxta server). Vercel'da O'RNATILMAYDI.
const SYNDICATION = process.env.X_SYNDICATION_BASE ?? "https://cdn.syndication.twimg.com";
const FXTWITTER = process.env.FXTWITTER_BASE ?? "https://api.fxtwitter.com";

export type XVideo = {
  /** MP4 manzillari, eng sifatlisi birinchi */
  urls: string[];
  poster: string | null;
  /** X'ning o'zi "GIF" deb belgilagan (ovozsiz) */
  isGif: boolean;
};

export type XPost = {
  text: string;
  name: string | null;
  handle: string | null;
  avatar: string | null;
  photo: string | null;
  video: XVideo | null;
};

export function tweetId(url: string) {
  return url.match(/\/status(?:es)?\/(\d{5,25})/)?.[1] ?? null;
}

/** react-tweet ishlatadigan token formulasi */
function syndicationToken(id: string) {
  return ((Number(id) / 1e15) * Math.PI).toString(36).replace(/(0+|\.)/g, "");
}

function largePhoto(url: string) {
  return /[?&]name=/.test(url) ? url : `${url}${url.includes("?") ? "&" : "?"}name=large`;
}

function cleanText(text: string) {
  return text
    .replace(/\s*https:\/\/t\.co\/\w+\s*$/g, "")
    .replace(/\s*https:\/\/t\.co\/\w+\s*$/g, "")
    .trim();
}

type Variant = { content_type?: string; bitrate?: number; url?: string };
type MediaDetail = {
  type?: string;
  media_url_https?: string;
  video_info?: { variants?: Variant[] };
};
type Syndication = {
  text?: string;
  display_text_range?: [number, number];
  user?: { name?: string; screen_name?: string; profile_image_url_https?: string };
  mediaDetails?: MediaDetail[];
  photos?: { url?: string }[];
};

async function viaSyndication(id: string): Promise<XPost | null> {
  const res = await fetch(`${SYNDICATION}/tweet-result?id=${id}&lang=en&token=${syndicationToken(id)}`, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; PixorBot/1.0)" },
    signal: AbortSignal.timeout(12_000),
    cache: "no-store",
  });
  if (!res.ok) return null;
  const d = (await res.json().catch(() => null)) as Syndication | null;
  if (!d?.user) return null;

  let text = d.text ?? "";
  if (d.display_text_range) text = Array.from(text).slice(d.display_text_range[0], d.display_text_range[1]).join("");

  const media = d.mediaDetails ?? [];
  const vid = media.find((m) => m.type === "video" || m.type === "animated_gif");
  const photo = media.find((m) => m.type === "photo")?.media_url_https ?? d.photos?.[0]?.url ?? null;
  const video: XVideo | null = vid
    ? {
        urls: (vid.video_info?.variants ?? [])
          .filter((v) => v.content_type === "video/mp4" && v.url)
          .sort((a, b) => (b.bitrate ?? 0) - (a.bitrate ?? 0))
          .map((v) => v.url!),
        poster: vid.media_url_https ?? null,
        isGif: vid.type === "animated_gif",
      }
    : null;

  return {
    text: cleanText(text),
    name: d.user.name ?? null,
    handle: d.user.screen_name ?? null,
    avatar: d.user.profile_image_url_https?.replace("_normal.", "_400x400.") ?? null,
    photo: photo ? largePhoto(photo) : null,
    video: video && video.urls.length ? video : null,
  };
}

type Fx = {
  tweet?: {
    text?: string;
    author?: { name?: string; screen_name?: string; avatar_url?: string };
    media?: {
      photos?: { url?: string }[];
      videos?: { url?: string; thumbnail_url?: string; type?: string }[];
    };
  };
};

async function viaFxtwitter(id: string): Promise<XPost | null> {
  const res = await fetch(`${FXTWITTER}/status/${id}`, {
    headers: { "User-Agent": "PixorBot/1.0" },
    signal: AbortSignal.timeout(12_000),
    cache: "no-store",
  });
  if (!res.ok) return null;
  const t = ((await res.json().catch(() => null)) as Fx | null)?.tweet;
  if (!t?.author) return null;
  const v = t.media?.videos?.find((x) => x.url);
  const photo = t.media?.photos?.[0]?.url ?? null;
  return {
    text: cleanText(t.text ?? ""),
    name: t.author.name ?? null,
    handle: t.author.screen_name ?? null,
    avatar: t.author.avatar_url ?? null,
    photo: photo ? largePhoto(photo) : null,
    video: v?.url ? { urls: [v.url], poster: v.thumbnail_url ?? null, isGif: v.type === "gif" } : null,
  };
}

/** X postini o'qiydi. Topilmasa null. */
export async function fetchXPost(url: string): Promise<{ post: XPost | null; note: string }> {
  const id = tweetId(url);
  if (!id) return { post: null, note: "x: post id yo'q" };
  const notes: string[] = [];
  for (const [name, fn] of [
    ["embed", viaSyndication],
    ["fx", viaFxtwitter],
  ] as const) {
    try {
      const post = await fn(id);
      if (post) return { post, note: `x ${name} ok` };
      notes.push(`x ${name}: bo'sh`);
    } catch (err) {
      notes.push(`x ${name}: ${err instanceof Error ? err.name : "xato"}`);
    }
  }
  return { post: null, note: notes.join(" → ") };
}
