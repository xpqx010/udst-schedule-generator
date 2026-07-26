import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const STORAGE_KEY = /^[0-9a-f-]+\.(?:png|jpg)$/;

function storageDirectory() {
  return process.env.SCREENSHOT_STORAGE_DIR
    ? path.resolve(process.env.SCREENSHOT_STORAGE_DIR)
    : path.join(process.cwd(), "storage", "screenshots");
}

function screenshotPath(storageKey: string) {
  if (!STORAGE_KEY.test(storageKey)) throw new Error("Invalid screenshot storage key.");
  return path.join(storageDirectory(), storageKey);
}

export async function storeScreenshot(storageKey: string, data: Uint8Array) {
  await mkdir(storageDirectory(), { recursive: true });
  await writeFile(screenshotPath(storageKey), data, { flag: "wx" });
}

export async function loadScreenshot(storageKey: string) {
  return readFile(screenshotPath(storageKey));
}

export async function deleteScreenshot(storageKey: string) {
  try {
    await unlink(screenshotPath(storageKey));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}
