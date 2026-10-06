import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import CategoryWorks from "@/components/CategoryWorks";
import PageShell from "@/components/PageShell";
import { avatarBgFor, initials } from "@/data/designers";
import { getPlatform, type Platform } from "@/data/platforms";
import { savedIdsForUser } from "@/lib/db";
import { designerLinks, getDesignerBySlug } from "@/lib/designers";
import { getSession } from "@/lib/session";
import { getPublishedWorks } from "@/lib/works";

const AVATAR_BG = { blue: "bg-avatar-blue", red: "bg-avatar-red", yellow: "bg-avatar-yellow" } as const;

/** Figma'dagi 18px platforma ikonkalari (Dprofile uchun alohida chizilmagan — saytdagisi) */
const SOCIAL_ICON: Record<Platform, string> = {
  behance: "/icons/social-behance.svg",
  x: "/icons/social-x.svg",
  dribbble: "/icons/social-dribbble.svg",
  dprofile: "/icons/dprofile.png",
};

export async function generateMetadata({ params }: PageProps<"/designers/[slug]">): Promise<Metadata> {
  const designer = await getDesignerBySlug((await params).slug);
  return {
    title: designer ? `${designer.name} — Pixor` : "Pixor",
    description: designer?.bio?.slice(0, 160) || undefined,
  };
}

/** Figma: "Dizayner profili" — avatar, ism, nik, bio, ijtimoiy tarmoqlar va tanlangan ishlari */
export default async function DesignerProfilePage({ params, searchParams }: PageProps<"/designers/[slug]">) {
  const { slug } = await params;
  const { w } = await searchParams;
  const designer = await getDesignerBySlug(slug);
  if (!designer) notFound();

  const [works, user] = await Promise.all([getPublishedWorks(null, designer.id), getSession()]);
  const savedIds = await savedIdsForUser(user?.id);
  const links = designerLinks(designer);

  return (
    <PageShell active="designers" hero={false} tight>
      <div className="flex w-full flex-col gap-[50px] sm:mt-[18px]">
        <header className="flex w-full items-start gap-3">
          <div
            className={`relative size-14 shrink-0 overflow-hidden rounded-full sm:size-[72px] ${AVATAR_BG[avatarBgFor(designer.name)]}`}
          >
            {designer.avatar_url ? (
              <Image src={designer.avatar_url} alt="" fill sizes="72px" className="object-cover" />
            ) : (
              <span className="flex size-full items-center justify-center text-[22px] font-semibold text-ink/70">
                {initials(designer.name)}
              </span>
            )}
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div className="flex w-full flex-col gap-3 pt-1.5 sm:flex-row sm:items-start sm:gap-0.5">
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <h1 className="text-[22px] leading-[1.4] font-semibold break-words text-ink sm:text-[24px]">
                  {designer.name}
                </h1>
                <p className="flex flex-wrap items-center gap-x-2 text-[15px] leading-[1.4] text-subtle sm:text-[16px]">
                  {designer.platform && (
                    <Image
                      src={SOCIAL_ICON[designer.platform]}
                      alt={getPlatform(designer.platform).label}
                      width={18}
                      height={18}
                      className="size-[18px] object-contain"
                    />
                  )}
                  {designer.handle && <span>@{designer.handle}</span>}
                  {designer.handle && <span aria-hidden>•</span>}
                  <span>{works.length} tanlangan</span>
                </p>
              </div>

              {links.length > 0 && (
                <ul aria-label="Ijtimoiy tarmoqlar" className="flex shrink-0 gap-2">
                  {links.map((l) => (
                    <li key={l.platform}>
                      <a
                        href={l.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={getPlatform(l.platform).label}
                        title={getPlatform(l.platform).label}
                        className="flex size-[42px] items-center justify-center rounded-xl bg-white shadow-[0px_0px_0px_1px_#f1f5f9,0px_1px_3px_0px_rgba(14,18,27,0.12)] transition-colors hover:bg-page"
                      >
                        <Image
                          src={SOCIAL_ICON[l.platform]}
                          alt=""
                          width={18}
                          height={18}
                          className="size-[18px] object-contain"
                        />
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {designer.bio && (
              <p className="text-[14px] leading-[1.4] whitespace-pre-line text-subtle">{designer.bio}</p>
            )}
          </div>
        </header>

        <CategoryWorks
          works={works}
          savedIds={savedIds}
          loggedIn={Boolean(user)}
          initialOpenId={typeof w === "string" ? w : undefined}
          emptyText="Hozircha ishlar yo'q."
        />
      </div>
    </PageShell>
  );
}
