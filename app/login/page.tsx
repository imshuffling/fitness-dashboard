type SearchParams = Promise<{ next?: string; error?: string }>;

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const next = params.next ?? "/";
  const error = params.error;

  return (
    <main className="min-h-screen flex items-center justify-center p-8 bg-neutral-950 text-neutral-100">
      <form
        action="/api/login"
        method="POST"
        className="w-full max-w-sm space-y-4 rounded-xl border border-neutral-800 bg-neutral-900 p-6"
      >
        <h1 className="text-xl font-semibold">Sign in</h1>
        <p className="text-sm text-neutral-400">Enter the dashboard password to continue.</p>
        <input type="hidden" name="next" value={next} />
        <input
          type="password"
          name="password"
          autoFocus
          required
          autoComplete="current-password"
          className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
          placeholder="Password"
        />
        {error && <p className="text-xs text-red-400">Incorrect password.</p>}
        <button
          type="submit"
          className="w-full rounded-md bg-orange-500 hover:bg-orange-400 transition-colors px-4 py-2 text-sm font-medium"
        >
          Continue
        </button>
      </form>
    </main>
  );
}
