import { test, expect } from "@playwright/test";
import { unzipSync } from "fflate";
import { png } from "./fixtures";
import { inspectBytes } from "../../src/core/format";

test("streams ZIP chunks to a chosen writable file before closing it", async ({ page }) => {
  await page.addInitScript(() => {
    const state = { chunks: [] as number[][], closed: false };
    Object.defineProperty(window, "zipProbe", { value: state });
    Object.defineProperty(window, "showSaveFilePicker", { value: async () => ({
      createWritable: async () => ({
        write: async (chunk: Uint8Array) => { state.chunks.push([...chunk]); },
        close: async () => { state.closed = true; },
        abort: async () => {},
      }),
    }) });
  });
  await page.goto("/studio/");
  await page.getByTestId("file-input").setInputFiles({ name: "stream.png", mimeType: "image/png", buffer: await png(page, 11, 12) });
  await page.getByRole("button", { name: "Start batch" }).click();
  await page.getByRole("button", { name: "Download all as ZIP" }).click();
  await expect(page.getByText("ZIP export is ready.")).toBeVisible();
  const { chunks, closed } = await page.evaluate(() => (window as unknown as { zipProbe: { chunks: number[][]; closed: boolean } }).zipProbe);
  expect(closed).toBe(true);
  expect(chunks.length).toBeGreaterThan(2);
  const files = unzipSync(Uint8Array.from(chunks.flat()));
  expect(inspectBytes(files["stream.png"])).toEqual({ format: "image/png", width: 22, height: 24 });
});
