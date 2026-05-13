import Card from "@/components/garmin/Card";

function Pulse({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-neutral-800 ${className}`} />;
}

export function HeaderSkeleton() {
  return (
    <header className="flex items-center justify-between gap-4 rounded-2xl border border-neutral-800/80 bg-gradient-to-br from-neutral-900/80 via-neutral-900/40 to-transparent px-4 py-3 sm:px-5 sm:py-4">
      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
        <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-full bg-neutral-800 ring-2 ring-orange-500/40" />
        <div className="space-y-2">
          <Pulse className="h-5 w-40 sm:h-6 sm:w-48" />
          <Pulse className="h-3 w-56" />
        </div>
      </div>
      <Pulse className="h-8 w-8 rounded-full" />
    </header>
  );
}

export function LatestActivitySkeleton() {
  return (
    <section className="space-y-3">
      <h2 className="text-2xl font-semibold px-1">Latest Activity</h2>
      <div className="rounded-2xl bg-neutral-900 overflow-hidden flex flex-col md:flex-row">
        <Pulse className="h-44 w-full md:h-auto md:w-64 md:shrink-0 rounded-none" />
        <div className="flex-1 p-4 sm:p-5 space-y-3">
          <Pulse className="h-5 w-2/3" />
          <Pulse className="h-3 w-24" />
          <div className="grid grid-cols-3 gap-3 pt-2">
            <Pulse className="h-10" />
            <Pulse className="h-10" />
            <Pulse className="h-10" />
          </div>
          <Pulse className="h-2 w-full mt-2" />
        </div>
      </div>
    </section>
  );
}

export function AtAGlanceSkeleton() {
  return (
    <section className="space-y-3">
      <h2 className="text-2xl font-semibold px-1">At a Glance</h2>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <div className="space-y-3">
              <Pulse className="h-4 w-24" />
              <Pulse className="h-24 w-full" />
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}

export function YesterdaySkeleton() {
  return (
    <section className="space-y-3">
      <h2 className="text-2xl font-semibold px-1">Yesterday</h2>
      <div className="grid lg:grid-cols-2 gap-3 sm:gap-4">
        <Card>
          <div className="space-y-3">
            <Pulse className="h-4 w-32" />
            <Pulse className="h-32 w-full" />
          </div>
        </Card>
        <Card title="Last 7 Days">
          <div className="space-y-3">
            <Pulse className="h-4 w-28" />
            <Pulse className="h-32 w-full" />
          </div>
        </Card>
      </div>
    </section>
  );
}

export function TrainingLoadSkeleton() {
  return (
    <section className="space-y-3">
      <h2 className="text-2xl font-semibold px-1">Training Load</h2>
      <Card meta="CTL · ATL · TSB">
        <Pulse className="h-48 w-full" />
      </Card>
    </section>
  );
}

export function CalendarSkeleton() {
  return (
    <section className="space-y-3">
      <h2 className="text-2xl font-semibold px-1">Activity Calendar</h2>
      <Card>
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 42 }).map((_, i) => (
            <Pulse key={i} className="aspect-square" />
          ))}
        </div>
      </Card>
    </section>
  );
}
