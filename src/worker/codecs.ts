import { formats, type Format } from "../core/settings";

let available: Promise<Format[]> | undefined;
const native = new Set<Format>();
const avifType = "image/avif";
export const AVIF_WASM_MAX_PIXELS = 6_000_000;
type Avif = typeof import("./avif-encoder");

async function avifEncoder() {
  return await import(new URL("avif-encoder.js", self.location.href).href) as Avif;
}

async function probe() {
  const canvas = new OffscreenCanvas(2, 2);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("This browser cannot create an image canvas.");
  ctx.fillRect(0, 0, 2, 2);
  await Promise.all(formats.map(async type => {
    try {
      if ((await canvas.convertToBlob({ type })).type === type) native.add(type);
    } catch { /* Optional encoder. */ }
  }));
  let avif = native.has(avifType);
  if (!avif && typeof WebAssembly !== "undefined") {
    try {
      const encoder = await avifEncoder();
      const sample = await encoder.encodeAvif(ctx.getImageData(0, 0, 2, 2), 0.8);
      avif = sample.type === avifType && sample.size > 0;
    } catch { /* Leave AVIF disabled if the module or probe fails. */ }
  }
  return formats.filter(type => native.has(type) || (type === avifType && avif));
}

export function encoders() { return available ??= probe(); }

export function assertEncoderTarget(type: Format, pixels: number) {
  if (type === avifType && !native.has(avifType) && pixels > AVIF_WASM_MAX_PIXELS) {
    throw new Error("The WASM AVIF encoder supports up to 6 megapixels. Choose a smaller output or a different format.");
  }
}

export async function encode(canvas: OffscreenCanvas, pixels: ImageData, type: Format, quality: number) {
  if (type === avifType && !native.has(avifType)) {
    const encoder = await avifEncoder();
    return await encoder.encodeAvif(pixels, quality);
  }
  const blob = await canvas.convertToBlob({ type, quality });
  if (blob.type !== type || !blob.size) throw new Error("The browser did not produce the requested file format.");
  return blob;
}
