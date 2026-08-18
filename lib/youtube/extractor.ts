import { TranscriptSegment, VideoData } from "./types";
import { getActiveCookies } from "./session";

/** Extrai o ID do vídeo de qualquer formato comum de link do YouTube. */
export function extractVideoId(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();

  // Se já for apenas o ID de 11 caracteres
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?(?:.*&)?v=([a-zA-Z0-9_-]{11})/i,
    /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})/i,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/i,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/i,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/live\/([a-zA-Z0-9_-]{11})/i,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/v\/([a-zA-Z0-9_-]{11})/i,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/** Formata segundos para MM:SS ou HH:MM:SS. */
export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "00:00";
  const s = Math.floor(seconds);
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;

  const mm = String(mins).padStart(2, "0");
  const ss = String(secs).padStart(2, "0");

  if (hrs > 0) {
    const hh = String(hrs).padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}

/** Formata segundos para o formato de tempo SRT (HH:MM:SS,mmm). */
export function formatSrtTime(seconds: number): string {
  const s = Math.max(0, seconds);
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = Math.floor(s % 60);
  const ms = Math.floor((s - Math.floor(s)) * 1000);

  const hh = String(hrs).padStart(2, "0");
  const mm = String(mins).padStart(2, "0");
  const ss = String(secs).padStart(2, "0");
  const mmm = String(ms).padStart(3, "0");

  return `${hh}:${mm}:${ss},${mmm}`;
}

/** Limpa e decodifica entidades HTML e quebras de linha em textos de legendas. */
export function decodeTranscriptText(text: string): string {
  if (!text) return "";
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&apos;/g, "'")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Busca metadados públicos do vídeo via oEmbed API do YouTube. */
export async function fetchVideoMetadata(videoId: string): Promise<{
  title: string;
  channel: string;
  thumbnail_url: string;
}> {
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const res = await fetch(oembedUrl, { next: { revalidate: 3600 } });
    if (res.ok) {
      const data = await res.json();
      return {
        title: data.title || "Vídeo do YouTube",
        channel: data.author_name || "Canal do YouTube",
        thumbnail_url: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      };
    }
  } catch {
    // fallback
  }

  return {
    title: `Vídeo (${videoId})`,
    channel: "YouTube",
    thumbnail_url: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
  };
}

/** Método 1: Busca faixas de legendas usando a API Innertube (Cliente Android/TV - Bypassa verificação de cookies). */
async function fetchCaptionsViaInnertube(videoId: string): Promise<{
  captionTracks: any[];
  duration?: number;
} | null> {
  const clients = [
    { clientName: "ANDROID", clientVersion: "19.09.37" },
    { clientName: "TV_EMBEDDED", clientVersion: "1.0" },
    { clientName: "WEB_CREATOR", clientVersion: "1.0" },
    { clientName: "WEB", clientVersion: "2.20240308.00.00" },
  ];

  for (const c of clients) {
    try {
      const payload = {
        context: {
          client: {
            clientName: c.clientName,
            clientVersion: c.clientVersion,
            hl: "pt-BR",
            gl: "BR",
            utcOffsetMinutes: -180,
          },
        },
        videoId,
      };

      const res = await fetch("https://www.youtube.com/youtubei/v1/player", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent":
            "com.google.android.youtube/19.09.37 (Linux; U; Android 11) gzip",
          "X-YouTube-Client-Name": c.clientName === "ANDROID" ? "3" : "1",
          "X-YouTube-Client-Version": c.clientVersion,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        const tracks =
          data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
        const durationSec = data?.videoDetails?.lengthSeconds
          ? parseInt(data.videoDetails.lengthSeconds, 10)
          : undefined;

        if (tracks && tracks.length > 0) {
          return { captionTracks: tracks, duration: durationSec };
        }
      }
    } catch {
      // tenta próximo cliente
    }
  }

  return null;
}

/** Método 2: Busca legendas raspando o HTML do watch page com headers de sessão. */
async function fetchCaptionsViaWatchPage(videoId: string): Promise<{
  captionTracks: any[];
  duration?: number;
} | null> {
  try {
    const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const cookieHeader = getActiveCookies() || "PREF=f4=4000000&hl=pt-BR&gl=BR";

    const response = await fetch(watchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
        "Cookie": cookieHeader,
      },
    });

    if (!response.ok) return null;
    const html = await response.text();

    const playerResponseMatch = html.match(/ytInitialPlayerResponse\s*=\s*({.+?});/);
    if (playerResponseMatch && playerResponseMatch[1]) {
      const playerResponse = JSON.parse(playerResponseMatch[1]);
      const tracks =
        playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
      const durationSec = playerResponse?.videoDetails?.lengthSeconds
        ? parseInt(playerResponse.videoDetails.lengthSeconds, 10)
        : undefined;

      if (tracks && tracks.length > 0) {
        return { captionTracks: tracks, duration: durationSec };
      }
    }
  } catch {
    // ignore
  }

  return null;
}

