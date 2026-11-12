import { copyFile, mkdir, readdir } from "node:fs/promises";
import { build } from "esbuild";

const target = "public/pixelforge";
const dist = "node_modules/onnxruntime-web/dist";
await mkdir(target, { recursive: true });
const runtime = (await readdir(dist)).filter(file => file === "ort.webgpu.min.mjs" || /^ort-wasm.*\.(mjs|wasm)$/.test(file));
if (!runtime.includes("ort.webgpu.min.mjs") || !runtime.some(file => file.endsWith(".wasm"))) {
  throw new Error("ONNX Runtime browser assets were not found.");
}
await Promise.all(runtime.map(file => copyFile(dist + "/" + file, target + "/" + file)));
await build({
  entryPoints: ["src/worker/index.ts"], outfile: target + "/processor.js",
  bundle: true, minify: true, platform: "browser", format: "esm", target: "es2022",
});
