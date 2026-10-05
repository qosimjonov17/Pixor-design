import { redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import { isSiteAdmin } from "@/lib/admin";
import { env } from "@/lib/env";
import { BookmarkletLink, CaptureReceiver } from "./Capture";

export const maxDuration = 60;
export const metadata = { title: "Ish qo'shish — Pixora", robots: { index: false } };

export default async function AddWorkPage() {
  const { user, admin } = await isSiteAdmin();
  if (!user) redirect("/signup?next=/admin/add");
  if (!admin) redirect("/");

  return (
    <PageShell active={null} hero={false} tight>
      <div className="flex w-full max-w-[640px] flex-col gap-6 self-center">
        <h1 className="text-[32px] leading-[1.25] font-semibold text-ink">Ish qo&apos;shish</h1>
        <CaptureReceiver />
        <div className="flex flex-col gap-4 rounded-3xl border border-placeholder bg-surface p-6 text-[15px] leading-[1.5] text-subtle">
          <p className="text-ink">Brauzer tugmachasini o&apos;rnatish (kompyuterda, bir marta):</p>
          <ol className="list-decimal space-y-1 pl-5">
            <li>
              Xatcho&apos;plar panelini yoqing: <b>Ctrl+Shift+B</b> (Mac: <b>⌘+Shift+B</b>).
            </li>
            <li>Pastdagi ko&apos;k tugmani sichqoncha bilan xatcho&apos;plar paneliga sudrab tashlang.</li>
          </ol>
          <div className="py-2">
            <BookmarkletLink site={env.siteUrl} />
          </div>
          <p className="text-ink">Ishlatish:</p>
          <ol className="list-decimal space-y-1 pl-5">
            <li>Behance, Dribbble, Dprofile yoki X&apos;dagi ish sahifasini oching.</li>
            <li>Panelidagi «Pixora&apos;ga qo&apos;shish» ni bosing.</li>
            <li>Ish Telegram botga preview bo&apos;lib keladi — tekshirib, ✅ ni bosing.</li>
          </ol>
          <p>
            <span className="text-ink">Dizayner profili:</span> dizaynerning profil sahifasida (masalan,
            behance.net/ism) shu tugmani bossangiz — ismi, avatari va bio&apos;si saytdagi profiliga yoziladi.
            Boshqa platformadagi havolalarini botda <b>/dizayner</b> orqali qo&apos;shasiz.
          </p>
          <p className="text-[13px]">
            Tugmacha yangilangan bo&apos;lsa, eskisini o&apos;chirib, yuqoridagini qaytadan sudrab qo&apos;ying.
          </p>
        </div>
      </div>
    </PageShell>
  );
}
