import { Suspense, cache } from "react";
import nextDynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import HeaderMenu from "@/components/HeaderMenu";
import RecentActivityCard from "@/components/RecentActivityCard";
import Card from "@/components/garmin/Card";

const Calendar = nextDynamic(() => import("@/components/Calendar"));
const TrainingLoadChart = nextDynamic(() => import("@/components/TrainingLoadChart"));
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
import {
  buildHealthSummary,
  getLatestDayActivities,
  type ActivitySummary,
  type HealthSummary,
} from "@/lib/health";
import {
  getDailyTile,
  getHRTile,
  getHRVTile,
  getPulseOxTile,
  getSleepTile,
  getStressTile,
  getYesterdaySection,
} from "@/lib/garmin";
import { isGarminConnected } from "@/lib/garminTokens";
import { getTrainingLoadTrend, isIntervalsConfigured, type LoadPoint } from "@/lib/intervals";
import { isConnected } from "@/lib/tokens";
import { daysAgo, formatTrainingDay, parseTrainingDay, today } from "@/lib/trainingDay";

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
            priority
            fetchPriority="high"
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
  let activities: ActivitySummary[];
  try {
    activities = await getLatestDayActivities();
  } catch (e) {
    return <SummaryErrorCard error={(e as Error).message} />;
  }
  if (activities.length === 0) return null;
  const isToday = activities[0].date.slice(0, 10) === formatTrainingDay(today());
  const heading = isToday
    ? activities.length > 1
      ? "Today's Workouts"
      : "Today's Workout"
    : "Latest Activity";
  return (
    <section className="space-y-3">
      <h2 className="text-2xl font-semibold px-1">{heading}</h2>
      <div className="grid auto-rows-fr gap-3 sm:gap-4">
        {activities.map((activity) => (
          <RecentActivityCard key={activity.id} activity={activity} />
        ))}
      </div>
    </section>
  );
}

function TileSkeleton({ label }: { label?: string }) {
  return (
    <Card title={label}>
      <div className="space-y-3">
        <div className="h-4 w-24 animate-pulse rounded-md bg-neutral-800" />
        <div className="h-24 w-full animate-pulse rounded-md bg-neutral-800" />
      </div>
    </Card>
  );
}

function TileError({ title, message }: { title: string; message: string }) {
  return (
    <Card title={title}>
      <p className="text-xs text-red-400 break-all">{message}</p>
    </Card>
  );
}

async function SleepTile() {
  let sleep;
  try {
    sleep = await getSleepTile();
  } catch (e) {
    return <TileError title="Sleep Score" message={(e as Error).message} />;
  }
  return (
    <Card title="Sleep Score" icon={<SleepIcon />} className="flex flex-col">
      <div className="flex items-baseline gap-3 mb-3">
        <span className="text-4xl font-semibold tabular-nums">{sleep.sleepScore ?? "—"}</span>
        {sleep.totalHours !== null && (
          <span className="text-xs text-neutral-500">
            {Math.floor(sleep.totalHours)}h {Math.round((sleep.totalHours % 1) * 60)}m Duration
          </span>
        )}
      </div>
      <div className="flex-1 min-h-0">
        <SleepStagesChart intraday={sleep.intraday} startTs={sleep.startTs} endTs={sleep.endTs} />
      </div>
    </Card>
  );
}

async function HRTile() {
  let hr;
  try {
    hr = await getHRTile();
  } catch (e) {
    return <TileError title="Heart Rate" message={(e as Error).message} />;
  }
  return (
    <Card
      title="Heart Rate"
      icon={<HeartIcon />}
      meta={hr.min !== null && hr.max !== null ? `${hr.min}–${hr.max}` : undefined}
    >
      <ZonedGauge value={hr.resting} min={40} max={180} zones={HR_ZONES} unit="bpm Resting" />
    </Card>
  );
}

async function StressTile() {
  let stress;
  try {
    stress = await getStressTile();
  } catch (e) {
    return <TileError title="Stress" message={(e as Error).message} />;
  }
  return (
    <Card
      title="Stress"
      icon={<StressIcon />}
      meta={stress.max !== null ? `max ${stress.max}` : undefined}
    >
      <StressDonut value={stress.avg} />
      <p className="mt-2 text-center text-[11px] text-neutral-500">avg today</p>
    </Card>
  );
}

async function FloorsTile() {
  let daily;
  try {
    daily = await getDailyTile();
  } catch (e) {
    return <TileError title="Floors" message={(e as Error).message} />;
  }
  return (
    <Card title="Floors" icon={<FloorsIcon />}>
      <ZonedGauge
        value={daily.floorsAscended !== null ? Math.round(daily.floorsAscended) : null}
        min={0}
        max={Math.max(20, Math.round(daily.floorsAscended ?? 0) + 5)}
        zones={[
          { from: 0, color: "#262626" },
          { from: 1, color: "#22d3ee" },
        ]}
        unit="floors"
      />
    </Card>
  );
}

