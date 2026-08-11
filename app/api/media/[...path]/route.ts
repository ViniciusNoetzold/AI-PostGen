import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/server/authorization";
import { safeFileId, safeResolvePath } from "@/lib/server/security";

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const denied = await authorizeRequest(request, "viewer");
  if (denied) return denied;

  try {
    const segments = (await params).path.map(safeFileId);
    const baseDirectory = path.resolve(process.cwd(), ".data", "media");
    const target = safeResolvePath(baseDirectory, path.join(...segments));
    const buffer = await fs.readFile(target);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": CONTENT_TYPES[path.extname(target).toLowerCase()] || "application/octet-stream",
        "Content-Length": String(buffer.byteLength),
        "Cache-Control": "private, max-age=3600, immutable",
        "Content-Disposition": `inline; filename="${path.basename(target).replace(/[\"\r\n]/g, "")}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Media not found", code: "MEDIA_NOT_FOUND" }, { status: 404 });
  }
}
