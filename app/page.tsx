import Link from "next/link";
import Calendar from "@/components/Calendar";
import StatCard from "@/components/StatCard";
import TrainingLoadChart from "@/components/TrainingLoadChart";
import WellnessStrip from "@/components/WellnessStrip";
import { buildHealthSummary } from "@/lib/health";
import { getGarminWeekSummary, type GarminDailySummary } from "@/lib/garmin";
import { isGarminConnected } from "@/lib/garminTokens";
import { getTrainingLoadTrend, isIntervalsConfigured, type LoadPoint } from "@/lib/intervals";
import { isConnected } from "@/lib/tokens";

export const dynamic = "force-dynamic";

export default async function Home() {
  if (!(await isConnected())) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8 bg-neutral-950 text-neutral-100">
        <div className="max-w-md text-center space-y-6">
          <h1 className="text-3xl font-semibold">Fitness Dashboard</h1>
          <p className="text-neutral-400">
            Connect your Strava account to see your activity history, HR trends, and zone analytics.
          </p>
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

  let summary;
  let trainingLoad: LoadPoint[] = [];
  let intervalsError: string | null = null;
  let garminWeek: GarminDailySummary[] = [];
  let garminLinked = false;
  let garminError: string | null = null;

  try {
    summary = await buildHealthSummary({ days: 90 });
  } catch (e) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8 bg-neutral-950 text-neutral-100">
        <div className="max-w-lg text-center space-y-4">
          <h1 className="text-2xl font-semibold">Failed to load data</h1>
          <pre className="text-xs text-red-400 whitespace-pre-wrap">{(e as Error).message}</pre>
          <Link
            href="/auth/strava"
            className="inline-block rounded-lg bg-orange-500 hover:bg-orange-400 transition-colors px-4 py-2 text-sm"
          >
            Reconnect Strava
          </Link>
        </div>
      </main>
    );
  }

  if (isIntervalsConfigured()) {
    try {
      trainingLoad = await getTrainingLoadTrend(90);
    } catch (e) {
      intervalsError = (e as Error).message;
    }
  }

  garminLinked = await isGarminConnected();
  if (garminLinked) {
    try {
      garminWeek = await getGarminWeekSummary();
    } catch (e) {
      garminError = (e as Error).message;
    }
  }

  const trendLabel: Record<string, string> = {
    improving: "↓ Improving",
    stable: "→ Stable",
    declining: "↑ Declining",
    insufficient_data: "— Need more data",
  };

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 p-6 sm:p-10">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">{summary.athlete.name || "Athlete"}</h1>
            <p className="text-neutral-500 text-sm">
              Last updated {new Date(summary.generatedAt).toLocaleTimeString()}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`text-sm font-medium px-3 py-1 rounded-full ${
                summary.fitnessScore === "improving"
                  ? "bg-green-500/10 text-green-400"
                  : summary.fitnessScore === "declining"
                  ? "bg-red-500/10 text-red-400"
                  : "bg-neutral-800 text-neutral-300"
              }`}
            >
              {trendLabel[summary.fitnessScore]}
            </span>
            <form action="/api/cache/clear" method="POST">
              <button
                type="submit"
                title="Clear cached summaries (15-min TTL)"
                className="text-xs text-neutral-500 hover:text-neutral-300 px-2 py-1"
              >
                Refresh
              </button>
            </form>
            <form action="/api/logout" method="POST">
              <button
                type="submit"
                className="text-xs text-neutral-500 hover:text-neutral-300 px-2 py-1"
              >
                Sign out
              </button>
            </form>
          </div>
        </header>

        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            label="This week"
            value={summary.thisWeek.activities}
            hint={`activities · ${summary.thisWeek.rides} rides`}
          />
          <StatCard label="Total min" value={summary.thisWeek.totalMinutes} hint="this week" />
          <StatCard label="Zone 2 min" value={summary.thisWeek.zone2Minutes} hint="this week" />
          <StatCard
            label="Z2 share"
            value={`${summary.thisWeek.zone2Pct}%`}
            hint="of weekly time"
          />
        </section>

        {isIntervalsConfigured() && (
          <section className="rounded-xl bg-neutral-900 border border-neutral-800 p-5">
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-lg font-semibold">Training load (intervals.icu)</h2>
              <p className="text-xs text-neutral-500">CTL · ATL · TSB</p>
            </div>
            {intervalsError ? (
              <p className="text-xs text-red-400">{intervalsError}</p>
            ) : (
              <TrainingLoadChart points={trainingLoad} />
            )}
          </section>
        )}

        <section className="rounded-xl bg-neutral-900 border border-neutral-800 p-5">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-lg font-semibold">Garmin wellness · last 7 days</h2>
            {garminLinked ? (
              <div className="flex items-center gap-3">
                <Link
                  href="/garmin"
                  className="text-xs text-orange-400 hover:text-orange-300"
                >
                  Full Garmin dashboard →
                </Link>
                <form action="/api/garmin/logout" method="POST">
                  <button
                    type="submit"
                    className="text-[11px] text-neutral-500 hover:text-neutral-300"
                  >
                    Disconnect
                  </button>
                </form>
              </div>
            ) : (
              <Link
                href="/auth/garmin"
                className="text-xs text-orange-400 hover:text-orange-300"
              >
                Connect Garmin →
              </Link>
            )}
          </div>
          {!garminLinked ? (
            <p className="text-sm text-neutral-500">
              Connect Garmin Connect to see daily steps, sleep, and resting HR.
            </p>
          ) : garminError ? (
            <p className="text-xs text-red-400 break-all">{garminError}</p>
          ) : (
            <WellnessStrip days={garminWeek} />
          )}
        </section>

        <section className="rounded-xl bg-neutral-900 border border-neutral-800 p-5">
          <h2 className="text-lg font-semibold mb-3">Activity calendar</h2>
          <Calendar activities={summary.recentActivities} />
        </section>

      </div>
    </main>
  );
}
