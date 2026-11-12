import createEncoder, { type AVIFModule } from "@jsquash/avif/codec/enc/avif_enc.js";
import { defaultOptions } from "@jsquash/avif/meta.js";
import { inspectBytes } from "../core/format";

let instance: Promise<AVIFModule> | undefined;
const encodedType = "image/avif";
const load = createEncoder as (options: { noInitialRun: boolean }) => Promise<AVIFModule>;

export async function encodeAvif(input: ImageData, quality: number) {
  const encoder = await (instance ??= load({ noInitialRun: true }));
  const output = encoder.encode(input.data, input.width, input.height, {
    ...defaultOptions, quality: Math.round(quality * 100), qualityAlpha: 100, speed: 8,
  });
  if (!output?.length) throw new Error("The AVIF encoder could not produce an image.");
  const bytes = new Uint8Array(output);
  if (inspectBytes(bytes).format !== encodedType) throw new Error("The AVIF encoder produced an invalid file.");
  return new Blob([bytes], { type: encodedType });
}
