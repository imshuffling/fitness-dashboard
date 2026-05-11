import Image from "next/image";
import Link from "next/link";
import VideoPlayer from "@/components/rides/VideoPlayer";
import type { ActivitySummary } from "@/lib/health";

const TYPE_ICONS: Record<string, string> = {
  Ride: "🚴",
  VirtualRide: "🚴",
  EBikeRide: "🚴",
  Velomobile: "🚴",
  Run: "🏃",
  TrailRun: "🏃",
  VirtualRun: "🏃",
  Walk: "🚶",
  Hike: "🥾",
  WeightTraining: "🏋️",
  Workout: "💪",
  Yoga: "🧘",
  Swim: "🏊",
  Rowing: "🚣",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export default function RecentActivityCard({ activity }: { activity: ActivitySummary }) {
  const hours = Math.floor(activity.durationMin / 60);
  const mins = activity.durationMin % 60;
  const icon = TYPE_ICONS[activity.type] ?? "•";
  const href = `/rides/${activity.id}`;

  const media = activity.videoUrl ? (
    <div className="h-44 w-full md:h-auto md:w-64 md:shrink-0 md:self-stretch bg-neutral-800">
      <VideoPlayer
        src={activity.videoUrl}
        poster={activity.photoUrl ?? undefined}
        className="h-full w-full object-cover"
      />
    </div>
  ) : activity.photoUrl ? (
    <Link
      href={href}
      className="relative h-44 w-full md:h-auto md:w-64 md:shrink-0 md:self-stretch block"
    >
      <Image
        src={activity.photoUrl}
        alt=""
        fill
        sizes="(max-width: 768px) 100vw, 256px"
        className="object-cover"
      />
    </Link>
  ) : (
    <Link
      href={href}
      className="flex h-44 w-full items-center justify-center bg-neutral-800/60 text-4xl md:h-auto md:w-64 md:shrink-0 md:self-stretch"
    >
      {icon}
    </Link>
  );

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900/60">
      <div className="flex flex-col md:flex-row">
        {media}

        <Link
          href={href}
          className="flex-1 p-4 sm:p-5 min-w-0 hover:bg-neutral-900 transition"
        >
          <p className="text-[11px] uppercase tracking-wider text-neutral-500">
            {activity.type} · {formatDate(activity.date)}
          </p>
          <h3 className="mt-1 text-lg sm:text-xl font-semibold truncate">{activity.name}</h3>

          <dl className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="Duration" value={hours > 0 ? `${hours}h ${mins}m` : `${mins}m`} />
            {activity.distanceKm > 0 && (
              <Stat label="Distance" value={`${activity.distanceKm.toFixed(1)} km`} />
            )}
            {activity.avgWatts !== null && (
              <Stat label="Avg watts" value={`${activity.avgWatts} W`} />
            )}
            {activity.avgHR !== null && (
              <Stat label="Avg HR" value={`${activity.avgHR} bpm`} />
            )}
            {activity.zone2Pct !== null && <Stat label="Zone 2" value={`${activity.zone2Pct}%`} />}
          </dl>
        </Link>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-neutral-500">{label}</div>
      <div className="mt-0.5 text-base font-medium tabular-nums">{value}</div>
    </div>
  );
}
