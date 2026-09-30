import Image from "next/image";
import Link from "next/link";
import { getPlatform } from "@/data/platforms";
import { initials, type Designer } from "@/data/designers";

const AVATAR_BG = {
  blue: "bg-avatar-blue",
  red: "bg-avatar-red",
  yellow: "bg-avatar-yellow",
} as const;

/** Figma'dagi "Profile card" */
export default function DesignerCard({ designer }: { designer: Designer }) {
  const platform = designer.platform ? getPlatform(designer.platform) : null;
  const previews = [0, 1, 2].map((i) => designer.previews[i]);

  return (
    <Link
      href={`/designers/${designer.slug}`}
      className="flex min-w-0 flex-col gap-3.5 rounded-3xl border border-placeholder bg-surface p-4 outline-none focus-visible:ring-2 focus-visible:ring-brand"
    >
      <div className="flex w-full items-center gap-3">
        <div
          className={`relative size-[52px] shrink-0 overflow-hidden rounded-full ${AVATAR_BG[designer.avatarBg]}`}
        >
          {designer.avatar ? (
            <Image src={designer.avatar} alt="" fill sizes="52px" className="object-cover" />
          ) : (
            <span className="flex size-full items-center justify-center text-[16px] font-semibold text-ink/70">
              {initials(designer.name)}
            </span>
          )}
        </div>

        <div className="flex h-10 min-w-0 flex-1 flex-col justify-center gap-0.5">
          <p className="shrink-0 truncate text-[18px] leading-[1.4] font-medium text-ink">{designer.name}</p>
          <div className="flex min-w-0 shrink-0 items-center gap-1 text-[12px] leading-[1.4] text-subtle">
            {platform && (
              <Image
                src={platform.icon}
                alt={platform.label}
                width={14}
                height={14}
                className="size-3.5 shrink-0 object-contain"
              />
            )}
            {designer.handle && (
              <>
                <span className="truncate">@{designer.handle}</span>
                <span aria-hidden>•</span>
              </>
            )}
            <span className="shrink-0 whitespace-nowrap">{designer.picks} picks</span>
          </div>
        </div>
      </div>

      <div className="flex w-full gap-1.5">
        {previews.map((src, i) => (
          <div key={i} className="relative aspect-[110/80] min-w-0 flex-1 overflow-hidden rounded-[10px] bg-thumb">
            {src && <Image src={src} alt="" fill sizes="(min-width: 1024px) 12vw, 33vw" className="object-cover" />}
          </div>
        ))}
      </div>
    </Link>
  );
}
