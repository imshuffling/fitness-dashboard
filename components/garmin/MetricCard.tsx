export default function MetricCard({
  title,
  primary,
  unit,
  hint,
  children,
}: {
  title: string;
  primary: string | number | null;
  unit?: string;
  hint?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="rounded-xl bg-neutral-900 border border-neutral-800 p-4 flex flex-col gap-3">
      <header className="flex items-baseline justify-between">
        <h3 className="text-sm uppercase tracking-wider text-neutral-500">{title}</h3>
        {hint && <span className="text-[10px] text-neutral-500">{hint}</span>}
      </header>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-semibold">
          {primary === null || primary === undefined ? "—" : primary}
        </span>
        {unit && <span className="text-sm text-neutral-500">{unit}</span>}
      </div>
      {children}
    </section>
  );
}
