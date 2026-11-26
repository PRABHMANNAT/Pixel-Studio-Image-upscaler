import type { Dimensions, Settings } from "./settings";

export function cropRect(source: Dimensions, crop: Settings["crop"]) {
  let { width, height } = source;
  if (crop !== "source") {
    const [w, h] = crop.split(":").map(Number);
    width = Math.max(1, Math.min(width, Math.round(height * w / h)));
    height = Math.max(1, Math.min(height, Math.round(source.width * h / w)));
  }
  return { width, height, x: Math.floor((source.width - width) / 2), y: Math.floor((source.height - height) / 2) };
}

export function rotatedSize(size: Dimensions, rotation: Settings["rotation"]): Dimensions {
  return rotation === 90 || rotation === 270
    ? { width: size.height, height: size.width }
    : { width: size.width, height: size.height };
}
