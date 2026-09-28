import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ComingSoonSection from "@/components/ComingSoonSection";
import PageShell from "@/components/PageShell";
import { DESIGNERS, getDesigner } from "@/data/designers";

export function generateStaticParams() {
  return DESIGNERS.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: PageProps<"/designers/[slug]">): Promise<Metadata> {
  const designer = getDesigner((await params).slug);
  return { title: designer ? `${designer.name} — Pixora` : "Pixora" };
}

/** Dizayner profili — dizayni tayyor bo'lguncha "Tez kunda" ekrani */
export default async function DesignerProfilePage({ params }: PageProps<"/designers/[slug]">) {
  const designer = getDesigner((await params).slug);
  if (!designer) notFound();

  return (
    <PageShell active="designers" hero={false}>
      <ComingSoonSection description={`${designer.name} profili tez kunda ishga tushadi`} />
    </PageShell>
  );
}
