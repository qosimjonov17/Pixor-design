"use client";

import { useEffect, useRef, useState } from "react";
import { submitCapture } from "./actions";

/** Brauzer tugmachasi kodi: sahifadan ma'lumot yig'ib, Pixora'ning shu sahifasini ochadi */
function bookmarkletCode(site: string) {
  const js = `(()=>{const m=n=>{const e=document.querySelector('meta[property="'+n+'"],meta[name="'+n+'"]');return e&&e.content||""};const q=s=>{const e=document.querySelector(s);return e&&(e.textContent||"").trim()||""};const h=location.hostname;const d={url:location.href.split("#")[0],title:m("og:title")||document.title,description:m("og:description")||m("description"),image:m("og:image")||m("twitter:image"),designer:m("author")};if(h.includes("behance")){const r=document.documentElement.innerHTML.match(/"owners"\\s*:\\s*\\[\\s*\\{[^\\]]*?"display_name"\\s*:\\s*"([^"]{1,80})"/);let o="";try{o=r?JSON.parse('"'+r[1]+'"'):""}catch(e){o=r[1]}d.designer=d.designer||o||q('[class*="ProjectOwner"] a')||q('[class*="UserInfo-userName"]')}if(h==="x.com"||h.includes("twitter")){const t=document.querySelector('article [data-testid="tweetText"]');if(t)d.title=t.textContent.trim().slice(0,200);const u=document.querySelector('article [data-testid="User-Name"] span');if(u)d.designer=u.textContent.trim();const i=document.querySelector('article img[src*="pbs.twimg.com/media"]');if(i)d.image=i.src.replace(/name=[a-z0-9]+/,"name=large")}window.open(${JSON.stringify(site)}+"/admin/add#"+encodeURIComponent(JSON.stringify(d)),"_blank")})()`;
  return `javascript:${encodeURIComponent(js)}`;
}

export function BookmarkletLink({ site }: { site: string }) {
  const ref = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    // React javascript: havolalarni bloklaydi, shuning uchun manzilni to'g'ridan-to'g'ri qo'yamiz
    ref.current?.setAttribute("href", bookmarkletCode(site));
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
    let data: { url: string; title?: string };
    try {
      data = JSON.parse(decodeURIComponent(raw));
    } catch {
      queueMicrotask(() => setState({ kind: "done", ok: false, message: "Ma'lumotni o'qib bo'lmadi." }));
      return;
    }
    history.replaceState(null, "", window.location.pathname);
    queueMicrotask(() => setState({ kind: "sending", title: data.title ?? data.url }));
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
        <p className="text-[16px] leading-[1.4] text-ink">
          {state.ok ? "✅ " : "⚠️ "}
          {state.message}
          {state.ok && <span className="block pt-2 text-[14px] text-subtle">Bu oynani yopishingiz mumkin.</span>}
        </p>
      )}
    </div>
  );
}
