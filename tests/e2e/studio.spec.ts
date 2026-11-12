import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { test, expect } from "@playwright/test";
import { unzipSync } from "fflate";
import { inspectBytes } from "../../src/core/format";
import { downloaded, png, readPixels } from "./fixtures";

test("launches from the landing page and produces a valid resized JPG locally", async ({ page, context }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Open image studio" }).click();
  await expect(page.getByRole("heading", { name: "Image studio" })).toBeVisible();
  const outbound: string[] = [];
  context.on("request", request => {
    if (!request.url().startsWith("http")) return;
    const own = request.url().startsWith("http://localhost:3200/");
    if (!own || !["GET", "HEAD"].includes(request.method()) || request.postDataBuffer()?.length) {
      outbound.push(request.method() + " " + request.url());
    }
  });
  const buffer = await png(page, 17, 11);
  await page.getByTestId("file-input").setInputFiles({ name: "scene.png", mimeType: "image/png", buffer });
  await expect(page.getByText("PNG · 17 × 11")).toBeVisible();
  await page.getByLabel("Output format").selectOption("image/jpeg");
  await page.getByRole("button", { name: "Start batch" }).click();
  await expect(page.getByText("Completed", { exact: true })).toBeVisible();
  const comparison = page.getByRole("slider", { name: "Before and after comparison" });
  await comparison.focus();
  await comparison.press("ArrowRight");
  await expect(comparison).toHaveValue("51");
  await page.getByRole("button", { name: "Zoom in" }).click();
  await expect(page.getByText("125%", { exact: true })).toBeVisible();
  await page.getByRole("group", { name: /Use the arrow keys to pan/ }).press("ArrowRight");
  await expect(page.locator(".preview-layer").first()).toHaveCSS("transform", "matrix(1.25, 0, 0, 1.25, -16, 0)");
  const [file] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download scene.jpg" }).click()]);
  expect(file.suggestedFilename()).toBe("scene.jpg");
  expect(inspectBytes(await downloaded(file))).toEqual({ format: "image/jpeg", width: 34, height: 22 });
  expect(outbound).toEqual([]);
});

test("accepts nested folder intake and exports actual files with the same directory tree", async ({ page }, info) => {
  await page.addInitScript(() => Object.defineProperty(window, "showSaveFilePicker", { value: undefined }));
  await page.goto("/studio/");
  const directory = info.outputPath("photos");
  await mkdir(join(directory, "nested"), { recursive: true });
  await writeFile(join(directory, "portrait.png"), await png(page, 5, 9));
  await writeFile(join(directory, "nested", "portrait.png"), await png(page, 9, 5));
  await page.getByTestId("folder-input").setInputFiles(directory);
  await expect(page.getByText("photos/nested/portrait.png")).toBeVisible();
  await expect(page.getByText("2 ready · 0 complete")).toBeVisible();
  await page.getByLabel("Output format").selectOption("image/webp");
  await page.getByRole("button", { name: "Start batch" }).click();
  await expect(page.getByText("Completed", { exact: true })).toHaveCount(2);
  const [zip] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download all as ZIP" }).click()]);
  expect(zip.suggestedFilename()).toBe("pixelforge-exports.zip");
  const files = unzipSync(await downloaded(zip));
  expect(Object.keys(files).sort()).toEqual(["photos/nested/portrait.webp", "photos/portrait.webp"]);
  expect(inspectBytes(files["photos/nested/portrait.webp"])).toEqual({ format: "image/webp", width: 18, height: 10 });
  expect(inspectBytes(files["photos/portrait.webp"])).toEqual({ format: "image/webp", width: 10, height: 18 });
});

test("contains bad files, protects transparency, and retries with new settings", async ({ page }) => {
  await page.goto("/studio/");
  await page.getByTestId("file-input").setInputFiles([
    { name: "broken.png", mimeType: "image/png", buffer: Buffer.from("bad image") },
    { name: "alpha.png", mimeType: "image/png", buffer: await png(page, 19, 13, true) },
    { name: "opaque.png", mimeType: "image/png", buffer: await png(page, 20, 14) },
  ]);
  await expect(page.getByText("2 ready · 0 complete")).toBeVisible();
  await page.getByLabel("Output format").selectOption("image/jpeg");
  await page.getByRole("button", { name: "Start batch" }).click();
  await expect(page.getByText(/JPEG cannot preserve transparency/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Download opaque.jpg" })).toBeVisible();
  await page.getByRole("button", { name: "Remove broken.png" }).click();
  await page.getByLabel("Output format").selectOption("image/png");
  await page.getByRole("button", { name: "Retry failed" }).click();
  await page.getByRole("button", { name: "Start batch" }).click();
  const [file] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download alpha.png" }).click()]);
  const bytes = await downloaded(file);
  expect(inspectBytes(bytes)).toMatchObject({ width: 38, height: 26 });
  expect((await readPixels(page, bytes, 37, 25, 1, 1))[3]).toBe(0);
  await page.getByRole("button", { name: "Clear completed" }).click();
  await expect(page.getByText("Your queue is empty.")).toBeVisible();
});

test("pauses between files, resumes, and can cancel and retry active work", async ({ page }) => {
  await page.goto("/studio/");
  const buffer = await png(page, 1100, 1100);
  await page.getByTestId("file-input").setInputFiles([
    { name: "one.png", mimeType: "image/png", buffer },
    { name: "two.png", mimeType: "image/png", buffer },
  ]);
  await expect(page.getByText("2 ready · 0 complete")).toBeVisible();
  await page.getByLabel("Target size").selectOption("4x");
  await page.getByRole("button", { name: "Start batch" }).click();
  await page.getByRole("button", { name: "Pause after this file" }).click();
  await expect(page.getByText("1 ready · 1 complete")).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await page.getByRole("button", { name: "Cancel batch" }).click();
  await expect(page.getByText("Cancelled", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Download one.png" })).toBeEnabled();
  await page.getByRole("button", { name: "Retry failed" }).click();
  await page.getByLabel("Target size").selectOption("original");
  await page.getByRole("button", { name: "Start batch" }).click();
  await expect(page.getByText("Completed", { exact: true })).toHaveCount(2);
});

test("has a usable narrow layout and persists theme and output preferences", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/studio/");
  await expect(page.getByRole("button", { name: "Select images" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  await page.getByRole("button", { name: "Toggle color theme" }).click();
  await page.getByLabel("Target size").selectOption("4096");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByLabel("Target size")).toHaveValue("4096");
});
