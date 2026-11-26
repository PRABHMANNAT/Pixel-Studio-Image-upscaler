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

export function outputPath(path: string, format: Format, suffix = "") {
  const safe = safePath(path);
  const parts = safe.split("/");
  const stem = parts.pop()!.replace(/(?<=.)\.[^.]+$/, "");
  const tag = suffix.trim().replace(/[^\p{L}\p{N}_-]+/gu, "-").slice(0, 32);
  const extension = "." + extensions[format];
  const base = [...stem].slice(0, 150 - tag.length - extension.length).join("");
  return [...parts, base + tag + extension].join("/");
}

export function uniquePath(path: string, used: Set<string>): string {
  const safe = safePath(path);
  const dot = safe.lastIndexOf(".");
  const split = dot > safe.lastIndexOf("/") + 1 ? dot : safe.length;
  const directory = safe.slice(0, safe.lastIndexOf("/") + 1);
  const stem = safe.slice(directory.length, split);
  const extension = safe.slice(split);
  let candidate = safe;
  for (let i = 2; used.has(candidate.toLowerCase()); i++) {
    const number = " (" + i + ")";
    const prefix = [...stem].slice(0, Math.max(1, 150 - number.length - extension.length)).join("");
    candidate = directory + prefix + number + extension;
  }
  used.add(candidate.toLowerCase());
  return candidate;
}

export function leaf(path: string) { return path.split("/").at(-1) || path; }
