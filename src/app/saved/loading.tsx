/** Saqlangan ishlar yuklanayotganda: menyusiz, sahifa bilan bir xil joylashuv */
export default function Loading() {
  return (
    <div className="mx-auto flex max-w-[2880px] flex-col gap-8 p-4 pt-8" aria-busy="true">
      <div className="flex w-full items-start justify-between">
        <div className="h-10 w-[170px] animate-pulse rounded-[10px] bg-placeholder" />
        <div className="size-10 animate-pulse rounded-full bg-placeholder" />
      </div>
      <div className="flex w-full flex-col gap-6">
        <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-[28px] leading-[1.4] font-medium text-ink">Saqlangan ishlar</h1>
          <div className="flex w-full gap-2 sm:w-[450px]">
            {[0, 1, 2, 3].map((j) => (
              <div key={j} className="h-[34px] flex-1 animate-pulse rounded-lg bg-placeholder" />
            ))}
          </div>
        </div>
        <div className="grid w-full grid-cols-1 gap-x-3 gap-y-5 sm:grid-cols-2 lg:grid-cols-3 3xl:grid-cols-4">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="aspect-[362/270] w-full animate-pulse rounded-[32px] bg-placeholder" />
          ))}
        </div>
      </div>
    </div>
  );
}
