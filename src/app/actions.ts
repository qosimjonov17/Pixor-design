"use server";

import { revalidatePath } from "next/cache";
import { getWork } from "@/data/works";
import { setWorkSaved } from "@/lib/db";
import { getSession } from "@/lib/session";

export type SaveResult = { ok: true; saved: boolean } | { ok: false; reason: "login" | "error" };

/** Ishni saqlash yoki saqlanganlardan olib tashlash */
export async function setSaved(workId: string, saved: boolean): Promise<SaveResult> {
  const user = await getSession();
  if (!user) return { ok: false, reason: "login" };
  if (!getWork(workId)) return { ok: false, reason: "error" };

  try {
    await setWorkSaved(user.id, workId, saved);
  } catch (err) {
    console.error("[saved] saqlash xatosi:", err);
    return { ok: false, reason: "error" };
  }
  revalidatePath("/saved");
  return { ok: true, saved };
}
