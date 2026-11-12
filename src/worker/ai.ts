import type * as Runtime from "onnxruntime-web";
import { model } from "../core/model";
import { assertDimensions, type Dimensions } from "../core/settings";
import { tiles } from "../core/tiles";

type Provider = "webgpu" | "wasm";
type Progress = (value: number, phase: string) => void;
let runtime: typeof Runtime | undefined;
let session: Runtime.InferenceSession | undefined;
let activeProvider: Provider | undefined;
let preferWasm = false;
const base = new URL("./", self.location.href).href;
export const AI_MAX_PIXELS = 3_000_000;

export async function gpuAvailable() {
  const nav = navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } };
  if (!nav.gpu) return false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<null>(resolve => { timer = setTimeout(() => resolve(null), 3000); });
    return Boolean(await Promise.race([nav.gpu.requestAdapter(), timeout]));
  } catch { return false; }
  finally { clearTimeout(timer); }
}

async function verifiedBytes(response: Response, report: Progress): Promise<ArrayBuffer> {
  if (!response.ok) throw new Error("The model host returned HTTP " + response.status + ".");
  const expected = Number(response.headers.get("content-length"));
  if (expected > model.bytes && !response.headers.has("content-encoding")) throw new Error("Model download exceeded its size limit.");
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Streaming model downloads are unavailable in this browser.");
  const bytes = new Uint8Array(model.bytes);
  let total = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value.byteLength > bytes.length - total) throw new Error("Model download exceeded its size limit.");
      bytes.set(value, total);
      total += value.byteLength;
      report(0.08 + 0.22 * total / model.bytes, "Downloading Real-ESRGAN model");
    }
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  } finally {
    reader.releaseLock();
  }
  if (total !== bytes.length) throw new Error("The model failed its integrity check.");
  const digest = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), b => b.toString(16).padStart(2, "0")).join("");
  if (digest !== model.sha256) throw new Error("The model failed its integrity check.");
  return bytes.buffer;
}

async function weights(report: Progress): Promise<ArrayBuffer> {
  const cache = await self.caches?.open("pixelforge-model-v1").catch(() => undefined);
  const cacheKey = new URL("weights-" + model.sha256, base).href;
  const saved = await cache?.match(cacheKey).catch(() => undefined);
  if (saved) {
    try {
      report(0.14, "Reading cached model");
      return await verifiedBytes(saved, () => {});
    } catch { await cache?.delete(cacheKey).catch(() => {}); }
  }
  report(0.08, "Downloading Real-ESRGAN model");
  let response: Response;
  try {
    response = await fetch(model.url, {
      credentials: "omit", referrerPolicy: "no-referrer", signal: AbortSignal.timeout(180_000),
    });
  } catch {
    throw new Error("Could not reach the model host. Check your connection and retry, or switch to Fast Resize.");
  }
  const bytes = await verifiedBytes(response, report);
  if (cache) await cache.put(cacheKey, new Response(bytes)).catch(() => {});
  return bytes;
}

async function initialize(provider: Provider, bytes: ArrayBuffer, report: Progress) {
  runtime ??= await import(base + "ort.webgpu.min.mjs") as typeof Runtime;
  runtime.env.wasm.wasmPaths = base;
  runtime.env.wasm.numThreads = 1;
  runtime.env.wasm.proxy = false;
  report(0.33, "Initializing " + provider.toUpperCase());
  session = await runtime.InferenceSession.create(bytes, { executionProviders: [provider] });
  activeProvider = provider;
}

function alphaAt(input: Uint8ClampedArray, { width, height }: Dimensions, px: number, py: number) {
  const x = Math.max(0, Math.min(width - 1, (px + 0.5) / 2 - 0.5));
  const y = Math.max(0, Math.min(height - 1, (py + 0.5) / 2 - 0.5));
  const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
  const x1 = Math.min(x0 + 1, width - 1), y1 = Math.min(y0 + 1, height - 1);
  const a = (col: number, row: number) => input[(row * width + col) * 4 + 3];
  return (1 - fy) * ((1 - fx) * a(x0, y0) + fx * a(x1, y0))
    + fy * ((1 - fx) * a(x0, y1) + fx * a(x1, y1));
}

