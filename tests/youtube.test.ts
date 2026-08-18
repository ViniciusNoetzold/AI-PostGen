import { describe, expect, it } from "vitest";
import { parseCaptionData, extractVideoId } from "@/lib/youtube/extractor";

describe("YouTube Extractor", () => {
  it("extracts video id correctly from different url formats", () => {
    expect(extractVideoId("https://youtu.be/rgsz8228LaA?si=xjkOsqCufXpgJHf2")).toBe("rgsz8228LaA");
    expect(extractVideoId("https://www.youtube.com/watch?v=rgsz8228LaA")).toBe("rgsz8228LaA");
    expect(extractVideoId("rgsz8228LaA")).toBe("rgsz8228LaA");
  });

  it("parses JSON3 caption format", () => {
    const json3 = JSON.stringify({
      events: [
        { tStartMs: 1000, dDurationMs: 2500, segs: [{ utf8: "Olá mundo" }] },
        { tStartMs: 3500, dDurationMs: 2000, segs: [{ utf8: "Segundo segmento" }] }
      ]
    });
    const result = parseCaptionData(json3);
    expect(result).toHaveLength(2);
    expect(result[0].text).toBe("Olá mundo");
    expect(result[0].start).toBe(1);
    expect(result[0].duration).toBe(2.5);
  });

  it("parses standard XML format", () => {
    const xml = `<transcript><text start="1.5" dur="3.0">Texto em XML &amp; teste</text></transcript>`;
    const result = parseCaptionData(xml);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe("Texto em XML & teste");
    expect(result[0].start).toBe(1.5);
    expect(result[0].duration).toBe(3);
  });

  it("parses SRV3 timedtext XML format", () => {
    const srv3 = `<timedtext><body><p t="2000" d="4000"><s>Segmento</s> <s>composto</s></p></body></timedtext>`;
    const result = parseCaptionData(srv3);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe("Segmento composto");
    expect(result[0].start).toBe(2);
    expect(result[0].duration).toBe(4);
  });
});
