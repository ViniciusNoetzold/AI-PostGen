import { NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/server/authorization";
import { decryptSecret, encryptSecret } from "@/lib/server/encryption";
import { getDb, isDatabaseConfigured } from "@/lib/server/db";

interface TokenResponse { access_token?: string; expires_in?: number; error?: { message?: string } }

export async function POST(request: Request) {
  const denied = await authorizeRequest(request, "admin");
  if (denied) return denied;
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) return NextResponse.json({ error: "Meta OAuth is not configured" }, { status: 503 });
  const version = process.env.META_GRAPH_VERSION || "v23.0";
  const connections = await getDb().metaConnection.findMany({ where: { active: true } });
  const results: Array<{ id: string; refreshed: boolean; error?: string }> = [];
  for (const connection of connections) {
    try {
      const url = new URL(`https://graph.facebook.com/${version}/oauth/access_token`);
      url.search = new URLSearchParams({ grant_type: "fb_exchange_token", client_id: appId, client_secret: appSecret, fb_exchange_token: decryptSecret(connection.encryptedAccessToken) }).toString();
      const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
      const payload = await response.json() as TokenResponse;
      if (!response.ok || !payload.access_token) throw new Error(payload.error?.message || "Token refresh failed");
      await getDb().metaConnection.update({ where: { id: connection.id }, data: { encryptedAccessToken: encryptSecret(payload.access_token), tokenExpiresAt: new Date(Date.now() + (payload.expires_in || 5_184_000) * 1000), lastRefreshedAt: new Date() } });
      results.push({ id: connection.id, refreshed: true });
    } catch (error: unknown) {
      results.push({ id: connection.id, refreshed: false, error: error instanceof Error ? error.message : "Unknown error" });
    }
  }
  return NextResponse.json({ results });
}
