import type { Inspection, Product } from "./protocol";

export type Status = "inspecting" | "ready" | "working" | "done" | "failed" | "cancelled";
export type Entry = {
  id: string;
  path: string;
  file: File;
  status: Status;
  progress: number;
  phase?: string;
  error?: string;
  input?: Omit<Inspection, "preview" | "thumbnail"> & { preview: string; thumbnail: string };
  output?: Omit<Product, "preview"> & { preview: string; path: string };
};

const transitions: Record<Status, Status[]> = {
  inspecting: ["ready", "failed"],
  ready: ["working"],
  working: ["done", "failed", "cancelled"],
  done: [],
  failed: ["ready", "inspecting"],
  cancelled: ["ready", "inspecting"],
};

export function transition(entry: Entry, status: Status, changes: Partial<Entry> = {}): Entry {
  if (!transitions[entry.status].includes(status)) throw new Error("Invalid queue transition: " + entry.status + " → " + status);
  return { ...entry, phase: undefined, error: undefined, progress: status === "done" ? 1 : 0, ...changes, status };
}

export function estimatedSeconds(entries: Entry[], durations: number[]) {
  if (!durations.length) return null;
  const work = entries.reduce((sum, item) => sum + (item.status === "ready" ? 1 : item.status === "working" ? 1 - item.progress : 0), 0);
  return Math.ceil(work * durations.reduce((a, b) => a + b, 0) / durations.length);
}
