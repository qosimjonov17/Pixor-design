"use client";

import { useEffect, useRef, useState } from "react";

/**
 * GIF kabi video: ovozsiz, takrorlanadi, faqat ekranda ko'ringanda o'ynaydi
 * (ko'p video bir vaqtda yuklanib, sahifani og'irlashtirmasin).
 */
export default function AutoVideo({
  src,
  poster,
  className = "",
  eager = false,
}: {
  src: string;
  poster?: string;
  className?: string;
  /** true — darhol o'ynaydi (ko'rish oynasi uchun) */
  eager?: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video || eager) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) video.play().catch(() => {});
        else video.pause();
      },
      { threshold: 0.25 },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, [eager]);

  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      muted
      loop
      playsInline
      autoPlay={eager}
      preload={eager ? "auto" : "metadata"}
      className={className}
    />
  );
}

/** Ko'rish oynasidagi video: o'zi o'ynaydi; ovozli bo'lsa — ovozni yoqish tugmasi */
export function ViewerVideo({
  src,
  poster,
  withSound,
}: {
  src: string;
  poster?: string;
  withSound: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);

  return (
    <>
      <video
        ref={ref}
        src={src}
        poster={poster}
        muted={muted}
        loop
        playsInline
        autoPlay
        preload="auto"
        className="absolute inset-0 size-full bg-black object-contain"
      />
      {withSound && (
        <button
          type="button"
          onClick={() => {
            const next = !muted;
            setMuted(next);
            if (ref.current) {
              ref.current.muted = next;
              if (!next) ref.current.play().catch(() => {});
            }
          }}
          aria-label={muted ? "Ovozni yoqish" : "Ovozni o'chirish"}
          className="absolute right-4 bottom-4 flex h-10 items-center gap-2 rounded-full bg-black/60 px-4 text-[14px] font-medium text-white backdrop-blur transition-colors hover:bg-black/75"
        >
          <span aria-hidden>{muted ? "🔇" : "🔊"}</span>
          {muted ? "Ovozni yoqish" : "Ovozli"}
        </button>
      )}
    </>
  );
}
