import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/server/authorization';
import { GoogleGenAI } from '@google/genai';
import { getProviderErrorMessage } from '@/lib/errors';
import { recordStudioGeneration } from '@/lib/server/studio-metrics';
import { studioGenerateVideoSchema } from '@/lib/schemas/api';
import { assertSafeRemoteUrl, validateJsonRequest } from '@/lib/server/security';

export async function POST(req: NextRequest) {
  const denied = await authorizeRequest(req, 'editor');
  if (denied) return denied;
  try {
    const validated = await validateJsonRequest(req, studioGenerateVideoSchema, 4_000_000);
    if (!validated.ok) return validated.response;
    const { prompt, productImages, atmosphereImages, productImageUrl } = validated.data;

    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY environment variable is missing');
    }

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: { timeout: 300000 },
    });

    console.log(`Sending request to Gemini Omni (${productImages.length} product images, ${atmosphereImages.length} atmosphere images)...`);

    const finalProductImages = [...productImages];
    if (productImageUrl) {
      try {
        const safeProductImageUrl = await assertSafeRemoteUrl(productImageUrl);
        console.log(`Fetching product image from allowed host: ${safeProductImageUrl.hostname}`);
        const response = await fetch(safeProductImageUrl, { redirect: 'error', signal: AbortSignal.timeout(15_000) });
        if (!response.ok) throw new Error(`Remote image returned ${response.status}`);
        const declaredLength = Number(response.headers.get('content-length') || 0);
        if (declaredLength > 4_000_000) throw new Error('Remote image is too large');
        const arrayBuffer = await response.arrayBuffer();
        if (arrayBuffer.byteLength > 4_000_000) throw new Error('Remote image is too large');
        const buffer = Buffer.from(arrayBuffer);
        const mimeType = response.headers.get('content-type') || 'image/png';
        if (!mimeType.startsWith('image/')) throw new Error('Remote resource is not an image');
        finalProductImages.push({
          data: buffer.toString('base64'),
          mimeType: mimeType as typeof productImages[number]['mimeType']
        });
      } catch (err) {
        console.error('Failed to fetch productImageUrl:', err);
      }
    }
    const interaction = await ai.interactions.create({
      model: 'gemini-omni-flash-preview',
      input: [
          ...finalProductImages.map(img => ({ type: 'image' as const, data: img.data, mime_type: img.mimeType })),
          ...atmosphereImages.map(img => ({ type: 'image' as const, data: img.data, mime_type: img.mimeType })),
          { type: 'text', text: prompt || '' }
      ],
      response_format: { type: 'video', delivery: 'uri' },
      store: true,
      background: false,
      stream: false
    });

    console.log(`Interaction created: ${interaction.id}`);
    
    if (!interaction.output_video || !interaction.output_video.uri) {
      throw new Error('No video URI returned from interaction.');
    }
    
    const fileIdMatch = interaction.output_video.uri.match(/files\/([a-zA-Z0-9_-]+)/);
    const fileId = fileIdMatch ? fileIdMatch[1] : null;
    if (!interaction.id || !fileId) throw new Error('Invalid video identifiers returned by Gemini.');

    await recordStudioGeneration({ interactionId: interaction.id, fileId, kind: 'generation' })
      .catch((metricError: unknown) => console.error('Unable to record Studio metric:', metricError));

    return NextResponse.json({ interactionId: interaction.id, uri: interaction.output_video.uri, fileId });
  } catch (e: unknown) {
    console.error('Error generating video:', e);
    return NextResponse.json({ error: getProviderErrorMessage(e) }, { status: 500 });
  }
}
