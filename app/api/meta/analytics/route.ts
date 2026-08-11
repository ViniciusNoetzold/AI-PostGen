import { NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/server/authorization";
import { decryptSecret } from "@/lib/server/encryption";
import { getDb, isDatabaseConfigured } from "@/lib/server/db";

interface InsightValue { value?: number; end_time?: string }
interface InsightItem { name?: string; values?: InsightValue[] }
interface InsightsResponse { data?: InsightItem[]; error?: { message?: string } }

export async function GET(request: Request) {
  const denied = await authorizeRequest(request, "viewer");
  if (denied) return denied;
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  const connectionId = new URL(request.url).searchParams.get("connectionId");
  const connection = connectionId
    ? await getDb().metaConnection.findUnique({ where: { id: connectionId } })
    : await getDb().metaConnection.findFirst({ where: { active: true }, orderBy: { updatedAt: "desc" } });
  if (!connection?.instagramBusinessId) return NextResponse.json({ error: "Meta connection not found" }, { status: 404 });
  const version = process.env.META_GRAPH_VERSION || "v23.0";
  const url = new URL(`https://graph.facebook.com/${version}/${connection.instagramBusinessId}/insights`);
  url.search = new URLSearchParams({ metric: "reach,impressions,profile_views,total_interactions", period: "day", access_token: decryptSecret(connection.encryptedAccessToken) }).toString();
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(15_000) });
  const payload = await response.json() as InsightsResponse;
  if (!response.ok) return NextResponse.json({ error: payload.error?.message || "Meta insights failed" }, { status: 502 });
  const capturedAt = new Date();
  const points = (payload.data || []).flatMap((item) => (item.values || []).map((point) => ({ metric: item.name || "unknown", value: point.value || 0, capturedAt: point.end_time || capturedAt.toISOString() })));
  if (points.length) await getDb().metric.createMany({ data: points.map((point) => ({ provider: "META", metric: point.metric, value: point.value, capturedAt: new Date(point.capturedAt), dimensions: { connectionId: connection.id } })) });
  return NextResponse.json({ connectionId: connection.id, points, capturedAt: capturedAt.toISOString() }, { headers: { "Cache-Control": "no-store" } });
}
