"use client";

import { useCallback, useState } from "react";
import WorkCard from "@/components/WorkCard";
import WorkViewer from "@/components/WorkViewer";
import type { Work } from "@/data/works";

/** Ishlar to'ri + bosilganda ochiladigan ko'rish oynasi */
export default function WorkGallery({
  works,
  savedIds,
  loggedIn,
}: {
  works: Work[];
  savedIds: string[];
  loggedIn: boolean;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [saved, setSaved] = useState(() => new Set(savedIds));

  const close = useCallback(() => setOpenIndex(null), []);
  const prev = useCallback(() => setOpenIndex((i) => (i !== null && i > 0 ? i - 1 : i)), []);
  const next = useCallback(
    () => setOpenIndex((i) => (i !== null && i < works.length - 1 ? i + 1 : i)),
    [works.length],
  );

  const open = openIndex !== null ? works[openIndex] : null;

  return (
    <>
      <div className="grid grid-cols-1 gap-x-3 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
        {works.map((work, i) => (
          <WorkCard key={work.id} work={work} onOpen={() => setOpenIndex(i)} />
        ))}
      </div>

      {open && openIndex !== null && (
        <WorkViewer
          work={open}
          saved={saved.has(open.id)}
          loggedIn={loggedIn}
          onClose={close}
          onPrev={openIndex > 0 ? prev : undefined}
          onNext={openIndex < works.length - 1 ? next : undefined}
          onSavedChange={(isSaved) =>
            setSaved((s) => {
              const copy = new Set(s);
              if (isSaved) copy.add(open.id);
              else copy.delete(open.id);
              return copy;
            })
          }
        />
      )}
    </>
  );
}
