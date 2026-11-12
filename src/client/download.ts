import { archiveBlob, writeArchive, type ArchiveFile } from "../core/zip";

type FilePicker = (options: { suggestedName: string; types: { description: string; accept: Record<string, string[]> }[] }) =>
  Promise<{ createWritable(): Promise<{ write(data: Uint8Array<ArrayBuffer>): Promise<void>; close(): Promise<void>; abort(): Promise<void> }> }>;

export function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export async function saveZip(files: ArchiveFile[]) {
  const name = "pixelforge-exports.zip";
  const browser = window as Window & { showSaveFilePicker?: FilePicker };
  if (!browser.showSaveFilePicker) {
    download(await archiveBlob(files), name);
    return true;
  }
  let handle: Awaited<ReturnType<FilePicker>>;
  try { handle = await browser.showSaveFilePicker({ suggestedName: name, types: [{ description: "ZIP archive", accept: { "application/zip": [".zip"] } }] }); }
  catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return false;
    if (!(error instanceof DOMException) || !["SecurityError", "NotSupportedError"].includes(error.name)) throw error;
    download(await archiveBlob(files), name);
    return true;
  }
  const writer = await handle.createWritable();
  try { await writeArchive(files, chunk => writer.write(chunk)); await writer.close(); }
  catch (error) { await writer.abort().catch(() => {}); throw error; }
  return true;
}
