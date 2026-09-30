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
| `src/lib/bot.ts` | Telegram bot: havola → preview → sayt + kanal |
| `src/data/platforms.ts` | Platformalar (X, Behance, Dprofile, Dribbble) va ikonkalari |
| `src/app/page.tsx` | Bosh sahifa (Main page) |
| `src/components/Sidebar.tsx` | Chap menyu, mobil versiyada esa filtr qatori |
| `src/components/WorkCard.tsx` | Bitta ish kartasi |
| `src/components/FancyButton.tsx` | "Bepul boshlang!" tugmasi |
| `src/app/globals.css` | Ranglar va shriftlar (Figma tokenlari) |
| `public/icons`, `public/avatars` | Figma'dan olingan ikonka va rasmlar |

## Yangi ish qo'shish (Telegram bot)

Ishlar Supabase'dagi `works` jadvalida turadi va bot orqali qo'shiladi:

1. Botga Behance / Dribbble / Dprofile / X havolasini yuborasiz.
2. Bot muqova, nom, tavsif va dizayner ismini oladi va preview ko'rsatadi.
3. Kerak bo'lsa ✏️ tugmalar bilan tuzatasiz (muqova topilmasa, rasmni o'zingiz yuborasiz).
4. ✅ Chop etish: ish saytga va kanalga chiqadi. Kanal postining pastida "Pixora'da ko'rish" tugmasi bo'ladi.

**Bir martalik sozlash**

1. Supabase → SQL Editor: `supabase/002_works.sql` ni ishga tushiring.
2. Botni kanalga **admin** qilib qo'shing (xabar yuborish huquqi bilan).
3. Vercel → Environment Variables:
   - `TELEGRAM_BOT_TOKEN`: BotFather bergan token (Sensitive)
   - `TELEGRAM_CHANNEL_ID`: masalan `@pixora_uz`
   - `TELEGRAM_ADMIN_IDS`: botga `/start` yozganda chiqadigan ID (bir nechta bo'lsa vergul bilan)
4. Redeploy, keyin saytga kirgan holda `https://SAYT/api/telegram/setup` ni oching.

**Dizaynerlar**

Supabase'da `supabase/004_designers.sql` ni ishga tushiring. Har bir ish dizaynerga bog'lanadi (profil havolasi bo'yicha, bo'lmasa ism bo'yicha). Botdagi 👤 Dizayner tugmasi oldingi dizaynerlarni tanlashga beradi. `/designers` va `/designers/{slug}` bazadan chiqadi.

**Behance kabi bloklovchi saytlar uchun: brauzer tugmachasi**

Behance serverlarni bloklaydi. Kompyuterda `https://SAYT/admin/add` sahifasini oching (admin sifatida kirgan holda), «Pixora'ga qo'shish» tugmasini xatcho'plar paneliga sudrang. Keyin istalgan ish sahifasida shu tugmani bosing — ish botga preview bo'lib keladi.

**Telegram preview (qo'shimcha, ixtiyoriy)**

Behance serverlarni bloklaydi, lekin Telegram'ga ochiq. Bot Telegram yasagan havola preview'ini o'qiydi:

1. Supabase'da `supabase/003_bot_kv.sql` ni ishga tushiring.
2. https://my.telegram.org → API development tools → ilova yarating.
3. Vercel'ga `TELEGRAM_API_ID` va `TELEGRAM_API_HASH` (Sensitive) qo'shing va redeploy qiling.
4. Havolani botga preview bilan yuboring (preview o'chirilmagan bo'lsin).

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
