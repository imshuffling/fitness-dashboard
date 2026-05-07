import {
  BikeIcon,
  FloorsIcon,
  HeartIcon,
  PulseOxIcon,
  SleepIcon,
  StepsIcon,
  StressIcon,
} from "./Icons";
import MetricRow from "./MetricRow";
import type { WeekRollup } from "@/lib/garmin";

export default function Last7DaysCard({
  rollup,
  rideCount,
  rideDistanceKm,
}: {
  rollup: WeekRollup;
  rideCount: number;
  rideDistanceKm: number;
}) {
  return (
    <div className="rounded-xl bg-neutral-800/40 px-4 divide-y divide-neutral-800">
      <MetricRow
        icon={<BikeIcon />}
        label={`${rideCount} ${rideCount === 1 ? "Ride" : "Rides"}`}
        value={`${rideDistanceKm.toFixed(1)} km`}
      />
      <MetricRow
        icon={<StepsIcon />}
        label="Steps"
        value={rollup.steps.avg !== null ? `${rollup.steps.avg.toLocaleString()} Avg` : "—"}
      />
      <MetricRow
        icon={<SleepIcon />}
        label="Sleep Score"
        value={
          rollup.sleep.scoreAvg !== null && rollup.sleep.durationAvgHours !== null
            ? `${rollup.sleep.scoreAvg} Avg / ${Math.floor(
                rollup.sleep.durationAvgHours
              )}h ${Math.round((rollup.sleep.durationAvgHours % 1) * 60)}m Avg`
            : "—"
        }
      />
      <MetricRow
        icon={<HeartIcon />}
        label="Heart Rate"
        value={rollup.restingHR.avg !== null ? `${rollup.restingHR.avg} Avg Resting` : "—"}
      />
      <MetricRow
        icon={<StressIcon />}
        label="Stress"
        value={rollup.stress.avg !== null ? `${rollup.stress.avg} Avg` : "—"}
      />
      <MetricRow
        icon={<FloorsIcon />}
        label="Floors"
        value={rollup.floors.avg !== null ? `${rollup.floors.avg} Avg` : "—"}
      />
      <MetricRow
        icon={<PulseOxIcon />}
        label="Pulse Ox"
        value={rollup.pulseOx.avg !== null ? `${rollup.pulseOx.avg}% Avg` : "—"}
      />
    </div>
  );
}
