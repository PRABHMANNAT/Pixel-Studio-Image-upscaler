import { inspectBytes } from "../core/format";
import { lanczos, sharpenPixels } from "../core/resize";
import { assertDimensions, MAX_INPUT_BYTES, targetSize, type Dimensions, type Settings } from "../core/settings";
import type { Inspection, Product } from "../core/protocol";
import { upscale } from "./ai";
import { assertEncoderTarget, encode, encoders } from "./codecs";

type Progress = (value: number, phase: string) => void;

function surface(width: number, height: number) {
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("This browser cannot create an image canvas.");
  return { canvas, ctx };
}

async function decoded(file: File) {
  if (!file.size) throw new Error("This file is empty.");
  if (file.size > MAX_INPUT_BYTES) throw new Error("Source exceeds the 48 MiB file limit.");
  const header = inspectBytes(new Uint8Array(await file.arrayBuffer()));
  if (header.width !== undefined && header.height !== undefined) assertDimensions({ width: header.width, height: header.height });
  let bitmap: ImageBitmap;
  try { bitmap = await createImageBitmap(file.slice(0, file.size, header.format), { imageOrientation: "from-image" }); }
  catch { throw new Error("The browser could not decode this image. Check the file and browser codec support."); }
  try { assertDimensions(bitmap); }
  catch (error) { bitmap.close(); throw error; }
  return { bitmap, format: header.format };
}

async function preview(image: ImageBitmap | OffscreenCanvas, limit: number) {
  const ratio = Math.min(1, limit / Math.max(image.width, image.height));
  const { canvas, ctx } = surface(Math.max(1, Math.round(image.width * ratio)), Math.max(1, Math.round(image.height * ratio)));
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  const blob = await canvas.convertToBlob({ type: "image/webp", quality: 0.85 });
  canvas.width = canvas.height = 1;
  return blob;
}

export async function inspect(file: File): Promise<Inspection> {
  const { bitmap, format } = await decoded(file);
  try {
    const { width, height } = bitmap;
    return { width, height, format, thumbnail: await preview(bitmap, 96), preview: await preview(bitmap, 1600) };
  } finally { bitmap.close(); }
}

export async function processImage(file: File, settings: Settings, report: Progress): Promise<Product> {
  report(0.02, "Decoding source");
  const { bitmap, format } = await decoded(file);
  const source: Dimensions = { width: bitmap.width, height: bitmap.height };
  let raw: Uint8ClampedArray;
  let target: Dimensions;
  const type = settings.format === "original" ? format : settings.format;
  try {
    target = targetSize(source, settings);
    if (!(await encoders()).includes(type)) throw new Error("This browser cannot encode the selected format. Choose a different output format.");
    assertEncoderTarget(type, target.width * target.height);
    if (settings.mode === "ai" && target.width <= source.width && target.height <= source.height) {
      throw new Error("AI Upscale needs a larger target. Use Fast Resize for conversion at the original size.");
    }
    const original = surface(source.width, source.height);
    original.ctx.drawImage(bitmap, 0, 0);
    raw = original.ctx.getImageData(0, 0, source.width, source.height).data;
    original.canvas.width = original.canvas.height = 1;
  } finally { bitmap.close(); }

  if (type === "image/jpeg" && !settings.jpegMatte) {
    for (let i = 3; i < raw.length; i += 4) {
      if (raw[i] !== 255) throw new Error("JPEG cannot preserve transparency. Choose PNG/WebP or enable the white JPEG background.");
    }
  }

  let provider: Product["provider"];
  let inputSize = source;
  if (settings.mode === "ai") {
    const result = await upscale(raw, source, report);
    provider = result.provider;
    inputSize = result.size;
    raw = result.pixels;
  }
  report(settings.mode === "ai" ? 0.83 : 0.35, "Resampling image");
  let pixels = lanczos(raw, inputSize, target, () => report(0.85, "Finishing resize"));
  if (settings.sharpen) {
    report(0.88, "Sharpening opaque pixels");
    pixels = sharpenPixels(pixels, target);
  }

  const { canvas, ctx } = surface(target.width, target.height);
  // Compositing explicitly avoids browser-dependent handling of transparent JPEG input.
  if (type === "image/jpeg" && settings.jpegMatte) {
    for (let i = 0; i < pixels.length; i += 4) {
      const alpha = pixels[i + 3] / 255;
      for (let c = 0; c < 3; c++) pixels[i + c] = pixels[i + c] * alpha + 255 * (1 - alpha);
      pixels[i + 3] = 255;
    }
  }
  try {
    const image = new ImageData(pixels as Uint8ClampedArray<ArrayBuffer>, target.width, target.height);
    ctx.putImageData(image, 0, 0);
    report(0.94, "Encoding output");
    const blob = await encode(canvas, image, type, settings.quality);
    return { ...target, format: type, blob, preview: await preview(canvas, 1600), provider };
  } finally { canvas.width = canvas.height = 1; }
}
