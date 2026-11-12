import { expect, it } from "vitest";
import { inspectBytes } from "../../src/core/format";

const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+X2ioAAAAASUVORK5CYII=", "base64");

it("recognizes actual PNG bytes and dimensions independently of file extension", () => {
  expect(inspectBytes(png)).toEqual({ format: "image/png", width: 1, height: 1 });
});
it("refuses truncated PNG, JPEG and WebP", () => {
  expect(() => inspectBytes(png.subarray(0, -4))).toThrow(/truncated/);
  expect(() => inspectBytes(Uint8Array.of(255, 216, 0, 0))).toThrow(/truncated/);
  expect(() => inspectBytes(Buffer.from("RIFFabcdWEBP"))).toThrow(/truncated/);
});
it("refuses APNG, animated WebP, GIF and animated AVIF", () => {
  const chunk = Buffer.concat([Buffer.alloc(4), Buffer.from("acTL"), Buffer.alloc(4)]);
  expect(() => inspectBytes(Buffer.concat([png.subarray(0, 33), chunk, png.subarray(33)]))).toThrow(/Animated PNG/);
  const webp = Buffer.from("RIFF\0\0\0\0WEBPVP8X\0\0\0\0\x02\0\0\0\0\0\0\0\0\0", "ascii");
  expect(() => inspectBytes(webp)).toThrow(/Animated WebP/);
  expect(() => inspectBytes(Buffer.from("GIF89a"))).toThrow(/GIF/);
  expect(() => inspectBytes(Buffer.from("\0\0\0\x14ftypavif\0\0\0\0avis"))).toThrow(/Animated AVIF/);
});
it("refuses HEIC instead of mislabeling it as AVIF", () => {
  expect(() => inspectBytes(Buffer.from("\0\0\0\x10ftypheic\0\0\0\0"))).toThrow(/HEIC/);
});
it("reads AVIF dimensions from item properties and refuses sequence boxes", () => {
  function box(type: string, payload: Buffer) {
    const header = Buffer.alloc(8);
    header.writeUInt32BE(payload.length + 8);
    header.write(type, 4, "ascii");
    return Buffer.concat([header, payload]);
  }
  const ftyp = box("ftyp", Buffer.from("avif\0\0\0\0"));
  const dimensions = Buffer.alloc(12);
  dimensions.writeUInt32BE(1200, 4);
  dimensions.writeUInt32BE(720, 8);
  const properties = box("iprp", box("ipco", box("ispe", dimensions)));
  const meta = box("meta", Buffer.concat([Buffer.alloc(4), properties]));
  expect(inspectBytes(Buffer.concat([ftyp, meta]))).toEqual({ format: "image/avif", width: 1200, height: 720 });
  expect(() => inspectBytes(Buffer.concat([ftyp, box("moov", Buffer.alloc(0))]))).toThrow(/sequences/);
  expect(() => inspectBytes(Buffer.concat([ftyp, meta.subarray(0, -1)]))).toThrow(/truncated/);
});
