import { test, expect } from "@playwright/test";
import { inspectBytes } from "../../src/core/format";
import { model } from "../../src/core/model";
import { downloaded, png, readPixels } from "./fixtures";

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
  const engine = page.getByText(/Real-ESRGAN · (WASM|WEBGPU)/);
  await expect(engine).toBeVisible();
  const provider = (await engine.innerText()).split(" · ")[1];
  console.log("Verified Real-ESRGAN provider:", provider);
  if (process.env.PIXELFORGE_EXPECT_PROVIDER) expect(provider).toBe(process.env.PIXELFORGE_EXPECT_PROVIDER);
  const [ai] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download reference.png" }).click()]);
  const output = await downloaded(ai);
  expect(inspectBytes(output)).toEqual({ format: "image/png", width: 30, height: 18 });
  expect(await readPixels(page, output)).not.toEqual(await readPixels(page, reference));

  await context.unroute(model.url);
  await context.route(model.url, route => route.abort());
  await page.reload();
  const fresh = await png(page, 13, 11);
  await expect(page.getByRole("radio", { name: "AI Upscale" })).toBeChecked();
  await page.getByTestId("file-input").setInputFiles({ name: "cached.png", mimeType: "image/png", buffer: fresh });
  await page.getByRole("button", { name: "Start batch" }).click();
  await expect(page.getByRole("button", { name: "Download cached.png" })).toBeVisible({ timeout: 40_000 });
});

test("rejects a corrupt model and can recover in Fast Resize", async ({ page, context }) => {
  await context.route(model.url, route => route.fulfill({
    body: "not the model", contentType: "application/octet-stream",
    headers: { "access-control-allow-origin": "*" },
  }));
  await page.goto("/studio/");
  await page.getByRole("radio", { name: "AI Upscale" }).check();
  const buffer = await png(page, 12, 8);
  await page.getByTestId("file-input").setInputFiles({ name: "retry.png", mimeType: "image/png", buffer });
  await page.getByRole("button", { name: "Start batch" }).click();
  await expect(page.getByText("The model failed its integrity check.")).toBeVisible();
  await page.getByRole("radio", { name: "Fast Resize" }).check();
  await page.getByRole("button", { name: "Retry failed" }).click();
  await page.getByRole("button", { name: "Start batch" }).click();
  await expect(page.getByRole("button", { name: "Download retry.png" })).toBeVisible();
});
