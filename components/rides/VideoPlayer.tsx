"use client";

import { useEffect, useRef, useState } from "react";

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
  const [status, setStatus] = useState<string>("init");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;

    const isHls = src.includes(".m3u8");
    if (!isHls) {
      video.src = src;
      setStatus("direct");
      return;
    }

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      setStatus("native-hls");
      return;
    }

    let hls: import("hls.js").default | null = null;
    let cancelled = false;

    setStatus("loading-hls.js");
    import("hls.js")
      .then(({ default: Hls }) => {
        if (cancelled) return;
        if (!Hls.isSupported()) {
          setStatus("hls-unsupported");
          video.src = src;
          return;
        }
        hls = new Hls();
        hls.on(Hls.Events.ERROR, (_e, data) => {
          setErr(`${data.type}/${data.details}`);
        });
        hls.on(Hls.Events.MANIFEST_PARSED, () => setStatus("ready"));
        hls.loadSource(src);
        hls.attachMedia(video);
        setStatus("attached");
      })
      .catch((e) => {
        setErr(`import failed: ${(e as Error).message}`);
      });

    return () => {
      cancelled = true;
      hls?.destroy();
    };
  }, [src]);

  return (
    <div className="relative">
      <video
        ref={ref}
        poster={poster}
        controls
        preload="metadata"
        playsInline
        className={className}
      />
      <span className="absolute top-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white">
        {err ?? status}
      </span>
    </div>
  );
}
