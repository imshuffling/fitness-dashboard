type SearchParams = Promise<{ error?: string }>;

export default async function GarminConnectPage({ searchParams }: { searchParams: SearchParams }) {
  const { error } = await searchParams;

  return (
    <main className="min-h-screen flex items-center justify-center p-8 bg-neutral-950 text-neutral-100">
      <form
        action="/api/garmin/login"
        method="POST"
        className="w-full max-w-sm space-y-4 rounded-xl border border-neutral-800 bg-neutral-900 p-6"
      >
        <h1 className="text-xl font-semibold">Connect Garmin Connect</h1>
        <p className="text-sm text-neutral-400">
          Garmin has no public API for personal use. This logs in with your Garmin Connect
          credentials and stores OAuth tokens (not your password) so the app can fetch wellness
          data.
        </p>
        <input
          type="email"
          name="username"
          required
          autoComplete="username"
          className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
          placeholder="Garmin Connect email"
        />
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
          placeholder="Password"
        />
        {error && (
          <p className="text-xs text-red-400 break-all">
            Login failed: {decodeURIComponent(error)}
          </p>
        )}
        <button
          type="submit"
          className="w-full rounded-md bg-orange-500 hover:bg-orange-400 transition-colors px-4 py-2 text-sm font-medium"
        >
          Sign in with Garmin
        </button>
        <p className="text-[11px] text-neutral-500">
          Uses the unofficial garmin-connect package. Garmin may require a CAPTCHA or block
          repeated logins. Tokens persist for ~1 year (oauth1) and refresh automatically.
        </p>
      </form>
    </main>
  );
}
