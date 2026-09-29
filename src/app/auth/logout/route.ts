import { NextResponse, type NextRequest } from "next/server";
import { destroySession } from "@/lib/session";

/** Chiqish (faqat POST — boshqa saytlar havola orqali chiqarib yubora olmasin) */
export async function POST(request: NextRequest) {
  await destroySession();
  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}
