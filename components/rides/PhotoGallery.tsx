import Image from "next/image";
import { isVideoPhoto, videoSrc, type StravaPhoto } from "@/lib/strava";

function pickLargestUrl(urls: Record<string, string>): string | null {
  const sizes = Object.keys(urls)
    .map((k) => parseInt(k, 10))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => b - a);
  const key = sizes[0]?.toString() ?? Object.keys(urls)[0];
  return key ? urls[key] ?? null : null;
}

export default function PhotoGallery({ photos }: { photos: StravaPhoto[] }) {
  if (photos.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-neutral-500 text-sm">
        No photos or videos on this ride.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
      {photos.map((p, i) => {
        const poster = pickLargestUrl(p.urls);
        const key = p.unique_id ?? p.id ?? i;

        if (isVideoPhoto(p)) {
          const src = videoSrc(p);
          if (!src) {
            // Video flagged but no URL — show poster only.
            if (!poster) return null;
            return (
              <div
                key={key}
                className="relative aspect-square overflow-hidden rounded-lg bg-neutral-800"
              >
                <Image
                  src={poster}
                  alt={p.caption ?? ""}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className="object-cover"
                />
                <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white">
                  Video
                </span>
              </div>
            );
          }
          return (
            <video
              key={key}
              src={src}
              poster={poster ?? undefined}
              controls
              preload="metadata"
              playsInline
              className="aspect-square w-full rounded-lg bg-neutral-800 object-cover"
            />
          );
        }

        if (!poster) return null;
        return (
          <a
            key={key}
            href={poster}
            target="_blank"
            rel="noreferrer"
            className="relative aspect-square overflow-hidden rounded-lg bg-neutral-800 hover:opacity-90 transition"
          >
            <Image
              src={poster}
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
