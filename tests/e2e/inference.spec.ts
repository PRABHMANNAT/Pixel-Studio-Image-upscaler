import { test, expect } from "@playwright/test";
import { inspectBytes } from "../../src/core/format";
import { model } from "../../src/core/model";
import { downloaded, png } from "./fixtures";

test("runs real Real-ESRGAN inference and produces a different output from Lanczos", async ({ page, context }) => {
  test.skip(process.env.PIXELFORGE_TEST_AI !== "1", "Enable the model-download integration test with PIXELFORGE_TEST_AI=1.");
  test.setTimeout(240_000);
  if (process.env.PIXELFORGE_TEST_MODEL_FILE) {
    await context.route(model.url, route => route.fulfill({
      path: process.env.PIXELFORGE_TEST_MODEL_FILE!,
      contentType: "application/octet-stream",
      headers: { "access-control-allow-origin": "*" },
    }));
  }
  await page.goto("/studio/");
  const buffer = await png(page, 15, 9);
  await page.getByTestId("file-input").setInputFiles({ name: "reference.png", mimeType: "image/png", buffer });
  await page.getByRole("button", { name: "Start batch" }).click();
  const [fast] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download reference.png" }).click()]);
  const reference = await downloaded(fast);
  await page.getByRole("button", { name: "Clear completed" }).click();
  await page.getByLabel("AI Upscale", { exact: true }).check();
  await page.getByTestId("file-input").setInputFiles({ name: "reference.png", mimeType: "image/png", buffer });
  await page.getByRole("button", { name: "Start batch" }).click();
  await expect(page.getByText(/Real-ESRGAN · (WASM|WEBGPU)|Failed/)).toBeVisible({ timeout: 210_000 });
  await expect(page.getByText(/Real-ESRGAN · (WASM|WEBGPU)/)).toBeVisible();
  const [ai] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download reference.png" }).click()]);
  const output = await downloaded(ai);
  expect(inspectBytes(output)).toEqual({ format: "image/png", width: 30, height: 18 });
  expect(output.equals(reference)).toBe(false);
});
