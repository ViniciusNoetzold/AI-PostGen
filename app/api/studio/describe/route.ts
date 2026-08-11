import { NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/server/authorization';
import { GoogleGenAI } from '@google/genai';
import { getErrorMessage } from '@/lib/errors';
import { studioDescribeSchema } from '@/lib/schemas/api';
import { validateJsonRequest } from '@/lib/server/security';

function getAiClient() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY environment variable is missing');
  }
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: { timeout: 300000 },
  });
}

export async function POST(req: Request) {
  const denied = await authorizeRequest(req, 'editor');
  if (denied) return denied;
  try {
    const validated = await validateJsonRequest(req, studioDescribeSchema, 4_000_000);
    if (!validated.ok) return validated.response;
    const { type, images } = validated.data;
    const ai = getAiClient();

    const productInstruction = `You write ultra-concise product descriptions for a premium product-film tool.
Given product reference image(s), output ONE short description (1–2 sentences, plain language): what the product is, plus its key aesthetic and material details. Match the voice of these examples:
- "An oversized cup holder-friendly mug that comes with the last straw you will ever need."
- "Premium luxury running sneakers. Sculptural modular sole and an upper made out of suede nubuck leather and mesh sculptural panels."
- "A bottle of perfume called 'Nerelle'. The ornate bottle features real stone minerals, sodalite, and malachite."
Output ONLY the description text — no labels, no quotes, no preamble.`;

    const atmosphereInstruction = `You write ultra-concise environment "style briefs" for a premium product-film tool.
Given a reference image of an empty scene or backdrop, output ONE short style brief (1–3 sentences) describing the environment, materials, lighting and mood. Where the product would sit, refer to it as the literal token "the {product_id}" so it can be substituted later. Match the voice of these examples:
- "Minimalist craft luxury. A pristine Carrara marble plinth rests against a soft sage backdrop. Crisp directional sunlight casts soft shadows, creating an earthy yet elevated aesthetic. The {product_id} is seen in perfect detail, conveying texture, calm, and sophisticated gradients."
- "Mediterranean, modern luxury. Warm, porous travertine blocks create a structured geometric podium beneath a brilliant azure sky, presenting the {product_id} perfectly. Soft dappled leaf shadows contrast the sharp architectural lines, evoking a serene, sun-drenched coastal escape."
- "Mediterranean minimalism utilizing a warm sun-drenched, polished plaster corner with a soft rose-tinted floor. Crisp palm frond silhouettes cast dramatic yet serene shadows evoking a premium organic golden-hour mood."
Output ONLY the style brief text — no labels, no quotes, no preamble.`;

    const isAtmosphere = type === 'atmosphere';
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: [
        { text: isAtmosphere ? 'Describe this scene/backdrop as a style brief:' : 'Describe this product:' },
        ...images.map(img => ({ inlineData: { mimeType: img.mimeType, data: img.data } })),
      ],
      config: {
        systemInstruction: isAtmosphere ? atmosphereInstruction : productInstruction,
        maxOutputTokens: 512,
        temperature: 0.7,
      },
    });

    return NextResponse.json({ description: (response.text || '').trim() });
  } catch (e: unknown) {
    console.error('Error describing image:', e);
    return NextResponse.json({ error: getErrorMessage(e) }, { status: 500 });
  }
}
