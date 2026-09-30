import Image from "next/image";
import Link from "next/link";
import { initials } from "@/data/designers";

/** Figma'dagi "Fancy Buttons" — Basic (oq) turi */
export const softButtonClass =
  "flex w-full items-center justify-center gap-1 overflow-hidden rounded-[10px] bg-surface px-4 py-2.5 text-[14px] leading-[1.25] font-medium shadow-[0_1px_3px_0_rgba(14,18,27,0.12),0_0_0_1px_#ebebeb] transition-colors hover:bg-page disabled:opacity-60";

export function SoftLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={`${softButtonClass} text-[#5c5c5c]`}>
      <span className="px-1">{children}</span>
    </a>
  );
}

/** Avatar + ism + @nik (ko'rish oynasidagi 46px variant) */
export function PersonRow({
  name,
  handle,
  avatar,
  avatarBgClass = "",
  href,
}: {
  name: string;
  handle?: string;
  avatar?: string;
  avatarBgClass?: string;
  /** Berilsa, butun qator shu sahifaga havola bo'ladi (dizayner profili) */
  href?: string;
}) {
  const Wrapper = href ? Link : "div";
  return (
    <Wrapper
      href={href as string}
      className={`flex w-full items-center gap-3 ${href ? "rounded-xl outline-none hover:opacity-80 focus-visible:ring-2 focus-visible:ring-brand" : ""}`}
    >
      <div className={`relative size-[46px] shrink-0 overflow-hidden rounded-full ${avatarBgClass}`}>
        {avatar ? (
          <Image src={avatar} alt="" fill sizes="46px" className="object-cover" />
        ) : (
          <span className="flex size-full items-center justify-center text-[15px] font-semibold text-ink/70">
            {initials(name)}
          </span>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="truncate text-[16px] leading-[1.4] font-medium text-ink">{name}</p>
        {handle && <p className="truncate text-[12px] leading-[1.4] text-subtle">@{handle}</p>}
      </div>
    </Wrapper>
  );
}
