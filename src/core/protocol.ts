import type { Dimensions, Format, Settings } from "./settings";

export type Inspection = Dimensions & { format: Format; preview: Blob; thumbnail: Blob };
export type Product = Dimensions & { format: Format; blob: Blob; preview: Blob; provider?: "webgpu" | "wasm" };
export type Request =
  | { id: number; type: "capabilities" }
  | { id: number; type: "inspect"; file: File }
  | { id: number; type: "process"; file: File; settings: Settings };
export type Reply =
  | { id: number; type: "error"; message: string }
  | { id: number; type: "progress"; value: number; phase: string }
  | { id: number; type: "capabilities"; formats: Format[]; gpu: boolean }
  | { id: number; type: "inspect"; data: Inspection }
  | { id: number; type: "process"; data: Product };
