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
