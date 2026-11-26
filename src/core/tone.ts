import type { Settings } from "./settings";

export function adjustTone(pixels: Uint8ClampedArray, { exposure, contrast, saturation }: Settings) {
  if (!exposure && !contrast && !saturation) return;
  const gain = 2 ** exposure;
  const slope = (100 + contrast) / Math.max(1, 100 - contrast);
  const chroma = 1 + saturation / 100;
  for (let i = 0; i < pixels.length; i += 4) {
    const gray = 0.2126 * pixels[i] + 0.7152 * pixels[i + 1] + 0.0722 * pixels[i + 2];
    for (let c = i; c < i + 3; c++) {
      const channel = gray + (pixels[c] - gray) * chroma;
      pixels[c] = (channel * gain - 127.5) * slope + 127.5;
    }
  }
}
