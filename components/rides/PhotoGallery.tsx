import Image from "next/image";
import type { StravaPhoto } from "@/lib/strava";

function pickLargestUrl(photo: StravaPhoto): string | null {
  const sizes = Object.keys(photo.urls)
    .map((k) => parseInt(k, 10))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => b - a);
  const key = sizes[0]?.toString() ?? Object.keys(photo.urls)[0];
  return key ? photo.urls[key] ?? null : null;
}

export default function PhotoGallery({ photos }: { photos: StravaPhoto[] }) {
  if (photos.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-neutral-500 text-sm">
        No photos on this ride.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
      {photos.map((p, i) => {
        const url = pickLargestUrl(p);
        if (!url) return null;
        return (
          <a
            key={p.unique_id ?? p.id ?? i}
            href={url}
            target="_blank"
            rel="noreferrer"
            className="relative aspect-square overflow-hidden rounded-lg bg-neutral-800 hover:opacity-90 transition"
          >
            <Image
              src={url}
              alt={p.caption ?? ""}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover"
            />
          </a>
        );
      })}
    </div>
  );
}
