import {
  ScrapeResponse,
  MetadataInfo,
  ContentNode,
  ImageInfo,
  StructureNode,
  PageStats,
} from "./types";

/** Resolve uma URL relativa para absoluta com base na URL pai. */
export function resolveAbsoluteUrl(relativeUrl: string, baseUrl: string): string {
  try {
    if (!relativeUrl) return "";
    if (relativeUrl.startsWith("data:") || relativeUrl.startsWith("blob:")) return relativeUrl;
    return new URL(relativeUrl, baseUrl).href;
  } catch {
    return relativeUrl;
  }
}

/** Limpa entidades HTML comuns e espaços extras. */
export function decodeHtmlEntities(str: string): string {
  if (!str) return "";
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Remove todas as tags HTML mantendo apenas o texto puro. */
export function stripHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Extrai atributos de uma tag HTML como objeto. */
export function parseAttributes(tagString: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const attrRegex = /([a-zA-Z0-9_:-]+)(?:=(?:"([^"]*)"|'([^']*)'|([^>\s]+)))?/g;
  let match;
  while ((match = attrRegex.exec(tagString)) !== null) {
    const key = match[1].toLowerCase();
    const val = match[2] ?? match[3] ?? match[4] ?? "";
    if (key !== "tag") {
      attrs[key] = decodeHtmlEntities(val);
    }
  }
  return attrs;
}

/** Detecta tecnologias usadas na página através de padrões no HTML e scripts. */
export function detectTechnologies(html: string): string[] {
  const techs = new Set<string>();
  const lower = html.toLowerCase();

  if (lower.includes("__next") || lower.includes("/_next/")) techs.add("Next.js");
  if (lower.includes("react") || lower.includes("data-reactroot")) techs.add("React");
  if (lower.includes("vue") || lower.includes("data-v-")) techs.add("Vue.js");
  if (lower.includes("ng-version") || lower.includes("angular")) techs.add("Angular");
  if (lower.includes("wp-content") || lower.includes("wordpress")) techs.add("WordPress");
  if (lower.includes("shopify")) techs.add("Shopify");
  if (lower.includes("tailwind") || lower.includes("tailwindcss")) techs.add("Tailwind CSS");
  if (lower.includes("bootstrap")) techs.add("Bootstrap");
  if (lower.includes("jquery")) techs.add("jQuery");
  if (lower.includes("google-analytics.com") || lower.includes("gtag(") || lower.includes("ga(")) techs.add("Google Analytics");
  if (lower.includes("googletagmanager.com")) techs.add("Google Tag Manager");
  if (lower.includes("cloudflare")) techs.add("Cloudflare");
  if (lower.includes("vercel")) techs.add("Vercel");
  if (lower.includes("schema.org")) techs.add("Schema.org (Microdata/JSON-LD)");

  return Array.from(techs);
}

/** Extrai metadados completos de SEO, OpenGraph, Twitter e Favicon. */
export function extractMetadata(html: string, baseUrl: string): MetadataInfo {
  const metadata: MetadataInfo = {
    og_tags: {},
    twitter_tags: {},
    schema_org: [],
  };

  // Title
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  if (titleMatch && titleMatch[1]) {
    metadata.title = decodeHtmlEntities(titleMatch[1]);
  }

  // Canonical
  const canonicalMatch = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["']/i);
  if (canonicalMatch && canonicalMatch[1]) {
    metadata.canonical_url = resolveAbsoluteUrl(canonicalMatch[1], baseUrl);
  }

  // Favicon
  const faviconMatch = html.match(/<link[^>]*rel=["'](?:shortcut icon|icon|apple-touch-icon)["'][^>]*href=["']([^"']*)["']/i);
  if (faviconMatch && faviconMatch[1]) {
    metadata.favicon = resolveAbsoluteUrl(faviconMatch[1], baseUrl);
  } else {
    try {
      metadata.favicon = new URL("/favicon.ico", baseUrl).href;
    } catch {
      // ignore
    }
  }

  // Language
  const langMatch = html.match(/<html[^>]*lang=["']([^"']*)["']/i);
  if (langMatch && langMatch[1]) {
    metadata.language = langMatch[1];
  }

  // Meta Tags
  const metaRegex = /<meta\s+([^>]+)>/gi;
  let metaMatch;
  while ((metaMatch = metaRegex.exec(html)) !== null) {
    const attrs = parseAttributes(metaMatch[1]);
    const name = attrs.name || attrs.property || attrs["http-equiv"] || "";
    const content = attrs.content || "";

    if (!name || !content) continue;

    const lowerName = name.toLowerCase();

    if (lowerName === "description") {
      metadata.description = content;
    } else if (lowerName === "author") {
      metadata.author = content;
    } else if (lowerName.includes("publish_date") || lowerName.includes("article:published_time") || lowerName === "date") {
      metadata.publish_date = content;
    } else if (lowerName.startsWith("og:")) {
      metadata.og_tags![lowerName] = content;
      if (lowerName === "og:title" && !metadata.title) metadata.title = content;
      if (lowerName === "og:description" && !metadata.description) metadata.description = content;
    } else if (lowerName.startsWith("twitter:")) {
      metadata.twitter_tags![lowerName] = content;
    }
  }

  // Schema.org JSON-LD
  const jsonLdRegex = /<script\s+[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let jsonLdMatch;
  while ((jsonLdMatch = jsonLdRegex.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(jsonLdMatch[1].trim());
      metadata.schema_org!.push(parsed);
    } catch {
      // ignore invalid json-ld
    }
  }

  return metadata;
}

/** Extrai todas as imagens com dimensões, alt, filename e resolução absoluta. */
export function extractImages(html: string, baseUrl: string): ImageInfo[] {
  const images: ImageInfo[] = [];
  const imgRegex = /<img\s+([^>]+)>/gi;
  let match;
  let position = 0;

  while ((match = imgRegex.exec(html)) !== null) {
    const attrs = parseAttributes(match[1]);
    const src = attrs.src || attrs["data-src"] || attrs["data-lazy-src"] || "";
    if (!src) continue;

    const absUrl = resolveAbsoluteUrl(src, baseUrl);
    const alt = attrs.alt || "";
    const title = attrs.title || "";

    let filename = "";
    try {
      const pathname = new URL(absUrl).pathname;
      filename = pathname.split("/").pop() || "image";
    } catch {
      filename = "image";
    }

    const format = filename.includes(".") ? filename.split(".").pop()?.toLowerCase() : undefined;
    const width = attrs.width ? parseInt(attrs.width, 10) : undefined;
    const height = attrs.height ? parseInt(attrs.height, 10) : undefined;

    images.push({
      url: src,
      absolute_url: absUrl,
      filename,
      alt_text: alt,
      title,
      width: isNaN(width as number) ? undefined : width,
      height: isNaN(height as number) ? undefined : height,
      format,
      position: ++position,
    });
  }

  return images;
}

/** Extrai nós estruturados de conteúdo (H1-H6, P, UL/OL, PRE/CODE, TABLE, BLOCKQUOTE). */
export function extractContentNodes(html: string): ContentNode[] {
  const nodes: ContentNode[] = [];
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  const contentHtml = bodyMatch ? bodyMatch[1] : html;

  const blockRegex = /<(h[1-6]|p|blockquote|pre|ul|ol|table)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
  let match;

  while ((match = blockRegex.exec(contentHtml)) !== null) {
    const tag = match[1].toLowerCase();
    const innerHtml = match[3];
    const text = decodeHtmlEntities(stripHtml(innerHtml));

    if (text.length > 0) {
      nodes.push({
        tag,
        text,
        attributes: parseAttributes(match[2]),
      });
    }
  }

  return nodes;
}

/** Converte conteúdo HTML para Markdown estruturado e limpo. */
export function htmlToMarkdown(html: string, baseUrl: string): string {
  let md = html;

  // Remove scripts & styles
  md = md.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  md = md.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");

  // Headings
  md = md.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, (_, text) => `\n# ${stripHtml(text)}\n`);
  md = md.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, (_, text) => `\n## ${stripHtml(text)}\n`);
  md = md.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, (_, text) => `\n### ${stripHtml(text)}\n`);
  md = md.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, (_, text) => `\n#### ${stripHtml(text)}\n`);
  md = md.replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi, (_, text) => `\n##### ${stripHtml(text)}\n`);
  md = md.replace(/<h6[^>]*>([\s\S]*?)<\/h6>/gi, (_, text) => `\n###### ${stripHtml(text)}\n`);

  // Links
  md = md.replace(/<a\s+[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi, (_, href, text) => {
    const absHref = resolveAbsoluteUrl(href, baseUrl);
    const linkText = stripHtml(text) || absHref;
    return `[${linkText}](${absHref})`;
  });

  // Images
  md = md.replace(/<img\s+[^>]*src=["']([^"']*)["'][^>]*alt=["']([^"']*)["'][^>]*>/gi, (_, src, alt) => {
    return `![${alt}](${resolveAbsoluteUrl(src, baseUrl)})`;
  });
  md = md.replace(/<img\s+[^>]*src=["']([^"']*)["'][^>]*>/gi, (_, src) => {
    return `![](${resolveAbsoluteUrl(src, baseUrl)})`;
  });

  // Bold & Italic
  md = md.replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, (_, t) => `**${stripHtml(t)}**`);
  md = md.replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, (_, t) => `**${stripHtml(t)}**`);
  md = md.replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, (_, t) => `*${stripHtml(t)}*`);
  md = md.replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, (_, t) => `*${stripHtml(t)}*`);

  // Code & Pre
  md = md.replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, (_, code) => `\n\`\`\`\n${decodeHtmlEntities(code)}\n\`\`\`\n`);
  md = md.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, (_, code) => `\`${decodeHtmlEntities(code)}\``);

  // Paragraphs & Breaks
  md = md.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_, text) => `\n\n${stripHtml(text)}\n\n`);
  md = md.replace(/<br\s*\/?>/gi, "\n");
  md = md.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, text) => `\n* ${stripHtml(text)}`);

  // Remove remaining HTML tags
  md = stripHtml(md);

  return md.trim();
}

