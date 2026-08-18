import { NextRequest, NextResponse } from "next/server";
import { crawlDomain } from "@/lib/scraper/crawler";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { base_url, max_depth, max_pages } = body;

    if (!base_url) {
      return NextResponse.json(
        { error: "A URL base (base_url) é obrigatória." },
        { status: 400 }
      );
    }

    const result = await crawlDomain(base_url, {
      maxDepth: max_depth ? Number(max_depth) : undefined,
      maxPages: max_pages ? Number(max_pages) : undefined,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      {
        status: "error",
        error: err?.message || "Erro ao executar crawler.",
        created_at: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
