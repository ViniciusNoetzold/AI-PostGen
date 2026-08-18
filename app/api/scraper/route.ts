import { NextRequest, NextResponse } from "next/server";
import { scrapeUrl } from "@/lib/scraper/engine";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, download_images, use_ai, userAgent, timeoutMs } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "URL é obrigatória e deve ser uma string válida." },
        { status: 400 }
      );
    }

    const result = await scrapeUrl(url, {
      downloadImages: Boolean(download_images),
      useAi: Boolean(use_ai),
      userAgent,
      timeoutMs,
    });

    if (result.status === "error") {
      return NextResponse.json(result, { status: 422 });
    }

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      {
        status: "error",
        error: err?.message || "Erro interno ao processar a requisição de scraping.",
        created_at: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
