import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

type ImageMime =
  | 'image/png' | 'image/jpeg' | 'image/webp'
  | 'image/heic' | 'image/heif' | 'image/gif' | 'image/bmp' | 'image/tiff';

interface InlineImage {
  data: string;
  mimeType: ImageMime;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, productImages = [], atmosphereImages = [], productImageUrl } = body as { prompt?: string, productImages?: InlineImage[], atmosphereImages?: InlineImage[], productImageUrl?: string };

    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY environment variable is missing');
    }

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: { timeout: 300000 },
    });

    console.log(`Sending request to Gemini Omni (${productImages.length} product images, ${atmosphereImages.length} atmosphere images)...`);

    let finalProductImages = [...productImages];
    if (productImageUrl) {
      try {
        console.log(`Fetching product image from URL: ${productImageUrl}`);
        const response = await fetch(productImageUrl);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const mimeType = response.headers.get('content-type') || 'image/png';
        finalProductImages.push({
          data: buffer.toString('base64'),
          mimeType: mimeType as ImageMime
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

    return NextResponse.json({ interactionId: interaction.id, uri: interaction.output_video.uri, fileId });
  } catch (e: any) {
    console.error('Error generating video:', e);
    return NextResponse.json({ error: e?.body || e.message }, { status: 500 });
  }
}
