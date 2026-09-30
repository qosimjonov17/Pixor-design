"use server";

import { isSiteAdmin } from "@/lib/admin";
import { addFromBrowser, type BrowserCapture } from "@/lib/bot";

export async function submitCapture(input: BrowserCapture) {
  const { admin } = await isSiteAdmin();
  if (!admin) return { ok: false as const, message: "Ruxsat yo'q — admin akkaunt bilan kiring." };
  if (!input || typeof input.url !== "string") return { ok: false as const, message: "Ma'lumot noto'g'ri." };
  try {
    return await addFromBrowser({
      url: input.url,
      title: typeof input.title === "string" ? input.title : undefined,
      description: typeof input.description === "string" ? input.description : undefined,
      image: typeof input.image === "string" ? input.image : undefined,
      designer: typeof input.designer === "string" ? input.designer : undefined,
      designerUrl: typeof input.designerUrl === "string" ? input.designerUrl : undefined,
      designerAvatar: typeof input.designerAvatar === "string" ? input.designerAvatar : undefined,
      video: typeof input.video === "string" ? input.video : undefined,
    });
  } catch (err) {
    console.error("[admin/add]", err);
    return { ok: false as const, message: `Xatolik: ${err instanceof Error ? err.message : String(err)}` };
  }
}
