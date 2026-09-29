import type { Metadata } from "next";
import { redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import WorkGallery from "@/components/WorkGallery";
import { savedIdsForUser } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getPublishedWorksByIds } from "@/lib/works";

export const metadata: Metadata = {
  title: "Saqlanganlar — Pixora",
};

export default async function SavedPage() {
  const user = await getSession();
  if (!user) redirect("/signup?next=/saved");

  const savedIds = await savedIdsForUser(user.id);
  const works = await getPublishedWorksByIds(savedIds);

  return (
    <PageShell active={null} hero={false} tight>
      <section aria-label="Saqlanganlar" className="flex w-full flex-col gap-6">
        <h1 className="text-[28px] leading-[1.2] font-semibold text-ink">Saqlanganlar</h1>
        {works.length > 0 ? (
          <WorkGallery works={works} savedIds={savedIds} loggedIn />
        ) : (
          <p className="py-16 text-center text-[15px] text-subtle">
            Hali hech narsa saqlamadingiz. Yoqqan ishni ochib, “Saqlash” tugmasini bosing.
          </p>
        )}
      </section>
    </PageShell>
  );
}
