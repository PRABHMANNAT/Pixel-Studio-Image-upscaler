import { copyFile, mkdir, readdir, unlink } from "node:fs/promises";
import { build } from "esbuild";

const target = "public/pixelforge";
const dist = "node_modules/onnxruntime-web/dist";
await mkdir(target, { recursive: true });
// Keep these filenames in sync with the pinned ort.webgpu.min.mjs bundle.
const runtime = ["ort.webgpu.min.mjs", "ort-wasm-simd-threaded.asyncify.mjs", "ort-wasm-simd-threaded.asyncify.wasm"];
const stale = (await readdir(target)).filter(file => /^ort-wasm-simd-threaded(?:\.(?:jsep|jspi))?\.(?:mjs|wasm)$/.test(file));
await Promise.all(stale.map(file => unlink(target + "/" + file)));
await Promise.all(runtime.map(file => copyFile(dist + "/" + file, target + "/" + file)));
const avif = "node_modules/@jsquash/avif";
await Promise.all([
  copyFile(avif + "/codec/enc/avif_enc.wasm", target + "/avif_enc.wasm"),
  copyFile(avif + "/LICENSE", target + "/avif-license.txt"),
]);
await build({
  entryPoints: { processor: "src/worker/index.ts", "avif-encoder": "src/worker/avif-encoder.ts" },
  outdir: target,
  bundle: true, minify: true, platform: "browser", format: "esm", target: "es2022",
});
