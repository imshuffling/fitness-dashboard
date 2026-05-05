import { NextResponse } from "next/server";
import { CLIENT_ID } from "@/lib/oauth";

export const runtime = "nodejs";

// Dynamic Client Registration (RFC 7591).
// Single-user app: issue the same client_id for everyone.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    client_name?: string;
    redirect_uris?: string[];
  };
  const issuedAt = Math.floor(Date.now() / 1000);
  return NextResponse.json(
    {
      client_id: CLIENT_ID,
      client_id_issued_at: issuedAt,
      client_name: body.client_name ?? "MCP Client",
      redirect_uris: body.redirect_uris ?? [],
      grant_types: ["authorization_code"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
      application_type: "web",
    },
    { status: 201 }
  );
}
