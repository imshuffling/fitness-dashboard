import Link from "next/link";
import Gauge from "@/components/garmin/Gauge";
import IntradayChart from "@/components/garmin/IntradayChart";
import MetricCard from "@/components/garmin/MetricCard";
import RestingHRTrend from "@/components/garmin/RestingHRTrend";
import SleepStagesBar from "@/components/garmin/SleepStagesBar";
import { getGarminDashboard } from "@/lib/garmin";
import { isGarminConnected } from "@/lib/garminTokens";

export const dynamic = "force-dynamic";

const FEEDBACK_PHRASES: Record<string, string> = {
  HIGH_RT_HIGHEST_SS_AVAILABLE_ACWR_POS: "Excellent recovery — high readiness, strong sleep, positive load trend.",
  HIGH_RT_HIGH_SS_AVAILABLE_ACWR_POS: "High readiness — good sleep and a healthy load trend.",
  HIGH_RT_HIGH_SS_AVAILABLE: "High readiness — sleep and recovery look good.",
  MODERATE_RT_AVAILABLE_LOW_SLEEP: "Moderate readiness — sleep was light. Take it easy or recover.",
  MODERATE_RT_AVAILABLE_LOW_HRV: "Moderate readiness — HRV trending low.",
  LOW_RT_AVAILABLE_LOW_SLEEP: "Low readiness — poor sleep. Prioritize rest today.",
  LOW_RT_AVAILABLE_LOW_HRV: "Low readiness — HRV is low. Prioritize recovery.",
  EXCELLENT_RECOVERY: "Excellent recovery",
  GOOD_RECOVERY: "Good recovery",
  MODERATE_RECOVERY: "Moderate recovery",
  POOR_RECOVERY: "Poor recovery",
};

