import { Zip, ZipPassThrough } from "fflate";
import { safePath, uniquePath } from "./paths";

export type ArchiveFile = { path: string; blob: Blob };
export const BLOB_ZIP_LIMIT = 96 * 1024 ** 2;

// Images are already encoded. Stored entries avoid redundant CPU work and buffering.
export async function writeArchive(files: ArchiveFile[], write: (chunk: Uint8Array<ArrayBuffer>) => void | Promise<void>) {
  const emitted: Uint8Array<ArrayBuffer>[] = [];
  let failure: Error | undefined;
  const zip = new Zip((error, data) => {
    if (error) failure = error;
    else emitted.push(data as Uint8Array<ArrayBuffer>);
  });
  const flush = async () => {
    if (failure) throw failure;
    for (const chunk of emitted.splice(0)) await write(chunk);
  };
  const used = new Set<string>();
  for (const file of files) {
    const path = safePath(file.path);
    for (let i = path.indexOf("/"); i >= 0; i = path.indexOf("/", i + 1)) {
      used.add(path.slice(0, i).toLowerCase());
    }
  }
  try {
    for (const { path, blob } of files) {
      const entry = new ZipPassThrough(uniquePath(path, used));
      zip.add(entry);
      const reader = blob.stream().getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          entry.push(value, false);
          await flush();
        }
        entry.push(new Uint8Array(0), true);
        await flush();
      } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
    }
    zip.end();
    await flush();
  } catch (error) {
    zip.terminate();
    throw error;
  }
}

export async function archiveBlob(files: ArchiveFile[]) {
  if (files.reduce((sum, item) => sum + item.blob.size, 0) > BLOB_ZIP_LIMIT) {
    throw new Error("This ZIP is too large to assemble in memory. Save to disk in a supported browser or download files individually.");
  }
  const parts: BlobPart[] = [];
  await writeArchive(files, chunk => { parts.push(chunk); });
  return new Blob(parts, { type: "application/zip" });
}
