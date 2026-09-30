"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/*
 * Videolar <canvas> ga chiziladi, <video> esa 1px, ko'rinmas holda faqat kadr beradi.
 * Sababi: Yandex Brauzer ko'rinib turgan har bir <video> ustiga o'z panelini
 * ("Субтитры", "rasm ichida rasm") chiqaradi va buni sayt tomondan o'chirib bo'lmaydi.
 * Tashqi ko'rinish oddiy video bilan bir xil.
 */

const HIDDEN_VIDEO_STYLE: React.CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  opacity: 0,
  pointerEvents: "none",
  left: 0,
  top: 0,
};

/** Video kadrlarini canvas'ga (object-cover kabi) chizib turadi */
function useCanvasPlayback(onFirstFrame: () => void) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const firstRef = useRef(onFirstFrame);
  useEffect(() => {
    firstRef.current = onFirstFrame;
  }, [onFirstFrame]);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;
    let raf = 0;
    let drawn = false;

    const draw = () => {
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (!vw || !vh || video.readyState < 2) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== w) canvas.width = w;
      if (canvas.height !== h) canvas.height = h;
      const scale = Math.max(w / vw, h / vh);
      const dw = vw * scale;
      const dh = vh * scale;
      ctx.drawImage(video, (w - dw) / 2, (h - dh) / 2, dw, dh);
      if (!drawn) {
        drawn = true;
        canvas.dataset.drawn = "1";
        firstRef.current();
      }
    };
    const loop = () => {
      draw();
      if (!video.paused && !video.ended) raf = requestAnimationFrame(loop);
    };
    const onPlay = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(loop);
    };
    const onFrameReady = () => draw();

    video.addEventListener("play", onPlay);
    video.addEventListener("loadeddata", onFrameReady);
    video.addEventListener("seeked", onFrameReady);
    if (!video.paused) onPlay();
    else draw();
    return () => {
      cancelAnimationFrame(raf);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("loadeddata", onFrameReady);
      video.removeEventListener("seeked", onFrameReady);
    };
  }, []);

  return { videoRef, canvasRef };
}

/**
 * GIF kabi video: ovozsiz, takrorlanadi, faqat ekranda ko'ringanda o'ynaydi.
 * `active={false}` bo'lsa (masalan, ko'rish oynasi ochiq) — to'xtab turadi.
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
  const [ready, setReady] = useState(false);
  const onFirst = useCallback(() => setReady(true), []);
  const { videoRef, canvasRef } = useCanvasPlayback(onFirst);
  const boxRef = useRef<HTMLDivElement>(null);
  const visible = useRef(false);
  const activeRef = useRef(active);

  const sync = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (visible.current && activeRef.current) video.play().catch(() => {});
    else if (!video.paused) video.pause();
  }, [videoRef]);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible.current = entry.isIntersecting;
        sync();
      },
      { threshold: 0.25 },
    );
    observer.observe(box);
    return () => observer.disconnect();
  }, [sync]);

  useEffect(() => {
    activeRef.current = active;
    sync();
  }, [active, sync]);

  return (
    <div ref={boxRef} className={`overflow-hidden ${className}`}>
      {poster && !ready && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={poster} alt="" className="absolute inset-0 size-full object-cover" />
      )}
      <canvas ref={canvasRef} className={`absolute inset-0 size-full ${ready ? "" : "opacity-0"}`} aria-hidden />
      <video
        ref={videoRef}
        src={src}
        muted
        loop
        playsInline
        preload="none"
        style={HIDDEN_VIDEO_STYLE}
        aria-hidden
      />
    </div>
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
  const [ready, setReady] = useState(false);
  const onFirst = useCallback(() => setReady(true), []);
  const { videoRef, canvasRef } = useCanvasPlayback(onFirst);
  const [muted, setMuted] = useState(true);

  // Video sahifa tayyor bo'lishidan oldin o'lchamini bilib olgan bo'lishi mumkin — shuni ham ushlaymiz
  useEffect(() => {
    const v = videoRef.current;
    if (v && v.readyState >= 1 && v.videoWidth > 0 && v.videoHeight > 0) onRatio?.(v.videoWidth / v.videoHeight);
    v?.play().catch(() => {});
  }, [onRatio, videoRef]);

  return (
    <>
      {poster && !ready && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={poster} alt="" className="absolute inset-0 size-full object-cover" />
      )}
      <canvas ref={canvasRef} className={`absolute inset-0 size-full ${ready ? "" : "opacity-0"}`} aria-hidden />
      <video
        ref={videoRef}
        src={src}
        muted={muted}
        loop
        playsInline
        autoPlay
        preload="auto"
        style={HIDDEN_VIDEO_STYLE}
        aria-hidden
        onLoadedMetadata={(e) => {
          const { videoWidth: w, videoHeight: h } = e.currentTarget;
          if (w > 0 && h > 0) onRatio?.(w / h);
        }}
      />
      {withSound && (
        <button
          type="button"
          onClick={() => {
            const next = !muted;
            setMuted(next);
            if (videoRef.current) {
              videoRef.current.muted = next;
              if (!next) videoRef.current.play().catch(() => {});
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
