import { NextRequest, NextResponse } from "next/server";
import { fetchYouTubePlaylist, isPlaylistUrl } from "@/lib/youtube/playlist";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "URL da playlist do YouTube é obrigatória." },
        { status: 400 }
      );
    }

    const playlistInfo = await fetchYouTubePlaylist(url);
    return NextResponse.json(playlistInfo);
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error?.message ||
          "Não foi possível carregar a playlist. Verifique se o link está correto e a playlist é pública.",
      },
      { status: 422 }
    );
  }
}
