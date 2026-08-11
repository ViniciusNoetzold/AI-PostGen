import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { encryptSecret } from "@/lib/server/encryption";
import { getDb, isDatabaseConfigured } from "@/lib/server/db";

interface TokenResponse { access_token?: string; token_type?: string; expires_in?: number; error?: { message?: string } }
interface PagesResponse { data?: Array<{ id: string; access_token?: string; instagram_business_account?: { id: string; username?: string } }>; error?: { message?: string } }

function sameState(expected: string | undefined, received: string | null): boolean {
  if (!expected || !received) return false;
  const left = Buffer.from(expected);
  const right = Buffer.from(received);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const stateCookie = request.headers.get("cookie")?.match(/(?:^|;\s*)meta_oauth_state=([^;]+)/)?.[1];
  if (!sameState(stateCookie ? decodeURIComponent(stateCookie) : undefined, requestUrl.searchParams.get("state"))) {
    return NextResponse.json({ error: "Invalid OAuth state" }, { status: 400 });
  }
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "Database is required" }, { status: 503 });
  const code = requestUrl.searchParams.get("code");
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  const redirectUri = process.env.META_REDIRECT_URI;
  if (!code || !appId || !appSecret || !redirectUri) return NextResponse.json({ error: "Incomplete OAuth callback" }, { status: 400 });
  const graphVersion = process.env.META_GRAPH_VERSION || "v23.0";
  const shortUrl = new URL(`https://graph.facebook.com/${graphVersion}/oauth/access_token`);
  shortUrl.search = new URLSearchParams({ client_id: appId, client_secret: appSecret, redirect_uri: redirectUri, code }).toString();
  const shortResponse = await fetch(shortUrl, { signal: AbortSignal.timeout(15_000) });
  const short = await shortResponse.json() as TokenResponse;
  if (!shortResponse.ok || !short.access_token) return NextResponse.json({ error: short.error?.message || "Token exchange failed" }, { status: 502 });
  const longUrl = new URL(`https://graph.facebook.com/${graphVersion}/oauth/access_token`);
  longUrl.search = new URLSearchParams({ grant_type: "fb_exchange_token", client_id: appId, client_secret: appSecret, fb_exchange_token: short.access_token }).toString();
  const longResponse = await fetch(longUrl, { signal: AbortSignal.timeout(15_000) });
  const long = await longResponse.json() as TokenResponse;
  const userToken = long.access_token || short.access_token;
  const pagesUrl = new URL(`https://graph.facebook.com/${graphVersion}/me/accounts`);
  pagesUrl.search = new URLSearchParams({ fields: "id,name,access_token,instagram_business_account{id,username}", access_token: userToken }).toString();
  const pagesResponse = await fetch(pagesUrl, { signal: AbortSignal.timeout(15_000) });
  const pages = await pagesResponse.json() as PagesResponse;
  if (!pagesResponse.ok) return NextResponse.json({ error: pages.error?.message || "Unable to list Meta pages" }, { status: 502 });
  const expiresAt = new Date(Date.now() + (long.expires_in || short.expires_in || 5_184_000) * 1000);
  let connected = 0;
  for (const page of pages.data || []) {
    if (!page.instagram_business_account || !page.access_token) continue;
    await getDb().metaConnection.upsert({
      where: { accountId: page.id },
      update: { instagramBusinessId: page.instagram_business_account.id, encryptedAccessToken: encryptSecret(page.access_token), tokenExpiresAt: expiresAt, active: true, lastRefreshedAt: new Date() },
      create: { accountId: page.id, pageId: page.id, instagramBusinessId: page.instagram_business_account.id, encryptedAccessToken: encryptSecret(page.access_token), tokenExpiresAt: expiresAt, scopes: ["instagram_basic", "instagram_content_publish", "instagram_manage_insights"], lastRefreshedAt: new Date() },
    });
    connected += 1;
  }
  const response = NextResponse.redirect(new URL(`/settings?meta=connected&accounts=${connected}`, request.url));
  response.cookies.delete("meta_oauth_state");
  return response;
}
