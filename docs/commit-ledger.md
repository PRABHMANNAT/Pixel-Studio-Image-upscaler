# PixelForge Studio commit ledger

The requested target was 124 meaningful commits. This delivery contains 51: the 50 changes below and the commit adding this ledger and verification record. The remaining 73 were not created. Git is the source of truth: run `git log --reverse --oneline main` or `git rev-list --count main`.

| # | Commit | Change |
| ---: | --- | --- |
| 1 | `5f0787c` | build: initialize the static PixelForge application toolchain |
| 2 | `4f7a4d9` | build: lock application dependencies |
| 3 | `dc375a6` | feat: validate resize presets and saved preferences |
| 4 | `9f19456` | feat: validate image signatures and reject animated inputs |
| 5 | `080b35d` | feat: preserve portable paths and disambiguate output names |
| 6 | `1e43bdf` | feat: resample images with alpha-aware Lanczos filters |
| 7 | `be08636` | feat: calculate overlapping inference tile bounds |
| 8 | `18c5524` | feat: pin verified Real-ESRGAN model weights |
| 9 | `c6f4635` | feat: run tiled Real-ESRGAN with WebGPU and WASM |
| 10 | `5e2d35c` | feat: decode, resize and encode images in a browser worker |
| 11 | `c1832be` | feat: enforce queue transitions and estimate remaining work |
| 12 | `59ae40d` | feat: traverse folder drops and preserve relative paths |
| 13 | `2e7e23b` | feat: manage worker requests, timeouts and cancellation |
| 14 | `3048998` | feat: stream ZIP entries with bounded memory |
| 15 | `eb5e208` | feat: download individual outputs and save ZIP streams |
| 16 | `5f7e0f7` | feat: coordinate sequential batches and preserve completed jobs |
| 17 | `22ab635` | feat: persist local settings and color theme |
| 18 | `3a67bc9` | feat: format image dimensions, file sizes and durations |
| 19 | `59f2133` | feat: add accessible shared studio controls |
| 20 | `b0f7cc7` | feat: provide drag-and-drop, image and folder pickers |
| 21 | `a73cf00` | feat: expose output presets and detected encoders |
| 22 | `d8f1cc3` | feat: compare source and output with zoom and pan |
| 23 | `47f074c` | feat: show thumbnail queue, errors and file actions |
| 24 | `eddaf83` | feat: connect workspace and landing routes to batch controls |
| 25 | `c5e13be` | test: verify target dimensions and restored settings |
| 26 | `1cacf80` | test: cover image signatures and animation rejection |
| 27 | `117252f` | test: check alpha-aware resizing and tile coverage |
| 28 | `b2d9bee` | test: cover queue status transitions and time estimates |
| 29 | `e040dfa` | test: read exported ZIP bytes and verify portable paths |
| 30 | `791c53c` | test: validate conversion, folders and batch recovery in Chromium |
| 31 | `de73bab` | test: exercise verified Real-ESRGAN weights in Chromium |
| 32 | `e470bc2` | docs: explain privacy boundaries and working limits |
| 33 | `b95f504` | docs: record model provenance and redistribution terms |
| 34 | `6e70d45` | docs: explain browser and model verification workflows |
| 35 | `2b03ccf` | build: configure Vercel to serve the static export |
| 36 | `d835af0` | ci: run static build and browser verification on GitHub |
| 37 | `e92ea95` | docs: document local setup and deployment |
| 38 | `caa4c6e` | fix: preserve encoder discovery through React development remounts |
| 39 | `2c26ad1` | fix: validate AVIF dimensions and reject sequence containers |
| 40 | `0620040` | fix: reserve folder names while generating ZIP entries |
| 41 | `bbed635` | feat: pan zoomed previews with the keyboard |
| 42 | `6f97477` | build: configure the shadcn component registry and theme tokens |
| 43 | `325da01` | feat: encode AVIF with a verified worker-side libavif fallback |
| 44 | `d596c2d` | fix: bound the model download buffer and improve fallback feedback |
| 45 | `96d8b45` | test: cover AVIF conversion and preserved alpha in Chromium |
| 46 | `1426d1d` | test: cover cached inference and recovery from invalid weights |
| 47 | `030c9b2` | test: exercise nested drag intake and EXIF orientation |
| 48 | `35fe9c6` | test: read ZIP output written to a browser file destination |
| 49 | `7e80348` | build: restrict network sources and test the production export |
| 50 | `0cd04e9` | docs: publish codec notices and verified model details |
| 51 | Ledger commit | docs: record the delivery history and verification |