/** Gera HTML limpo e seguro sem scripts, iframes ou trackers. */
export function cleanHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, "")
    .replace(/\son[a-z]+="[^"]*"/gi, "")
    .replace(/\son[a-z]+='[^']*'/gi, "")
    .trim();
}

/** Constrói árvore de estrutura hierárquica do DOM. */
export function buildStructureTree(html: string): StructureNode {
  const root: StructureNode = {
    tag: "html",
    children: [
      {
        tag: "head",
        children: [
          { tag: "title" },
          { tag: "meta" },
        ],
      },
      {
        tag: "body",
        children: [],
      },
    ],
  };

  const bodyNode = root.children![1];
  const tagRegex = /<(header|nav|main|article|section|aside|footer|div|h[1-6]|p|ul|ol|table)\b([^>]*)>/gi;
  let match;
  let count = 0;

  while ((match = tagRegex.exec(html)) !== null && count < 80) {
    const tag = match[1].toLowerCase();
    const attrs = parseAttributes(match[2]);
    const classes = attrs.class ? attrs.class.split(/\s+/).filter(Boolean) : undefined;
    const id = attrs.id || undefined;

    bodyNode.children!.push({
      tag,
      id,
      classes,
    });
    count++;
  }

  return root;
}

/** Calcula estatísticas completas da página. */
export function computePageStats(html: string, textContent: string, images: ImageInfo[]): PageStats {
  const headings = (html.match(/<h[1-6]\b/gi) || []).length;
  const paragraphs = (html.match(/<p\b/gi) || []).length;
  const links = (html.match(/<a\b/gi) || []).length;
  const tables = (html.match(/<table\b/gi) || []).length;
  const lists = (html.match(/<(ul|ol)\b/gi) || []).length;
  const codeBlocks = (html.match(/<pre\b/gi) || []).length;

  const words = textContent ? textContent.trim().split(/\s+/).filter(Boolean).length : 0;
  const chars = textContent ? textContent.length : 0;

  return {
    heading_count: headings,
    paragraph_count: paragraphs,
    image_count: images.length,
    link_count: links,
    table_count: tables,
    list_count: lists,
    code_block_count: codeBlocks,
    word_count: words,
    char_count: chars,
  };
}

