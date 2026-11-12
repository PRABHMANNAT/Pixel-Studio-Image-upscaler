export const formats = ["image/png", "image/jpeg", "image/webp", "image/avif"] as const;
export type Format = (typeof formats)[number];
export type Dimensions = { width: number; height: number };
export const presets = ["original", "2x", "4x", "2k", "4k", "4096", "custom"] as const;
export type Preset = (typeof presets)[number];
export type Settings = {
  mode: "resize" | "ai";
  preset: Preset;
  format: Format | "original";
  quality: number;
  width: number;
  height: number;
  lock: boolean;
  allowDownscale: boolean;
  sharpen: boolean;
  jpegMatte: boolean;
};
export const defaults: Settings = {
  mode: "resize", preset: "2x", format: "original", quality: 0.92,
  width: 1920, height: 1080, lock: true, allowDownscale: false, sharpen: false, jpegMatte: false,
};
export const MAX_SIDE = 8192;
export const MAX_PIXELS = 24_000_000;
export const MAX_INPUT_BYTES = 48 * 1024 ** 2;

export function assertDimensions({ width, height }: Dimensions, limit = MAX_PIXELS) {
  if (![width, height].every(x => Number.isInteger(x) && x >= 1 && x <= MAX_SIDE) || width * height > limit) {
    throw new Error("Image exceeds this mode’s pixel or edge limit. Choose smaller output dimensions or use a smaller source.");
  }
}

export function targetSize(source: Dimensions, settings: Settings): Dimensions {
  const { width, height } = source;
  assertDimensions(source);
  const { preset, lock, allowDownscale } = settings;
  if (preset === "original") return { width, height };
  let ratio = 1;
  if (preset === "2x" || preset === "4x") ratio = Number(preset[0]);
  if (preset === "4096") ratio = 4096 / Math.max(width, height);
  if (preset === "2k" || preset === "4k") {
    const long = preset === "2k" ? 2560 : 3840;
    const short = preset === "2k" ? 1440 : 2160;
    ratio = Math.min(long / Math.max(width, height), short / Math.min(width, height));
  }
  if (preset === "custom") {
    if (![settings.width, settings.height].every(x => Number.isInteger(x) && x >= 1 && x <= MAX_SIDE)) {
      throw new Error("Enter whole-number custom dimensions between 1 and 8192.");
    }
    if (!lock) {
      const target = { width: settings.width, height: settings.height };
      if (!allowDownscale && (target.width < width || target.height < height)) {
        throw new Error("Enable downscaling to use these custom dimensions.");
      }
      assertDimensions(target);
      return target;
    }
    ratio = Math.min(settings.width / width, settings.height / height);
  }
  if (!allowDownscale) ratio = Math.max(1, ratio);
  const result = { width: Math.max(1, Math.round(width * ratio)), height: Math.max(1, Math.round(height * ratio)) };
  assertDimensions(result);
  return result;
}

export function restoreSettings(raw: string | null): Settings {
  if (!raw) return defaults;
  try {
    const s = JSON.parse(raw) as Partial<Settings>;
    const dimension = (n: unknown, fallback: number) => typeof n === "number" && Number.isInteger(n) && n > 0 && n <= MAX_SIDE ? n : fallback;
    return {
      mode: s.mode === "ai" ? "ai" : "resize",
      preset: presets.includes(s.preset as Preset) ? s.preset! : defaults.preset,
      format: s.format && formats.includes(s.format as Format) ? s.format : defaults.format,
      quality: typeof s.quality === "number" && s.quality >= 0.1 && s.quality <= 1 ? s.quality : defaults.quality,
      width: dimension(s.width, defaults.width), height: dimension(s.height, defaults.height),
      lock: s.lock !== false, allowDownscale: s.allowDownscale === true,
      sharpen: s.sharpen === true, jpegMatte: s.jpegMatte === true,
    };
  } catch { return defaults; }
}
