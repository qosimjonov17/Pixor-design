"use client";

import { useEffect, useRef, useState } from "react";
import { submitCapture } from "./actions";

/** Brauzer tugmachasi kodi: sahifadan ma'lumot yig'ib, Pixora'ning shu sahifasini ochadi */
function bookmarkletCode(site: string) {
  // Behance/Dribbble loyihani profil ustida oynacha qilib ochadi — sahifadagi meta profilniki bo'lib qoladi.
  // Shuning uchun loyiha manzilini brauzerning o'zida qayta yuklab (sayt bloklamaydi), o'sha HTML'ni o'qiymiz.
  const js = `(()=>{const S=${JSON.stringify(site)};const w=window.open("about:blank","_blank");const go=d=>{const u=S+"/admin/add#"+encodeURIComponent(JSON.stringify(d));if(w)w.location.href=u;else location.href=u};const href=location.href.split("#")[0];const h=location.hostname;const pick=(doc,n)=>{const e=doc.querySelector('meta[property="'+n+'"],meta[name="'+n+'"]');return e&&e.content||""};const own=html=>{const r=html.match(/"owners"\\s*:\\s*\\[\\s*\\{[^\\]]*?"display_name"\\s*:\\s*"([^"]{1,80})"/);if(!r)return"";try{return JSON.parse('"'+r[1]+'"')}catch(e){return r[1]}};if(h==="x.com"||h.includes("twitter")){const q=s=>document.querySelector(s);const t=q('article [data-testid="tweetText"]'),u=q('article [data-testid="User-Name"] span'),i=q('article img[src*="pbs.twimg.com/media"]');go({url:href,title:t?t.textContent.trim().slice(0,200):pick(document,"og:title"),description:"",image:i?i.src.replace(/name=[a-z0-9]+/,"name=large"):pick(document,"og:image"),designer:u?u.textContent.trim():""});return}fetch(href,{credentials:"include"}).then(r=>r.text()).then(html=>{const doc=new DOMParser().parseFromString(html,"text/html");go({url:href,title:pick(doc,"og:title")||(doc.title||""),description:pick(doc,"og:description")||pick(doc,"description"),image:pick(doc,"og:image")||pick(doc,"twitter:image"),designer:own(html)||pick(doc,"author")})}).catch(()=>go({url:href,title:pick(document,"og:title")||document.title,description:pick(document,"og:description"),image:pick(document,"og:image"),designer:own(document.documentElement.innerHTML)}))})()`;
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