/** Analisa qualquer formato de dados de legenda retornado pelo YouTube (JSON3, XML padrão, SRV3 ou WebVTT). */
export function parseCaptionData(rawText: string): TranscriptSegment[] {
  const segments: TranscriptSegment[] = [];
  if (!rawText || typeof rawText !== "string") return segments;

  // 1. Tenta formato JSON3
  try {
    const json = JSON.parse(rawText);
    if (json.events && Array.isArray(json.events)) {
      for (const evt of json.events) {
        if (!evt.segs || !Array.isArray(evt.segs)) continue;
        const text = decodeTranscriptText(
          evt.segs.map((s: any) => s.utf8 || "").join("")
        );
        if (!text) continue;
        const start = (evt.tStartMs || 0) / 1000;
        const duration = (evt.dDurationMs || 0) / 1000;
        segments.push({ text, start, duration });
      }
      if (segments.length > 0) return segments;
    }
  } catch {}

  // 2. Tenta XML padrão (<text start="1.23" dur="2.5">Texto</text>)
  const textTagRegex = /<text\s+[^>]*start="([\d.]+)"(?:\s+dur="([\d.]+)")?[^>]*>([\s\S]*?)<\/text>/gi;
  let match;
  while ((match = textTagRegex.exec(rawText)) !== null) {
    const start = parseFloat(match[1]);
    const duration = match[2] ? parseFloat(match[2]) : 2.0;
    const text = decodeTranscriptText(match[3]);
    if (text) {
      segments.push({ text, start, duration });
    }
  }
  if (segments.length > 0) return segments;

  // 3. Tenta formato SRV3 / TimedText XML (<p t="1234" d="2000"><s>Texto</s></p>)
  const pTagRegex = /<p\s+[^>]*t="(\d+)"(?:\s+d="(\d+)")?[^>]*>([\s\S]*?)<\/p>/gi;
  while ((match = pTagRegex.exec(rawText)) !== null) {
    const start = parseInt(match[1], 10) / 1000;
    const duration = match[2] ? parseInt(match[2], 10) / 1000 : 2.0;
    const cleanText = decodeTranscriptText(match[3].replace(/<[^>]+>/g, ""));
    if (cleanText) {
      segments.push({ text: cleanText, start, duration });
    }
  }
  if (segments.length > 0) return segments;

  // 4. Tenta formato WebVTT (00:00:01.000 --> 00:00:04.000 \n Texto)
  const vttRegex = /(?:(\d{1,2}:)?(\d{2}):(\d{2})[.,](\d{3}))\s*-->\s*(?:(\d{1,2}:)?(\d{2}):(\d{2})[.,](\d{3}))[\r\n]+([\s\S]*?)(?=(?:\r?\n\r?\n|\r?\n\d|\r?\n[0-9]{2}:|$))/g;
  while ((match = vttRegex.exec(rawText)) !== null) {
    const hrs = match[1] ? parseInt(match[1], 10) : 0;
    const mins = parseInt(match[2], 10);
    const secs = parseInt(match[3], 10);
    const ms = parseInt(match[4], 10);
    const start = hrs * 3600 + mins * 60 + secs + ms / 1000;

    const endHrs = match[5] ? parseInt(match[5], 10) : 0;
    const endMins = parseInt(match[6], 10);
    const endSecs = parseInt(match[7], 10);
    const endMs = parseInt(match[8], 10);
    const end = endHrs * 3600 + endMins * 60 + endSecs + endMs / 1000;
    const duration = Math.max(1, end - start);

    const text = decodeTranscriptText(match[9].replace(/<[^>]+>/g, ""));
    if (text) {
      segments.push({ text, start, duration });
    }
  }

  return segments;
}