async function reconstruct(input: Uint8ClampedArray, source: Dimensions, size: number, report: Progress) {
  if (!session || !runtime) throw new Error("Inference session is unavailable.");
  const pixels = new Uint8ClampedArray(source.width * source.height * 16);
  const total = Math.ceil(source.width / size) * Math.ceil(source.height / size);
  let count = 0;
  for (const tile of tiles(source, size)) {
    const plane = tile.inputWidth * tile.inputHeight;
    const rgb = new Float32Array(plane * 3);
    for (let y = 0; y < tile.inputHeight; y++) for (let x = 0; x < tile.inputWidth; x++) {
      const px = Math.min(source.width - 1, tile.left + x), py = Math.min(source.height - 1, tile.top + y);
      const src = (py * source.width + px) * 4;
      const dst = y * tile.inputWidth + x;
      for (let c = 0; c < 3; c++) rgb[dst + c * plane] = input[src + c] / 255;
    }
    const tensor = new runtime.Tensor("float32", rgb, [1, 3, tile.inputHeight, tile.inputWidth]);
    let results: Awaited<ReturnType<Runtime.InferenceSession["run"]>> | undefined;
    try {
      results = await session.run({ input: tensor });
      const result = results.output;
      const stride = tile.inputWidth * 2;
      const height = tile.inputHeight * 2;
      if (!result || result.type !== "float32" || result.dims.join(",") !== [1, 3, height, stride].join(",")) {
        throw new Error("Real-ESRGAN returned an unexpected tensor shape.");
      }
      const values = await result.getData() as Float32Array;
      for (let y = 0; y < tile.height * 2; y++) for (let x = 0; x < tile.width * 2; x++) {
        const px = tile.x * 2 + x, py = tile.y * 2 + y;
        const src = ((tile.y - tile.top) * 2 + y) * stride + (tile.x - tile.left) * 2 + x;
        const dst = (py * source.width * 2 + px) * 4;
        for (let c = 0; c < 3; c++) pixels[dst + c] = values[src + c * stride * height] * 255;
        pixels[dst + 3] = alphaAt(input, source, px, py);
      }
    } finally {
      tensor.dispose();
      if (results) for (const output of Object.values(results)) output.dispose();
    }
    report(0.36 + 0.44 * ++count / total, "Real-ESRGAN tiles " + count + "/" + total);
  }
  return pixels;
}

async function release() {
  const previous = session;
  session = undefined;
  activeProvider = undefined;
  await previous?.release().catch(() => {});
}

export async function upscale(input: Uint8ClampedArray, source: Dimensions, report: Progress) {
  if (!self.isSecureContext || !crypto.subtle) throw new Error("AI requires HTTPS or localhost to verify the model download.");
  assertDimensions(source, AI_MAX_PIXELS);
  const size = { width: source.width * 2, height: source.height * 2 };
  assertDimensions(size);
  let bytes: ArrayBuffer | undefined;
  const getWeights = async () => bytes ??= await weights(report);
  if (!session && !preferWasm && await gpuAvailable()) {
    const data = await getWeights();
    try { await initialize("webgpu", data, report); } catch { preferWasm = true; await release(); }
  }
  if (activeProvider === "webgpu") {
    try { return { pixels: await reconstruct(input, source, 96, report), size, provider: "webgpu" as const }; }
    catch { preferWasm = true; await release(); }
  }
  if (!session) await initialize("wasm", await getWeights(), report);
  try {
    return { pixels: await reconstruct(input, source, 64, report), size, provider: "wasm" as const };
  } catch (error) {
    if (!(error instanceof Error) || !/memory|allocat|out of bounds/i.test(error.message)) {
      await release();
      throw error;
    }
    await release();
    await initialize("wasm", await getWeights(), report);
    try {
      return { pixels: await reconstruct(input, source, 32, report), size, provider: "wasm" as const };
    } catch {
      await release();
      throw new Error("AI ran out of working memory. Use a smaller image or Fast Resize.");
    }
  }
}
