import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import { CONTACT_TELEGRAM_URL } from "@/data/contact";

export const metadata: Metadata = {
  title: "Qoidalar — Pixora",
  description: "Pixora qanday ishlaydi: ishlar qanday tanlanadi, mualliflik huquqi va ishni olib tashlash.",
};

const SECTIONS: { title: string; body: React.ReactNode }[] = [
  {
    title: "Pixora nima",
    body: (
      <p>
        Pixora — Behance, Dribbble, X va Dprofile&apos;dagi eng yaxshi dizayn ishlarini bitta lentada
        yig&apos;adigan saralangan to&apos;plam. Biz ishlarni o&apos;zimiz yaratmaymiz va sotmaymiz: har bir ish
        muallifining asl sahifasiga havola bilan ko&apos;rsatiladi.
      </p>
    ),
  },
  {
    title: "Ishlar qanday tanlanadi",
    body: (
      <ul>
        <li>Har bir ishni Pixora jamoasi qo&apos;lda ko&apos;rib chiqib tanlaydi.</li>
        <li>Ishlar Case, UI va Branding kategoriyalariga ajratiladi.</li>
        <li>Tanlov — bizning didimiz; tanlanmagan ish yomon degani emas.</li>
      </ul>
    ),
  },
  {
    title: "Mualliflik huquqi",
    body: (
      <ul>
        <li>Barcha ishlar va rasmlar ularning mualliflariga tegishli.</li>
        <li>Har bir ishda muallif ismi, profili va asl sahifaga havola ko&apos;rsatiladi.</li>
        <li>Ishlarni Pixora&apos;dan yuklab olib, o&apos;zingizniki qilib ishlatmang.</li>
      </ul>
    ),
  },
  {
    title: "Ishni olib tashlash yoki tuzatish",
    body: (
      <p>
        Agar siz ish muallifi bo&apos;lsangiz va uni Pixora&apos;da ko&apos;rishni istamasangiz yoki ism, havola
        noto&apos;g&apos;ri bo&apos;lsa —{" "}
        <a href={CONTACT_TELEGRAM_URL} target="_blank" rel="noopener noreferrer" className="text-brand underline">
          bizga Telegram&apos;da yozing
        </a>
        . Ish havolasini yuboring, odatda bir kun ichida ko&apos;rib chiqamiz.
      </p>
    ),
  },
  {
    title: "Hisob va saqlanganlar",
    body: (
      <ul>
        <li>Saytga Telegram orqali kirasiz; parolingiz bizga kelmaydi.</li>
        <li>Biz faqat ismingiz, Telegram username va rasmingizni saqlaymiz.</li>
        <li>Saqlagan ishlaringizni faqat siz ko&apos;rasiz.</li>
      </ul>
    ),
  },
];

export default function RulesPage() {
  return (
    <PageShell active={null} hero={false} tight>
      <article className="flex w-full max-w-[720px] flex-col gap-8 self-start">
        <h1 className="text-[28px] leading-[1.2] font-medium text-ink">Qoidalar</h1>
        {SECTIONS.map((s) => (
          <section key={s.title} className="flex flex-col gap-2">
            <h2 className="text-[18px] leading-[1.4] font-medium text-ink">{s.title}</h2>
            <div className="text-[15px] leading-[1.6] text-subtle [&_li]:ml-5 [&_li]:list-disc [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1">
              {s.body}
            </div>
          </section>
        ))}
      </article>
    </PageShell>
  );
}
