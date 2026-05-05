export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const issuer = `${url.protocol}//${url.host}`;
  return Response.json({
    issuer,
    authorization_endpoint: `${issuer}/authorize`,
    token_endpoint: `${issuer}/token`,
    registration_endpoint: `${issuer}/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
    scopes_supported: ["mcp"],
  });
}
