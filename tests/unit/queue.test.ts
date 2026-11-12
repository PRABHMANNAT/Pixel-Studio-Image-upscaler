import { expect, it } from "vitest";
import { estimatedSeconds, transition, type Entry } from "../../src/core/queue";

const item: Entry = { id: "1", path: "a.png", file: new File([], "a.png"), progress: 0, status: "inspecting" };
it("runs ready work and clears a failure when retrying", () => {
  const active = transition(transition(item, "ready"), "working");
  const failed = transition(active, "failed", { error: "example" });
  expect(transition(failed, "ready")).toMatchObject({ status: "ready", error: undefined, progress: 0 });
  expect(transition(active, "done")).toMatchObject({ status: "done", progress: 1 });
});
it("rejects invalid transitions", () => {
  expect(() => transition(item, "done")).toThrow(/Invalid queue transition/);
});
it("estimates time from actual elapsed work and skips terminal rows", () => {
  const entries: Entry[] = [
    { ...item, status: "working", progress: 0.25 }, { ...item, status: "ready" },
    { ...item, status: "failed" }, { ...item, status: "done" },
  ];
  expect(estimatedSeconds(entries, [])).toBeNull();
  expect(estimatedSeconds(entries, [2, 6])).toBe(7);
});
