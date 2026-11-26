import { expect, test, type Page } from "@playwright/test";
import { inspectBytes } from "../../src/core/format";
import { downloaded, png, readPixels } from "./fixtures";

async function openFold(page: Page, label: string) {
  const summary = page.locator("summary").filter({ hasText: label });
  if (!await summary.evaluate(element => (element.parentElement as HTMLDetailsElement).open)) await summary.click();
}

test("crops, rotates, mirrors and scales actual pixels using the inspector plan", async ({ page }) => {
  await page.goto("/studio/");
  const base64 = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 4;
    canvas.height = 2;
    const ctx = canvas.getContext("2d")!;
    for (let x = 0; x < 4; x++) for (let y = 0; y < 2; y++) {
      ctx.fillStyle = "rgb(" + (20 + 40*x) + "," + (60 + 100*y) + ",90)";
      ctx.fillRect(x, y, 1, 1);
    }
    return canvas.toDataURL().split(",")[1];
  });
  await page.getByTestId("file-input").setInputFiles({ name: "grid.png", mimeType: "image/png", buffer: Buffer.from(base64,"base64") });
  await page.getByLabel("Processing recipe").selectOption("Pixel art 4×");
  await openFold(page, "Crop & framing");
  await page.getByLabel("Center crop").selectOption("3:2");
  await page.getByLabel("Rotate clockwise").selectOption("90");
  await page.getByLabel("Mirror horizontally").check();
  await expect(page.getByLabel("Resampling")).toHaveValue("nearest");
  await expect(page.getByText("8 × 12 px", { exact: true })).toBeVisible();
  await page.getByLabel("Filename suffix").fill("-proof");
  await page.getByRole("button", { name: "Start batch" }).click();
  const [file] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download grid-proof.png" }).click()]);
  const result = await downloaded(file);
  expect(inspectBytes(result)).toMatchObject({ width: 8, height: 12 });
  expect(await readPixels(page, result, 0, 0, 1, 1)).toEqual([20,60,90,255]);
  expect(await readPixels(page, result, 7, 11, 1, 1)).toEqual([100,160,90,255]);

  await page.getByLabel("Comparison view").selectOption("original");
  await expect(page.getByAltText("Original preview")).toBeVisible();
  await expect(page.getByAltText("Processed preview")).toHaveCount(0);
  await page.getByLabel("Comparison view").selectOption("output");
  await expect(page.getByAltText("Processed preview")).toBeVisible();
  for (const ground of ["dark", "light", "checker"]) {
    await page.getByLabel("Preview backdrop").selectOption(ground);
    await expect(page.locator(".preview-surface")).toHaveAttribute("data-ground", ground);
  }
  await openFold(page, "Luminance histogram");
  await expect(page.locator(".histogram-plot i")).toHaveCount(32);
  await page.getByLabel("Histogram image").selectOption("output");
  await expect(page.locator(".histogram-plot i")).toHaveCount(32);
});

test("saves and restores a grade, processes its pixels, and resets the recipe", async ({ page }) => {
  await page.goto("/studio/");
  await page.getByLabel("Processing recipe").selectOption("Monochrome print");
  await openFold(page, "Tone & color");
  await expect(page.getByRole("slider", { name: "Saturation", exact: true })).toHaveValue("-100");
  await page.getByRole("slider", { name: "Exposure", exact: true }).press("End");
  await page.getByRole("slider", { name: "Contrast", exact: true }).press("ArrowRight");
  await page.getByRole("button", { name: "Save current recipe" }).click();
  await page.getByLabel("Processing recipe").selectOption("Web delivery");
  await expect(page.getByLabel("Output format")).toHaveValue("image/webp");
  await page.reload();
  await page.getByLabel("Processing recipe").selectOption("saved");
  await expect(page.getByLabel("Output format")).toHaveValue("image/png");
  await openFold(page, "Tone & color");
  await expect(page.getByRole("slider", { name: "Exposure", exact: true })).toHaveValue("2");
  await expect(page.getByRole("slider", { name: "Contrast", exact: true })).toHaveValue("1");
  await page.getByTestId("file-input").setInputFiles({ name: "grade.png", mimeType: "image/png", buffer: await png(page, 15, 9) });
  await page.getByRole("button", { name: "Start batch" }).click();
  const [file] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download grade.png" }).click()]);
  const pixel = await readPixels(page, await downloaded(file), 13, 8, 1, 1);
  expect(pixel).toEqual([255,255,255,255]);
  await page.getByRole("button", { name: "Reset tone" }).click();
  await expect(page.getByRole("slider", { name: "Exposure", exact: true })).toHaveValue("0");
  await page.getByLabel("Processing recipe").selectOption("default");
  await expect(page.getByLabel("Target size")).toHaveValue("2x");
});

test("pastes an image, applies a custom JPEG matte and creates a second export version", async ({ page }) => {
  await page.goto("/studio/");
  const bytes = [...await png(page, 48, 32, true)];
  await page.evaluate(bytes => {
    const transfer = new DataTransfer();
    transfer.items.add(new File([new Uint8Array(bytes)], "clipboard.png", { type: "image/png" }));
    window.dispatchEvent(new ClipboardEvent("paste", { clipboardData: transfer, bubbles: true, cancelable: true }));
  }, bytes);
  await expect(page.getByText("1 ready · 0 complete")).toBeVisible();
  await page.getByLabel("Target size").selectOption("original");
  await page.getByLabel("Output format").selectOption("image/jpeg");
  await page.getByLabel("Allow background for JPG").check();
  await page.getByLabel(/Matte color/).fill("#204080");
  await page.getByRole("button", { name: "Start batch" }).click();
  const first = page.getByRole("button", { name: "Download clipboard.jpg", exact: true });
  const [file] = await Promise.all([page.waitForEvent("download"), first.click()]);
  const pixel = await readPixels(page, await downloaded(file), 44, 28, 1, 1);
  [32,64,128].forEach((expected, i) => expect(Math.abs(pixel[i] - expected)).toBeLessThan(5));
  await page.getByRole("button", { name: "Make new version of clipboard.png" }).click();
  await page.getByRole("button", { name: "Start batch" }).click();
  await expect(page.getByRole("button", { name: "Download clipboard (2).jpg" })).toBeEnabled();
  await expect(first).toBeEnabled();
  const [report] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download batch report" }).click()]);
  expect(report.suggestedFilename()).toBe("pixelforge-report.csv");
  const csv = (await downloaded(report)).toString("utf8");
  expect(csv).toContain('"clipboard.jpg","48","32"');
  expect(csv).toContain('"clipboard (2).jpg","48","32"');
});

