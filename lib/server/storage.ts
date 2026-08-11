import { createHash, randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { put } from "@vercel/blob";
import { safeResolvePath } from "@/lib/server/security";

export interface StoredObject {
  key: string;
  url: string;
  bytes: number;
  checksum: string;
  provider: "vercel-blob" | "local";
}

interface StoreObjectInput {
  data: Buffer | Uint8Array;
  contentType: string;
  extension: string;
  prefix: "images" | "videos";
}

function normalizeExtension(extension: string): string {
  const value = extension.toLowerCase().replace(/^\./, "");
  return /^[a-z0-9]{2,5}$/.test(value) ? value : "bin";
}

export async function storeObject(input: StoreObjectInput): Promise<StoredObject> {
  const bytes = Buffer.from(input.data);
  const checksum = createHash("sha256").update(bytes).digest("hex");
  const key = `${input.prefix}/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${normalizeExtension(input.extension)}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(key, bytes, {
      access: "public",
      addRandomSuffix: false,
      contentType: input.contentType,
    });
    return { key: blob.pathname, url: blob.url, bytes: bytes.byteLength, checksum, provider: "vercel-blob" };
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("BLOB_READ_WRITE_TOKEN is required in production");
  }

  const dataDirectory = path.resolve(process.cwd(), ".data", "media");
  const target = safeResolvePath(dataDirectory, key);
  await fs.mkdir(path.dirname(target), { recursive: true });
  const temporary = `${target}.${randomUUID()}.tmp`;
  await fs.writeFile(temporary, bytes, { flag: "wx" });
  await fs.rename(temporary, target);
  return {
    key,
    url: `/api/media/${key.split("/").map(encodeURIComponent).join("/")}`,
    bytes: bytes.byteLength,
    checksum,
    provider: "local",
  };
}
