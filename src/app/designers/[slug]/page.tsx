import { notFound } from "next/navigation";
import ComingSoon from "@/components/ComingSoon";
import { DESIGNERS, getDesigner } from "@/data/designers";

export function generateStaticParams() {
  return DESIGNERS.map((d) => ({ slug: d.slug }));
}

/** Dizayner profili — dizayni tayyor bo'lguncha vaqtinchalik sahifa */
export default async function DesignerProfilePage({ params }: PageProps<"/designers/[slug]">) {
  const { slug } = await params;
  const designer = getDesigner(slug);
  if (!designer) notFound();

  return <ComingSoon title={designer.name} />;
}
