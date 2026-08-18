export type MetadataInfo = {
  title?: string;
  description?: string;
  author?: string;
  publish_date?: string;
  favicon?: string;
  canonical_url?: string;
  language?: string;
  og_tags?: Record<string, string>;
  twitter_tags?: Record<string, string>;
  schema_org?: any[];
};

export type ContentNode = {
  tag: string;
  text?: string;
  children?: ContentNode[];
  attributes?: Record<string, string>;
};

export type ImageInfo = {
  url: string;
  absolute_url: string;
  filename?: string;
  alt_text?: string;
  title?: string;
  caption?: string;
  section?: string;
  position?: number;
  width?: number;
  height?: number;
  format?: string;
  local_path?: string;
  ai_description?: string;
};

export type StructureNode = {
  tag: string;
  id?: string;
  classes?: string[];
  text_preview?: string;
  children?: StructureNode[];
};

export type PageStats = {
  heading_count: number;
  paragraph_count: number;
  image_count: number;
  link_count: number;
  table_count: number;
  list_count: number;
  code_block_count: number;
  word_count: number;
  char_count: number;
};

export type ScrapeResponse = {
  id: string;
  url: string;
  status: "pending" | "processing" | "completed" | "complete" | "error";
  metadata?: MetadataInfo;
  content?: ContentNode[];
  images?: ImageInfo[];
  structure?: StructureNode;
  raw_html?: string;
  clean_html?: string;
  markdown?: string;
  text_content?: string;
  stats?: PageStats;
  technologies?: string[];
  created_at: string;
  error?: string;
};

export type CompareResponse = {
  id: string;
  url1: string;
  url2: string;
  status: "pending" | "processing" | "completed" | "complete" | "error";
  text_diffs?: {
    type: "added" | "removed" | "unchanged";
    text: string;
  }[];
  structure_diffs?: {
    type: "added" | "removed" | "modified";
    description: string;
  }[];
  images_added?: ImageInfo[];
  images_removed?: ImageInfo[];
  similarity_score?: number;
  created_at: string;
  error?: string;
};

export type CrawlPageItem = {
  url: string;
  title?: string;
  status_code?: number;
  depth: number;
  links_count?: number;
  images_count?: number;
  word_count?: number;
};

export type CrawlResponse = {
  id: string;
  base_url: string;
  status: "pending" | "processing" | "completed" | "complete" | "error";
  pages_found: number;
  pages_scraped: number;
  pages?: CrawlPageItem[];
  sitemap?: string;
  created_at: string;
  error?: string;
};

export type HistoryItem = {
  id: string;
  url: string;
  title?: string;
  status: string;
  created_at: string;
  image_count?: number;
  word_count?: number;
};

export type ScraperSettings = {
  backendUrl: string;
  useBackend: boolean;
  userAgent: string;
  timeoutMs: number;
};
