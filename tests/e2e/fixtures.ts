import type { Download, Page } from "@playwright/test";

export async function png(page: Page, width: number, height: number, transparent = false) {
  const base64 = await page.evaluate(({ width, height, transparent }) => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#245645";
    ctx.fillRect(0, 0, transparent ? Math.floor(width / 2) : width, height);
    ctx.fillStyle = "#ecc779";
    ctx.fillRect(0, 0, Math.floor(width / 3), Math.floor(height / 3));
    ctx.fillStyle = "#533c89";
    ctx.fillRect(1, Math.floor(height / 2), Math.floor(width / 5), Math.floor(height / 5));
    return canvas.toDataURL("image/png").split(",")[1];
  }, { width, height, transparent });
  return Buffer.from(base64, "base64");
}

export async function downloaded(download: Download) {
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

export async function readPixels(page: Page, bytes: Buffer, x = 0, y = 0, width?: number, height?: number) {
  return page.evaluate(async ({ base64, x, y, width, height }) => {
    const image = await createImageBitmap(new Blob([Uint8Array.from(atob(base64), char => char.charCodeAt(0))], { type: "image/png" }));
    const canvas = new OffscreenCanvas(image.width, image.height);
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(image, 0, 0);
    return [...ctx.getImageData(x, y, width ?? image.width, height ?? image.height).data];
  }, { base64: bytes.toString("base64"), x, y, width, height });
}
