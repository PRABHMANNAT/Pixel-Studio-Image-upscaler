export function luminanceBins(pixels: Uint8ClampedArray) {
  const bins = new Array<number>(32).fill(0);
  for (let i = 0; i < pixels.length; i += 4) {
    const brightness = 0.2126 * pixels[i] + 0.7152 * pixels[i + 1] + 0.0722 * pixels[i + 2];
    bins[Math.min(31, Math.floor(brightness / 8))] += pixels[i + 3] / 255;
  }
  return bins;
}
