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

const TYPE_GLOW: Record<string, string> = {
  Ride: "bg-orange-500/25",
  VirtualRide: "bg-orange-500/25",
  EBikeRide: "bg-orange-500/25",
  Velomobile: "bg-orange-500/25",
  Run: "bg-emerald-500/25",
  TrailRun: "bg-emerald-500/25",
  VirtualRun: "bg-emerald-500/25",
  Walk: "bg-sky-500/25",
  Hike: "bg-amber-500/25",
  WeightTraining: "bg-violet-500/25",
  Workout: "bg-violet-500/25",
  Yoga: "bg-pink-500/25",
  Swim: "bg-cyan-500/25",
  Rowing: "bg-teal-500/25",
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
  const glow = TYPE_GLOW[activity.type] ?? "bg-neutral-500/20";
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
      className="relative h-44 w-full overflow-hidden md:h-auto md:w-64 md:shrink-0 md:self-stretch block"
    >
      <Image
        src={activity.photoUrl}
        alt=""
        fill
        sizes="(max-width: 768px) 100vw, 256px"
        className="object-cover transition-transform duration-300 group-hover:scale-105"
      />
    </Link>
  ) : (
    <Link
      href={href}
      className="relative flex h-44 w-full items-center justify-center overflow-hidden bg-neutral-950 md:h-auto md:w-64 md:shrink-0 md:self-stretch"
    >
      <div
        className={`absolute h-32 w-32 rounded-full blur-3xl transition-transform duration-300 group-hover:scale-125 ${glow}`}
      />
      <span className="relative text-6xl drop-shadow-lg transition-transform duration-300 group-hover:scale-110">
        {icon}
      </span>
    </Link>
  );

  return (
    <div className="group overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/60 transition-colors hover:border-neutral-700">
      <div className="flex flex-col md:flex-row">
        {media}

        <Link href={href} className="flex flex-1 flex-col p-4 sm:p-5 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wider text-neutral-500">
                {activity.type} · {formatDate(activity.date)}
              </p>
              <h3 className="mt-1 text-lg sm:text-xl font-semibold truncate">{activity.name}</h3>
            </div>
            <span className="mt-0.5 shrink-0 text-neutral-600 transition-all group-hover:translate-x-0.5 group-hover:text-neutral-300">
              →
            </span>
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-4 border-t border-neutral-800/80 pt-4 sm:grid-cols-4">
            <Stat label="Duration" value={hours > 0 ? `${hours}h ${mins}m` : `${mins}m`} />
            {activity.distanceKm > 0 && (
              <Stat label="Distance" value={`${activity.distanceKm.toFixed(1)} km`} />
            )}
            {activity.avgWatts !== null && (
              <Stat label="Avg watts" value={`${activity.avgWatts} W`} />
            )}
            {activity.avgHR !== null && <Stat label="Avg HR" value={`${activity.avgHR} bpm`} />}
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
      <div className="mt-1 text-lg font-semibold tabular-nums text-neutral-100">{value}</div>
    </div>
  );
}
