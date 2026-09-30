import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import PageShell from "@/components/PageShell";
import WorkGallery from "@/components/WorkGallery";
import { SoftLink } from "@/components/ui";
import { avatarBgFor, initials } from "@/data/designers";
import { getPlatform, viewOnLabel } from "@/data/platforms";
import { savedIdsForUser } from "@/lib/db";
import { getDesignerBySlug } from "@/lib/designers";
import { getSession } from "@/lib/session";
import { getPublishedWorks } from "@/lib/works";

const AVATAR_BG = { blue: "bg-avatar-blue", red: "bg-avatar-red", yellow: "bg-avatar-yellow" } as const;

export async function generateMetadata({ params }: PageProps<"/designers/[slug]">): Promise<Metadata> {
  const designer = await getDesignerBySlug((await params).slug);
  return { title: designer ? `${designer.name} — Pixora` : "Pixora" };
}

/**
 * Dizayner profili: uning Pixora'ga tanlangan barcha ishlari.
 * Vaqtinchalik oddiy ko'rinish — Figma'dagi profil dizayni kelgach almashtiriladi.
 */
export default async function DesignerProfilePage({ params, searchParams }: PageProps<"/designers/[slug]">) {
  const { slug } = await params;
  const { w } = await searchParams;
  const designer = await getDesignerBySlug(slug);
  if (!designer) notFound();

  const [works, user] = await Promise.all([getPublishedWorks(null, designer.id), getSession()]);
  const savedIds = await savedIdsForUser(user?.id);
  const platform = designer.platform ? getPlatform(designer.platform) : null;

  return (
    <PageShell active="designers" hero={false} tight>
      <header className="flex w-full flex-wrap items-center gap-4">
        <div
          className={`relative size-20 shrink-0 overflow-hidden rounded-full ${AVATAR_BG[avatarBgFor(designer.name)]}`}
        >
          {designer.avatar_url ? (
            <Image src={designer.avatar_url} alt="" fill sizes="80px" className="object-cover" />
          ) : (
            <span className="flex size-full items-center justify-center text-[24px] font-semibold text-ink/70">
              {initials(designer.name)}
            </span>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h1 className="truncate text-[28px] leading-[1.25] font-semibold text-ink">{designer.name}</h1>
          <p className="flex items-center gap-1.5 text-[14px] leading-[1.4] text-subtle">
            {platform && (
              <Image src={platform.icon} alt={platform.label} width={16} height={16} className="size-4 object-contain" />
            )}
            {designer.handle && <span>@{designer.handle}</span>}
            {designer.handle && <span aria-hidden>•</span>}
            <span>{works.length} picks</span>
          </p>
        </div>
        {designer.profile_url && designer.platform && (
          <div className="w-full sm:w-auto">
            <SoftLink href={designer.profile_url}>{viewOnLabel(designer.platform)}</SoftLink>
          </div>
        )}
      </header>

      {works.length === 0 ? (
        <p className="py-20 text-center text-[16px] leading-[1.4] text-subtle">Hozircha ishlar yo&apos;q.</p>
      ) : (
        <WorkGallery
          works={works}
          savedIds={savedIds}
          loggedIn={Boolean(user)}
          initialOpenId={typeof w === "string" ? w : undefined}
        />
      )}
    </PageShell>
  );
}
