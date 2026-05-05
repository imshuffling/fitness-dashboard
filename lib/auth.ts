import { isValidAccessToken } from "./oauth";

function unauthorized(req: Request): Response {
  const url = new URL(req.url);
  const origin = `${url.protocol}//${url.host}`;
  return new Response("Unauthorized", {
    status: 401,
    headers: {
      "WWW-Authenticate": `Bearer resource_metadata="${origin}/.well-known/oauth-protected-resource"`,
    },
  });
}

export async function requireBearer(req: Request): Promise<Response | null> {
  const hdr = req.headers.get("authorization");
  if (!hdr?.toLowerCase().startsWith("bearer ")) return unauthorized(req);
  const token = hdr.slice(7).trim();
  if (!token) return unauthorized(req);
  if (!(await isValidAccessToken(token))) return unauthorized(req);
  return null;
}
