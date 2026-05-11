import Link from "next/link";
import { notFound } from "next/navigation";
import ZoneBreakdown from "@/components/ZoneBreakdown";
import PhotoGallery from "@/components/rides/PhotoGallery";
import PowerCurve from "@/components/rides/PowerCurve";
import RideMap from "@/components/rides/RideMap";
import { getRideDetail } from "@/lib/rides";
import { isConnected } from "@/lib/tokens";

export const dynamic = "force-dynamic";

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
  if (!(await isConnected())) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8 bg-black text-neutral-100">
        <div className="max-w-md text-center space-y-6">
          <h1 className="text-2xl font-semibold">Strava not connected</h1>
          <Link
            href="/auth/strava"
            className="inline-block rounded-lg bg-orange-500 hover:bg-orange-400 transition-colors px-6 py-3 font-medium"
          >
            Connect Strava
          </Link>
        </div>
      </main>
    );
  }

  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (!Number.isFinite(id)) notFound();

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
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-semibold truncate">{ride.name}</h1>
            <p className="text-neutral-500 text-xs sm:text-sm">
              {ride.type} · {ride.date.slice(0, 10)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`https://www.strava.com/activities/${ride.id}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-neutral-800 bg-neutral-900/60 px-3 py-1.5 text-xs text-neutral-300 hover:bg-neutral-800 hover:text-neutral-100 transition"
            >
              Open in Strava
            </a>
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

        <section className="rounded-xl bg-neutral-900 border border-neutral-800 p-3 sm:p-5">
          <div className="flex items-baseline justify-between mb-3">
            <h3 className="text-sm uppercase tracking-wider text-neutral-500">Route</h3>
            <span className="text-[11px] text-neutral-500">
              {ride.polyline.length > 0 ? `${ride.polyline.length} points` : ""}
            </span>
          </div>
          <RideMap coords={ride.polyline} />
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

        <section className="rounded-xl bg-neutral-900 border border-neutral-800 p-3 sm:p-5">
          <div className="flex items-baseline justify-between mb-3">
            <h3 className="text-sm uppercase tracking-wider text-neutral-500">Photos</h3>
            <span className="text-[11px] text-neutral-500">{ride.photos.length}</span>
          </div>
          <PhotoGallery photos={ride.photos} />
        </section>
      </div>
    </main>
  );
}
