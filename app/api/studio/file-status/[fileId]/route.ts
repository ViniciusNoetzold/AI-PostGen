import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params;
    
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY environment variable is missing');
    }

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });
    
    const fInfo = await ai.files.get({ name: `files/${fileId}` });
    const state = (fInfo.state as any)?.name || fInfo.state;
    
    return NextResponse.json({ state });
  } catch (e: any) {
    console.error('Error getting file status:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
