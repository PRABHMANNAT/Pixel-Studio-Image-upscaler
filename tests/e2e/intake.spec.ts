import { test, expect } from "@playwright/test";
import { inspectBytes } from "../../src/core/format";
import { downloaded, png } from "./fixtures";

test("reads every batch of entries from a dropped folder", async ({ page }) => {
  await page.goto("/studio/");
  const bytes = [...await png(page, 6, 8)];
  await page.locator(".dropzone").evaluate((element, bytes) => {
    function file(name: string) {
      return { name, isFile: true, isDirectory: false, file: (resolve: (file: File) => void) => {
        resolve(new File([new Uint8Array(bytes)], name, { type: "image/png" }));
      } };
    }
    function folder(name: string, batches: unknown[][]) {
      return { name, isFile: false, isDirectory: true, createReader() {
        let index = 0;
        return { readEntries: (resolve: (items: unknown[]) => void) => queueMicrotask(() => resolve(batches[index++] || [])) };
      } };
    }
    const root = folder("album", [[file("a.png")], [folder("nested", [[file("b.png")], [file("c.png")]])]]);
    const drop = new Event("drop", { bubbles: true, cancelable: true });
    Object.defineProperty(drop, "dataTransfer", {
      value: { items: [{ kind: "file", webkitGetAsEntry: () => root, getAsFile: () => null }], files: [] },
    });
    element.dispatchEvent(drop);
  }, bytes);
  await expect(page.getByText("album/nested/b.png")).toBeVisible();
  await expect(page.getByText("album/nested/c.png")).toBeVisible();
  await expect(page.getByText("3 ready · 0 complete")).toBeVisible();
});

test("applies JPEG EXIF orientation before resizing", async ({ page }) => {
  await page.goto("/studio/");
  const data = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 16;
    canvas.height = 9;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#784522";
    ctx.fillRect(0, 0, 16, 9);
    return canvas.toDataURL("image/jpeg").split(",")[1];
  });
  const source = Buffer.from(data, "base64");
  // Little-endian TIFF IFD0, one Orientation tag with value 6 (90° clockwise).
  const exif = Buffer.from("ffe1002245786966000049492a0008000000010012010300010000000600000000000000", "hex");
  const buffer = Buffer.concat([source.subarray(0, 2), exif, source.subarray(2)]);
  await page.getByTestId("file-input").setInputFiles({ name: "rotated.jpg", mimeType: "image/jpeg", buffer });
  await expect(page.getByText("JPG · 9 × 16")).toBeVisible();
  await page.getByRole("button", { name: "Start batch" }).click();
  const [file] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download rotated.jpg" }).click()]);
  expect(inspectBytes(await downloaded(file))).toEqual({ format: "image/jpeg", width: 18, height: 32 });
});
