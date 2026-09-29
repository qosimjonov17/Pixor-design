"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setSaved } from "@/app/actions";
import { softButtonClass } from "@/components/ui";

/**
 * Ko'rish oynasidagi "Saqlash" tugmasi. Kirmagan bo'lsa — kirish sahifasiga yuboradi.
 * Har bir ish uchun key={work.id} bilan chaqiriladi, shuning uchun holat o'zi yangilanadi.
 */
export default function SaveButton({
  workId,
  initialSaved,
  loggedIn,
  onChange,
}: {
  workId: string;
  initialSaved: boolean;
  loggedIn: boolean;
  onChange?: (saved: boolean) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [saved, setLocalSaved] = useState(initialSaved);
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();

  function goToLogin() {
    router.push(`/signup?next=${encodeURIComponent(pathname)}`);
  }

  function toggle() {
    if (!loggedIn) return goToLogin();
    const next = !saved;
    setLocalSaved(next); // darhol ko'rsatamiz, server javobini kutmasdan
    setError(false);
    startTransition(async () => {
      const res = await setSaved(workId, next);
      if (res.ok) {
        onChange?.(res.saved);
      } else {
        setLocalSaved(!next);
        if (res.reason === "login") goToLogin();
        else setError(true);
      }
    });
  }

  return (
    <div className="flex w-full flex-col gap-1.5">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-pressed={saved}
        className={`${softButtonClass} ${saved ? "text-brand" : "text-[#62748e]"}`}
      >
        <Image
          src={saved ? "/icons/bookmark-filled.svg" : "/icons/bookmark.svg"}
          alt=""
          width={20}
          height={20}
          className="size-5"
        />
        <span className="px-1">{saved ? "Saqlangan" : "Saqlash"}</span>
      </button>
      {error && (
        <p className="text-center text-[12px] text-red-500">Saqlab bo‘lmadi, qayta urinib ko‘ring.</p>
      )}
    </div>
  );
}
