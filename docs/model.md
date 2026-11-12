# Real-ESRGAN model

PixelForge uses the FP32 RealESRGAN_x2plus ONNX export in the [SkillSafe model repository](https://huggingface.co/skillsafe-ai/realesrgan-x2plus). The model card documents the upstream checkpoint, conversion procedure, and numerical comparison with the PyTorch reference.

- Revision: `8166b63ed4baafea3c2867a01050c6af919527d7`
- Artifact: `model.onnx`
- Size: 67,076,136 bytes (about 64 MiB)
- SHA-256: `7eb5e9eb507df603c0c04b49b23c86a362e0a01575bfbbac891d970f9c331888`
- Contract: float32 RGB NCHW in [0, 1], even input dimensions, float32 RGB NCHW output at 2×.
- License: [BSD 3-Clause](https://github.com/xinntao/Real-ESRGAN/blob/a4abfb2979a7bbff3f69f58f58ae324608821e27/LICENSE). Real-ESRGAN copyright © 2021 Xintao Wang. The model repository documents separate terms for its conversion material.

The weights are downloaded on demand and are not included in the Git repository or deployment. ONNX Runtime Web, which is installed as an npm dependency, is [MIT licensed](../public/notices/onnxruntime.txt). The browser receives the runtime and the matching WebAssembly binaries from the same static site.

AI requires WebAssembly, OffscreenCanvas, workers, and a secure context for integrity checks. WebGPU availability depends on the browser, graphics driver, and hardware. If WebGPU initialization or inference fails, PixelForge retries with single-threaded WASM. WASM may take substantially longer, and some devices cannot process the maximum allowed size. The model can run from a verified cache after its first download.
