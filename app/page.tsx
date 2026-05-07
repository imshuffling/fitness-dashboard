import Link from "next/link";
import Calendar from "@/components/Calendar";
import TrainingLoadChart from "@/components/TrainingLoadChart";
import BodyBatteryHero from "@/components/garmin/BodyBatteryHero";
import Card from "@/components/garmin/Card";
import HRVStatusCard from "@/components/garmin/HRVStatusCard";
import Last7DaysCard from "@/components/garmin/Last7DaysCard";
import SleepStagesChart from "@/components/garmin/SleepStagesChart";
import StressDonut from "@/components/garmin/StressDonut";
import YesterdayCard from "@/components/garmin/YesterdayCard";
import ZonedGauge from "@/components/garmin/ZonedGauge";
import {
  BodyBatteryIcon,
  FloorsIcon,
  HeartIcon,
  HRVIcon,
  PulseOxIcon,
  SleepIcon,
  StressIcon,
} from "@/components/garmin/Icons";
import { buildHealthSummary } from "@/lib/health";
import { getGarminDashboard, type GarminDashboard } from "@/lib/garmin";
import { isGarminConnected } from "@/lib/garminTokens";
import { getTrainingLoadTrend, isIntervalsConfigured, type LoadPoint } from "@/lib/intervals";
import { isConnected } from "@/lib/tokens";

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

  let summary;
  let trainingLoad: LoadPoint[] = [];
  let intervalsError: string | null = null;
  let garminDash: GarminDashboard | null = null;
  let garminLinked = false;
  let garminError: string | null = null;

  try {
    summary = await buildHealthSummary({ days: 90 });
  } catch (e) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8 bg-black text-neutral-100">
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
  const [intervalsRes, garminDashRes] = await Promise.allSettled([
    isIntervalsConfigured() ? getTrainingLoadTrend(90) : Promise.resolve([] as LoadPoint[]),
    garminLinked ? getGarminDashboard() : Promise.resolve(null as GarminDashboard | null),
  ]);
  if (intervalsRes.status === "fulfilled") trainingLoad = intervalsRes.value;
  else intervalsError = (intervalsRes.reason as Error).message;
  if (garminDashRes.status === "fulfilled") garminDash = garminDashRes.value;
  else garminError = (garminDashRes.reason as Error).message;

  const nowMs = new Date(summary.generatedAt).getTime();
  const yesterdayKey = new Date(nowMs - 86400_000).toISOString().slice(0, 10);
  const yesterdayActivity =
    summary.recentActivities.find((a) => a.date.startsWith(yesterdayKey)) ??
    summary.recentActivities[0] ??
    null;

  const last7DaysRides = summary.recentActivities.filter((a) => {
    const ageMs = nowMs - new Date(a.date).getTime();
    return ageMs <= 7 * 86400_000 && a.type.toLowerCase().includes("ride");
  });
  const last7DaysRideKm = last7DaysRides.reduce((s, a) => s + a.distanceKm, 0);

  return (
    <main className="min-h-screen bg-black text-neutral-100 p-3 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        <header className="flex items-center justify-between gap-4 px-1">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-semibold truncate">
              {summary.athlete.name || "Athlete"}
            </h1>
            <p className="text-neutral-500 text-[11px] sm:text-xs">
              Updated {new Date(summary.generatedAt).toLocaleTimeString()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/garmin"
              className="text-xs text-neutral-400 hover:text-neutral-200 px-2 py-1"
            >
              Detail
            </Link>
            <form action="/api/cache/clear" method="POST">
              <button
                type="submit"
                className="text-xs text-neutral-400 hover:text-neutral-200 px-2 py-1"
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

        {garminLinked && garminDash && (
          <>
            {garminDash.bodyBattery.intraday.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-2xl font-semibold px-1">In Focus</h2>
                <Card title="Body Battery" icon={<BodyBatteryIcon />}>
                  <BodyBatteryHero
                    current={garminDash.bodyBattery.end}
                    charged={garminDash.bodyBattery.charged}
                    drained={garminDash.bodyBattery.drained}
                    intraday={garminDash.bodyBattery.intraday}
                    highest={garminDash.daily.bodyBatteryHighestValue}
                  />
                </Card>
              </section>
            )}

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold px-1">At a Glance</h2>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                <Card title="Sleep Score" icon={<SleepIcon />} className="flex flex-col">
                  <div className="flex items-baseline gap-3 mb-3">
                    <span className="text-4xl font-semibold tabular-nums">
                      {garminDash.sleep.sleepScore ?? "—"}
                    </span>
                    {garminDash.sleep.totalHours !== null && (
                      <span className="text-xs text-neutral-500">
                        {Math.floor(garminDash.sleep.totalHours)}h{" "}
                        {Math.round((garminDash.sleep.totalHours % 1) * 60)}m Duration
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-h-0">
                    <SleepStagesChart
                      intraday={garminDash.sleep.intraday}
                      startTs={garminDash.sleep.startTs}
                      endTs={garminDash.sleep.endTs}
                    />
                  </div>
                </Card>

                <Card
                  title="Heart Rate"
                  icon={<HeartIcon />}
                  meta={
                    garminDash.hr.min !== null && garminDash.hr.max !== null
                      ? `${garminDash.hr.min}–${garminDash.hr.max}`
                      : undefined
                  }
                >
                  <ZonedGauge
                    value={garminDash.hr.resting ?? garminDash.daily.restingHeartRate}
                    min={40}
                    max={180}
                    zones={HR_ZONES}
                    unit="bpm Resting"
                  />
                </Card>

                <Card
                  title="Stress"
                  icon={<StressIcon />}
                  meta={garminDash.stress.max !== null ? `max ${garminDash.stress.max}` : undefined}
                >
                  <StressDonut value={garminDash.stress.avg} />
                  <p className="mt-2 text-center text-[11px] text-neutral-500">avg today</p>
                </Card>

                <Card title="Floors" icon={<FloorsIcon />}>
                  <ZonedGauge
                    value={garminDash.daily.floorsAscended}
                    min={0}
                    max={Math.max(20, (garminDash.daily.floorsAscended ?? 0) + 5)}
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
                  meta={
                    garminDash.pulseOx.lowest !== null
                      ? `min ${garminDash.pulseOx.lowest}%`
                      : undefined
                  }
                >
                  <ZonedGauge
                    value={garminDash.pulseOx.avg}
                    min={80}
                    max={100}
                    zones={PULSE_OX_ZONES}
                    display={garminDash.pulseOx.avg !== null ? `${garminDash.pulseOx.avg}%` : "—"}
                  />
                </Card>

                <Card title="HRV Status" icon={<HRVIcon />}>
                  <HRVStatusCard
                    status={garminDash.hrv.status}
                    weeklyAvg={garminDash.hrv.weeklyAvg}
                    lastNightAvg={garminDash.hrv.lastNightAvg}
                    baseline={garminDash.hrv.baseline}
                    history={garminDash.hrvHistory}
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
                    daily={garminDash.weekDaily[5] ?? garminDash.daily}
                    sleep={garminDash.weekSleep[5] ?? garminDash.sleep}
                    hrv={garminDash.hrv}
                    pulseOx={garminDash.weekPulseOx[5] ?? garminDash.pulseOx}
                    bodyBatteryDelta={{
                      charged: garminDash.bodyBattery.charged,
                      drained: garminDash.bodyBattery.drained,
                    }}
                  />
                </Card>
                <Card title="Last 7 Days">
                  <Last7DaysCard
                    rollup={garminDash.weekRollup}
                    rideCount={last7DaysRides.length}
                    rideDistanceKm={last7DaysRideKm}
                  />
                </Card>
              </div>
            </section>
          </>
        )}

        {!garminLinked && (
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
        )}

        {garminLinked && garminError && !garminDash && (
          <section>
            <Card>
              <p className="text-xs text-red-400 break-all">{garminError}</p>
            </Card>
          </section>
        )}

        {isIntervalsConfigured() && (
          <section className="space-y-3">
            <h2 className="text-2xl font-semibold px-1">Training Load</h2>
            <Card meta="CTL · ATL · TSB">
              {intervalsError ? (
                <p className="text-xs text-red-400">{intervalsError}</p>
              ) : (
                <TrainingLoadChart points={trainingLoad} />
              )}
            </Card>
          </section>
        )}

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold px-1">Activity Calendar</h2>
          <Card>
            <Calendar activities={summary.recentActivities} />
          </Card>
        </section>
      </div>
    </main>
  );
}