/** Obtém e processa a lista de legendas cronometradas do YouTube. */
export async function fetchYouTubeTranscript(videoId: string): Promise<{
  segments: TranscriptSegment[];
  source: string;
  language?: string;
  duration: number;
}> {
  // 1. Tenta via Innertube API direta (sem necessidade de cookies)
  let captionResult = await fetchCaptionsViaInnertube(videoId);

  // 2. Fallback para watch page caso necessário
  if (!captionResult || captionResult.captionTracks.length === 0) {
    captionResult = await fetchCaptionsViaWatchPage(videoId);
  }

  if (!captionResult || captionResult.captionTracks.length === 0) {
    throw new Error(
      "Nenhuma legenda ou transcrição disponível para este vídeo no YouTube. Verifique se o vídeo possui legendas ativadas."
    );
  }

  const captionTracks = captionResult.captionTracks;

  // Seleciona a melhor faixa (prioriza Português manual, depois PT automático, depois Inglês)
  let selectedTrack = captionTracks.find(
    (t: any) =>
      (t.languageCode === "pt" || t.languageCode === "pt-BR") &&
      t.kind !== "asr"
  );

  if (!selectedTrack) {
    selectedTrack = captionTracks.find(
      (t: any) => t.languageCode === "pt" || t.languageCode === "pt-BR"
    );
  }

  if (!selectedTrack) {
    selectedTrack = captionTracks.find(
      (t: any) => t.languageCode === "en" && t.kind !== "asr"
    );
  }

  if (!selectedTrack) {
    selectedTrack = captionTracks[0];
  }

  const transcriptBaseUrl = selectedTrack.baseUrl;
  if (!transcriptBaseUrl) {
    throw new Error("Faixa de legendas sem URL válida.");
  }

  let segments: TranscriptSegment[] = [];

  const urlsToTry = [
    transcriptBaseUrl.includes("fmt=json3") ? transcriptBaseUrl : `${transcriptBaseUrl}&fmt=json3`,
    transcriptBaseUrl.includes("fmt=srv3") ? transcriptBaseUrl : `${transcriptBaseUrl}&fmt=srv3`,
    transcriptBaseUrl,
  ];

  for (const targetUrl of urlsToTry) {
    try {
      const timedRes = await fetch(targetUrl);
      if (timedRes.ok) {
        const textData = await timedRes.text();
        segments = parseCaptionData(textData);
        if (segments.length > 0) break;
      }
    } catch {}
  }

  if (segments.length === 0) {
    throw new Error("Não foi possível decodificar os blocos de texto da transcrição.");
  }

  const lastSegment = segments[segments.length - 1];
  const calculatedDuration =
    captionResult.duration || Math.ceil(lastSegment.start + lastSegment.duration);

  const isAsr = selectedTrack.kind === "asr";
  const langName =
    selectedTrack.name?.simpleText || selectedTrack.languageCode || "PT";
  const source = isAsr
    ? `Legendas Automáticas (${langName})`
    : `Legendas Oficiais (${langName})`;

  return {
    segments,
    source,
    language: selectedTrack.languageCode,
    duration: calculatedDuration,
  };
}

/** Transcreve completamente um vídeo do YouTube com metadados e segmentos. */
export async function transcribeYouTubeVideo(url: string): Promise<VideoData> {
  const videoId = extractVideoId(url);
  if (!videoId) {
    throw new Error("URL do YouTube inválida ou ID do vídeo não reconhecido.");
  }

  const cleanUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const metadata = await fetchVideoMetadata(videoId);
  const transcript = await fetchYouTubeTranscript(videoId);

  const fullText = transcript.segments.map((s) => s.text).join(" ");

  return {
    video_id: videoId,
    url: cleanUrl,
    title: metadata.title,
    channel: metadata.channel,
    thumbnail_url: metadata.thumbnail_url,
    duration: transcript.duration,
    transcript_data: transcript.segments,
    source: transcript.source,
    language: transcript.language,
    full_text: fullText,
    created_at: new Date().toISOString(),
  };
}

/** Gera arquivo SRT de legendas a partir dos segmentos. */
export function generateSrtContent(segments: TranscriptSegment[]): string {
  return segments
    .map((seg, idx) => {
      const startStr = formatSrtTime(seg.start);
      const endStr = formatSrtTime(seg.start + (seg.duration || 2));
      return `${idx + 1}\n${startStr} --> ${endStr}\n${seg.text}\n`;
    })
    .join("\n");
}

/** Gera documento Markdown formatado com cabeçalho, metadados e falas cronometradas. */
export function generateMarkdownContent(video: VideoData): string {
  const header = `# Transcrição: ${video.title}

- **Canal:** ${video.channel}
- **URL do Vídeo:** [${video.url}](${video.url})
- **Duração:** ${formatTime(video.duration)}
- **Fonte da Transcrição:** ${video.source}
- **Data da Extração:** ${new Date().toLocaleDateString("pt-BR")}

---

## 📝 Transcrição Completa

`;

  const timeline = video.transcript_data
    .map((seg) => `> **[${formatTime(seg.start)}]** ${seg.text}`)
    .join("\n\n");

  return header + timeline;
}
