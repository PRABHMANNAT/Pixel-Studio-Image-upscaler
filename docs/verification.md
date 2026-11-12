# Delivery verification

The application was verified on Windows with Node.js 24 and Playwright Chromium. `npm install`, lint, type checking, and the production build completed. Vitest passed 22 tests. Chromium passed 11 tests against the production static export with the response headers declared in `vercel.json`.

Browser checks covered JPG, PNG, WebP, and AVIF outputs; alpha preservation; EXIF orientation; nested folder intake; readable ZIP contents and the writable-file interface; pause, cancel, and retry; and basic mobile layout and preference persistence. The normal conversion test observed no external requests or HTTP requests with file data during processing.

The AI test downloaded the pinned weights, ran Real-ESRGAN using WASM, compared its decoded pixels with a Lanczos result, and confirmed inference from the local cache while the model request was blocked. The suite also verified recovery after a corrupt model download. WebGPU is implemented as an optional provider; hardware acceleration was not verified in this run.

Vercel compatibility was checked by building and serving `out/` locally. A live Vercel deployment was outside this delivery. The native save picker itself was not automated; the browser suite exercised the writer it returns and inspected the resulting ZIP bytes.
