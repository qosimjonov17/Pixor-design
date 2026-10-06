import type { Metadata } from "next";
import { redirect } from "next/navigation";
import BackButton from "@/components/BackButton";
import CategoryWorks from "@/components/CategoryWorks";
import UserMenu from "@/components/UserMenu";
import { savedIdsForUser } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getPublishedWorksByIds } from "@/lib/works";

export const metadata: Metadata = {
  title: "Saqlangan ishlar — Pixor",
};

/** Figma: "Saqlangan ishlar" — chap menyusiz, butun kenglikda */
export default async function SavedPage() {
  const user = await getSession();
  if (!user) redirect("/signup?next=/saved");

  const savedIds = await savedIdsForUser(user.id);
  const works = await getPublishedWorksByIds(savedIds);

  return (
    <div className="mx-auto flex max-w-[2880px] flex-col gap-8 p-4 pt-8">
      <header className="flex w-full items-start justify-between">
        <BackButton />
        <UserMenu user={user} />
      </header>
      <CategoryWorks
        title="Saqlangan ishlar"
        works={works}
        savedIds={savedIds}
        loggedIn
        emptyText="Hali hech narsa saqlamadingiz. Yoqqan ishni ochib, “Saqlash” tugmasini bosing."
      />
    </div>
  );
}
