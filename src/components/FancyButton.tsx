import Link from "next/link";

/** Figma'dagi "Fancy Buttons [1.1]" — Primary / Default / Small */
export default function FancyButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center gap-1 overflow-hidden rounded-[10px] border border-white/12 bg-brand px-4 py-[9px] shadow-fancy transition-[filter] hover:brightness-105 active:brightness-95"
      style={{
        backgroundImage:
          "linear-gradient(180deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0) 100%)",
      }}
    >
      <span
        className="px-1 text-[14px] leading-[18px] font-medium whitespace-nowrap text-white"
        style={{ fontFeatureSettings: '"calt" 0, "liga" 0' }}
      >
        {children}
      </span>
    </Link>
  );
}
