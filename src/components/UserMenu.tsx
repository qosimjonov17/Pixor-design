"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { SessionUser } from "@/lib/session";

/** Kirgan foydalanuvchi: o'ng yuqoridagi 40px avatar + kichik menyu */
export default function UserMenu({ user }: { user: SessionUser }) {
  const [open, setOpen] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const initials = user.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Profil menyusi"
        className="block size-10 overflow-hidden rounded-full bg-avatar-blue outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        {user.picture && !imgFailed ? (
          // Telegram rasmi tashqi manzildan keladi
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.picture}
            alt=""
            className="size-full object-cover"
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <span className="flex size-full items-center justify-center text-[14px] font-semibold text-ink/70">
            {initials}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute top-12 right-0 z-40 w-56 overflow-hidden rounded-xl border border-line bg-surface p-1.5 shadow-[0_8px_24px_rgba(15,23,42,0.12)]"
        >
          <div className="px-3 py-2">
            <p className="truncate text-[14px] font-medium text-ink">{user.name}</p>
            {user.username && <p className="truncate text-[12px] text-subtle">@{user.username}</p>}
          </div>
          <Link
            href="/saved"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block rounded-lg px-3 py-2 text-[14px] text-ink hover:bg-line"
          >
            Saqlanganlar
          </Link>
          <form action="/auth/logout" method="post">
            <button
              type="submit"
              role="menuitem"
              className="block w-full rounded-lg px-3 py-2 text-left text-[14px] text-red-600 hover:bg-line"
            >
              Chiqish
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
