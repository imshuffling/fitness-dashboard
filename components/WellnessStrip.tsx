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
    <div className="grid grid-cols-7 gap-1 sm:gap-2">
      {days.map((d) => (
        <div
          key={d.date}
          className="rounded-md border border-neutral-800 bg-neutral-900/40 p-1.5 sm:p-2 text-center"
        >
          <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-neutral-500">
            {format(parseISO(d.date), "EEEEE")}
          </p>
          <p className="mt-1 text-xs sm:text-sm font-semibold leading-tight break-all">
            {d.steps !== null ? d.steps.toLocaleString() : "—"}
          </p>
          <p className="text-[9px] sm:text-[10px] text-neutral-500">steps</p>
          <p className="mt-1.5 sm:mt-2 text-[10px] sm:text-xs text-neutral-300 leading-tight">
            {d.sleepHours !== null ? `${d.sleepHours}h` : "—"}
            <span className="text-neutral-600 hidden sm:inline"> · </span>
            <br className="sm:hidden" />
            {d.restingHR !== null ? `${d.restingHR}bpm` : "—"}
          </p>
        </div>
      ))}
    </div>
  );
}
