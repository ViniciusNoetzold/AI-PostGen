import { TranscriptSegment, VideoData } from "./types";

export interface PlaylistItem {
  videoId: string;
  url: string;
  title: string;
  channel?: string;
  thumbnailUrl: string;
  duration?: number;
}

export interface PlaylistInfo {
  playlistId: string;
  title: string;
  channel?: string;
  videoCount: number;
  videos: PlaylistItem[];
}

export interface QueueItem {
  id: string;
  videoId: string;
  url: string;
  title: string;
  channel?: string;
  thumbnailUrl: string;
  duration?: number;
  status: "pending" | "processing" | "completed" | "error";
  progress?: number;
  error?: string;
  videoData?: VideoData;
  addedAt: string;
}

/** Extrai o ID da playlist a partir de uma URL do YouTube. */
export function extractPlaylistId(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();

  const match = trimmed.match(/[?&]list=([a-zA-Z0-9_-]+)/i);
  if (match && match[1]) {
    return match[1];
  }

  return null;
}

/** Detecta se uma URL é uma playlist do YouTube. */
export function isPlaylistUrl(url: string): boolean {
  return Boolean(extractPlaylistId(url));
}

/** Busca e extrai a lista de vídeos de uma playlist do YouTube. */
export async function fetchYouTubePlaylist(playlistUrlOrId: string): Promise<PlaylistInfo> {
  const playlistId = extractPlaylistId(playlistUrlOrId) || playlistUrlOrId.trim();

  if (!playlistId) {
    throw new Error("ID ou URL da Playlist inválida.");
  }

  // 1. Tenta via Innertube Browse API
  try {
    const browseId = playlistId.startsWith("VL") ? playlistId : `VL${playlistId}`;
    const payload = {
      context: {
        client: {
          clientName: "WEB",
          clientVersion: "2.20240308.00.00",
          hl: "pt-BR",
          gl: "BR",
        },
      },
      browseId,
    };

    const res = await fetch("https://www.youtube.com/youtubei/v1/browse", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      const title =
        data?.header?.playlistHeaderRenderer?.title?.simpleText ||
        data?.metadata?.playlistMetadataRenderer?.title ||
        "Playlist do YouTube";

      const channel =
        data?.header?.playlistHeaderRenderer?.ownerText?.runs?.[0]?.text ||
        "YouTube";

      const tabs = data?.contents?.twoColumnBrowseResultsRenderer?.tabs || [];
      const sectionContents =
        tabs[0]?.tabRenderer?.content?.sectionListRenderer?.contents?.[0]
          ?.itemSectionRenderer?.contents?.[0]?.playlistVideoListRenderer
          ?.contents || [];

      const videos: PlaylistItem[] = [];

      for (const item of sectionContents) {
        const vid = item.playlistVideoRenderer;
        if (!vid || !vid.videoId) continue;

        const videoId = vid.videoId;
        const vidTitle = vid.title?.runs?.[0]?.text || vid.title?.accessibility?.accessibilityData?.label || `Vídeo ${videoId}`;
        const vidChannel = vid.shortBylineText?.runs?.[0]?.text || channel;
        const lengthSeconds = vid.lengthSeconds ? parseInt(vid.lengthSeconds, 10) : undefined;
        const thumb =
          vid.thumbnail?.thumbnails?.[vid.thumbnail?.thumbnails?.length - 1]?.url ||
          `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

        videos.push({
          videoId,
          url: `https://www.youtube.com/watch?v=${videoId}`,
          title: vidTitle,
          channel: vidChannel,
          thumbnailUrl: thumb,
          duration: lengthSeconds,
        });
      }

      if (videos.length > 0) {
        return {
          playlistId,
          title,
          channel,
          videoCount: videos.length,
          videos,
        };
      }
    }
  } catch {
    // fallback para scraping do html da playlist
  }

  // 2. Fallback: raspando HTML público da playlist
  const pageUrl = `https://www.youtube.com/playlist?list=${playlistId}`;
  const response = await fetch(pageUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
    },
  });

  if (!response.ok) {
    throw new Error(`Erro ao acessar playlist (HTTP ${response.status}).`);
  }

  const html = await response.text();

  // Título da playlist
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  let playlistTitle = titleMatch ? titleMatch[1].replace(" - YouTube", "").trim() : "Playlist do YouTube";

  // Extrai IDs dos vídeos
  const videoIdRegex = /"videoId":"([a-zA-Z0-9_-]{11})"/g;
  const foundIds = new Set<string>();
  let vMatch;

  while ((vMatch = videoIdRegex.exec(html)) !== null) {
    foundIds.add(vMatch[1]);
  }

  if (foundIds.size === 0) {
    throw new Error("Nenhum vídeo encontrado nesta playlist ou playlist privada.");
  }

  const videos: PlaylistItem[] = Array.from(foundIds).map((vId, idx) => ({
    videoId: vId,
    url: `https://www.youtube.com/watch?v=${vId}`,
    title: `Vídeo ${idx + 1} (${vId})`,
    thumbnailUrl: `https://img.youtube.com/vi/${vId}/hqdefault.jpg`,
  }));

  return {
    playlistId,
    title: playlistTitle,
    videoCount: videos.length,
    videos,
  };
}
