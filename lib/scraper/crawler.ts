import { CrawlResponse, CrawlPageItem } from "./types";
import { resolveAbsoluteUrl, stripHtml, decodeHtmlEntities } from "./engine";

/** Executa o rastreamento em profundidade de um domínio base. */
export async function crawlDomain(
  baseUrl: string,
  options: {
    maxDepth?: number;
    maxPages?: number;
    timeoutMs?: number;
  } = {}
): Promise<CrawlResponse> {
  const id = "cwl_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
  const maxDepth = Math.min(options.maxDepth || 2, 4);
  const maxPages = Math.min(options.maxPages || 15, 50);
  const timeout = options.timeoutMs || 10000;

  let baseOrigin: string;
  let baseHostname: string;
  try {
    const u = new URL(baseUrl);
    baseOrigin = u.origin;
    baseHostname = u.hostname;
  } catch {
    return {
      id,
      base_url: baseUrl,
      status: "error",
      pages_found: 0,
      pages_scraped: 0,
      created_at: new Date().toISOString(),
      error: "URL base inválida",
    };
  }

  const visited = new Set<string>();
  const queue: { url: string; depth: number }[] = [{ url: baseUrl, depth: 0 }];
  const pages: CrawlPageItem[] = [];

  while (queue.length > 0 && pages.length < maxPages) {
    const current = queue.shift()!;
    const cleanUrl = current.url.split("#")[0].replace(/\/+$/, "");

    if (visited.has(cleanUrl)) continue;
    visited.add(cleanUrl);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const res = await fetch(current.url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; AI-PostGen-Crawler/1.0)",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        pages.push({
          url: current.url,
          status_code: res.status,
          depth: current.depth,
        });
        continue;
      }

      const html = await res.text();

      // Title
      const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
      const title = titleMatch ? decodeHtmlEntities(titleMatch[1]) : "";

      // Counts
      const text = decodeHtmlEntities(stripHtml(html));
      const wordCount = text.split(/\s+/).filter(Boolean).length;
      const imagesCount = (html.match(/<img\b/gi) || []).length;

      // Extract internal links
      const linkRegex = /<a\s+[^>]*href=["']([^"']*)["'][^>]*>/gi;
      let linkMatch;
      let internalLinksCount = 0;

      while ((linkMatch = linkRegex.exec(html)) !== null) {
        const href = linkMatch[1];
        if (!href || href.startsWith("javascript:") || href.startsWith("mailto:") || href.startsWith("tel:")) continue;

        const abs = resolveAbsoluteUrl(href, current.url);
        try {
          const parsed = new URL(abs);
          if (parsed.hostname === baseHostname || parsed.hostname.endsWith("." + baseHostname)) {
            internalLinksCount++;
            const cleanAbs = abs.split("#")[0].replace(/\/+$/, "");
            if (!visited.has(cleanAbs) && current.depth + 1 <= maxDepth && queue.length < 100) {
              queue.push({ url: abs, depth: current.depth + 1 });
            }
          }
        } catch {
          // ignore invalid
        }
      }

      pages.push({
        url: current.url,
        title,
        status_code: res.status,
        depth: current.depth,
        links_count: internalLinksCount,
        images_count: imagesCount,
        word_count: wordCount,
      });
    } catch {
      pages.push({
        url: current.url,
        depth: current.depth,
        status_code: 0,
      });
    }
  }

  // Gera sitemap XML sintético
  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
  .filter((p) => (p.status_code || 0) >= 200 && (p.status_code || 0) < 400)
  .map(
    (p) => `  <url>
    <loc>${p.url}</loc>
    <lastmod>${new Date().toISOString().slice(0, 10)}</lastmod>
    <priority>${p.depth === 0 ? "1.0" : p.depth === 1 ? "0.8" : "0.5"}</priority>
  </url>`
  )
  .join("\n")}
</urlset>`;

  return {
    id,
    base_url: baseUrl,
    status: "complete",
    pages_found: visited.size,
    pages_scraped: pages.length,
    pages,
    sitemap: sitemapXml,
    created_at: new Date().toISOString(),
  };
}