function formatReadinessFeedback(code: string): string {
  if (FEEDBACK_PHRASES[code]) return FEEDBACK_PHRASES[code];
  // Strip leading qualifiers (HIGH_/MODERATE_/LOW_) + suffix tags, lowercase rest.
  return code
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function readinessColor(level: string | null): string {
  switch (level) {
    case "HIGH":
      return "#22c55e";
    case "MODERATE":
      return "#eab308";
    case "LOW":
    case "VERY_LOW":
      return "#ef4444";
    default:
      return "#737373";
  }
}

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

export default async function GarminDashboardPage() {
  if (!(await isGarminConnected())) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8 bg-neutral-950 text-neutral-100">
        <div className="max-w-md text-center space-y-6">
          <h1 className="text-2xl font-semibold">Garmin not connected</h1>
          <Link
            href="/auth/garmin"
            className="inline-block rounded-lg bg-orange-500 hover:bg-orange-400 transition-colors px-6 py-3 font-medium"
          >
            Connect Garmin
          </Link>
        </div>
      </main>
    );
  }

  let dash;
  try {
    dash = await getGarminDashboard();
  } catch (e) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8 bg-neutral-950 text-neutral-100">
        <div className="max-w-lg text-center space-y-4">
          <h1 className="text-2xl font-semibold">Failed to load Garmin data</h1>
          <pre className="text-xs text-red-400 whitespace-pre-wrap">{(e as Error).message}</pre>
          <Link
            href="/auth/garmin"
            className="inline-block rounded-lg bg-orange-500 hover:bg-orange-400 transition-colors px-4 py-2 text-sm"
          >
            Re-link Garmin
          </Link>
        </div>
      </main>
    );
  }

  const {
    daily,
    sleep,
    stress,
    bodyBattery,
    hr,
    hrv,
    readiness,
    restingHRTrend,
    restingHRStats,
    restingHRYearTrend,
    restingHRYearStats,
  } = dash;

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 p-3 sm:p-10">
      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-semibold truncate">
              Garmin Health · {dash.date}
            </h1>
            <p className="text-neutral-500 text-xs sm:text-sm">
              Cloned from Garmin Connect (unofficial)
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

        {/* Top row: Readiness + HRV gauges */}
        <section className="grid sm:grid-cols-2 gap-4">
          <div className="rounded-xl bg-neutral-900 border border-neutral-800 p-3 sm:p-5">
            <h3 className="text-sm uppercase tracking-wider text-neutral-500 mb-3">
              Training Readiness
            </h3>
            <Gauge
              value={readiness.score}
              label={readiness.level ?? "—"}
              color={readinessColor(readiness.level)}
            />
            {readiness.feedbackLong && (
              <p className="mt-3 text-xs text-neutral-400">
                {formatReadinessFeedback(readiness.feedbackLong)}
              </p>
            )}
            <dl className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-neutral-400">
              <div>Sleep score · <span className="text-neutral-200">{readiness.factors.sleep ?? "—"}</span></div>
              <div>Recovery (h) · <span className="text-neutral-200">{readiness.factors.recovery ?? "—"}</span></div>
              <div>HRV (wk avg) · <span className="text-neutral-200">{readiness.factors.hrv ?? "—"}</span></div>
              <div>Acute load · <span className="text-neutral-200">{readiness.factors.acuteLoad ?? "—"}</span></div>
            </dl>
          </div>

          <div className="rounded-xl bg-neutral-900 border border-neutral-800 p-3 sm:p-5">
            <h3 className="text-sm uppercase tracking-wider text-neutral-500 mb-3">
              HRV Status
            </h3>
            <Gauge
              value={hrv.lastNightAvg}
              max={Math.max(120, (hrv.baseline.balancedUpper ?? 80) + 20)}
              label={hrv.status ?? "—"}
              color={hrvColor(hrv.status)}
            />
            <dl className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-neutral-400">
              <div>Last night · <span className="text-neutral-200">{hrv.lastNightAvg ?? "—"} ms</span></div>
              <div>Weekly avg · <span className="text-neutral-200">{hrv.weeklyAvg ?? "—"} ms</span></div>
              <div>Balanced low · <span className="text-neutral-200">{hrv.baseline.balancedLow ?? "—"}</span></div>
              <div>Balanced high · <span className="text-neutral-200">{hrv.baseline.balancedUpper ?? "—"}</span></div>
            </dl>
          </div>
        </section>

        {/* Daily activity stats grid */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricCard
            title="Steps"
            primary={daily.totalSteps !== null ? daily.totalSteps.toLocaleString() : null}
            hint={daily.stepGoal ? `goal ${daily.stepGoal.toLocaleString()}` : undefined}
          >
            {daily.stepGoal && daily.totalSteps !== null && (
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-800">
                <div
                  className="h-full bg-orange-500"
                  style={{
                    width: `${Math.min(100, (daily.totalSteps / daily.stepGoal) * 100)}%`,
                  }}
                />
              </div>
            )}
          </MetricCard>
          <MetricCard
            title="Distance"
            primary={
              daily.totalDistanceMeters !== null
                ? (daily.totalDistanceMeters / 1000).toFixed(1)
                : null
            }
            unit="km"
          />
          <MetricCard
            title="Active kcal"
            primary={daily.activeKilocalories !== null ? Math.round(daily.activeKilocalories) : null}
            hint={daily.bmrKilocalories ? `+ ${Math.round(daily.bmrKilocalories)} BMR` : undefined}
          />
          <MetricCard
            title="Floors"
            primary={daily.floorsAscended !== null ? Math.round(daily.floorsAscended) : null}
          />
          <MetricCard
            title="Intensity min"
            primary={daily.intensityMinutes ?? null}
            hint={
              daily.vigorousIntensityMinutes !== null && daily.moderateIntensityMinutes !== null
                ? `${daily.vigorousIntensityMinutes}V · ${daily.moderateIntensityMinutes}M`
                : undefined
            }
          />
          <MetricCard
            title="Resting HR"
            primary={daily.restingHeartRate ?? hr.resting ?? null}
            unit="bpm"
          />
          <MetricCard title="Min HR" primary={daily.minHeartRate ?? hr.min ?? null} unit="bpm" />
          <MetricCard title="Max HR" primary={daily.maxHeartRate ?? hr.max ?? null} unit="bpm" />
        </section>

        {/* Body battery + Stress side by side */}
        <section className="grid lg:grid-cols-2 gap-4">
          <div className="rounded-xl bg-neutral-900 border border-neutral-800 p-3 sm:p-5">
            <div className="flex items-baseline justify-between mb-2">
              <h3 className="text-sm uppercase tracking-wider text-neutral-500">Body Battery</h3>
              <span className="text-[11px] text-neutral-500">
                {bodyBattery.charged !== null && bodyBattery.drained !== null
                  ? `+${bodyBattery.charged} / -${bodyBattery.drained}`
                  : ""}
              </span>
            </div>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-3xl font-semibold">{bodyBattery.end ?? "—"}</span>
              <span className="text-sm text-neutral-500">
                {bodyBattery.start !== null ? `started ${bodyBattery.start}` : ""}
              </span>
            </div>
            <IntradayChart
              points={bodyBattery.intraday}
              color="#3b82f6"
              yDomain={[0, 100]}
              yLabel="Battery"
            />
          </div>

          <div className="rounded-xl bg-neutral-900 border border-neutral-800 p-3 sm:p-5">
            <div className="flex items-baseline justify-between mb-2">
              <h3 className="text-sm uppercase tracking-wider text-neutral-500">Stress</h3>
              <span className="text-[11px] text-neutral-500">
                {stress.max !== null ? `max ${stress.max}` : ""}
              </span>
            </div>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-3xl font-semibold">{stress.avg ?? "—"}</span>
              <span className="text-sm text-neutral-500">avg</span>
            </div>
            <IntradayChart points={stress.intraday} color="#f97316" yDomain={[0, 100]} yLabel="Stress" />
          </div>
        </section>

        {/* Sleep */}
        <section className="rounded-xl bg-neutral-900 border border-neutral-800 p-3 sm:p-5">
          <div className="flex items-baseline justify-between mb-3">
            <h3 className="text-sm uppercase tracking-wider text-neutral-500">Last night sleep</h3>
            <span className="text-[11px] text-neutral-500">
              {sleep.sleepScore !== null ? `score ${sleep.sleepScore}` : ""}
            </span>
          </div>
          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-3xl font-semibold">
              {sleep.totalHours !== null ? `${sleep.totalHours}h` : "—"}
            </span>
            {sleep.avgSleepHR !== null && (
              <span className="text-sm text-neutral-500">avg HR {sleep.avgSleepHR}bpm</span>
            )}
          </div>
          <SleepStagesBar stages={sleep} />
        </section>

        {/* Heart rate panel — today intraday + resting HR 14-day trend */}
        <section className="rounded-xl bg-neutral-900 border border-neutral-800 p-3 sm:p-5 space-y-6">
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <h3 className="text-sm uppercase tracking-wider text-neutral-500">
                Heart rate · today
              </h3>
              <span className="text-[11px] text-neutral-500">
                {hr.resting !== null ? `resting ${hr.resting}` : ""}
                {hr.min !== null && hr.max !== null ? ` · ${hr.min}–${hr.max}` : ""}
              </span>
            </div>
            <div className="flex items-baseline gap-3 mb-3">
              <span className="text-3xl font-semibold">{hr.resting ?? "—"}</span>
              <span className="text-sm text-neutral-500">resting bpm</span>
              {hr.min !== null && hr.max !== null && (
                <span className="ml-auto text-xs text-neutral-500">
                  range {hr.min} – {hr.max}
                </span>
              )}
            </div>
            <IntradayChart points={hr.intraday} color="#ef4444" yLabel="bpm" />
          </div>

          <div>
            <div className="flex items-baseline justify-between mb-2">
              <h3 className="text-sm uppercase tracking-wider text-neutral-500">
                Resting HR · 14 days
              </h3>
              <span className="text-[11px] text-neutral-500">
                {restingHRStats.avg !== null
                  ? `avg ${restingHRStats.avg} · range ${restingHRStats.min}–${restingHRStats.max}`
                  : ""}
              </span>
            </div>
            <RestingHRTrend points={restingHRTrend} />
            <p className="mt-2 text-[11px] text-neutral-500">
              Bars = daily HR range (max − min). Line = resting HR. Trend down = improving aerobic fitness.
            </p>
          </div>

          <div>
            <div className="flex items-baseline justify-between mb-2">
              <h3 className="text-sm uppercase tracking-wider text-neutral-500">
                Resting HR · year
              </h3>
              <span className="text-[11px] text-neutral-500">
                {restingHRYearStats.avg !== null
                  ? `avg ${restingHRYearStats.avg} · range ${restingHRYearStats.min}–${restingHRYearStats.max}`
                  : ""}
              </span>
            </div>
            <RestingHRTrend points={restingHRYearTrend} showDots={false} />
            <p className="mt-2 text-[11px] text-neutral-500">
              Last 365 days. Bars = daily HR range. Line = resting HR.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
