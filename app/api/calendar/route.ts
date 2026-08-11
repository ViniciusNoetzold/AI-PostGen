import { NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/server/authorization";
import { getDb, isDatabaseConfigured } from "@/lib/server/db";

export async function GET(request: Request) {
  const denied = await authorizeRequest(request, "viewer");
  if (denied) return denied;
  if (!isDatabaseConfigured()) return NextResponse.json({ posts: [], databaseConfigured: false });
  const posts = await getDb().post.findMany({
    include: { client: { select: { name: true } }, media: { select: { id: true, kind: true, url: true } } },
    orderBy: [{ scheduledAt: "asc" }, { createdAt: "desc" }],
    take: 200,
  });
  return NextResponse.json({ posts, databaseConfigured: true }, { headers: { "Cache-Control": "no-store" } });
}
