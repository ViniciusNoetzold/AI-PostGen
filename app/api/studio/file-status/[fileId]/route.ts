import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { getErrorMessage } from '@/lib/errors';
import { authorizeRequest } from '@/lib/server/authorization';
import { safeFileId } from '@/lib/server/security';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const denied = await authorizeRequest(req, 'viewer');
  if (denied) return denied;
  try {
    const { fileId: rawFileId } = await params;
    const fileId = safeFileId(rawFileId);
    
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY environment variable is missing');
    }

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });
    
    const fInfo = await ai.files.get({ name: `files/${fileId}` });
    const rawState: unknown = fInfo.state;
    const state = typeof rawState === 'object' && rawState !== null && 'name' in rawState
      ? String((rawState as { name: unknown }).name)
      : String(rawState ?? 'UNKNOWN');
    
    return NextResponse.json({ state });
  } catch (e: unknown) {
    console.error('Error getting file status:', e);
    return NextResponse.json({ error: getErrorMessage(e) }, { status: 500 });
  }
}
