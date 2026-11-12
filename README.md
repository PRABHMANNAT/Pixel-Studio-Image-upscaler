# PixelForge Studio

PixelForge Studio resizes, converts, and enhances image batches in the browser. It has no image upload endpoint, account, database, analytics, or paid processing API.

## Run locally

Use Node.js 22 or later.

```sh
npm install
npm run dev
```

Open [the local studio](http://localhost:3000/studio/). Choose images or a folder, set the target size and format, and select **Start batch**. Download individual results from the queue or export the completed batch as a ZIP. Originals are untouched.

```sh
npm run lint
npm run typecheck
npm test
npx playwright install chromium
npm run test:e2e
npm run build
```

The AI browser test is opt-in because it downloads roughly 64 MiB of weights and loads WebAssembly. Enable it with `PIXELFORGE_TEST_AI=1` when running Playwright. See [testing](docs/testing.md) for exact commands and local model fixtures.

## What works where

| Feature | Behavior |
| --- | --- |
| Fast Resize | Alpha-aware Lanczos, with optional sharpening of opaque details. Choose original size for conversion only. |
| AI Upscale | Real-ESRGAN x2plus performs one native 2× pass. For other target sizes, Lanczos resamples the model result. WebGPU is attempted when available; WASM is the fallback. |
| Input | Static JPG, PNG, WebP and AVIF, when the browser can decode them. Animated images, GIF, SVG, HEIC and HEIF are rejected. |
| Output | JPG, PNG, and WebP through browser encoders. AVIF uses native encoding when available and otherwise a tested libavif WebAssembly encoder, limited to 6 megapixels. Transparent inputs require explicit permission before flattening to a white JPG background. |
| Folders | Pick or drop folders on supported browsers. ZIP exports preserve nested paths and add suffixes when names collide. |
| Batch control | Pause after the current file, resume, or cancel the active job. Retrying puts failed or cancelled files back in the queue; start again with the settings you want. |
| Local storage | Settings, theme, and verified model weights may persist. The queue, source files, and results clear on reload. |

The queue holds 80 images. Each source is limited to 48 MiB, an 8192-pixel edge, and 24 megapixels; AI sources are limited to 3 megapixels. Output pixels are also bounded. Large files can still exceed a device's memory or browser canvas limits. Completed exports occupy up to 256 MiB. Chromium browsers that support saving files directly can stream ZIP entries to disk; the in-memory ZIP fallback is limited to 96 MiB. For large jobs, download and clear results as you go.

## Deploy to Vercel

Import [the GitHub repository](https://github.com/PRABHMANNAT/Pixel-Studio-Image-upscaler) into Vercel. Choose Node.js 22 or later and deploy the `main` branch. The checked-in configuration builds and publishes the `out/` directory. No secrets or environment variables are required. The output can also be hosted on any HTTPS static server that serves `.mjs` as JavaScript and `.wasm` as WebAssembly. Do not open the exported HTML via `file://`.

After deployment, open `/studio/`, convert a small image, download it, and test the AI mode on the target browser. See [architecture](docs/architecture.md), [model provenance](docs/model.md), and [commit ledger](docs/commit-ledger.md).
