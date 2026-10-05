"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CONTACT_TELEGRAM_URL } from "@/data/contact";
import type { SessionUser } from "@/lib/session";

const itemClass =
  "flex items-center gap-2 rounded-lg p-2 text-[14px] leading-5 font-medium transition-colors hover:bg-page focus-visible:bg-page outline-none";

/** Figma: "Dropdown Items [1.1]" — 20px ikonka + matn */
function MenuLink({
  href,
  icon,
  external,
  onPick,
  children,
}: {
  href: string;
  icon: string;
  external?: boolean;
  onPick: () => void;
  children: React.ReactNode;
}) {
  const inner = (
    <>
      <Image src={icon} alt="" width={20} height={20} className="size-5 shrink-0" />
      {children}
    </>
  );
  return external ? (
    <a href={href} target="_blank" rel="noopener noreferrer" role="menuitem" onClick={onPick} className={itemClass + " text-[#62748e]"}>
      {inner}
    </a>
  ) : (
    <Link href={href} role="menuitem" onClick={onPick} className={itemClass + " text-[#62748e]"}>
      {inner}
    </Link>
  );
}

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
          className="absolute top-11 right-0 z-40 flex w-[300px] max-w-[calc(100vw-32px)] flex-col gap-1 overflow-hidden rounded-2xl border border-[#ebebeb] bg-surface p-2 shadow-[0px_16px_32px_-12px_rgba(14,18,27,0.1)]"
          style={{ fontFeatureSettings: '"ss11" 1, "calt" 0, "liga" 0' }}
        >
          <MenuLink href="/saved" icon="/icons/menu-bookmark.svg" onPick={() => setOpen(false)}>
            Saqlanganlar
          </MenuLink>
          <p className="px-2 py-1 text-[12px] leading-5 text-muted uppercase">Yordam</p>
          <MenuLink href="/qoidalar" icon="/icons/menu-rules.svg" onPick={() => setOpen(false)}>
            Qoidalar
          </MenuLink>
          <MenuLink href={CONTACT_TELEGRAM_URL} icon="/icons/menu-support.svg" external onPick={() => setOpen(false)}>
            Aloqa
          </MenuLink>
          <div className="py-[1.5px]" role="separator">
            <div className="h-px bg-[#ebebeb]" />
          </div>
          <form action="/auth/logout" method="post">
            <button type="submit" role="menuitem" className={itemClass + " w-full text-left text-[#fb2c36]"}>
              <Image src="/icons/menu-logout.svg" alt="" width={20} height={20} className="size-5 shrink-0" />
              Chiqish
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
