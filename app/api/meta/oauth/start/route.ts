import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/server/authorization";

export async function GET(request: Request) {
  const denied = await authorizeRequest(request, "admin");
  if (denied) return denied;
  const appId = process.env.META_APP_ID;
  const redirectUri = process.env.META_REDIRECT_URI;
  if (!appId || !redirectUri) return NextResponse.json({ error: "Meta OAuth is not configured" }, { status: 503 });
  const state = randomBytes(32).toString("base64url");
  const graphVersion = process.env.META_GRAPH_VERSION || "v23.0";
  const url = new URL(`https://www.facebook.com/${graphVersion}/dialog/oauth`);
  url.search = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    state,
    response_type: "code",
    scope: "pages_show_list,pages_read_engagement,instagram_basic,instagram_content_publish,instagram_manage_insights",
  }).toString();
  const response = NextResponse.redirect(url);
  response.cookies.set("meta_oauth_state", state, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/api/meta/oauth/callback", maxAge: 600 });
  return response;
}
