import { Suspense, cache } from "react";
import Image from "next/image";
import Link from "next/link";
import Calendar from "@/components/Calendar";
import HeaderMenu from "@/components/HeaderMenu";
import RecentActivityCard from "@/components/RecentActivityCard";
import TrainingLoadChart from "@/components/TrainingLoadChart";
import Card from "@/components/garmin/Card";
import HRVStatusCard from "@/components/garmin/HRVStatusCard";
import Last7DaysCard from "@/components/garmin/Last7DaysCard";
import SleepStagesChart from "@/components/garmin/SleepStagesChart";
import StressDonut from "@/components/garmin/StressDonut";
import YesterdayCard from "@/components/garmin/YesterdayCard";
import ZonedGauge from "@/components/garmin/ZonedGauge";
import {
  FloorsIcon,
  HeartIcon,
  HRVIcon,
  PulseOxIcon,
  SleepIcon,
  StressIcon,
} from "@/components/garmin/Icons";
import {
  AtAGlanceSkeleton,
  CalendarSkeleton,
  HeaderSkeleton,
  LatestActivitySkeleton,
  TrainingLoadSkeleton,
  YesterdaySkeleton,
} from "@/components/dashboard/Skeletons";
import { buildHealthSummary, type HealthSummary } from "@/lib/health";
import { getGarminDashboard, type GarminDashboard } from "@/lib/garmin";
import { isGarminConnected } from "@/lib/garminTokens";
import { getTrainingLoadTrend, isIntervalsConfigured, type LoadPoint } from "@/lib/intervals";
import { isConnected } from "@/lib/tokens";
import { daysAgo, formatTrainingDay, parseTrainingDay } from "@/lib/trainingDay";

export const dynamic = "force-dynamic";

const HR_ZONES = [
  { from: 40, color: "#737373" },
  { from: 95, color: "#3b82f6" },
  { from: 115, color: "#22c55e" },
  { from: 140, color: "#f59e0b" },
  { from: 160, color: "#ef4444" },
];

const PULSE_OX_ZONES = [
  { from: 0, color: "#ef4444" },
  { from: 89, color: "#f59e0b" },
  { from: 95, color: "#22c55e" },
];

const getSummary = cache((): Promise<HealthSummary> => buildHealthSummary({ days: 90 }));

const getGarminLinked = cache((): Promise<boolean> => isGarminConnected());

type GarminDashResult =
  | { status: "ok"; data: GarminDashboard }
  | { status: "unlinked" }
  | { status: "error"; message: string };

const getGarminDash = cache(async (): Promise<GarminDashResult> => {
  if (!(await getGarminLinked())) return { status: "unlinked" };
  try {
    const data = await getGarminDashboard();
    return { status: "ok", data };
  } catch (e) {
    return { status: "error", message: (e as Error).message };
  }
});

type TrainingLoadResult =
  | { status: "ok"; points: LoadPoint[] }
  | { status: "unconfigured" }
  | { status: "error"; message: string };

const getTrainingLoad = cache(async (): Promise<TrainingLoadResult> => {
  if (!isIntervalsConfigured()) return { status: "unconfigured" };
  try {
    const points = await getTrainingLoadTrend(90);
    return { status: "ok", points };
  } catch (e) {
    return { status: "error", message: (e as Error).message };
  }
});

function SummaryErrorCard({ error }: { error: string }) {
  return (
    <Card>
      <p className="text-xs text-red-400 break-all">Failed to load summary: {error}</p>
      <Link
        href="/auth/strava"
        className="mt-3 inline-block rounded-lg bg-orange-500 hover:bg-orange-400 transition-colors px-3 py-1.5 text-xs font-medium"
      >
        Reconnect Strava
      </Link>
    </Card>
  );
}

