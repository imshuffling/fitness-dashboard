export default function ConnectStravaPage() {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const redirect = process.env.STRAVA_REDIRECT_URI;

  if (!clientId || !redirect) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8 bg-neutral-950 text-neutral-100">
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-2xl font-semibold">Configuration missing</h1>
          <p className="text-neutral-400 text-sm">
            Set <code>STRAVA_CLIENT_ID</code> and <code>STRAVA_REDIRECT_URI</code> in your environment.
          </p>
        </div>
      </main>
    );
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirect,
    response_type: "code",
    scope: "activity:read_all,profile:read_all,read",
    approval_prompt: "auto",
  });
  const authUrl = `https://www.strava.com/oauth/authorize?${params.toString()}`;

  return (
    <main className="min-h-screen flex items-center justify-center p-8 bg-neutral-950 text-neutral-100">
      <div className="max-w-md text-center space-y-6">
        <h1 className="text-3xl font-semibold">Connect your Strava</h1>
        <p className="text-neutral-400">
          One-time authorisation. Tokens are stored privately and used to sync your activities.
        </p>
        <a
          href={authUrl}
          className="inline-block rounded-lg bg-orange-500 hover:bg-orange-400 transition-colors px-6 py-3 font-medium text-white"
        >
          Authorise with Strava
        </a>
      </div>
    </main>
  );
}
