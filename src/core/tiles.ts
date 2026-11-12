import type { Dimensions } from "./settings";

export type Tile = { x: number; y: number; width: number; height: number; left: number; top: number; inputWidth: number; inputHeight: number };

export function* tiles({ width, height }: Dimensions, size = 96, overlap = 16): Generator<Tile> {
  for (let y = 0; y < height; y += size) for (let x = 0; x < width; x += size) {
    const w = Math.min(size, width - x);
    const h = Math.min(size, height - y);
    const left = Math.max(0, x - overlap);
    const top = Math.max(0, y - overlap);
    const extentX = Math.min(width, x + w + overlap) - left;
    const extentY = Math.min(height, y + h + overlap) - top;
    // Pixel-unshuffle in x2plus needs even input dimensions.
    yield { x, y, width: w, height: h, left, top, inputWidth: extentX + extentX % 2, inputHeight: extentY + extentY % 2 };
  }
}
