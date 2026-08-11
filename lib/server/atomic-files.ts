import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

export async function atomicWriteText(targetPath: string, content: string): Promise<void> {
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  const temporaryPath = path.join(
    path.dirname(targetPath),
    `.${path.basename(targetPath)}.${randomUUID()}.tmp`,
  );

  try {
    await fs.writeFile(temporaryPath, content, { encoding: "utf8", flag: "wx" });
    await fs.rename(temporaryPath, targetPath);
  } catch (error: unknown) {
    await fs.unlink(temporaryPath).catch(() => undefined);
    throw error;
  }
}
