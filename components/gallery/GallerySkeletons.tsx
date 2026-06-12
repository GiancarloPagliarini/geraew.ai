/** Alturas variadas imitando o masonry real. */
export const SKELETON_HEIGHTS = [300, 170, 360, 230, 140, 320, 260, 190, 280, 220, 340, 160];

export function SkeletonCard({ height, index }: { height: number; index: number }) {
  const delay = { animationDelay: `${(index * 110) % 660}ms` };
  return (
    <div className="mb-5 break-inside-avoid">
      <div
        className="relative w-full skeleton-app overflow-hidden rounded-[14px] border border-app-hairline bg-app-surface"
        style={{ height, ...delay }}
      >
        {/* badge de tipo */}
        <div className="absolute left-2.5 top-2.5 h-6 w-[76px] rounded-full bg-app-card-hover" />
      </div>
      {/* título + botão copy */}
      <div className="mt-2.5 flex items-center gap-2">
        <div className="h-4 w-3/4 skeleton-app rounded bg-app-surface" style={delay} />
        <div className="ml-auto size-4 skeleton-app rounded bg-app-surface" style={delay} />
      </div>
      {/* timestamp */}
      <div className="mt-1.5 h-3 w-1/3 skeleton-app rounded bg-app-surface" style={delay} />
    </div>
  );
}

export function SkeletonMasonry() {
  return (
    <div className="columns-1 gap-5 sm:columns-2 lg:columns-3 xl:columns-4">
      {SKELETON_HEIGHTS.map((h, i) => (
        <SkeletonCard key={i} height={h} index={i} />
      ))}
    </div>
  );
}
