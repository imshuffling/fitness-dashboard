"use client";

import { useEffect, useRef } from "react";

export default function VideoPlayer({
  src,
  poster,
  className,
}: {
  src: string;
  poster?: string;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;

    const isHls = src.includes(".m3u8");
    if (!isHls) {
      video.src = src;
      return;
    }

    let hls: import("hls.js").default | null = null;
    let cancelled = false;

    import("hls.js")
      .then(({ default: Hls }) => {
        if (cancelled) return;
        if (Hls.isSupported()) {
          hls = new Hls();
          hls.loadSource(src);
          hls.attachMedia(video);
          return;
        }
        if (video.canPlayType("application/vnd.apple.mpegurl")) {
          video.src = src;
        }
      })
      .catch(() => {
        // hls.js failed to load — leave video without src
      });

    return () => {
      cancelled = true;
      hls?.destroy();
    };
  }, [src]);

  return (
    <video
      ref={ref}
      poster={poster}
      controls
      preload="metadata"
      playsInline
      className={className}
    />
  );
}
