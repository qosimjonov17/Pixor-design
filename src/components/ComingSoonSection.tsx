import Image from "next/image";

/** Figma'dagi "Tez kunda" bloki (Yetakchilar sahifasi) */
export default function ComingSoonSection({ description }: { description: string }) {
  return (
    <section className="flex w-full flex-col items-center">
      <Image
        src="/illustrations/404.png"
        alt=""
        width={418}
        height={418}
        priority
        className="size-[260px] object-cover sm:size-[418px]"
      />
      <div className="flex w-full flex-col items-center gap-4 text-center">
        <h1 className="text-[32px] leading-[1.25] font-medium text-ink">Tez kunda</h1>
        <p className="max-w-[424px] font-helvetica text-[16px] leading-[1.4] text-subtle">{description}</p>
      </div>
    </section>
  );
}
