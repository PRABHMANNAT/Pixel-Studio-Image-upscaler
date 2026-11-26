import { describe, expect, it } from "vitest";
import { cropRect, rotatedSize } from "../../src/core/framing";
import { luminanceBins } from "../../src/core/histogram";
import { outputPath, safePath, uniquePath } from "../../src/core/paths";
import { nearest } from "../../src/core/resize";
import { defaults, restoreSettings } from "../../src/core/settings";
import { adjustTone } from "../../src/core/tone";
import { batchReport } from "../../src/core/report";

describe("framing", () => {
  it.each([
    ["source", 240, 160, 0, 0], ["1:1", 160, 160, 40, 0], ["4:5", 128, 160, 56, 0],
    ["3:2", 240, 160, 0, 0], ["16:9", 240, 135, 0, 12],
  ] as const)("centers a %s crop", (ratio, width, height, x, y) => {
    expect(cropRect({ width: 240, height: 160 }, ratio)).toEqual({ width, height, x, y });
  });
  it("retains at least one pixel and swaps axes only on quarter turns", () => {
    expect(cropRect({ width: 200, height: 1 }, "4:5").width).toBe(1);
    for (const angle of [0, 90, 180, 270] as const) {
      const size = rotatedSize({ width: 10, height: 20 }, angle);
      expect([size.width, size.height]).toEqual(angle % 180 ? [20, 10] : [10, 20]);
    }
  });
});

it("samples at pixel centers and preserves color and alpha exactly", () => {
  const left = [10,20,30,45], right = [200,160,80,0];
  const out = nearest(Uint8ClampedArray.from([...left,...right]), { width: 2, height: 1 }, { width: 4, height: 2 });
  const row = [...left,...left,...right,...right];
  expect([...out]).toEqual([...row,...row]);
});

it("applies exposure, contrast and saturation while retaining alpha", () => {
  const data = Uint8ClampedArray.of(80, 40, 20, 53);
  adjustTone(data, defaults);
  expect([...data]).toEqual([80, 40, 20, 53]);
  adjustTone(data, { ...defaults, exposure: 1 });
  expect([...data]).toEqual([160, 80, 40, 53]);
  adjustTone(data, { ...defaults, saturation: -100 });
  expect([...data]).toEqual([94, 94, 94, 53]);
  adjustTone(data, { ...defaults, contrast: 25 });
  expect([...data]).toEqual([72, 72, 72, 53]);
});

it("weights the histogram by transparency", () => {
  const bins = luminanceBins(Uint8ClampedArray.of(0,0,0,255, 255,255,255,128, 255,0,0,0));
  expect(bins[0]).toBe(1);
  expect(bins[31]).toBeCloseTo(128 / 255);
  expect(bins.slice(1,-1).every(bin => bin === 0)).toBe(true);
});

it("restores old preferences and validates new controls", () => {
  expect(restoreSettings('{"jpegMatte":true}')).toEqual({ ...defaults, jpegMatte: true });
  expect(restoreSettings('{"crop":"oops","rotation":32,"exposure":99,"saturation":101,"matteColor":"red","sampler":1}')).toEqual(defaults);
});

it("keeps suffixes in the leaf and collision numbers inside the filename limit", () => {
  const path = outputPath("folder/" + "a".repeat(148) + ".jpg", "image/webp", "../blue");
  expect(path).toMatch(/^folder\/a+-blue\.webp$/);
  const used = new Set<string>([path.toLowerCase()]);
  const duplicate = uniquePath(path, used);
  expect(duplicate).toBe(safePath(duplicate));
  expect(duplicate).toMatch(/ \(2\)\.webp$/);
});

it("quotes CSV cells, neutralizes formula-shaped names and retains error details", () => {
  const text = batchReport([{ id: "1", file: new File(["abc"], "sample"), path: '=1,"2"', status: "failed", progress: 0, error: "two\nlines" }]);
  expect(text).toContain('"\'=1,""2"""');
  expect(text).toContain('"two\nlines"');
  expect(text.charCodeAt(0)).toBe(0xfeff);
});
