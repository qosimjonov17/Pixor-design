import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession, safeNext } from "@/lib/session";

export const metadata: Metadata = {
  title: "Kirish — Pixor",
};

const ERRORS: Record<string, string> = {
  cancelled: "Kirish bekor qilindi. Qayta urinib ko‘ring.",
  expired: "Kirish sessiyasi eskirdi. Tugmani qayta bosing.",
  failed: "Telegram orqali kirib bo‘lmadi. Birozdan keyin qayta urinib ko‘ring.",
  config: "Kirish hali sozlanmagan. Administratorga murojaat qiling.",
};

/** Figma'dagi "AUTH" sahifasi */
export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const params = await searchParams;
  const next = safeNext(typeof params.next === "string" ? params.next : null);
  const step = typeof params.step === "string" ? params.step : null;
  const baseError = typeof params.error === "string" ? ERRORS[params.error] : undefined;
  // Sinov davrida qaysi qadamda to'xtaganini ham ko'rsatamiz
  const detail = typeof params.detail === "string" ? params.detail : "";
  const error = baseError && step ? `${baseError} (xato kodi: ${step}${detail ? ` — ${detail}` : ""})` : baseError;

  if (await getSession()) redirect(next);

  return (
    <main className="relative isolate flex min-h-dvh items-center justify-center overflow-hidden p-4">
      <Image
        src="/illustrations/auth-bg.jpg"
        alt=""
        fill
        priority
        sizes="100vw"
        className="-z-10 object-cover"
      />

      <Link
        href={next}
        className="absolute top-4 left-4 flex w-[170px] items-center justify-center gap-2 rounded-[10px] bg-surface p-2.5 shadow-[0_1px_3px_0_rgba(14,18,27,0.12),0_0_0_1px_#ebebeb] transition-colors hover:bg-page sm:top-10 sm:left-10"
      >
        <Image src="/icons/chevron-left.svg" alt="" width={20} height={20} className="size-5" />
        <span className="px-1 text-[14px] leading-[1.25] font-semibold text-[#62748e]">Ortga qaytish</span>
      </Link>

      <div className="flex w-full max-w-[466px] flex-col items-center gap-6 rounded-[32px] border border-[#eeeff2] bg-surface p-6 shadow-[0_17px_19px_rgba(0,0,0,0.02),0_68px_34px_rgba(0,0,0,0.02),0_154px_46px_rgba(0,0,0,0.01)] sm:p-8">
        <div className="flex w-full flex-col items-center gap-2 text-center">
          <h1 className="text-[28px] leading-[1.2] font-semibold text-ink">Xush kelibsiz!</h1>
          <p className="text-[14px] leading-[1.4] text-subtle">Ro’yxatdan o’tish uchun tugmani bosing!</p>
        </div>

        {/* Oddiy havola: route handler Telegram'ga yo'naltiradi */}
        <a
          href={`/auth/telegram?next=${encodeURIComponent(next)}`}
          className="flex w-full items-center justify-center gap-2 overflow-hidden rounded-[10px] border border-white/12 bg-brand p-2.5 shadow-fancy transition-[filter] hover:brightness-105 active:brightness-95"
          style={{ backgroundImage: "linear-gradient(180deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0) 100%)" }}
        >
          <Image src="/icons/telegram.svg" alt="" width={20} height={20} className="size-5" />
          <span className="px-1 text-[14px] leading-[1.25] font-semibold text-white">Telegram orqali</span>
        </a>

        {error && (
          <p role="alert" className="text-center text-[13px] text-red-600">
            {error}
          </p>
        )}
      </div>
    </main>
  );
}
