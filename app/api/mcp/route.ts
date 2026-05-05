import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { requireBearer } from "@/lib/auth";
import { createMcpServer } from "@/lib/mcp";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function handle(req: Request): Promise<Response> {
  const unauth = requireBearer(req);
  if (unauth) return unauth;

  const server = createMcpServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  await server.connect(transport);
  try {
    return await transport.handleRequest(req);
  } finally {
    // best-effort cleanup
    void server.close();
  }
}

export const GET = handle;
export const POST = handle;
export const DELETE = handle;
