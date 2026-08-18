export interface TranscriptSegment {
  text: string;
  start: number; // segundos
  duration: number; // segundos
}

export interface VideoData {
  video_id: string;
  url: string;
  title: string;
  channel: string;
  duration: number; // segundos
  thumbnail_url: string;
  transcript_data: TranscriptSegment[];
  source: string; // e.g. "Legendas Oficiais (PT)", "Legendas Automáticas", etc.
  full_text: string;
  language?: string;
  created_at: string;
}

export interface TranscribeHistoryItem {
  id: string;
  video_id: string;
  url: string;
  title: string;
  channel: string;
  thumbnail_url: string;
  duration: number;
  segments_count: number;
  created_at: string;
}