test("finds, filters and sorts files while retaining all jobs for processing", async ({ page }) => {
  await page.goto("/studio/");
  await page.getByTestId("file-input").setInputFiles([
    { name: "z.png", mimeType: "image/png", buffer: await png(page, 18, 9) },
    { name: "a.png", mimeType: "image/png", buffer: await png(page, 80, 110) },
    { name: "broken.png", mimeType: "image/png", buffer: Buffer.from("broken") },
  ]);
  await expect(page.getByText("2 ready · 0 complete")).toBeVisible();
  await page.getByLabel("Sort queue").selectOption("name");
  await expect(page.locator(".queue-name strong").first()).toHaveText("a.png");
  await page.getByLabel("Sort queue").selectOption("size");
  await expect(page.locator(".queue-name strong").first()).toHaveText("a.png");
  await page.getByLabel("Filter queue").selectOption("attention");
  await expect(page.locator(".queue-row")).toHaveCount(1);
  await expect(page.locator(".queue-name strong")).toHaveText("broken.png");
  await page.getByLabel("Filter queue").selectOption("all");
  await page.getByLabel("Search filenames").fill("Z.PNG");
  await expect(page.locator(".queue-row")).toHaveCount(1);
  await page.getByRole("button", { name: "Start batch" }).click();
  await expect(page.getByText("0 ready · 2 complete")).toBeVisible();
  await page.getByLabel("Search filenames").fill("missing");
  await expect(page.getByText(/No matching files/)).toBeVisible();
});

test("opens the sample from the gallery and the empty light table", async ({ page }) => {
  const missing: string[] = [];
  page.on("response", response => { if (response.status() >= 400) missing.push(response.url()); });
  await page.setViewportSize({ width: 320, height: 812 });
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await page.getByRole("link", { name: "Try the sample" }).click();
  await expect(page.getByText("1 ready · 0 complete")).toBeVisible();
  await expect(page.locator(".queue-name strong")).toHaveText("butterfly-nebula.jpg");
  await expect(page).toHaveURL(/\/studio\/$/);
  await page.reload();
  await page.getByRole("button", { name: "Use sample image" }).click();
  const portrait = page.getByAltText("Original preview");
  await expect(portrait).toBeVisible();
  const imageBox = (await portrait.boundingBox())!;
  const surfaceBox = (await page.locator(".preview-surface").boundingBox())!;
  expect(imageBox.height).toBeCloseTo(surfaceBox.height, 0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  expect(missing).toEqual([]);
  await page.getByRole("link", { name: "Inspector" }).click();
  await expect(page).toHaveURL(/#inspector$/);
});

test("inspects the photograph with the keyboard and a reduced-motion software fallback", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    Object.defineProperty(HTMLCanvasElement.prototype, "getContext", { value: function(...args: unknown[]) {
      return args[0] === "webgl2" ? null : Reflect.apply(original, this, args);
    } });
  });
  await page.goto("/");
  const toggle = page.getByRole("button", { name: "Inspect with 2× loupe" });
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  const glass = page.locator(".optical-glass");
  await expect(glass).toHaveCSS("background-image", /butterfly-nebula/);
  const left = await glass.evaluate(element => element.getBoundingClientRect().left);
  await toggle.press("ArrowRight");
  await expect.poll(() => glass.evaluate(element => element.getBoundingClientRect().left)).toBeGreaterThan(left);
  await expect(glass.locator("canvas")).toBeHidden();
  await toggle.press("Escape");
  await expect(glass).toHaveCount(0);
});

test("the 2× loupe magnifies the same point in the photographic plate", async ({ page }) => {
  await page.goto("/");
  await page.locator(".plate-image img").evaluate(img => (img as HTMLImageElement).decode());
  const support = await page.evaluate(() => {
    const gl = document.createElement("canvas").getContext("webgl2");
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
    return !!gl;
  });
  const plate = page.locator(".plate-image");
  await plate.scrollIntoViewIfNeeded();
  const before = await plate.screenshot();
  await page.getByRole("button", { name: "Inspect with 2× loupe" }).click();
  const glass = page.locator(".optical-glass");
  if (support) await expect(glass.locator("canvas")).toBeVisible();
  await expect(glass).toHaveCSS("opacity", "1");
  const frame = (await plate.boundingBox())!;
  const lens = (await glass.boundingBox())!;
  const centerX = Math.round(lens.x + lens.width / 2 - frame.x);
  const centerY = Math.round(lens.y + lens.height / 2 - frame.y);
  const after = await plate.screenshot();
  const source = await readPixels(page, before, centerX + 9, centerY, 1, 1);
  const magnified = await readPixels(page, after, centerX + 18, centerY, 1, 1);
  for (let channel = 0; channel < 3; channel++) expect(Math.abs(source[channel] - magnified[channel])).toBeLessThan(22);
});
