export default function Loading() {
  return (
    <main className="min-h-screen flex items-center justify-center p-8 bg-neutral-950 text-neutral-100">
      <div className="flex flex-col items-center gap-4">
        <svg
          className="h-8 w-8 animate-spin text-orange-500"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="3"
            strokeOpacity="0.2"
          />
          <path
            d="M22 12a10 10 0 0 1-10 10"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
        <p className="text-sm text-neutral-400 animate-pulse">Loading Garmin data…</p>
      </div>
    </main>
  );
}
