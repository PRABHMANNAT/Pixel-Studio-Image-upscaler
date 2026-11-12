import type { Reply, Request } from "../core/protocol";
import { gpuAvailable } from "./ai";
import { encoders } from "./codecs";
import { inspect, processImage } from "./image";

const send = (message: Reply) => self.postMessage(message);

self.addEventListener("message", async (event: MessageEvent<Request>) => {
  const request = event.data;
  const { id } = request;
  try {
    if (request.type === "capabilities") {
      send({ id, type: "capabilities", formats: await encoders(), gpu: await gpuAvailable() });
    } else if (request.type === "inspect") {
      send({ id, type: "inspect", data: await inspect(request.file) });
    } else if (request.type === "process") {
      const data = await processImage(request.file, request.settings, (value, phase) => send({ id, type: "progress", value, phase }));
      send({ id, type: "process", data });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Image processing failed.";
    send({ id, type: "error", message });
  }
});
