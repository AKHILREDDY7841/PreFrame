import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
// Serve the bundled `site` output, not TypeScript's unbundled development files.
const root = join(process.cwd(), "site");
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".map": "application/json" };
const port = Number(process.env.PORT || 4173);
createServer(async (req, res) => {
  const pathname = new URL(req.url || "/", "http://localhost").pathname;
  const isAppRoute = pathname === "/" || pathname === "/auth" || pathname === "/app" || pathname.startsWith("/app/");
  const requested = (isAppRoute ? "index.html" : decodeURIComponent(pathname)).replace(/^[/\\]+/, "");
  const path = normalize(join(root, requested));
  if (!path.startsWith(root)) return res.writeHead(403).end("Forbidden");
  try { const data = await readFile(path); if ((await stat(path)).isDirectory()) throw new Error("directory"); res.writeHead(200, { "content-type": types[extname(path)] || "application/octet-stream" }).end(data); }
  catch { res.writeHead(404).end("Not found"); }
}).listen(port, "127.0.0.1", () => console.log(`http://127.0.0.1:${port}`));
