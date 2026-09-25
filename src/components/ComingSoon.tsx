import Link from "next/link";

export default function ComingSoon({ title }: { title: string }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-[28px] font-bold text-ink">{title}</h1>
      <p className="text-[15px] text-subtle">Bu sahifa tez orada tayyor bo&apos;ladi.</p>
      <Link href="/" className="text-[15px] font-medium text-brand hover:underline">
        ← Bosh sahifaga qaytish
      </Link>
    </main>
  );
}
