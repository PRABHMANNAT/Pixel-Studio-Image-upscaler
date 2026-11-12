export type IntakeFile = { file: File; path: string };
export const QUEUE_LIMIT = 80;

type Entry = {
  name: string;
  isFile: boolean;
  isDirectory: boolean;
  file(resolve: (file: File) => void, reject: (error: DOMException) => void): void;
  createReader(): { readEntries(resolve: (entries: Entry[]) => void, reject: (error: DOMException) => void): void };
};

export function picked(files: FileList | readonly File[]): IntakeFile[] {
  return Array.from(files, file => ({ file, path: file.webkitRelativePath || file.name }));
}

export function captureDrop(transfer: DataTransfer) {
  // Directory handles and File objects must be captured before the first await.
  const roots = Array.from(transfer.items).filter(item => item.kind === "file").map(item => ({
    entry: item.webkitGetAsEntry?.() as Entry | null,
    file: item.getAsFile(),
  }));
  const fallback = picked(transfer.files);
  return async () => {
    const files: IntakeFile[] = [];
    let errors = 0;
    let limited = false;
    let visited = 0;
    async function walk(entry: Entry, prefix = "", depth = 0) {
      if (files.length >= QUEUE_LIMIT || ++visited > 5000 || depth > 32) { limited = true; return; }
      const path = prefix + entry.name;
      if (entry.isFile) {
        try {
          const file = await new Promise<File>((resolve, reject) => entry.file(resolve, reject));
          files.push({ file, path });
        } catch { errors++; }
      } else if (entry.isDirectory) {
        const reader = entry.createReader();
        try {
          while (true) {
            const children = await new Promise<Entry[]>((resolve, reject) => reader.readEntries(resolve, reject));
            if (!children.length) break;
            for (const child of children) {
              await walk(child, path + "/", depth + 1);
              if (files.length >= QUEUE_LIMIT || visited > 5000) { limited = true; return; }
            }
          }
        } catch { errors++; }
      }
    }
    if (!roots.length) return { files: fallback.slice(0, QUEUE_LIMIT), errors, limited: fallback.length > QUEUE_LIMIT };
    for (const root of roots) {
      if (files.length >= QUEUE_LIMIT) { limited = true; break; }
      if (root.entry) await walk(root.entry);
      else if (root.file) files.push({ file: root.file, path: root.file.name });
      else errors++;
    }
    return { files, errors, limited };
  };
}
