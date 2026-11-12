# Browser processing and privacy

PixelForge is a static Next.js App Router export. The browser sends selected `File` objects only to its own dedicated worker via structured cloning. It does not serialize them into HTTP requests. The worker validates the container, decodes with orientation applied, and creates small thumbnails and previews before processing. The UI holds local object URLs for those previews and releases them when rows are removed or the workspace closes.

The queue runs one worker operation at a time. It takes a copy of the settings at the start of each batch. Pausing lets the current operation finish. Cancelling terminates the worker, including any active inference or fetch, while keeping completed results. Worker failures are attached to the affected file so the batch can continue. Idle workers are terminated to release their image and inference memory.

Fast Resize filters in two separable Lanczos passes, with premultiplied alpha. AI tiles include context beyond the area copied into the output, then crop the overlapped border to reduce seams. The native model enhances RGB; alpha is resampled separately. These choices avoid silently dropping alpha, but AI can still produce artifacts on fine textures or transparent edges.

The first AI run requests a pinned public model from Hugging Face. The request uses no credentials or referrer and carries no image data. The runtime loads from this site. Model weights are checksum-verified on each read from Cache Storage; settings and theme use local storage. Hosting providers still see ordinary requests for the page and its assets.

ZIP output uses stored entries because the image files are already encoded. Each blob is read as a stream, and the next chunk is consumed only after the destination accepts the previous one. The directory layout is preserved after removing traversal components and replacing invalid filename characters. Originals are never edited in place.

Browser encoders re-encode pixels and can change color profiles or metadata. The app does not preserve EXIF, GPS, or camera metadata. Source format detection does not depend on filenames or declared MIME types. Unsupported animation is rejected rather than converted to a still. Optional denoise and HEIC/HEIF are not included.

The AVIF fallback uses the single-threaded encoder from [jSquash](https://github.com/jamsinclair/jSquash/tree/main/packages/avif) (Apache 2.0), built with [libavif](https://github.com/AOMediaCodec/libavif). The worker verifies the fallback by encoding a tiny image before enabling the format. The application serves the codec and its license from the same origin.
