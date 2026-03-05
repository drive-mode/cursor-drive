import * as fs from "fs/promises";
import * as path from "path";

export async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function appendNdjsonLine(filePath: string, value: unknown): Promise<void> {
  await ensureDir(path.dirname(filePath));
  const line = JSON.stringify(value) + "\n";
  await fs.appendFile(filePath, line, "utf8");
}

export async function writeJsonAtomic(
  filePath: string,
  value: unknown
): Promise<void> {
  await ensureDir(path.dirname(filePath));
  const tmp = `${filePath}.tmp`;
  const text = JSON.stringify(value, null, 2) + "\n";
  await fs.writeFile(tmp, text, "utf8");
  await fs.rename(tmp, filePath);
}

export async function writeTextAtomic(
  filePath: string,
  text: string
): Promise<void> {
  await ensureDir(path.dirname(filePath));
  const tmp = `${filePath}.tmp`;
  await fs.writeFile(tmp, text, "utf8");
  await fs.rename(tmp, filePath);
}

export async function readTextIfExists(filePath: string): Promise<string | undefined> {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return undefined;
  }
}

