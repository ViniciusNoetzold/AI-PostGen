import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { previousInteractionId, instructions } = body as { previousInteractionId?: string; instructions?: string };
    
    if (!previousInteractionId || !instructions) {
      return NextResponse.json({ error: 'previousInteractionId and instructions are required' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY environment variable is missing');
    }

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: { timeout: 300000 },
    });

    console.log(`Editing interaction ${previousInteractionId}...`);
    const interaction = await ai.interactions.create({
      model: 'gemini-omni-flash-preview',
      previous_interaction_id: previousInteractionId,
      input: [{ type: 'text', text: instructions }],
      response_format: { type: 'video', delivery: 'uri' },
      store: true,
      background: false,
      stream: false
    });

    if (!interaction.output_video || !interaction.output_video.uri) {
      throw new Error('No video URI returned from interaction.');
    }

    const fileIdMatch = interaction.output_video.uri.match(/files\/([a-zA-Z0-9_-]+)/);
    const fileId = fileIdMatch ? fileIdMatch[1] : null;

    return NextResponse.json({ interactionId: interaction.id, uri: interaction.output_video.uri, fileId });
  } catch (e: any) {
    console.error('Error editing video:', e);
    return NextResponse.json({ error: e?.body || e.message }, { status: 500 });
  }
}
