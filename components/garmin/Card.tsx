import type { ReactNode } from "react";

export default function Card({
  title,
  icon,
  meta,
  children,
  className = "",
}: {
  title?: string;
  icon?: ReactNode;
  meta?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl bg-neutral-900 p-4 sm:p-5 ${className}`}>
      {(title || icon || meta) && (
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {icon && <span className="text-base">{icon}</span>}
            {title && (
              <h3 className="text-sm font-medium text-neutral-200">{title}</h3>
            )}
          </div>
          {meta && <span className="text-[11px] text-neutral-500">{meta}</span>}
        </div>
      )}
      {children}
    </div>
  );
}