/** Executa o processo completo de scraping em uma URL. */
export async function scrapeUrl(
  url: string,
  options: {
    downloadImages?: boolean;
    useAi?: boolean;
    userAgent?: string;
    timeoutMs?: number;
  } = {}
): Promise<ScrapeResponse> {
  const id = "scr_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
  const userAgent = options.userAgent || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 AI-PostGen/Scraper";
  const timeout = options.timeoutMs || 15000;

  // Validação básica da URL
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      throw new Error("Protocolo não suportado. Utilize http:// ou https://");
    }
  } catch (err: any) {
    return {
      id,
      url,
      status: "error",
      created_at: new Date().toISOString(),
      error: `URL inválida: ${err?.message || "URL incorreta"}`,
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(parsedUrl.href, {
      headers: {
        "User-Agent": userAgent,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Servidor respondeu com código HTTP ${response.status} (${response.statusText})`);
    }

    const rawHtml = await response.text();
    const metadata = extractMetadata(rawHtml, parsedUrl.href);
    const images = extractImages(rawHtml, parsedUrl.href);
    const content = extractContentNodes(rawHtml);
    const structure = buildStructureTree(rawHtml);
    const clean = cleanHtml(rawHtml);
    const markdown = htmlToMarkdown(rawHtml, parsedUrl.href);
    const textContent = decodeHtmlEntities(stripHtml(rawHtml));
    const stats = computePageStats(rawHtml, textContent, images);
    const technologies = detectTechnologies(rawHtml);

    return {
      id,
      url: parsedUrl.href,
      status: "complete",
      metadata,
      images,
      content,
      structure,
      raw_html: rawHtml,
      clean_html: clean,
      markdown,
      text_content: textContent,
      stats,
      technologies,
      created_at: new Date().toISOString(),
    };
  } catch (error: any) {
    return {
      id,
      url: parsedUrl.href,
      status: "error",
      created_at: new Date().toISOString(),
      error: error?.name === "AbortError" ? "Tempo limite de conexão esgotado (timeout)." : error?.message || "Erro desconhecido ao raspar o site.",
    };
  }
}
