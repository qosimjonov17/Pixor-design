# Pixora

Behance, Dribbble, X va Dprofile'dagi eng yaxshi dizayn ishlarini bitta lentada yig'adigan sayt.

## Ishga tushirish

Kompyuteringizda [Node.js](https://nodejs.org) (20 yoki undan yangi versiyasi) o'rnatilgan bo'lishi kerak.

```bash
npm install     # birinchi marta, kutubxonalarni o'rnatadi
npm run dev     # saytni http://localhost:3000 da ochadi
```

## Qayerda nima bor

| Fayl | Nima uchun |
|---|---|
| `src/data/works.ts` | Galereyadagi ishlar ro'yxati. Yangi ish qo'shish uchun shu yerga yozasiz |
| `src/data/platforms.ts` | Platformalar (X, Behance, Dprofile, Dribbble) va ikonkalari |
| `src/app/page.tsx` | Bosh sahifa (Main page) |
| `src/components/Sidebar.tsx` | Chap menyu, mobil versiyada esa filtr qatori |
| `src/components/WorkCard.tsx` | Bitta ish kartasi |
| `src/components/FancyButton.tsx` | "Bepul boshlang!" tugmasi |
| `src/app/globals.css` | Ranglar va shriftlar (Figma tokenlari) |
| `public/icons`, `public/avatars` | Figma'dan olingan ikonka va rasmlar |

## Yangi ish qo'shish

`src/data/works.ts` fayliga yangi qator qo'shing:

```ts
{
  id: "13",
  title: "Banking app redesign",
  platform: "dribbble",               // "x" | "behance" | "dprofile" | "dribbble"
  url: "https://dribbble.com/shots/...", // asl post
  image: "/works/banking-app.jpg",     // rasmni public/works/ papkasiga qo'ying
  designer: { name: "Ism Familiya", avatar: "/avatars/ism.png", avatarBg: "blue" },
},
```

Keyingi bosqichda bu ro'yxat admin panelga ko'chiriladi, shunda kodga tegmasdan ish qo'sha olasiz.

## Kirish (Telegram) va saqlanganlar

Foydalanuvchi faqat Telegram orqali kiradi (OpenID Connect). Saqlangan ishlar Supabase bazasida turadi.

**Bir martalik sozlash**

1. Supabase → **SQL Editor** → New query → `supabase/schema.sql` faylini to'liq joylab **Run** bosing.
2. Vercel → Settings → Environment Variables:

| Nomi | Qayerdan |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Sayt manzili, masalan `https://pixor-design.vercel.app` (oxirida `/` yo'q) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `SUPABASE_SECRET_KEY` | Supabase → API Keys → secret (`sb_secret_…`) |
| `AUTH_SESSION_SECRET` | Tasodifiy uzun matn |
| `TELEGRAM_CLIENT_ID` | @BotFather → Login Widget → Client ID |
| `TELEGRAM_CLIENT_SECRET` | @BotFather → Login Widget → Client Secret |

3. @BotFather → Login Widget:
   - Redirect URI: `https://SAYT/auth/telegram/callback`
   - Trusted Origin: `https://SAYT`

Xatolar Vercel → Logs bo'limida `[auth]` va `[saved]` belgisi bilan ko'rinadi.
`TELEGRAM_OIDC_BASE` faqat lokal sinov uchun — Vercel'da o'rnatmang.
