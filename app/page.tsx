import Link from "next/link";
import Calendar from "@/components/Calendar";
import StatCard from "@/components/StatCard";
import TrainingLoadChart from "@/components/TrainingLoadChart";
import WellnessStrip from "@/components/WellnessStrip";
import Gauge from "@/components/garmin/Gauge";
import SleepStagesBar from "@/components/garmin/SleepStagesBar";
import { buildHealthSummary } from "@/lib/health";
import {
  getGarminDashboard,
  getGarminWeekSummary,
  type GarminDailySummary,
  type GarminDashboard,
} from "@/lib/garmin";
import { isGarminConnected } from "@/lib/garminTokens";
import { getTrainingLoadTrend, isIntervalsConfigured, type LoadPoint } from "@/lib/intervals";
import { isConnected } from "@/lib/tokens";

export const dynamic = "force-dynamic";

function hrvColor(status: string | null): string {
  switch (status) {
    case "BALANCED":
      return "#22c55e";
    case "UNBALANCED":
      return "#eab308";
    case "LOW":
    case "POOR":
      return "#ef4444";
    default:
      return "#737373";
  }
}

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
  let garminDash: GarminDashboard | null = null;
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

  garminLinked = await isGarminConnected();
  const [intervalsRes, garminRes, garminDashRes] = await Promise.allSettled([
    isIntervalsConfigured() ? getTrainingLoadTrend(90) : Promise.resolve([] as LoadPoint[]),
    garminLinked ? getGarminWeekSummary() : Promise.resolve([] as GarminDailySummary[]),
    garminLinked ? getGarminDashboard() : Promise.resolve(null as GarminDashboard | null),
  ]);
  if (intervalsRes.status === "fulfilled") trainingLoad = intervalsRes.value;
  else intervalsError = (intervalsRes.reason as Error).message;
  if (garminRes.status === "fulfilled") garminWeek = garminRes.value;
  else garminError = (garminRes.reason as Error).message;
  if (garminDashRes.status === "fulfilled") garminDash = garminDashRes.value;

  const trendLabel: Record<string, string> = {
    improving: "↓ Improving",
    stable: "→ Stable",
    declining: "↑ Declining",
    insufficient_data: "— Need more data",
  };

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 p-3 sm:p-10">
      <div className="max-w-6xl mx-auto space-y-5 sm:space-y-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-semibold truncate">
              {summary.athlete.name || "Athlete"}
            </h1>
            <p className="text-neutral-500 text-xs sm:text-sm">
              Last updated {new Date(summary.generatedAt).toLocaleTimeString()}
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
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
          <section className="rounded-xl bg-neutral-900 border border-neutral-800 p-3 sm:p-5">
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

        <section className="rounded-xl bg-neutral-900 border border-neutral-800 p-3 sm:p-5">
          <div className="flex items-baseline justify-between gap-2 mb-3">
            <h2 className="text-base sm:text-lg font-semibold whitespace-nowrap">
              Garmin · 7d
            </h2>
            {garminLinked ? (
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
                <Link
                  href="/garmin"
                  className="text-xs text-orange-400 hover:text-orange-300"
                >
                  Full dashboard →
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

        {garminLinked && garminDash && (
          <section className="grid lg:grid-cols-2 gap-4">
            <div className="rounded-xl bg-neutral-900 border border-neutral-800 p-3 sm:p-5">
              <div className="flex items-baseline justify-between mb-3">
                <h2 className="text-base sm:text-lg font-semibold">Last night sleep</h2>
                <span className="text-[11px] text-neutral-500">
                  {garminDash.sleep.sleepScore !== null
                    ? `score ${garminDash.sleep.sleepScore}`
                    : ""}
                </span>
              </div>
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-3xl font-semibold">
                  {garminDash.sleep.totalHours !== null
                    ? `${garminDash.sleep.totalHours}h`
                    : "—"}
                </span>
                {garminDash.sleep.avgSleepHR !== null && (
                  <span className="text-sm text-neutral-500">
                    avg HR {garminDash.sleep.avgSleepHR}bpm
                  </span>
                )}
              </div>
              <SleepStagesBar stages={garminDash.sleep} />
            </div>

            <div className="rounded-xl bg-neutral-900 border border-neutral-800 p-3 sm:p-5">
              <div className="flex items-baseline justify-between mb-3">
                <h2 className="text-base sm:text-lg font-semibold">HRV status</h2>
                <span className="text-[11px] text-neutral-500">
                  {garminDash.hrv.weeklyAvg !== null
                    ? `wk avg ${garminDash.hrv.weeklyAvg} ms`
                    : ""}
                </span>
              </div>
              <Gauge
                value={garminDash.hrv.lastNightAvg}
                max={Math.max(120, (garminDash.hrv.baseline.balancedUpper ?? 80) + 20)}
                label={garminDash.hrv.status ?? "—"}
                color={hrvColor(garminDash.hrv.status)}
              />
              <dl className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-neutral-400">
                <div>
                  Last night ·{" "}
                  <span className="text-neutral-200">
                    {garminDash.hrv.lastNightAvg ?? "—"} ms
                  </span>
                </div>
                <div>
                  Weekly avg ·{" "}
                  <span className="text-neutral-200">
                    {garminDash.hrv.weeklyAvg ?? "—"} ms
                  </span>
                </div>
                <div>
                  Balanced low ·{" "}
                  <span className="text-neutral-200">
                    {garminDash.hrv.baseline.balancedLow ?? "—"}
                  </span>
                </div>
                <div>
                  Balanced high ·{" "}
                  <span className="text-neutral-200">
                    {garminDash.hrv.baseline.balancedUpper ?? "—"}
                  </span>
                </div>
              </dl>
            </div>
          </section>
        )}

        <section className="rounded-xl bg-neutral-900 border border-neutral-800 p-3 sm:p-5">
          <h2 className="text-lg font-semibold mb-3">Activity calendar</h2>
          <Calendar activities={summary.recentActivities} />
        </section>

      </div>
    </main>
  );
}
