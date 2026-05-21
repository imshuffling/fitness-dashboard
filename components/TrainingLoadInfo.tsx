"use client";

const METRICS = [
  {
    color: "#22c55e",
    name: "Fitness (CTL)",
    desc: "42-day average training load. Your long-term form — slow to move. Trending up means you're getting fitter.",
  },
  {
    color: "#fb923c",
    name: "Fatigue (ATL)",
    desc: "7-day average training load. Recent tiredness — spikes after hard days, drops when you rest.",
  },
  {
    color: "#3b82f6",
    name: "Form (TSB)",
    desc: "Fitness minus Fatigue. Freshness: negative means you're building, positive means rested and race-ready.",
  },
];

export default function TrainingLoadInfo() {
  return (
    <span className="group relative inline-flex items-center gap-1.5">
      <span className="text-[11px] text-neutral-500">CTL · ATL · TSB</span>
      <button
        type="button"
        aria-label="What do these metrics mean?"
        className="flex h-4 w-4 cursor-pointer items-center justify-center rounded-full border border-neutral-700 text-[10px] font-medium leading-none text-neutral-400 transition-colors hover:border-neutral-500 hover:text-neutral-200"
      >
        i
      </button>
      <span className="pointer-events-none absolute right-0 top-full z-20 mt-2 block w-72 origin-top-right scale-95 rounded-xl border border-neutral-800 bg-neutral-950 p-3 text-left opacity-0 shadow-xl transition-all duration-150 group-hover:scale-100 group-hover:opacity-100 group-focus-within:scale-100 group-focus-within:opacity-100">
        <span className="mb-2 block text-[11px] font-medium text-neutral-300">
          Training Load metrics
        </span>
        <span className="flex flex-col gap-2">
          {METRICS.map((m) => (
            <span key={m.name} className="flex gap-2">
              <span
                className="mt-1 h-2 w-2 shrink-0 rounded-full"
                style={{ background: m.color }}
              />
              <span className="text-[11px] leading-snug text-neutral-400">
                <span className="font-medium text-neutral-200">{m.name}</span> — {m.desc}
              </span>
            </span>
          ))}
        </span>
      </span>
    </span>
  );
}
