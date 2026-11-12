import { describe, expect, it } from "vitest";
import { defaults, restoreSettings, targetSize } from "../../src/core/settings";

describe("resize targets", () => {
  it("scales source dimensions exactly at 2× and 4×", () => {
    expect(targetSize({ width: 321, height: 179 }, defaults)).toEqual({ width: 642, height: 358 });
    expect(targetSize({ width: 321, height: 179 }, { ...defaults, preset: "4x" })).toEqual({ width: 1284, height: 716 });
  });
  it("fits landscape and portrait within equivalent UHD boxes", () => {
    expect(targetSize({ width: 1920, height: 1080 }, { ...defaults, preset: "4k" })).toEqual({ width: 3840, height: 2160 });
    expect(targetSize({ width: 1080, height: 1920 }, { ...defaults, preset: "4k" })).toEqual({ width: 2160, height: 3840 });
  });
  it("keeps larger sources unless downscaling is enabled", () => {
    const source = { width: 5000, height: 2500 };
    expect(targetSize(source, { ...defaults, preset: "4096" })).toEqual(source);
    expect(targetSize(source, { ...defaults, preset: "4096", allowDownscale: true })).toEqual({ width: 4096, height: 2048 });
  });
  it("preserves aspect in a custom box and requires consent to shrink unlocked dimensions", () => {
    const source = { width: 400, height: 200 };
    const custom = { ...defaults, preset: "custom" as const, width: 800, height: 300 };
    expect(targetSize(source, custom)).toEqual({ width: 600, height: 300 });
    expect(() => targetSize(source, { ...custom, width: 390, lock: false })).toThrow(/Enable downscaling/);
    expect(targetSize(source, { ...custom, width: 390, lock: false, allowDownscale: true })).toEqual({ width: 390, height: 300 });
  });
  it("rejects limits on invalid input and output", () => {
    expect(() => targetSize({ width: 0, height: 10 }, defaults)).toThrow(/pixel or edge/);
    expect(() => targetSize({ width: 4000, height: 4000 }, defaults)).toThrow(/pixel or edge/);
    expect(() => targetSize({ width: 100, height: 100 }, { ...defaults, preset: "custom", width: 12.5 })).toThrow(/whole-number/);
  });
});

describe("saved preferences", () => {
  it("keeps valid choices while rejecting invalid persisted values", () => {
    expect(restoreSettings(JSON.stringify({ mode: "ai", format: "image/heic", quality: 2, width: -1, height: 300 }))).toEqual({
      ...defaults, mode: "ai", height: 300,
    });
    expect(restoreSettings("malformed JSON")).toEqual(defaults);
  });
});