async function HeaderSection() {
  let summary: HealthSummary;
  try {
    summary = await getSummary();
  } catch {
    return (
      <header className="flex items-center justify-between gap-4 rounded-2xl border border-neutral-800/80 bg-gradient-to-br from-neutral-900/80 via-neutral-900/40 to-transparent px-4 py-3 sm:px-5 sm:py-4">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-full bg-neutral-800 ring-2 ring-red-500/40" />
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-semibold truncate leading-tight">Athlete</h1>
            <p className="mt-0.5 text-[11px] sm:text-xs text-red-400">Summary unavailable</p>
          </div>
        </div>
        <HeaderMenu />
      </header>
    );
  }

  return (
    <header className="flex items-center justify-between gap-4 rounded-2xl border border-neutral-800/80 bg-gradient-to-br from-neutral-900/80 via-neutral-900/40 to-transparent px-4 py-3 sm:px-5 sm:py-4">
      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
        {summary.athlete.avatar ? (
          <Image
            src={summary.athlete.avatar}
            alt=""
            width={48}
            height={48}
            className="h-11 w-11 sm:h-12 sm:w-12 rounded-full object-cover ring-2 ring-orange-500/40"
          />
        ) : (
          <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-full bg-neutral-800 ring-2 ring-orange-500/40" />
        )}
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-semibold truncate leading-tight">
            {summary.athlete.name || "Athlete"}
          </h1>
          <p className="mt-0.5 text-[11px] sm:text-xs text-neutral-400 flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="tabular-nums">{summary.thisWeek.activities} this week</span>
            <span className="text-neutral-700">·</span>
            <span className="tabular-nums">
              {Math.floor(summary.thisWeek.totalMinutes / 60)}h {summary.thisWeek.totalMinutes % 60}m
            </span>
            <span className="text-neutral-700">·</span>
            <span className="tabular-nums">Z2 {summary.thisWeek.zone2Pct}%</span>
            <span className="text-neutral-700 hidden sm:inline">·</span>
            <span className="text-neutral-500 hidden sm:inline">
              {new Date(summary.generatedAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </p>
        </div>
      </div>
      <HeaderMenu />
    </header>
  );
}

async function LatestActivitySection() {
  let summary: HealthSummary;
  try {
    summary = await getSummary();
  } catch (e) {
    return <SummaryErrorCard error={(e as Error).message} />;
  }
  const mostRecent = summary.recentActivities[0] ?? null;
  if (!mostRecent) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-2xl font-semibold px-1">Latest Activity</h2>
      <RecentActivityCard activity={mostRecent} />
    </section>
  );
}

async function GarminSections() {
  const [dashRes, summaryRes] = await Promise.all([
    getGarminDash(),
    getSummary().then(
      (s) => ({ ok: true as const, summary: s }),
      (e) => ({ ok: false as const, error: (e as Error).message }),
    ),
  ]);

  if (dashRes.status === "unlinked") {
    return (
      <section>
        <Card>
          <p className="text-sm text-neutral-400">
            Connect Garmin Connect to populate health metrics.{" "}
            <Link href="/auth/garmin" className="text-orange-400 hover:text-orange-300">
              Connect Garmin →
            </Link>
          </p>
        </Card>
      </section>
    );
  }

  if (dashRes.status === "error") {
    return (
      <section>
        <Card>
          <p className="text-xs text-red-400 break-all">{dashRes.message}</p>
        </Card>
      </section>
    );
  }

  const dash = dashRes.data;
  const summary = summaryRes.ok ? summaryRes.summary : null;
  const generatedAt = summary ? new Date(summary.generatedAt) : new Date();
  const yesterdayKey = formatTrainingDay(daysAgo(1, generatedAt));
  const yesterdayActivity =
    summary?.recentActivities.find(
      (a) => a.date.startsWith(yesterdayKey) && a.type.toLowerCase().includes("ride"),
    ) ?? null;

  const sevenDaysAgo = daysAgo(7, generatedAt);
  const last7DaysRides = (summary?.recentActivities ?? []).filter((a) => {
    return parseTrainingDay(a.date) >= sevenDaysAgo && a.type.toLowerCase().includes("ride");
  });
  const last7DaysRideKm = last7DaysRides.reduce((s, a) => s + a.distanceKm, 0);

  return (
    <>
      <section className="space-y-3">
        <h2 className="text-2xl font-semibold px-1">At a Glance</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <Card title="Sleep Score" icon={<SleepIcon />} className="flex flex-col">
            <div className="flex items-baseline gap-3 mb-3">
              <span className="text-4xl font-semibold tabular-nums">
                {dash.sleep.sleepScore ?? "—"}
              </span>
              {dash.sleep.totalHours !== null && (
                <span className="text-xs text-neutral-500">
                  {Math.floor(dash.sleep.totalHours)}h{" "}
                  {Math.round((dash.sleep.totalHours % 1) * 60)}m Duration
                </span>
              )}
            </div>
            <div className="flex-1 min-h-0">
              <SleepStagesChart
                intraday={dash.sleep.intraday}
                startTs={dash.sleep.startTs}
                endTs={dash.sleep.endTs}
              />
            </div>
          </Card>

          <Card
            title="Heart Rate"
            icon={<HeartIcon />}
            meta={
              dash.hr.min !== null && dash.hr.max !== null
                ? `${dash.hr.min}–${dash.hr.max}`
                : undefined
            }
          >
            <ZonedGauge
              value={dash.hr.resting ?? dash.daily.restingHeartRate}
              min={40}
              max={180}
              zones={HR_ZONES}
              unit="bpm Resting"
            />
          </Card>

          <Card
            title="Stress"
            icon={<StressIcon />}
            meta={dash.stress.max !== null ? `max ${dash.stress.max}` : undefined}
          >
            <StressDonut value={dash.stress.avg} />
            <p className="mt-2 text-center text-[11px] text-neutral-500">avg today</p>
          </Card>

          <Card title="Floors" icon={<FloorsIcon />}>
            <ZonedGauge
              value={
                dash.daily.floorsAscended !== null
                  ? Math.round(dash.daily.floorsAscended)
                  : null
              }
              min={0}
              max={Math.max(20, Math.round(dash.daily.floorsAscended ?? 0) + 5)}
              zones={[
                { from: 0, color: "#262626" },
                { from: 1, color: "#22d3ee" },
              ]}
              unit="floors"
            />
          </Card>

          <Card
            title="Pulse Ox"
            icon={<PulseOxIcon />}
            meta={dash.pulseOx.lowest !== null ? `min ${dash.pulseOx.lowest}%` : undefined}
          >
            <ZonedGauge
              value={dash.pulseOx.avg}
              min={80}
              max={100}
              zones={PULSE_OX_ZONES}
              display={dash.pulseOx.avg !== null ? `${dash.pulseOx.avg}%` : "—"}
            />
          </Card>

          <Card title="HRV Status" icon={<HRVIcon />}>
            <HRVStatusCard
              status={dash.hrv.status}
              weeklyAvg={dash.hrv.weeklyAvg}
              lastNightAvg={dash.hrv.lastNightAvg}
              baseline={dash.hrv.baseline}
              history={dash.hrvHistory}
            />
          </Card>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold px-1">Yesterday</h2>
        <div className="grid lg:grid-cols-2 gap-3 sm:gap-4">
          <Card>
            <YesterdayCard
              activity={yesterdayActivity}
              daily={dash.weekDaily[5] ?? dash.daily}
              sleep={dash.weekSleep[5] ?? dash.sleep}
              hrv={dash.hrv}
              pulseOx={dash.weekPulseOx[5] ?? dash.pulseOx}
              bodyBatteryDelta={{
                charged: dash.bodyBattery.charged,
                drained: dash.bodyBattery.drained,
              }}
            />
          </Card>
          <Card title="Last 7 Days">
            <Last7DaysCard
              rollup={dash.weekRollup}
              rideCount={last7DaysRides.length}
              rideDistanceKm={last7DaysRideKm}
            />
          </Card>
        </div>
      </section>
    </>
  );
}

async function TrainingLoadSection() {
  const res = await getTrainingLoad();
  if (res.status === "unconfigured") return null;
  return (
    <section className="space-y-3">
      <h2 className="text-2xl font-semibold px-1">Training Load</h2>
      <Card meta="CTL · ATL · TSB">
        {res.status === "error" ? (
          <p className="text-xs text-red-400">{res.message}</p>
        ) : (
          <TrainingLoadChart points={res.points} />
        )}
      </Card>
    </section>
  );
}

async function CalendarSection() {
  let summary: HealthSummary;
  try {
    summary = await getSummary();
  } catch (e) {
    return <SummaryErrorCard error={(e as Error).message} />;
  }
  return (
    <section className="space-y-3">
      <h2 className="text-2xl font-semibold px-1">Activity Calendar</h2>
      <Card>
        <Calendar activities={summary.recentActivities} />
      </Card>
    </section>
  );
}

export default async function Home() {
  if (!(await isConnected())) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8 bg-black text-neutral-100">
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

  return (
    <main className="min-h-screen bg-black text-neutral-100 p-3 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        <Suspense fallback={<HeaderSkeleton />}>
          <HeaderSection />
        </Suspense>

        <Suspense fallback={<LatestActivitySkeleton />}>
          <LatestActivitySection />
        </Suspense>

        <Suspense fallback={<><AtAGlanceSkeleton /><YesterdaySkeleton /></>}>
          <GarminSections />
        </Suspense>

        <Suspense fallback={<TrainingLoadSkeleton />}>
          <TrainingLoadSection />
        </Suspense>

        <Suspense fallback={<CalendarSkeleton />}>
          <CalendarSection />
        </Suspense>
      </div>
    </main>
  );
}
