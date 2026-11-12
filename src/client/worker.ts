import type { Reply, Request } from "../core/protocol";

type Operation = Request extends infer T ? T extends Request ? Omit<T, "id"> : never : never;
type Result = Exclude<Reply, { type: "progress" | "error" }>;

export class Processor {
  #worker?: Worker;
  #pending?: { resolve: (message: Result) => void; reject: (error: Error) => void; progress?: (value: number, phase: string) => void; id: number };
  #idle?: ReturnType<typeof setTimeout>;
  #timer?: ReturnType<typeof setTimeout>;
  #id = 0;

  #start() {
    const worker = new Worker("/pixelforge/processor.js", { type: "module", name: "PixelForge image processor" });
    worker.onmessage = ({ data }: MessageEvent<Reply>) => {
      const job = this.#pending;
      if (!job || data.id !== job.id) return;
      if (data.type === "progress") { job.progress?.(data.value, data.phase); return; }
      this.#pending = undefined;
      clearTimeout(this.#timer);
      this.#idle = setTimeout(() => this.stop(), 45_000);
      if (data.type === "error") job.reject(new Error(data.message));
      else job.resolve(data);
    };
    worker.onerror = () => this.stop("The image worker stopped unexpectedly. Try a smaller file or reload this page.");
    worker.onmessageerror = () => this.stop("The browser could not read a worker result.");
    return worker;
  }

  request<T extends Operation>(operation: T, progress?: (value: number, phase: string) => void) {
    if (this.#pending) return Promise.reject(new Error("The image worker is already busy."));
    clearTimeout(this.#idle);
    return new Promise<Extract<Result, { type: T["type"] }>>((resolve, reject) => {
      try {
        this.#worker ??= this.#start();
        const id = ++this.#id;
        this.#pending = { id, progress, reject, resolve: reply => {
          if (reply.type === operation.type) resolve(reply as Extract<Result, { type: T["type"] }>);
          else reject(new Error("The worker returned an unexpected response."));
        } };
        this.#timer = setTimeout(() => this.stop("This image exceeded the processing time limit. Try a smaller target."), operation.type === "process" ? 900_000 : 60_000);
        this.#worker.postMessage({ ...operation, id });
      } catch (error) {
        this.stop();
        reject(error);
      }
    });
  }

  stop(message = "Processing cancelled.") {
    clearTimeout(this.#idle);
    clearTimeout(this.#timer);
    const job = this.#pending;
    this.#pending = undefined;
    this.#worker?.terminate();
    this.#worker = undefined;
    job?.reject(new Error(message));
  }
}
