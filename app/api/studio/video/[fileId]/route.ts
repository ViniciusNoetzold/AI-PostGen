import { NextRequest, NextResponse } from 'next/server';
import { getErrorMessage } from '@/lib/errors';
import { authorizeRequest } from '@/lib/server/authorization';
import { safeFileId } from '@/lib/server/security';

// Global cache for video buffers to avoid re-downloading on every range request during scrubbing.
// In development, Next.js clears modules on reload, so we use globalThis.
const globalVideoCache = globalThis as typeof globalThis & {
  videoCache?: Map<string, Buffer>;
};
if (!globalVideoCache.videoCache) {
  globalVideoCache.videoCache = new Map<string, Buffer>();
}
const videoCache = globalVideoCache.videoCache;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const denied = await authorizeRequest(req, 'viewer');
  if (denied) return denied;
  try {
    const { fileId: rawFileId } = await params;
    const fileId = safeFileId(rawFileId);

    let buffer = videoCache.get(fileId);
    if (!buffer) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY environment variable is missing');
      }
      
      const url = `https://generativelanguage.googleapis.com/v1beta/files/${fileId}:download?alt=media&key=${apiKey}`;
      const upstream = await fetch(url);
      
      if (!upstream.ok) {
        return new NextResponse(`Failed to fetch video: ${upstream.statusText}`, { status: upstream.status });
      }
      
      buffer = Buffer.from(await upstream.arrayBuffer());
      
      if (videoCache.size >= 12) {
        const oldest = videoCache.keys().next().value;
        if (oldest) videoCache.delete(oldest);
      }
      videoCache.set(fileId, buffer);
    }

    const total = buffer.length;
    const headers = new Headers();
    headers.set('Content-Type', 'video/mp4');
    headers.set('Accept-Ranges', 'bytes');
    headers.set('Cache-Control', 'public, max-age=31536000');

    const range = req.headers.get('range');
    if (range) {
      const match = /bytes=(\d*)-(\d*)/.exec(range);
      let start = match && match[1] ? parseInt(match[1], 10) : 0;
      let end = match && match[2] ? parseInt(match[2], 10) : total - 1;
      
      if (Number.isNaN(start)) start = 0;
      if (Number.isNaN(end) || end >= total) end = total - 1;
      
      if (start > end || start >= total) {
        headers.set('Content-Range', `bytes */${total}`);
        return new NextResponse(null, { status: 416, headers });
      }
      
      headers.set('Content-Range', `bytes ${start}-${end}/${total}`);
      headers.set('Content-Length', (end - start + 1).toString());
      
      return new NextResponse(new Uint8Array(buffer.subarray(start, end + 1)), {
        status: 206,
        headers,
      });
    } else {
      headers.set('Content-Length', total.toString());
      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers,
      });
    }
  } catch (e: unknown) {
    console.error('Error streaming video:', e);
    return new NextResponse(getErrorMessage(e), { status: 500 });
  }
}
