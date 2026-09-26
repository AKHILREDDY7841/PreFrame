import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { build } from "esbuild";

await mkdir("site", { recursive: true });
await build({ entryPoints: ["src/app.ts"], bundle: true, platform: "browser", format: "esm", target: ["es2022"], outfile: "site/app.js" });
await build({ entryPoints: ["src/prototype.ts"], bundle: true, platform: "browser", format: "esm", target: ["es2022"], outfile: "site/prototype.js" });
const publicConfig = {
  url: process.env.PREFRAME_SUPABASE_URL || "https://tvrhjgwegascckqsfmtk.supabase.co",
  publishableKey: process.env.PREFRAME_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_kSXrGkTqoCj2G6GX0__YMA_I1HmXTwf",
};
const configScript = `<script>window.__PREFRAME_PUBLIC_CONFIG__=${JSON.stringify(publicConfig).replaceAll("<", "\\u003c")}</script>`;
const html = (await readFile("index.html", "utf8"))
  .replace("<head>", `<head><script>const preframeBase=document.createElement('base');preframeBase.href=location.pathname.startsWith('/PreFrame')?'/PreFrame/':'/';document.head.append(preframeBase)</script>`)
  .replace("</head>", `${configScript}</head>`)
  .replace('href="/styles.css"', 'href="./styles.css"')
  .replace("/dist/app.js", "./app.js");
await writeFile("site/index.html", html);
await cp("styles.css", "site/styles.css");
await cp("studio.css", "site/studio.css");
const prototypeHtml = (await readFile("prototype.html", "utf8"))
  .replace('href="/styles.css"', 'href="./prototype.css"')
  .replace('href="/comment.css"', 'href="./comment.css"')
  .replace(/\s*<script type="importmap">[\s\S]*?<\/script>/, "")
  .replace('/dist/app.js', './prototype.js');
await writeFile("site/prototype.html", prototypeHtml);
await cp("prototype.css", "site/prototype.css");
await cp("comment.css", "site/comment.css");
await cp("assets", "site/assets", { recursive: true });
await cp("node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs", "site/pdf.worker.mjs");
await writeFile("site/404.html", `<!doctype html><meta charset="utf-8"><script>const b=location.pathname.startsWith('/PreFrame/')?'/PreFrame/':'/';location.replace(b+'?r='+encodeURIComponent(location.pathname.replace('/PreFrame','')+location.search+location.hash))</script>`);
