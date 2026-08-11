import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/server/authorization';
import { GoogleGenAI } from '@google/genai';
import { getProviderErrorMessage } from '@/lib/errors';
import { recordStudioGeneration } from '@/lib/server/studio-metrics';
import { studioEditVideoSchema } from '@/lib/schemas/api';
import { validateJsonRequest } from '@/lib/server/security';

export async function POST(req: NextRequest) {
  const denied = await authorizeRequest(req, 'editor');
  if (denied) return denied;
  try {
    const validated = await validateJsonRequest(req, studioEditVideoSchema);
    if (!validated.ok) return validated.response;
    const { previousInteractionId, instructions } = validated.data;

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
    if (!interaction.id || !fileId) throw new Error('Invalid video identifiers returned by Gemini.');

    await recordStudioGeneration({ interactionId: interaction.id, fileId, kind: 'edit' })
      .catch((metricError: unknown) => console.error('Unable to record Studio metric:', metricError));

    return NextResponse.json({ interactionId: interaction.id, uri: interaction.output_video.uri, fileId });
  } catch (e: unknown) {
    console.error('Error editing video:', e);
    return NextResponse.json({ error: getProviderErrorMessage(e) }, { status: 500 });
  }
}
