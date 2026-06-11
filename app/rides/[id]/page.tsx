import Link from "next/link";
import { notFound } from "next/navigation";
import ZoneBreakdown from "@/components/ZoneBreakdown";
import PhotoGallery from "@/components/rides/PhotoGallery";
import PowerCurve from "@/components/rides/PowerCurve";
import RideMap from "@/components/rides/RideMap";
import { isIntervalsConfigured } from "@/lib/intervals";
import { getRideDetail } from "@/lib/rides";
import "maplibre-gl/dist/maplibre-gl.css";

export const dynamic = "force-dynamic";

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

const PLATFORM_LABEL: Record<string, string> = {
  zwift: "Zwift",
  mywhoosh: "MyWhoosh",
  other: "Virtual",
};

function rideTypeLabel(type: string, platform: string | null): string {
  if (platform && PLATFORM_LABEL[platform]) {
    return `${PLATFORM_LABEL[platform]} ride`;
  }
  return type;
}

function formatRideDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function Stat({
  label,
  value,
  unit,
}: {
  label: string;
  value: string | number | null;
  unit?: string;
}) {
  return (
    <div className="rounded-xl bg-neutral-900 border border-neutral-800 p-3">
      <div className="text-[11px] uppercase tracking-wider text-neutral-500">{label}</div>
      <div className="mt-1 text-xl font-semibold tabular-nums">
        {value ?? "—"}
        {value !== null && unit && (
          <span className="ml-1 text-sm font-normal text-neutral-500">{unit}</span>
        )}
      </div>
    </div>
  );
}

