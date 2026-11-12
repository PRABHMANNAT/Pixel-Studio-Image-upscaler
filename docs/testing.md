# Verification

`npm test` runs unit tests for resize calculations, alpha handling, image signatures, queue transitions, overlapping tiles, filename safety, and ZIP contents. `npm run test:e2e` starts Next.js on port 3200 and uses Chromium to exercise the UI, worker, encoders, and downloads together.

To test the production export, run `npm run build` and then set `PIXELFORGE_TEST_STATIC=1` when running Playwright. It serves `out/` with the same response headers declared in `vercel.json`. To inspect the build manually, run `npm run preview`.

Run the inference test on a connection that can reach Hugging Face:

```sh
PIXELFORGE_TEST_AI=1 npm run test:e2e -- tests/e2e/inference.spec.ts
```

PowerShell:

```powershell
$env:PIXELFORGE_TEST_AI = '1'
npm run test:e2e -- tests/e2e/inference.spec.ts
```

If the model endpoint is inaccessible in the browser, download the exact ONNX artifact listed in [model provenance](model.md), verify its checksum, and set `PIXELFORGE_TEST_MODEL_FILE` to its absolute path. Playwright will intercept the model request with those bytes; the worker still verifies the digest and runs real inference. The test compares the AI result with a fast resize of the same source. For a browser already installed locally, set `PIXELFORGE_BROWSER` to its absolute executable path.

A pass with WASM does not verify WebGPU. Verify the provider shown in the completed queue row on each target browser and hardware combination. The normal ZIP integration test uses a browser download because the native save dialog is outside Playwright's page controls; the streaming writer is tested separately.
