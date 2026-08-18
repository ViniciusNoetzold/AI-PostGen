import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, title, channel } = body;

    if (!text) {
      return NextResponse.json(
        { error: "Texto da transcrição é obrigatório." },
        { status: 400 }
      );
    }

    // Se temos a chave do Gemini configurada
    if (GEMINI_API_KEY) {
      try {
        const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
        const prompt = `Você é um especialista em conteúdo e redação estratégica para mídias sociais.
Analise a seguinte transcrição do vídeo "${title || "Vídeo"}" (Canal: ${channel || "YouTube"}):

--- TRANSCRIÇÃO ---
${text.slice(0, 15000)}
-------------------

Gere uma resposta estruturada em Markdown contendo:
1. 💡 **Resumo Executivo** (3 a 5 linhas diretas e impactantes).
2. 🎯 **Principais Pontos-Chave & Aprendizados** (em tópicos com bullets).
3. 📱 **Ideia de Post para Redes Sociais** (com gancho inicial forte, desenvolvimento claro, emojis pontuais e chamada para ação).
4. 🏷️ **Hashtags Recomendadas**.

Responda em Português do Brasil com excelente formatação.`;

        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
        });

        const resultText = response.text || "";
        return NextResponse.json({ summary: resultText });
      } catch (geminiError: any) {
        console.error("Gemini AI error:", geminiError);
      }
    }

    // Fallback: resumo inteligente baseado em extração de frases-chave
    const sentences = text
      .split(/[.!?]+/)
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 25);

    const keySentences = sentences.slice(0, 6);

    const fallbackSummary = `### 💡 Resumo do Conteúdo: ${title || "Vídeo"}

**Canal:** ${channel || "YouTube"}

#### 🎯 Principais Destaques:
${keySentences.map((s: string) => `- ${s}.`).join("\n")}

#### 📱 Sugestão de Post:
🚀 *Confira os principais aprendizados deste conteúdo:*
${keySentences.slice(0, 3).map((s: string) => `👉 ${s}`).join("\n")}

💬 Qual desses pontos você achou mais relevante? Comente abaixo!

#conteudo #aprendizado #insights #produtividade`;

    return NextResponse.json({ summary: fallbackSummary });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Falha ao gerar resumo inteligente." },
      { status: 500 }
    );
  }
}
