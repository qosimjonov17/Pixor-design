"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

/** Figma: "Ortga qaytish" (170×40). Oldingi sahifa sayt ichida bo'lsa — orqaga, bo'lmasa bosh sahifaga. */
export default function BackButton({ fallback = "/" }: { fallback?: string }) {
  const router = useRouter();
  return (
    <Link
      href={fallback}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        const sameSite = document.referrer && new URL(document.referrer).origin === window.location.origin;
        if (sameSite && window.history.length > 1) {
          e.preventDefault();
          router.back();
        }
      }}
      className="flex w-[170px] items-center justify-center gap-2 rounded-[10px] bg-surface p-2.5 shadow-[0_1px_3px_0_rgba(14,18,27,0.12),0_0_0_1px_#ebebeb] transition-colors hover:bg-page"
    >
      <Image src="/icons/chevron-left-muted.svg" alt="" width={20} height={20} className="size-5" />
      <span
        className="px-1 text-[14px] leading-[normal] font-semibold text-[#62748e]"
        style={{ fontFeatureSettings: '"calt" 0, "liga" 0' }}
      >
        Ortga qaytish
      </span>
    </Link>
  );
}
