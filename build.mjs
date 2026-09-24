import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { build } from "esbuild";

await mkdir("site", { recursive: true });
await build({ entryPoints: ["src/app.ts"], bundle: true, platform: "browser", format: "esm", target: ["es2022"], outfile: "site/app.js" });
const publicConfig = {
  url: process.env.PREFRAME_SUPABASE_URL || "https://tvrhjgwegascckqsfmtk.supabase.co",
  publishableKey: process.env.PREFRAME_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_kSXrGkTqoCj2G6GX0__YMA_I1HmXTwf",
};
const configScript = `<script>window.__PREFRAME_PUBLIC_CONFIG__=${JSON.stringify(publicConfig).replaceAll("<", "\\u003c")}</script>`;
const html = (await readFile("index.html", "utf8"))
  .replace("</head>", `${configScript}</head>`)
  .replace('href="/styles.css"', 'href="./styles.css"')
  .replace("/dist/app.js", "./app.js");
await writeFile("site/index.html", html);
await cp("styles.css", "site/styles.css");
await cp("assets", "site/assets", { recursive: true });
await writeFile("site/404.html", `<!doctype html><meta charset="utf-8"><script>const b=location.pathname.startsWith('/PreFrame/')?'/PreFrame/':'/';location.replace(b+'?r='+encodeURIComponent(location.pathname.replace('/PreFrame','')+location.search+location.hash))</script>`);
