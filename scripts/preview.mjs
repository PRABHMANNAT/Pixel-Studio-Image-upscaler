import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, isAbsolute, relative, resolve, sep } from "node:path";

const root = resolve("out");
const config = JSON.parse(await readFile(new URL("../vercel.json", import.meta.url), "utf8"));
const headers = Object.fromEntries(config.headers.find(rule => rule.source === "/(.*)").headers.map(({ key, value }) => [key, value]));
const types = new Map([
  [".html", "text/html; charset=utf-8"], [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"], [".mjs", "text/javascript; charset=utf-8"],
  [".txt", "text/plain; charset=utf-8"], [".svg", "image/svg+xml"], [".wasm", "application/wasm"],
]);
const port = Number(process.argv[2] ?? 3000);
await stat(resolve(root, "index.html")).catch(() => {
  throw new Error("The static export is missing. Run npm run build first.");
});

createServer(async (request, response) => {
  try {
    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405, { Allow: "GET, HEAD" }).end();
      return;
    }
    const { pathname } = new URL(request.url, "http://localhost");
    let file = resolve(root, "." + decodeURIComponent(pathname));
    const location = relative(root, file);
    if (isAbsolute(location) || location === ".." || location.startsWith(".." + sep)) {
      response.writeHead(404, headers).end();
      return;
    }
    if ((await stat(file)).isDirectory()) file = resolve(file, "index.html");
    const metadata = await stat(file);
    if (!metadata.isFile()) throw new Error("Not found");
    response.writeHead(200, { ...headers, "Content-Type": types.get(extname(file)) ?? "application/octet-stream", "Content-Length": metadata.size });
    if (request.method === "HEAD") response.end();
    else {
      const stream = createReadStream(file);
      stream.on("error", () => response.destroy());
      stream.pipe(response);
    }
  } catch {
    if (!response.headersSent) response.writeHead(404, headers).end("Not found");
    else response.destroy();
  }
}).listen(port, "localhost", () => console.log("Static PixelForge preview: http://localhost:" + port));
