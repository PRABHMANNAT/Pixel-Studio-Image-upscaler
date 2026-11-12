import { expect, it } from "vitest";
import { lanczos, sharpenPixels } from "../../src/core/resize";
import { tiles } from "../../src/core/tiles";

it("preserves flat color through both Lanczos passes", () => {
  const input = Uint8ClampedArray.from(Array.from({ length: 15 }, () => [26, 112, 224, 255]).flat());
  const output = lanczos(input, { width: 5, height: 3 }, { width: 3, height: 11 });
  expect(output.length).toBe(132);
  for (let i = 0; i < output.length; i += 4) expect([...output.slice(i, i + 4)]).toEqual([26, 112, 224, 255]);
});

it("does not leak invisible RGB into interpolated edges", () => {
  const output = lanczos(Uint8ClampedArray.of(255, 0, 0, 255, 0, 255, 0, 0), { width: 2, height: 1 }, { width: 6, height: 1 });
  expect(output[11]).toBeGreaterThan(0);
  for (let i = 1; i < output.length; i += 4) expect(output[i]).toBe(0);
});

it("sharpens opaque detail while leaving alpha untouched", () => {
  const input = Uint8ClampedArray.from(Array.from({ length: 9 }, (_, n) => n === 4 ? [140, 140, 140, 255] : [80, 80, 80, 255]).flat());
  expect(sharpenPixels(input, { width: 3, height: 3 })[16]).toBeGreaterThan(140);
  input[3 + 4] = 200;
  expect(sharpenPixels(input, { width: 3, height: 3 })).toEqual(input);
});

it("covers each output location once with even padded input tiles", () => {
  const dimensions = { width: 203, height: 101 };
  const coverage = new Uint8Array(dimensions.width * dimensions.height);
  const list = [...tiles(dimensions)];
  expect(list).toHaveLength(6);
  for (const tile of list) {
    expect(tile.inputWidth % 2).toBe(0);
    expect(tile.inputHeight % 2).toBe(0);
    expect(tile.x + tile.width).toBeLessThanOrEqual(tile.left + tile.inputWidth);
    for (let y = tile.y; y < tile.y + tile.height; y++) {
      for (let x = tile.x; x < tile.x + tile.width; x++) coverage[y * dimensions.width + x]++;
    }
  }
  expect(coverage.every(value => value === 1)).toBe(true);
});
