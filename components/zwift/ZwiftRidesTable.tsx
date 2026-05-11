import Image from "next/image";
import Link from "next/link";
import type { ActivitySummary } from "@/lib/health";

export default function ZwiftRidesTable({ rides }: { rides: ActivitySummary[] }) {
  if (rides.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-neutral-500 text-sm">
        No Zwift rides in this window.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wider text-neutral-500 border-b border-neutral-800">
            <th className="py-2 pr-3 font-medium w-12"></th>
            <th className="py-2 pr-3 font-medium">Date</th>
            <th className="py-2 pr-3 font-medium">Ride</th>
            <th className="py-2 pr-3 font-medium text-right">Dur</th>
            <th className="py-2 pr-3 font-medium text-right">km</th>
            <th className="py-2 pr-3 font-medium text-right">Watts</th>
            <th className="py-2 pr-3 font-medium text-right">HR</th>
            <th className="py-2 pr-0 font-medium text-right">Z2</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-900">
          {rides.map((r) => (
            <tr key={r.id} className="hover:bg-neutral-900/50">
              <td className="py-2 pr-3">
                {r.photoUrl ? (
                  <Image
                    src={r.photoUrl}
                    alt=""
                    width={40}
                    height={40}
                    className="h-10 w-10 rounded object-cover"
                  />
                ) : (
                  <div className="h-10 w-10 rounded bg-neutral-800/60" />
                )}
              </td>
              <td className="py-2 pr-3 text-neutral-400 whitespace-nowrap">
                {r.date.slice(0, 10)}
              </td>
              <td className="py-2 pr-3 text-neutral-100 truncate max-w-[260px]">
                <Link href={`/rides/${r.id}`} className="hover:text-orange-400 transition">
                  {r.name}
                </Link>
              </td>
              <td className="py-2 pr-3 text-right text-neutral-200 tabular-nums">{r.durationMin}m</td>
              <td className="py-2 pr-3 text-right text-neutral-200 tabular-nums">
                {r.distanceKm.toFixed(1)}
              </td>
              <td className="py-2 pr-3 text-right text-neutral-200 tabular-nums">
                {r.avgWatts ?? "—"}
              </td>
              <td className="py-2 pr-3 text-right text-neutral-200 tabular-nums">
                {r.avgHR ?? "—"}
              </td>
              <td className="py-2 pr-0 text-right text-neutral-200 tabular-nums">
                {r.zone2Pct !== null ? `${r.zone2Pct}%` : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
