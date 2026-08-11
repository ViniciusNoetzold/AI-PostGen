import { NextResponse } from "next/server";

export async function GET() {
  const services = {
    authentication: Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY),
    database: Boolean(process.env.DATABASE_URL),
    objectStorage: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
    rateLimitStore: Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN),
    gemini: Boolean(process.env.GEMINI_API_KEY),
    telegram: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
    meta: Boolean(process.env.META_APP_ID && process.env.META_APP_SECRET),
  };
  return NextResponse.json({ status: "ok", services, timestamp: new Date().toISOString() }, {
    headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
  });
}
