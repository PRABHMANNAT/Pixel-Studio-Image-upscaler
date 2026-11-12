import type { Format, Settings } from "../core/settings";
import { estimatedSeconds, transition, type Entry } from "../core/queue";
import { outputPath, safePath } from "../core/paths";
import { QUEUE_LIMIT, type IntakeFile } from "./intake";
import { Processor } from "./worker";

type State = {
  entries: Entry[];
  run: "idle" | "running" | "paused";
  selected?: string;
  capabilities?: { formats: Format[]; gpu: boolean };
  notice?: { text: string; key: number };
  remaining: number | null;
};
const empty: State = { entries: [], run: "idle", remaining: null };
const OUTPUT_LIMIT = 256 * 1024 ** 2;

export class Studio {
  #state = empty;
  #processor = new Processor();
  #listeners = new Set<() => void>();
  #durations: number[] = [];
  #settings?: Settings;
  #busy = false;
  #active?: string;
  #stopped = false;
  #notice = 0;
  #checked = false;

  snapshot = () => this.#state;
  serverSnapshot = () => empty;
  subscribe = (listener: () => void) => {
    this.#listeners.add(listener);
    return () => { this.#listeners.delete(listener); };
  };
  #set(patch: Partial<State>) {
    const next = { ...this.#state, ...patch };
    next.remaining = next.run === "idle" ? null : estimatedSeconds(next.entries, this.#durations);
    this.#state = next;
    for (const listener of this.#listeners) listener();
  }

  #update(id: string, update: (entry: Entry) => Entry) {
    this.#set({ entries: this.#state.entries.map(entry => entry.id === id ? update(entry) : entry) });
  }

  notify(text: string) { this.#set({ notice: { text, key: ++this.#notice } }); }
  dismiss = () => this.#set({ notice: undefined });
  select(id: string) { this.#set({ selected: id }); }

  connect = () => {
    this.#stopped = false;
    void this.#pump();
    return () => {
      this.#stopped = true;
      this.#processor.stop();
      for (const entry of this.#state.entries) this.#revoke(entry);
    };
  };

  add(files: IntakeFile[]) {
    const count = QUEUE_LIMIT - this.#state.entries.length;
    const entries = files.slice(0, count).map(({ file, path }): Entry => ({
      id: crypto.randomUUID(), path: safePath(path), file, progress: 0, status: "inspecting",
    }));
    if (!entries.length && !files.length) return;
    this.#set({ entries: [...this.#state.entries, ...entries], selected: this.#state.selected ?? entries[0]?.id });
    if (files.length > entries.length) this.notify("The queue holds up to " + QUEUE_LIMIT + " files. Remove some before adding more.");
    void this.#pump();
  }

  start(settings: Settings) {
    if (this.#state.run !== "idle" || !this.#state.entries.some(entry => entry.status === "ready")) return;
    this.#settings = { ...settings };
    this.#durations = [];
    this.#set({ run: "running" });
    void this.#pump();
  }
  pause() { if (this.#state.run === "running") this.#set({ run: "paused" }); }
  resume() {
    if (this.#state.run !== "paused") return;
    this.#set({ run: "running" });
    void this.#pump();
  }
  cancel() {
    if (this.#state.run === "idle") return;
    this.#set({ run: "idle" });
    if (this.#active) {
      this.#update(this.#active, entry => transition(entry, "cancelled"));
      this.#active = undefined;
      this.#processor.stop();
    }
    this.notify("Batch cancelled. Completed results are still available.");
  }
  retry() {
    if (this.#state.run !== "idle") return;
    this.#set({ entries: this.#state.entries.map(entry => entry.status === "failed" || entry.status === "cancelled"
      ? transition(entry, entry.input ? "ready" : "inspecting") : entry) });
    void this.#pump();
  }

  #revoke(entry: Entry) {
    for (const url of [entry.input?.thumbnail, entry.input?.preview, entry.output?.preview]) if (url) URL.revokeObjectURL(url);
  }
  #remove(predicate: (entry: Entry) => boolean) {
    const entries = this.#state.entries.filter(entry => {
      if (!predicate(entry)) return true;
      this.#revoke(entry);
      return false;
    });
    this.#set({ entries, selected: entries.some(entry => entry.id === this.#state.selected) ? this.#state.selected : entries[0]?.id });
  }
  remove(id: string) { this.#remove(entry => entry.id === id && entry.status !== "working"); }
  clearCompleted() { this.#remove(entry => entry.status === "done"); }

  async #pump() {
    if (this.#busy || this.#stopped) return;
    this.#busy = true;
    try {
      if (!this.#checked) {
        try {
          const { formats, gpu } = await this.#processor.request({ type: "capabilities" });
          if (this.#stopped) return;
          this.#checked = true;
          this.#set({ capabilities: { formats, gpu } });
        } catch (error) {
          if (this.#stopped) return;
          this.#checked = true;
          this.notify(error instanceof Error ? error.message : "This browser does not support image processing.");
        }
      }
      while (!this.#stopped) {
        const { entries, run } = this.#state;
        const work = run === "running" ? entries.find(item => item.status === "ready") : undefined;
        if (work && this.#settings) {
          const settings = this.#settings;
          this.#active = work.id;
          this.#update(work.id, item => transition(item, "working"));
          const started = performance.now();
          try {
            const { data } = await this.#processor.request({ type: "process", file: work.file, settings }, (value, phase) => {
              if (this.#active === work.id) this.#update(work.id, item => ({ ...item, progress: Math.max(item.progress, value), phase }));
            });
            if (this.#active !== work.id || this.#stopped) continue;
            const retained = this.#state.entries.reduce((sum, item) => sum + (item.output?.blob.size ?? 0), 0);
            if (retained + data.blob.size > OUTPUT_LIMIT) throw new Error("The results limit is full. Download and clear completed files, then retry.");
            const { preview, ...output } = data;
            this.#durations.push((performance.now() - started) / 1000);
            this.#update(work.id, item => transition(item, "done", {
              output: { ...output, preview: URL.createObjectURL(preview), path: outputPath(item.path, output.format) },
            }));
          } catch (error) {
            if (this.#active === work.id && !this.#stopped) this.#update(work.id, item => transition(item, "failed", { error: String(error instanceof Error ? error.message : error) }));
          } finally {
            if (this.#active === work.id) this.#active = undefined;
          }
          continue;
        }
        const pending = entries.find(item => item.status === "inspecting");
        if (pending) {
          try {
            const { data } = await this.#processor.request({ type: "inspect", file: pending.file });
            if (this.#stopped) continue;
            this.#update(pending.id, item => {
              const { preview, thumbnail, ...input } = data;
              return transition(item, "ready", { input: { ...input, preview: URL.createObjectURL(preview), thumbnail: URL.createObjectURL(thumbnail) } });
            });
          } catch (error) {
            if (!this.#stopped) this.#update(pending.id, item => transition(item, "failed", { error: error instanceof Error ? error.message : String(error) }));
          }
          continue;
        }
        if (run === "running") {
          const done = entries.filter(item => item.status === "done").length;
          const failed = entries.filter(item => item.status === "failed").length;
          this.#set({ run: "idle" });
          this.notify(failed ? done + " ready to download · " + failed + " need attention" : "Batch complete. Your exports are ready.");
        }
        break;
      }
    } finally { this.#busy = false; }
  }
}
