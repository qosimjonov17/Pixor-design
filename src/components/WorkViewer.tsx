"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { ViewerVideo } from "@/components/AutoVideo";
import { CARD_IMAGE_SIZES, optimizedImageUrl } from "@/data/media";
import SaveButton from "@/components/SaveButton";
import { PersonRow, SoftLink } from "@/components/ui";
import { categoryLabel } from "@/data/categories";
import { getPlatform, viewOnLabel } from "@/data/platforms";
import { CURATOR, type Work } from "@/data/works";

const AVATAR_BG = { blue: "bg-avatar-blue", red: "bg-avatar-red", yellow: "bg-avatar-yellow" } as const;

const iconButton =
  "flex size-[50px] shrink-0 items-center justify-center rounded-2xl border border-placeholder bg-surface transition-colors hover:bg-page";

/** Figma'dagi "in project" — ishni katta ko'rish oynasi */
export default function WorkViewer({
  work,
  saved,
  loggedIn,
  onClose,
  onPrev,
  onNext,
  onSavedChange,
}: {
  work: Work;
  saved: boolean;
  loggedIn: boolean;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  onSavedChange: (saved: boolean) => void;
}) {
  const platform = getPlatform(work.platform);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Rasm — Figma'dagi 922×690 ramkada; video — o'zining nisbatida (qora chetlarsiz)
  const [videoRatio, setVideoRatio] = useState<{ id: string; ratio: number } | null>(null);
  const workId = work.id;
  const onVideoRatio = useCallback((ratio: number) => setVideoRatio({ id: workId, ratio }), [workId]);
  const frameRatio =
    work.video && videoRatio?.id === work.id ? Math.min(3, Math.max(0.4, videoRatio.ratio)) : 922 / 690;

  // Klaviatura: Esc — yopish, ← → — oldingi/keyingi
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") onPrev?.();
      else if (e.key === "ArrowRight") onNext?.();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onPrev, onNext]);

  // Orqadagi sahifa aylanmasin
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div role="dialog" aria-modal="true" aria-label={work.title} className="fixed inset-0 z-50">
      {/* Fon: sahifa xiralashadi va qorayadi */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2.6px]" onClick={onClose} aria-hidden />

      <div className="pointer-events-none relative flex h-full flex-col overflow-y-auto lg:flex-row lg:items-center lg:overflow-hidden">
        {/* Rasm va strelkalar */}
        <div className="flex min-w-0 flex-1 items-center justify-center gap-3 px-4 pt-20 pb-4 lg:gap-[30px] lg:px-[30px] lg:py-0">
          <button
            type="button"
            onClick={onPrev}
            disabled={!onPrev}
            aria-label="Oldingi ish"
            className={`${iconButton} pointer-events-auto hidden disabled:invisible sm:flex`}
          >
            <Image src="/icons/arrow-left.svg" alt="" width={24} height={24} />
          </button>

          {/* Ramka doim 922×690 nisbatda; bo'sh joy va ekran balandligi ruxsat bergancha kattalashadi */}
          <div
            className="pointer-events-auto relative aspect-(--r) max-w-[calc((100dvh_-_160px)*var(--r))] min-w-0 flex-1 overflow-hidden rounded-[32px] bg-placeholder lg:max-w-[calc((100dvh_-_120px)*var(--r))]"
            style={{ "--r": frameRatio } as React.CSSProperties}
          >
            {work.video ? (
              <ViewerVideo
                key={work.id}
                src={work.video.url}
                poster={optimizedImageUrl(work.image, 1920)}
                withSound={work.video.kind === "video"}
                onRatio={onVideoRatio}
              />
            ) : work.image && (
              <>
                {/* Kartada allaqachon yuklangan rasm — darhol ko'rinadi, katta rasm ustiga yuklanadi */}
                <Image src={work.image} alt="" aria-hidden fill sizes={CARD_IMAGE_SIZES} className="object-cover" />
                <Image
                  key={work.id}
                  src={work.image}
                  alt={work.title}
                  fill
                  sizes="(min-width: 1024px) 75vw, 100vw"
                  className="object-cover"
                  priority
                />
              </>
            )}
          </div>

          <button
            type="button"
            onClick={onNext}
            disabled={!onNext}
            aria-label="Keyingi ish"
            className={`${iconButton} pointer-events-auto hidden disabled:invisible sm:flex`}
          >
            <Image src="/icons/arrow-right.svg" alt="" width={24} height={24} />
          </button>
        </div>

        {/* O'ng panel */}
        <aside className="pointer-events-auto mx-4 mb-4 flex shrink-0 flex-col justify-between gap-6 rounded-2xl border border-line bg-surface px-4 py-5 lg:mx-0 lg:mr-4 lg:mb-0 lg:h-[calc(100dvh-32px)] lg:max-h-[992px] lg:w-[282px] lg:overflow-y-auto">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-3">
              <PersonRow
                name={work.designer.name}
                handle={work.designer.handle}
                avatar={work.designer.avatar}
                avatarBgClass={AVATAR_BG[work.designer.avatarBg]}
                href={work.designer.slug ? `/designers/${work.designer.slug}` : undefined}
              />
              <SoftLink href={work.url}>{viewOnLabel(work.platform)}</SoftLink>
            </div>

            <div className="flex flex-col gap-2">
              <h2 className="text-[16px] leading-[1.6] font-medium text-ink">{work.title}</h2>
              <p className="text-[14px] leading-[1.4] text-subtle">on {platform.label}</p>
            </div>

            {work.categories.length > 0 && (
              <ul aria-label="Kategoriyalar" className="flex flex-wrap gap-1">
                {work.categories.map((c) => (
                  <li
                    key={c}
                    className="rounded-md border-[0.5px] border-muted px-2 py-1 text-[12px] leading-3 font-medium tracking-[0.24px] text-[#62748e]"
                    style={{ fontFeatureSettings: '"calt" 0, "liga" 0' }}
                  >
                    {categoryLabel(c)}
                  </li>
                ))}
              </ul>
            )}

            <hr className="border-placeholder" />

            {work.description && <p className="text-[14px] leading-[1.6] text-subtle">{work.description}</p>}

            <SaveButton key={work.id} workId={work.id} initialSaved={saved} loggedIn={loggedIn} onChange={onSavedChange} />
          </div>

          <div className="flex flex-col gap-4">
            <hr className="border-placeholder" />
            <div className="flex flex-col gap-3">
              <p className="text-[14px] leading-[1.4] text-[#62748e]">Tanladi:</p>
              <PersonRow name={CURATOR.name} handle={CURATOR.handle} avatar={CURATOR.avatar} />
              <SoftLink href={CURATOR.url}>Xda ko’rish</SoftLink>
            </div>
          </div>
        </aside>
      </div>

      {/* Yopish */}
      <button
        ref={closeRef}
        type="button"
        onClick={onClose}
        aria-label="Yopish"
        className={`${iconButton} absolute top-4 left-4 lg:top-[30px] lg:left-[30px]`}
      >
        <Image src="/icons/close.svg" alt="" width={24} height={24} />
      </button>
    </div>
  );
}
