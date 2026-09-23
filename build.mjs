import { cp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";

await mkdir("site", { recursive: true });
for (const entry of await readdir("dist")) if (entry.endsWith(".js")) await cp(`dist/${entry}`, `site/${entry}`);
const importMap = `<script type="importmap">{"imports":{"prosemirror-model":"https://esm.sh/prosemirror-model@1.25.12","prosemirror-state":"https://esm.sh/prosemirror-state@1.4.4","prosemirror-view":"https://esm.sh/prosemirror-view@1.42.5","prosemirror-history":"https://esm.sh/prosemirror-history@1.5.0","prosemirror-keymap":"https://esm.sh/prosemirror-keymap@1.2.3","prosemirror-commands":"https://esm.sh/prosemirror-commands@1.7.2"}}</script>`;
const html = (await readFile("index.html", "utf8"))
  .replace(/<script type="importmap">[\s\S]*?<\/script>/, importMap)
  .replace('href="/styles.css"', 'href="./styles.css"')
  .replace("/dist/app.js", "./app.js");
await writeFile("site/index.html", html);
await cp("styles.css", "site/styles.css");
await writeFile("site/404.html", `<!doctype html><meta charset="utf-8"><script>const b=location.pathname.startsWith('/PreFrame/')?'/PreFrame/':'/';location.replace(b+'?r='+encodeURIComponent(location.pathname.replace('/PreFrame','')+location.search+location.hash))</script>`);
