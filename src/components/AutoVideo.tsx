"use client";

import { useEffect, useRef, useState } from "react";

/**
 * GIF kabi video: ovozsiz, takrorlanadi, faqat ekranda ko'ringanda o'ynaydi.
 * `active={false}` bo'lsa (masalan, ko'rish oynasi ochiq) — to'xtab turadi,
 * shunda orqa fonda videolar kompyuterni band qilmaydi.
 */
export default function AutoVideo({
  src,
  poster,
  className = "",
  active = true,
}: {
  src: string;
  poster?: string;
  className?: string;
  active?: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const visible = useRef(false);
  const activeRef = useRef(active);

  const sync = () => {
    const video = ref.current;
    if (!video) return;
    if (visible.current && activeRef.current) video.play().catch(() => {});
    else if (!video.paused) video.pause();
  };

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible.current = entry.isIntersecting;
        sync();
      },
      { threshold: 0.25 },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    activeRef.current = active;
    sync();
  }, [active]);

  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      muted
      loop
      playsInline
      // Ekranga kelmaguncha yuklanmaydi — poster (muqova) ko'rinib turadi
      preload="none"
      className={className}
    />
  );
}

/** Ko'rish oynasidagi video: o'zi o'ynaydi; ovozli bo'lsa — ovozni yoqish tugmasi */
export function ViewerVideo({
  src,
  poster,
  withSound,
  onRatio,
}: {
  src: string;
  poster?: string;
  withSound: boolean;
  /** Video o'lchami ma'lum bo'lganda (eni / bo'yi) — ramka shunga moslanadi */
  onRatio?: (ratio: number) => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);

  // Video sahifa tayyor bo'lishidan oldin o'lchamini bilib olgan bo'lishi mumkin — shuni ham ushlaymiz
  useEffect(() => {
    const v = ref.current;
    if (v && v.readyState >= 1 && v.videoWidth > 0 && v.videoHeight > 0) onRatio?.(v.videoWidth / v.videoHeight);
  }, [onRatio]);

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
        onLoadedMetadata={(e) => {
          const { videoWidth: w, videoHeight: h } = e.currentTarget;
          if (w > 0 && h > 0) onRatio?.(w / h);
        }}
        className="absolute inset-0 size-full object-cover"
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
