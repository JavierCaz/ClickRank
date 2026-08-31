export default function Loading() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-8 px-4 pb-16 pt-10">
      <div className="flex flex-col items-center gap-3">
        <div className="skeleton-shimmer h-9 w-48 rounded-lg" />
        <div className="skeleton-shimmer h-4 w-64 rounded" />
      </div>
      <div className="flex justify-center">
        <div className="skeleton-shimmer h-11 w-56 rounded-full" />
      </div>
      <div className="mt-4 flex flex-col gap-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="skeleton-shimmer flex h-16 items-center gap-3 rounded-2xl px-4"
          >
            <div className="skeleton-shimmer h-5 w-5 rounded" />
            <div className="skeleton-shimmer h-10 w-10 rounded-full" />
            <div className="flex-1">
              <div className="skeleton-shimmer h-4 w-28 rounded" />
              <div className="skeleton-shimmer mt-2 h-3 w-20 rounded" />
            </div>
            <div className="skeleton-shimmer h-6 w-16 rounded" />
          </div>
        ))}
      </div>
    </main>
  );
}
