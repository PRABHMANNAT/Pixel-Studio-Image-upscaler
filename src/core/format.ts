import type { Format } from "./settings";

export type Header = { format: Format; width?: number; height?: number };
const tag = (data: Uint8Array, at: number, count = 4) => String.fromCharCode(...data.subarray(at, at + count));
const PNG = [137, 80, 78, 71, 13, 10, 26, 10];
const frameMarkers = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);

export function inspectBytes(data: Uint8Array): Header {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  if (PNG.every((b, i) => data[i] === b)) {
    if (data.length < 33 || tag(data, 12) !== "IHDR" || view.getUint32(8) !== 13) throw new Error("The PNG header is damaged.");
    let end = false;
    for (let i = 8; i + 12 <= data.length;) {
      const type = tag(data, i + 4);
      if (type === "acTL") throw new Error("Animated PNG is unsupported. Export a still frame first.");
      const length = view.getUint32(i);
      if (length > data.length - i - 12) break;
      if (type === "IEND") { end = length === 0; break; }
      i += 12 + length;
    }
    if (!end) throw new Error("The PNG is truncated.");
    return { format: "image/png", width: view.getUint32(16), height: view.getUint32(20) };
  }
  if (data[0] === 255 && data[1] === 216) {
    let eoi = false;
    for (let i = data.length - 2; i > 1; i--) if (data[i] === 255 && data[i + 1] === 217) { eoi = true; break; }
    if (!eoi) throw new Error("The JPEG is truncated.");
    for (let i = 2; i + 4 < data.length;) {
      if (data[i++] !== 255) break;
      while (data[i] === 255) i++;
      const marker = data[i++];
      if (i + 2 > data.length || marker === 0xda) break;
      const size = view.getUint16(i);
      if (size < 2 || i + size > data.length) break;
      if (frameMarkers.has(marker) && size >= 7) return { format: "image/jpeg", width: view.getUint16(i + 5), height: view.getUint16(i + 3) };
      i += size;
    }
    throw new Error("The JPEG header is damaged.");
  }
  if (tag(data, 0) === "RIFF" && tag(data, 8) === "WEBP") {
    if (data.length < 20 || view.getUint32(4, true) > data.length - 8) throw new Error("The WebP is truncated.");
    const type = tag(data, 12);
    if (type === "VP8X" && data.length >= 30) {
      if (data[20] & 2) throw new Error("Animated WebP is unsupported. Export a still frame first.");
      return { format: "image/webp", width: 1 + data[24] + (data[25] << 8) + (data[26] << 16), height: 1 + data[27] + (data[28] << 8) + (data[29] << 16) };
    }
    if (type === "VP8L" && data.length >= 25) {
      const bits = view.getUint32(21, true);
      return { format: "image/webp", width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }
    if (type === "VP8 " && data.length >= 30) return { format: "image/webp", width: view.getUint16(26, true) & 0x3fff, height: view.getUint16(28, true) & 0x3fff };
    throw new Error("The WebP header is damaged.");
  }
  if (tag(data, 4) === "ftyp" && data.length >= 16) {
    const end = view.getUint32(0);
    if (end < 16 || end > data.length || end % 4) throw new Error("The image container is damaged.");
    const brands = [tag(data, 8)];
    for (let i = 16; i + 4 <= end; i += 4) brands.push(tag(data, i));
    if (brands.includes("avis")) throw new Error("Animated AVIF is unsupported. Export a still frame first.");
    if (brands.includes("avif")) return { format: "image/avif" };
    throw new Error("HEIC/HEIF and other ISO image containers are unsupported.");
  }
  if (tag(data, 0, 3) === "GIF") throw new Error("GIF is unsupported. Export a still frame first.");
  throw new Error("Unsupported or damaged image. Choose JPG, PNG, WebP or AVIF.");
}
