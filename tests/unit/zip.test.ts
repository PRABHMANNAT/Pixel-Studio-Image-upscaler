import { strFromU8, unzipSync } from "fflate";
import { expect, it } from "vitest";
import { outputPath, safePath, uniquePath } from "../../src/core/paths";
import { archiveBlob, BLOB_ZIP_LIMIT, writeArchive } from "../../src/core/zip";

it("cleans traversal, separators and reserved Windows names", () => {
  expect(safePath("..\\nested\\../CON.jpg")).toBe("nested/_CON.jpg");
  expect(outputPath("nested/α.v2.png", "image/jpeg")).toBe("nested/α.v2.jpg");
  const used = new Set<string>();
  expect(uniquePath("root/a.png", used)).toBe("root/a.png");
  expect(uniquePath("root/A.png", used)).toBe("root/A (2).png");
});
it("writes readable bytes and unique filenames for nested exports", async () => {
  const output = await archiveBlob([
    { path: "root/nested/photo.png", blob: new Blob(["png bytes"]) },
    { path: "root/nested/photo.png", blob: new Blob(["duplicate"]) },
    { path: "root/é.webp", blob: new Blob(["webp bytes"]) },
  ]);
  const files = unzipSync(new Uint8Array(await output.arrayBuffer()));
  expect(Object.keys(files)).toEqual(["root/nested/photo.png", "root/nested/photo (2).png", "root/é.webp"]);
  expect(strFromU8(files["root/nested/photo (2).png"])).toBe("duplicate");
});
it("propagates write failure and enforces a bounded memory fallback", async () => {
  await expect(writeArchive([{ path: "x.png", blob: new Blob(["x"]) }], () => { throw new Error("disk full"); })).rejects.toThrow("disk full");
  await expect(archiveBlob([{ path: "x.png", blob: { size: BLOB_ZIP_LIMIT + 1 } as Blob }])).rejects.toThrow(/too large/);
});