export default async function RidePage({ params }: { params: Promise<{ id: string }> }) {
  if (!isIntervalsConfigured()) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8 bg-black text-neutral-100">
        <div className="max-w-md text-center space-y-6">
          <h1 className="text-2xl font-semibold">intervals.icu not configured</h1>
          <p className="text-sm text-neutral-400">
            Set INTERVALS_ICU_API_KEY and INTERVALS_ICU_ATHLETE_ID to load rides.
          </p>
        </div>
      </main>
    );
  }

  const { id } = await params;
  if (!/^i?\d+$/.test(id)) notFound();

  let ride;
  try {
    ride = await getRideDetail(id);
  } catch (e) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8 bg-black text-neutral-100">
        <div className="max-w-lg text-center space-y-4">
          <h1 className="text-2xl font-semibold">Failed to load ride</h1>
          <pre className="text-xs text-red-400 whitespace-pre-wrap">{(e as Error).message}</pre>
          <Link
            href="/"
            className="inline-block rounded-lg bg-orange-500 hover:bg-orange-400 transition-colors px-4 py-2 text-sm"
          >
            Dashboard
          </Link>
        </div>
      </main>
    );
  }

  const hours = Math.floor(ride.durationMin / 60);
  const mins = ride.durationMin % 60;

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 p-3 sm:p-10">
      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-800/80 bg-gradient-to-br from-neutral-900/80 via-neutral-900/40 to-transparent px-4 py-3 sm:px-5 sm:py-4">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-neutral-800 text-2xl ring-2 ring-orange-500/40">
              {TYPE_ICONS[ride.type] ?? "•"}
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-semibold truncate leading-tight">
                {ride.name}
              </h1>
              <p className="mt-0.5 text-[11px] sm:text-xs text-neutral-400 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span>{rideTypeLabel(ride.type, ride.platform)}</span>
                <span className="text-neutral-700">·</span>
                <span>{formatRideDate(ride.date)}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {ride.stravaId !== null && (
              <a
                href={`https://www.strava.com/activities/${ride.stravaId}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-neutral-800 bg-neutral-900/60 px-3 py-1.5 text-xs text-neutral-300 hover:bg-neutral-800 hover:text-neutral-100 transition"
              >
                Open in Strava
              </a>
            )}
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-full border border-neutral-800 bg-neutral-900/60 px-3 py-1.5 text-xs text-neutral-300 hover:bg-neutral-800 hover:text-neutral-100 transition"
            >
              Dashboard
            </Link>
          </div>
        </header>

        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Duration" value={`${hours}h ${mins}m`} />
          <Stat label="Distance" value={ride.distanceKm.toFixed(1)} unit="km" />
          <Stat label="Elevation" value={ride.elevationGainM} unit="m" />
          <Stat label="kJ" value={ride.kilojoules} />
          <Stat label="Avg watts" value={ride.avgWatts} unit="W" />
          <Stat label="NP" value={ride.weightedAvgWatts} unit="W" />
          <Stat label="Avg HR" value={ride.avgHR} unit="bpm" />
          <Stat label="Max HR" value={ride.maxHR} unit="bpm" />
        </section>

        {ride.intervals && (
          <section className="rounded-xl bg-neutral-900 border border-neutral-800 p-3 sm:p-5">
            <div className="flex items-baseline justify-between mb-3">
              <h3 className="text-sm uppercase tracking-wider text-neutral-500">intervals.icu</h3>
              <a
                href={`https://intervals.icu/activities/${ride.id}`}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-neutral-500 hover:text-neutral-300"
              >
                Open ↗
              </a>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Stat label="Load" value={ride.intervals.load} />
              <Stat
                label="Intensity"
                value={ride.intervals.intensity != null ? ride.intervals.intensity.toFixed(2) : null}
              />
              <Stat
                label="EF"
                value={
                  ride.intervals.efficiencyFactor != null
                    ? ride.intervals.efficiencyFactor.toFixed(2)
                    : null
                }
              />
              <Stat
                label="Decoupling"
                value={
                  ride.intervals.decoupling != null ? ride.intervals.decoupling.toFixed(1) : null
                }
                unit="%"
              />
              <Stat
                label="VI"
                value={
                  ride.intervals.variabilityIndex != null
                    ? ride.intervals.variabilityIndex.toFixed(2)
                    : null
                }
              />
              <Stat label="eFTP" value={ride.intervals.eftp} unit="W" />
              <Stat label="FTP" value={ride.intervals.ftpAt} unit="W" />
              <Stat label="Recovery" value={ride.intervals.recoveryTime} unit="h" />
            </div>
          </section>
        )}

        <section className="rounded-xl bg-neutral-900 border border-neutral-800 p-3 sm:p-5">
          <div className="flex items-baseline justify-between mb-3">
            <h3 className="text-sm uppercase tracking-wider text-neutral-500">Route</h3>
            <span className="text-[11px] text-neutral-500">
              {ride.polyline.length > 0 ? `${ride.polyline.length} points` : ""}
            </span>
          </div>
          <RideMap coords={ride.polyline} type={ride.type} platform={ride.platform} />
        </section>

        <section className="grid lg:grid-cols-2 gap-4">
          <div className="rounded-xl bg-neutral-900 border border-neutral-800 p-3 sm:p-5">
            <div className="flex items-baseline justify-between mb-3">
              <h3 className="text-sm uppercase tracking-wider text-neutral-500">Power curve</h3>
              <span className="text-[11px] text-neutral-500">max avg by duration</span>
            </div>
            <PowerCurve points={ride.powerCurve} />
          </div>
          <div className="rounded-xl bg-neutral-900 border border-neutral-800 p-3 sm:p-5">
            <div className="flex items-baseline justify-between mb-3">
              <h3 className="text-sm uppercase tracking-wider text-neutral-500">HR zones</h3>
              <span className="text-[11px] text-neutral-500">time in zone</span>
            </div>
            <ZoneBreakdown zones={ride.zones} />
          </div>
        </section>

        {ride.photos.length > 0 && (
          <section className="rounded-xl bg-neutral-900 border border-neutral-800 p-3 sm:p-5">
            <div className="flex items-baseline justify-between mb-3">
              <h3 className="text-sm uppercase tracking-wider text-neutral-500">Media</h3>
              <span className="text-[11px] text-neutral-500">{ride.photos.length}</span>
            </div>
            <PhotoGallery photos={ride.photos} />
          </section>
        )}
      </div>
    </main>
  );
}
