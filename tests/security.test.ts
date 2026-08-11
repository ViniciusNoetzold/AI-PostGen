import { describe, expect, it } from "vitest";
import path from "node:path";
import { companySchema, configUpdateSchema, contactSchema, postReferenceSchema, relationshipSchema, serverConfigUpdateSchema } from "@/lib/schemas/api";
import { assertSafeRemoteUrl, safeFileId, safeResolvePath } from "@/lib/server/security";
import { decryptSecret, encryptSecret } from "@/lib/server/encryption";

describe("security contracts", () => {
  it("rejects unknown configuration fields and secrets not on the allowlist", () => {
    expect(configUpdateSchema.safeParse({ vaultPath: "C:\\vault", geminiApiKey: "secret" }).success).toBe(false);
    expect(serverConfigUpdateSchema.safeParse({ geminiApiKey: "secret\ninjected=value" }).success).toBe(false);
    expect(serverConfigUpdateSchema.safeParse({ databaseUrl: "https://not-postgres.example" }).success).toBe(false);
    expect(serverConfigUpdateSchema.safeParse({ databaseUrl: "postgresql://user:password@host/database" }).success).toBe(true);
  });

  it("rejects traversal in client and post identifiers", () => {
    expect(postReferenceSchema.safeParse({ client: "../../admin", id: "post.md" }).success).toBe(false);
    expect(() => safeResolvePath(path.resolve("C:\\vault"), "..\\outside.txt")).toThrow(/escapes/);
    expect(() => safeFileId("../../token")).toThrow();
  });

  it("blocks private SSRF targets", async () => {
    await expect(assertSafeRemoteUrl("https://127.0.0.1/secret")).rejects.toThrow(/Private/);
    await expect(assertSafeRemoteUrl("http://example.com/file")).rejects.toThrow(/HTTPS/);
  });

  it("encrypts tokens with authenticated encryption", () => {
    const encrypted = encryptSecret("token-value");
    expect(encrypted).not.toContain("token-value");
    expect(decryptSecret(encrypted)).toBe("token-value");
  });

  it("validates the CRM graph and only accepts HTTPS media", () => {
    expect(companySchema.safeParse({ name: "Empresa", logoUrl: "http://inseguro.test" }).success).toBe(false);
    expect(companySchema.safeParse({ name: "Empresa", logoUrl: "/api/media/images/2026-08-11/logo.png" }).success).toBe(true);
    expect(contactSchema.safeParse({ name: "Contato", photoUrl: "https://cdn.example.com/photo.jpg" }).success).toBe(true);
    expect(contactSchema.safeParse({ name: "João", category: "OWNER" }).success).toBe(true);
    expect(contactSchema.safeParse({ name: "João", category: "ROOT" }).success).toBe(false);
    const id = "d43862a9-5d82-4fa3-9cf4-1fb3582c45fb";
    expect(relationshipSchema.safeParse({ sourceClientId: id, targetClientId: id }).success).toBe(false);
  });
});
