import { CompareResponse, ImageInfo, ScrapeResponse } from "./types";
import { scrapeUrl } from "./engine";

/** Calcula a taxa de similaridade (Jaccard) entre dois conjuntos de palavras. */
export function calculateSimilarity(text1: string, text2: string): number {
  if (!text1 && !text2) return 1.0;
  if (!text1 || !text2) return 0.0;

  const words1 = new Set(text1.toLowerCase().split(/\s+/).filter((w) => w.length > 2));
  const words2 = new Set(text2.toLowerCase().split(/\s+/).filter((w) => w.length > 2));

  if (words1.size === 0 && words2.size === 0) return 1.0;
  if (words1.size === 0 || words2.size === 0) return 0.0;

  let intersection = 0;
  for (const word of words1) {
    if (words2.has(word)) intersection++;
  }

  const union = words1.size + words2.size - intersection;
  return union === 0 ? 1.0 : Math.round((intersection / union) * 100) / 100;
}

/** Compara dois resultados raspados e produz o relatório de diferenças. */
export function compareScrapes(scrape1: ScrapeResponse, scrape2: ScrapeResponse): CompareResponse {
  const id = "cmp_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);

  const text1 = scrape1.text_content || "";
  const text2 = scrape2.text_content || "";
  const similarityScore = calculateSimilarity(text1, text2);

  // Diferenças de imagens
  const images1 = scrape1.images || [];
  const images2 = scrape2.images || [];

  const urls1 = new Set(images1.map((img) => img.absolute_url));
  const urls2 = new Set(images2.map((img) => img.absolute_url));

  const imagesAdded: ImageInfo[] = images2.filter((img) => !urls1.has(img.absolute_url));
  const imagesRemoved: ImageInfo[] = images1.filter((img) => !urls2.has(img.absolute_url));

  // Diferenças estruturais
  const structureDiffs: { type: "added" | "removed" | "modified"; description: string }[] = [];

  const stats1 = scrape1.stats;
  const stats2 = scrape2.stats;

  if (stats1 && stats2) {
    if (stats1.heading_count !== stats2.heading_count) {
      structureDiffs.push({
        type: stats2.heading_count > stats1.heading_count ? "added" : "removed",
        description: `Headings (H1-H6) alterados de ${stats1.heading_count} para ${stats2.heading_count}.`,
      });
    }
    if (stats1.paragraph_count !== stats2.paragraph_count) {
      structureDiffs.push({
        type: stats2.paragraph_count > stats1.paragraph_count ? "added" : "removed",
        description: `Parágrafos alterados de ${stats1.paragraph_count} para ${stats2.paragraph_count}.`,
      });
    }
    if (stats1.link_count !== stats2.link_count) {
      structureDiffs.push({
        type: stats2.link_count > stats1.link_count ? "added" : "removed",
        description: `Links alterados de ${stats1.link_count} para ${stats2.link_count}.`,
      });
    }
    if (stats1.image_count !== stats2.image_count) {
      structureDiffs.push({
        type: stats2.image_count > stats1.image_count ? "added" : "removed",
        description: `Quantidade de imagens alterada de ${stats1.image_count} para ${stats2.image_count}.`,
      });
    }
  }

  // Título e metadados
  if (scrape1.metadata?.title !== scrape2.metadata?.title) {
    structureDiffs.push({
      type: "modified",
      description: `Título modificado de "${scrape1.metadata?.title || "N/A"}" para "${scrape2.metadata?.title || "N/A"}".`,
    });
  }
  if (scrape1.metadata?.description !== scrape2.metadata?.description) {
    structureDiffs.push({
      type: "modified",
      description: `Meta descrição modificada.`,
    });
  }

  // Diferenças de texto simples (amostra de parágrafos)
  const lines1 = text1.split("\n").map((l) => l.trim()).filter((l) => l.length > 20);
  const lines2 = text2.split("\n").map((l) => l.trim()).filter((l) => l.length > 20);

  const textDiffs: { type: "added" | "removed" | "unchanged"; text: string }[] = [];
  const setLines1 = new Set(lines1);
  const setLines2 = new Set(lines2);

  for (const line of lines2) {
    if (!setLines1.has(line)) {
      textDiffs.push({ type: "added", text: line });
    }
  }
  for (const line of lines1) {
    if (!setLines2.has(line)) {
      textDiffs.push({ type: "removed", text: line });
    }
  }

  return {
    id,
    url1: scrape1.url,
    url2: scrape2.url,
    status: "complete",
    similarity_score: similarityScore,
    images_added: imagesAdded,
    images_removed: imagesRemoved,
    structure_diffs: structureDiffs,
    text_diffs: textDiffs.slice(0, 30),
    created_at: new Date().toISOString(),
  };
}

/** Executa a comparação direta entre duas URLs. */
export async function compareUrls(url1: string, url2: string): Promise<CompareResponse> {
  const id = "cmp_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);

  try {
    const [res1, res2] = await Promise.all([scrapeUrl(url1), scrapeUrl(url2)]);

    if (res1.status === "error") {
      return {
        id,
        url1,
        url2,
        status: "error",
        created_at: new Date().toISOString(),
        error: `Erro ao analisar URL 1: ${res1.error}`,
      };
    }
    if (res2.status === "error") {
      return {
        id,
        url1,
        url2,
        status: "error",
        created_at: new Date().toISOString(),
        error: `Erro ao analisar URL 2: ${res2.error}`,
      };
    }

    return compareScrapes(res1, res2);
  } catch (err: any) {
    return {
      id,
      url1,
      url2,
      status: "error",
      created_at: new Date().toISOString(),
      error: err?.message || "Erro inesperado ao comparar as páginas.",
    };
  }
}
