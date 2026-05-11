import Link from "next/link";
import ZwiftHRAtPowerTrend from "@/components/zwift/ZwiftHRAtPowerTrend";
import ZwiftRidesTable from "@/components/zwift/ZwiftRidesTable";
import ZwiftWattsTrend from "@/components/zwift/ZwiftWattsTrend";
import ZwiftWeeklyChart from "@/components/zwift/ZwiftWeeklyChart";
import { isConnected } from "@/lib/tokens";
import { buildZwiftSummary } from "@/lib/zwift";

export const dynamic = "force-dynamic";

export default async function ZwiftPage() {
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

  let zwift;
  try {
    zwift = await buildZwiftSummary({ days: 90 });
  } catch (e) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8 bg-black text-neutral-100">
        <div className="max-w-lg text-center space-y-4">
          <h1 className="text-2xl font-semibold">Failed to load Zwift data</h1>
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

  const { rides, weekly, wattsTrend, hrAtPower, totals, targetWatts, generatedAt } = zwift;

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 p-3 sm:p-10">
      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-semibold truncate">Zwift · 90 days</h1>
            <p className="text-neutral-500 text-xs sm:text-sm">
              Strava VirtualRide activities · updated{" "}
              {new Date(generatedAt).toLocaleTimeString()}
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-full border border-neutral-800 bg-neutral-900/60 px-3 py-1.5 text-xs text-neutral-300 hover:bg-neutral-800 hover:text-neutral-100 transition"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
              <path
                d="M7.5 2.5 4 6l3.5 3.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Dashboard
          </Link>
        </header>

        <section className="grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-neutral-900 border border-neutral-800 p-3 sm:p-4">
            <div className="text-[11px] uppercase tracking-wider text-neutral-500">Rides</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">{totals.rides}</div>
          </div>
          <div className="rounded-xl bg-neutral-900 border border-neutral-800 p-3 sm:p-4">
            <div className="text-[11px] uppercase tracking-wider text-neutral-500">Time</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">
              {Math.floor(totals.totalMin / 60)}h {totals.totalMin % 60}m
            </div>
          </div>
          <div className="rounded-xl bg-neutral-900 border border-neutral-800 p-3 sm:p-4">
            <div className="text-[11px] uppercase tracking-wider text-neutral-500">Distance</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">
              {totals.km.toFixed(1)}
              <span className="ml-1 text-sm font-normal text-neutral-500">km</span>
            </div>
          </div>
        </section>

        <section className="rounded-xl bg-neutral-900 border border-neutral-800 p-3 sm:p-5">
          <div className="flex items-baseline justify-between mb-3">
            <h3 className="text-sm uppercase tracking-wider text-neutral-500">Weekly volume</h3>
            <span className="text-[11px] text-neutral-500">minutes + km</span>
          </div>
          <ZwiftWeeklyChart data={weekly} />
        </section>

        <section className="grid lg:grid-cols-2 gap-4">
          <div className="rounded-xl bg-neutral-900 border border-neutral-800 p-3 sm:p-5">
            <div className="flex items-baseline justify-between mb-3">
              <h3 className="text-sm uppercase tracking-wider text-neutral-500">Avg watts / ride</h3>
              <span className="text-[11px] text-neutral-500">whole-ride avg</span>
            </div>
            <ZwiftWattsTrend data={wattsTrend} />
          </div>
          <div className="rounded-xl bg-neutral-900 border border-neutral-800 p-3 sm:p-5">
            <div className="flex items-baseline justify-between mb-3">
              <h3 className="text-sm uppercase tracking-wider text-neutral-500">
                HR @ {targetWatts}W
              </h3>
              <span className="text-[11px] text-neutral-500">trend ↓ = aerobic gains</span>
            </div>
            <ZwiftHRAtPowerTrend points={hrAtPower} watts={targetWatts} />
          </div>
        </section>

        <section className="rounded-xl bg-neutral-900 border border-neutral-800 p-3 sm:p-5">
          <div className="flex items-baseline justify-between mb-3">
            <h3 className="text-sm uppercase tracking-wider text-neutral-500">Recent rides</h3>
            <span className="text-[11px] text-neutral-500">{rides.length} total</span>
          </div>
          <ZwiftRidesTable rides={rides} />
        </section>
      </div>
    </main>
  );
}
