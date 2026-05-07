import {
  BikeIcon,
  BodyBatteryIcon,
  FloorsIcon,
  HeartIcon,
  HRVIcon,
  PulseOxIcon,
  SleepIcon,
  StepsIcon,
  StressIcon,
} from "./Icons";
import MetricRow from "./MetricRow";
import type {
  DailyFull,
  HRVDay,
  PulseOxDay,
  SleepStages,
} from "@/lib/garmin";
import type { ActivitySummary } from "@/lib/health";

export default function YesterdayCard({
  activity,
  daily,
  sleep,
  hrv,
  pulseOx,
  bodyBatteryDelta,
}: {
  activity: ActivitySummary | null;
  daily: DailyFull;
  sleep: SleepStages;
  hrv: HRVDay;
  pulseOx: PulseOxDay;
  bodyBatteryDelta: { charged: number | null; drained: number | null };
}) {
  const fmt = (v: number | null, suffix = "") =>
    v === null || v === undefined ? "—" : `${v}${suffix}`;
  return (
    <div className="space-y-3">
      {activity && (
        <div className="rounded-xl bg-neutral-800/60 p-4 flex items-center gap-3">
          <div className="rounded-full bg-emerald-500/20 p-2">
            <BikeIcon />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-neutral-400 truncate">{activity.name}</p>
            <p className="text-lg font-semibold tabular-nums">
              {activity.distanceKm.toFixed(2)} km
            </p>
            <p className="text-[11px] text-neutral-500 tabular-nums">
              {Math.floor(activity.durationMin / 60)}:
              {String(Math.round(activity.durationMin % 60)).padStart(2, "0")}
              {activity.avgWatts !== null && ` · ${activity.avgWatts}W avg`}
              {activity.avgHR !== null && ` · ${activity.avgHR}bpm`}
            </p>
          </div>
        </div>
      )}

      <div className="rounded-xl bg-neutral-800/40 px-4 divide-y divide-neutral-800">
        <MetricRow
          icon={<BodyBatteryIcon />}
          label="Body Battery"
          value={
            bodyBatteryDelta.charged !== null && bodyBatteryDelta.drained !== null
              ? `+${bodyBatteryDelta.charged} / -${bodyBatteryDelta.drained}`
              : "—"
          }
        />
        <MetricRow
          icon={<StepsIcon />}
          label="Steps"
          value={daily.totalSteps !== null ? daily.totalSteps.toLocaleString() : "—"}
        />
        <MetricRow
          icon={<SleepIcon />}
          label="Sleep Score"
          value={
            sleep.sleepScore !== null && sleep.totalHours !== null
              ? `${sleep.sleepScore} / ${Math.floor(sleep.totalHours)}h ${Math.round(
                  (sleep.totalHours % 1) * 60
                )}m`
              : "—"
          }
        />
        <MetricRow
          icon={<HeartIcon />}
          label="Heart Rate"
          value={
            daily.restingHeartRate !== null && daily.maxHeartRate !== null
              ? `${daily.restingHeartRate} Rest / ${daily.maxHeartRate} High`
              : "—"
          }
        />
        <MetricRow
          icon={<StressIcon />}
          label="Stress"
          value={fmt(daily.averageStressLevel)}
        />
        <MetricRow
          icon={<FloorsIcon />}
          label="Floors"
          value={fmt(daily.floorsAscended)}
        />
        <MetricRow
          icon={<PulseOxIcon />}
          label="Pulse Ox"
          value={pulseOx.avg !== null ? `${pulseOx.avg}%` : "—"}
        />
        <MetricRow
          icon={<HRVIcon />}
          label="HRV Status"
          value={hrv.weeklyAvg !== null ? `${hrv.weeklyAvg} ms 7d Avg` : "—"}
        />
      </div>
    </div>
  );
}
