import type { ReactNode } from "react";

export default function MetricRow({
  icon,
  label,
  value,
  trailing,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 py-3">
      <span className="shrink-0 w-6 flex items-center justify-center">{icon}</span>
      <span className="flex-1 text-sm text-neutral-200">{label}</span>
      <span className="text-sm text-neutral-100 tabular-nums">{value}</span>
      {trailing && <span className="ml-2">{trailing}</span>}
    </div>
  );
}
