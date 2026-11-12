import type { Format } from "./settings";

const extensions: Record<Format, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif",
};
const reserved = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i;

export function safePath(path: string): string {
  return path.normalize("NFC").replaceAll("\\", "/").split("/")
    .filter(part => part && part !== "." && part !== "..")
    .map(part => part.replace(/[<>:"|?*\u0000-\u001f\u007f]/g, "_").replace(/[. ]+$/g, ""))
    .filter(Boolean)
    .map(part => {
      const name = [...part].slice(0, 150).join("");
      return reserved.test(name) ? "_" + name : name;
    }).join("/") || "image";
}

export function outputPath(path: string, format: Format) {
  const safe = safePath(path);
  return safe.replace(/(?<=[^/])\.[^./]+$/, "") + "." + extensions[format];
}

export function uniquePath(path: string, used: Set<string>): string {
  const safe = safePath(path);
  const dot = safe.lastIndexOf(".");
  const split = dot > safe.lastIndexOf("/") + 1 ? dot : safe.length;
  const prefix = safe.slice(0, split);
  const extension = safe.slice(split);
  let candidate = safe;
  for (let i = 2; used.has(candidate.toLowerCase()); i++) candidate = prefix + " (" + i + ")" + extension;
  used.add(candidate.toLowerCase());
  return candidate;
}

export function leaf(path: string) { return path.split("/").at(-1) || path; }
