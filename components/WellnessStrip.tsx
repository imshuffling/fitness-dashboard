import { format, parseISO } from "date-fns";

type Day = {
  date: string;
  steps: number | null;
  sleepHours: number | null;
  restingHR: number | null;
};

export default function WellnessStrip({ days }: { days: Day[] }) {
  if (days.length === 0) {
    return <p className="text-sm text-neutral-500">No Garmin data.</p>;
  }
  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map((d) => (
        <div
          key={d.date}
          className="rounded-md border border-neutral-800 bg-neutral-900/40 p-2 text-center"
        >
          <p className="text-[10px] uppercase tracking-wider text-neutral-500">
            {format(parseISO(d.date), "EEE")}
          </p>
          <p className="mt-1 text-sm font-semibold">
            {d.steps !== null ? d.steps.toLocaleString() : "—"}
          </p>
          <p className="text-[10px] text-neutral-500">steps</p>
          <p className="mt-2 text-xs text-neutral-300">
            {d.sleepHours !== null ? `${d.sleepHours}h` : "—"}
            <span className="text-neutral-600"> · </span>
            {d.restingHR !== null ? `${d.restingHR}bpm` : "—"}
          </p>
        </div>
      ))}
    </div>
  );
}
