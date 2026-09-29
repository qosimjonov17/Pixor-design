import Image from "next/image";
import { getPlatform } from "@/data/platforms";
import type { Work } from "@/data/works";

const AVATAR_BG = {
  blue: "bg-avatar-blue",
  red: "bg-avatar-red",
  yellow: "bg-avatar-yellow",
} as const;

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function WorkCard({ work, onOpen }: { work: Work; onOpen: () => void }) {
  const platform = getPlatform(work.platform);
  const { designer } = work;

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${work.title} — ${designer.name}`}
      className="group flex min-w-0 cursor-pointer flex-col gap-2 text-left outline-none"
    >
      <div className="relative h-[270px] w-full overflow-hidden rounded-[32px] bg-placeholder group-focus-visible:ring-2 group-focus-visible:ring-brand">
        {work.image && (
          <Image
            src={work.image}
            alt={work.title}
            fill
            sizes="(min-width: 1024px) 362px, (min-width: 640px) 50vw, 100vw"
            className="object-cover"
          />
        )}
      </div>

      <div className="flex w-full items-center gap-3 overflow-hidden rounded-[10px] bg-page">
        <div
          className={`relative size-10 shrink-0 overflow-hidden rounded-full ${AVATAR_BG[designer.avatarBg]}`}
        >
          {designer.avatar ? (
            <Image src={designer.avatar} alt="" fill sizes="40px" className="object-cover" />
          ) : (
            <span className="flex size-full items-center justify-center text-[13px] font-semibold text-ink/70">
              {initials(designer.name)}
            </span>
          )}
        </div>

        <div className="flex h-10 min-w-0 flex-1 flex-col justify-center gap-0.5">
          <p className="truncate text-[14px] leading-[1.4] font-medium text-ink">{designer.name}</p>
          <div className="flex items-center gap-1">
            <Image
              src={platform.icon}
              alt={platform.label}
              width={14}
              height={14}
              className="size-3.5 shrink-0 object-contain"
            />
            <p className="truncate text-[12px] leading-[1.4] font-normal text-subtle">{work.title}</p>
          </div>
        </div>
      </div>
    </button>
  );
}
