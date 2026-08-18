import { NextRequest, NextResponse } from "next/server";
import { compareUrls } from "@/lib/scraper/compare";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url1, url2 } = body;

    if (!url1 || !url2) {
      return NextResponse.json(
        { error: "Ambas as URLs (url1 e url2) são obrigatórias." },
        { status: 400 }
      );
    }

    const result = await compareUrls(url1, url2);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      {
        status: "error",
        error: err?.message || "Erro ao executar comparação de URLs.",
        created_at: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
