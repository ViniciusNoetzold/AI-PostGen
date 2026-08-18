import { NextRequest, NextResponse } from "next/server";
import {
  autoPullBrowserCookies,
  getSessionStatus,
  setActiveCookies,
} from "@/lib/youtube/session";

export async function GET() {
  try {
    const status = getSessionStatus();
    return NextResponse.json(status);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Erro ao obter status da sessão." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { manualCookies } = body;

    if (manualCookies && typeof manualCookies === "string") {
      setActiveCookies(manualCookies, "Manual / Personalizado");
      return NextResponse.json({
        success: true,
        message: "Cookies manuais atualizados com sucesso!",
        status: getSessionStatus(),
      });
    }

    // Executa a auto-obtenção / renovação da sessão
    const result = await autoPullBrowserCookies();
    return NextResponse.json({
      ...result,
      status: getSessionStatus(),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Erro ao auto-puxar sessão de cookies.",
      },
      { status: 500 }
    );
  }
}
