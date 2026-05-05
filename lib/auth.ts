export function requireBearer(req: Request): Response | null {
  const expected = process.env.MCP_SECRET_TOKEN;
  if (!expected) {
    return new Response("MCP_SECRET_TOKEN not configured", { status: 500 });
  }
  const hdr = req.headers.get("authorization");
  if (hdr !== `Bearer ${expected}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  return null;
}
