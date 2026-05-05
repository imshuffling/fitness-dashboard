import { format, parseISO } from "date-fns";

type Activity = {
  id: number;
  name: string;
  date: string;
  type: string;
  durationMin: number;
  distanceKm: number;
  avgHR: number | null;
  avgWatts: number | null;
  zone2Pct: number | null;
};

export default function ActivityFeed({ activities }: { activities: Activity[] }) {
  if (activities.length === 0) {
    return <p className="text-sm text-neutral-500">No recent activities.</p>;
  }
  return (
    <ul className="divide-y divide-neutral-800">
      {activities.map((a) => (
        <li key={a.id} className="py-3 flex items-center justify-between gap-4 text-sm">
          <div className="min-w-0">
            <p className="font-medium truncate">{a.name}</p>
            <p className="text-xs text-neutral-500">
              {format(parseISO(a.date), "EEE d MMM HH:mm")} · {a.type}
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs text-neutral-300 shrink-0">
            <span>{a.durationMin}m</span>
            {a.distanceKm > 0 && <span>{a.distanceKm}km</span>}
            {a.avgHR !== null && <span>{a.avgHR}bpm</span>}
            {a.avgWatts !== null && <span>{a.avgWatts}W</span>}
            {a.zone2Pct !== null && (
              <span
                className={
                  a.zone2Pct >= 70
                    ? "text-green-400"
                    : a.zone2Pct >= 40
                    ? "text-yellow-400"
                    : "text-neutral-400"
                }
              >
                Z2 {a.zone2Pct}%
              </span>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