async function PulseOxTile() {
  let pulseOx;
  try {
    pulseOx = await getPulseOxTile();
  } catch (e) {
    return <TileError title="Pulse Ox" message={(e as Error).message} />;
  }
  return (
    <Card
      title="Pulse Ox"
      icon={<PulseOxIcon />}
      meta={pulseOx.lowest !== null ? `min ${pulseOx.lowest}%` : undefined}
    >
      <ZonedGauge
        value={pulseOx.avg}
        min={80}
        max={100}
        zones={PULSE_OX_ZONES}
        display={pulseOx.avg !== null ? `${pulseOx.avg}%` : "—"}
      />
    </Card>
  );
}

async function HRVTile() {
  let hrv;
  let history;
  try {
    const tile = await getHRVTile();
    hrv = tile.hrv;
    history = tile.history;
  } catch (e) {
    return <TileError title="HRV Status" message={(e as Error).message} />;
  }
  return (
    <Card title="HRV Status" icon={<HRVIcon />}>
      <HRVStatusCard
        status={hrv.status}
        weeklyAvg={hrv.weeklyAvg}
        lastNightAvg={hrv.lastNightAvg}
        baseline={hrv.baseline}
        history={history}
      />
    </Card>
  );
}

async function AtAGlanceSection() {
  const linked = await getGarminLinked();
  if (!linked) {
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
  return (
    <section
      className="space-y-3"
      style={{ contentVisibility: "auto", containIntrinsicSize: "auto 600px" }}
    >
      <h2 className="text-2xl font-semibold px-1">At a Glance</h2>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <Suspense fallback={<TileSkeleton label="Sleep Score" />}>
          <SleepTile />
        </Suspense>
        <Suspense fallback={<TileSkeleton label="Heart Rate" />}>
          <HRTile />
        </Suspense>
        <Suspense fallback={<TileSkeleton label="Stress" />}>
          <StressTile />
        </Suspense>
        <Suspense fallback={<TileSkeleton label="Floors" />}>
          <FloorsTile />
        </Suspense>
        <Suspense fallback={<TileSkeleton label="Pulse Ox" />}>
          <PulseOxTile />
        </Suspense>
        <Suspense fallback={<TileSkeleton label="HRV Status" />}>
          <HRVTile />
        </Suspense>
      </div>
    </section>
  );
}

async function YesterdaySectionComponent() {
  const linked = await getGarminLinked();
  if (!linked) return null;

  let summary: HealthSummary | null = null;
  try {
    summary = await getSummary();
  } catch {
    summary = null;
  }

  let data;
  try {
    data = await getYesterdaySection();
  } catch (e) {
    return (
      <section>
        <Card>
          <p className="text-xs text-red-400 break-all">{(e as Error).message}</p>
        </Card>
      </section>
    );
  }

  const generatedAt = summary ? new Date(summary.generatedAt) : new Date();
  const sevenDaysAgo = daysAgo(7, generatedAt);
  const last7DaysRides = (summary?.recentActivities ?? []).filter(
    (a) => parseTrainingDay(a.date) >= sevenDaysAgo && a.type.toLowerCase().includes("ride"),
  );
  const last7DaysRideKm = last7DaysRides.reduce((s, a) => s + a.distanceKm, 0);

  const yesterdayKey = (() => {
    const d = daysAgo(1, generatedAt);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();
  const yesterdayActivity =
    summary?.recentActivities.find(
      (a) => a.date.startsWith(yesterdayKey) && a.type.toLowerCase().includes("ride"),
    ) ?? null;

  return (
    <section
      className="space-y-3"
      style={{ contentVisibility: "auto", containIntrinsicSize: "auto 500px" }}
    >
      <h2 className="text-2xl font-semibold px-1">Yesterday</h2>
      <div className="grid lg:grid-cols-2 gap-3 sm:gap-4">
        <Card>
          <YesterdayCard
            activity={yesterdayActivity}
            daily={data.daily}
            sleep={data.sleep}
            hrv={data.hrv}
            pulseOx={data.pulseOx}
            bodyBatteryDelta={data.bodyBatteryDelta}
          />
        </Card>
        <Card title="Last 7 Days">
          <Last7DaysCard
            rollup={data.weekRollup}
            rideCount={last7DaysRides.length}
            rideDistanceKm={last7DaysRideKm}
          />
        </Card>
      </div>
    </section>
  );
}

async function TrainingLoadSection() {
  const res = await getTrainingLoad();
  if (res.status === "unconfigured") return null;
  return (
    <section
      className="space-y-3"
      style={{ contentVisibility: "auto", containIntrinsicSize: "auto 340px" }}
    >
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
    <section
      className="space-y-3"
      style={{ contentVisibility: "auto", containIntrinsicSize: "auto 500px" }}
    >
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

        <Suspense fallback={<AtAGlanceSkeleton />}>
          <AtAGlanceSection />
        </Suspense>

        <Suspense fallback={<YesterdaySkeleton />}>
          <YesterdaySectionComponent />
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
