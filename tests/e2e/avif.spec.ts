import { test, expect } from "@playwright/test";
import { inspectBytes } from "../../src/core/format";
import { downloaded, png, readPixels } from "./fixtures";

test("encodes a real AVIF and re-imports it with its transparency intact", async ({ page, context }) => {
  let wasmRequested = false;
  context.on("request", request => { if (request.url().endsWith("/avif_enc.wasm")) wasmRequested = true; });
  await page.goto("/studio/");
  const canvasAvif = await page.evaluate(async () => {
    const canvas = new OffscreenCanvas(2, 2);
    canvas.getContext("2d")?.fillRect(0, 0, 2, 2);
    return (await canvas.convertToBlob({ type: "image/avif" })).type === "image/avif";
  });
  await page.getByLabel("Output format").selectOption("image/avif");
  await page.getByLabel("Target size").selectOption("original");
  await page.getByTestId("file-input").setInputFiles({
    name: "sample.png", mimeType: "image/png", buffer: await png(page, 19, 13, true),
  });
  await page.getByRole("button", { name: "Start batch" }).click();
  const [avif] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download sample.avif" }).click()]);
  const encoded = await downloaded(avif);
  expect(inspectBytes(encoded)).toEqual({ format: "image/avif", width: 19, height: 13 });
  if (!canvasAvif) expect(wasmRequested).toBe(true);
  await page.getByRole("button", { name: "Clear completed" }).click();
  await page.getByLabel("Output format").selectOption("image/png");
  await page.getByTestId("file-input").setInputFiles({ name: "round-trip.avif", mimeType: "image/avif", buffer: encoded });
  await page.getByRole("button", { name: "Start batch" }).click();
  const [back] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download round-trip.png" }).click()]);
  const result = await downloaded(back);
  expect((await readPixels(page, result, 18, 12, 1, 1))[3]).toBe(0);
  expect((await readPixels(page, result, 1, 1, 1, 1))[3]).toBe(255);
});
