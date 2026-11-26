# Darkroom verification

Verified on Windows with Node.js 24 and Playwright driving Chromium against the static production export. The test server sent the response headers from `vercel.json`.

| Check | Result |
| --- | --- |
| Installation and build | npm installation, ESLint, TypeScript, and the Next.js static export completed. |
| Unit suite | 34 cases passed, including crop coordinates, quarter turns, exact nearest-neighbor pixels, tone math, alpha-weighted histogram bins, settings migration, safe filenames, and CSV quoting. |
| Browser suite | All 18 cases passed with the real-model test enabled. Scenarios exercised browser inputs, worker processing, file downloads, and decoded output pixels. All seven darkroom feature scenarios also passed in Microsoft Edge on Windows. |
| AI providers | The end-to-end test ran the checksum-verified x2plus model through WebGPU and checked the result against Lanczos. A separate Chromium run with GPU support disabled fetched the model from Hugging Face and completed an export through WebAssembly. |
| Accessibility and layout | Automated axe checks reported zero WCAG 2/2.1 A/AA violations on the landing page and the empty light and dark workspaces in Chromium. Keyboard zoom, pan, split comparison, loupe movement, reduced motion, WebGL fallback, and a 320 px viewport were exercised. |

The production tests assert transformed pixel positions, opacity and matte colors, real AVIF round trips, downloaded ZIP entries, CSV contents, export naming, and persistence of recipes. They cover malformed files, corrupted weights, cancellation, retry, and inference from cached weights when the model request is blocked.

The native save dialog is controlled by the operating system. Its browser test exercises the returned writable stream and reads the resulting archive. Cross-browser testing on physical Safari and Firefox devices remains outside this verification. [How to repeat the checks](testing.md)
