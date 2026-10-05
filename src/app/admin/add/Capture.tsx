"use client";

import { useEffect, useRef, useState } from "react";
import { submitCapture } from "./actions";
import { bookmarkletHref } from "./bookmarklet";

export function BookmarkletLink({ site }: { site: string }) {
  const ref = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    // React javascript: havolalarni bloklaydi, shuning uchun manzilni to'g'ridan-to'g'ri qo'yamiz
    ref.current?.setAttribute("href", bookmarkletHref(site));
  }, [site]);
  return (
    <a
      ref={ref}
      onClick={(e) => e.preventDefault()}
      className="inline-flex cursor-grab items-center gap-2 rounded-[10px] bg-brand px-4 py-[9px] text-[14px] leading-[18px] font-medium text-white shadow-fancy"
    >
      ➕ Pixora&apos;ga qo&apos;shish
    </a>
  );
}

type State = { kind: "idle" } | { kind: "sending"; title: string } | { kind: "done"; ok: boolean; message: string };

/** Tugmacha ochgan oyna: #... dagi ma'lumotni botga yuboradi */
export function CaptureReceiver() {
  const [state, setState] = useState<State>({ kind: "idle" });
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    const raw = window.location.hash.slice(1);
    if (!raw) return;
    started.current = true;
    let data: { url: string; title?: string; designer?: string };
    try {
      data = JSON.parse(decodeURIComponent(raw));
    } catch {
      queueMicrotask(() => setState({ kind: "done", ok: false, message: "Ma'lumotni o'qib bo'lmadi." }));
      return;
    }
    history.replaceState(null, "", window.location.pathname);
    queueMicrotask(() => setState({ kind: "sending", title: data.title || data.designer || data.url }));
    submitCapture(data).then(
      (r) => setState({ kind: "done", ok: r.ok, message: r.message }),
      () => setState({ kind: "done", ok: false, message: "Server bilan bog'lanib bo'lmadi." }),
    );
  }, []);

  if (state.kind === "idle") return null;
  return (
    <div className="rounded-3xl border border-placeholder bg-surface p-6">
      {state.kind === "sending" ? (
        <p className="text-[16px] leading-[1.4] text-ink">
          ⏳ Yuborilmoqda: <span className="font-medium">{state.title}</span>
        </p>
      ) : (
        <p className="text-[16px] leading-[1.4] whitespace-pre-line text-ink">
          {state.ok ? "✅ " : "⚠️ "}
          {state.message}
          {state.ok && <span className="block pt-2 text-[14px] text-subtle">Bu oynani yopishingiz mumkin.</span>}
        </p>
      )}
    </div>
  );
}
