import { NextRequest, NextResponse } from "next/server";
import { transcribeYouTubeVideo } from "@/lib/youtube/extractor";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "URL do vídeo do YouTube é obrigatória." },
        { status: 400 }
      );
    }

    const videoData = await transcribeYouTubeVideo(url);
    return NextResponse.json(videoData);
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error?.message ||
          "Ocorreu um erro ao transcrever o vídeo. Verifique se o vídeo possui legendas disponíveis.",
      },
      { status: 422 }
    );
  }
}
