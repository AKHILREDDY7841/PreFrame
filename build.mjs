import { cp, mkdir, readFile, writeFile } from "node:fs/promises";

await mkdir("site", { recursive: true });
await cp("dist/app.js", "site/app.js");
await cp("dist/model.js", "site/model.js");
const importMap = `<script type="importmap">{"imports":{"prosemirror-model":"https://esm.sh/prosemirror-model@1.25.12","prosemirror-state":"https://esm.sh/prosemirror-state@1.4.4","prosemirror-view":"https://esm.sh/prosemirror-view@1.42.5","prosemirror-history":"https://esm.sh/prosemirror-history@1.5.0","prosemirror-keymap":"https://esm.sh/prosemirror-keymap@1.2.3","prosemirror-commands":"https://esm.sh/prosemirror-commands@1.7.2"}}</script>`;
const html = (await readFile("index.html", "utf8"))
  .replace(/<script type="importmap">[\s\S]*?<\/script>/, importMap)
  .replace('href="/styles.css"', 'href="./styles.css"')
  .replace('href="/comment.css"', 'href="./comment.css"')
  .replace("/dist/app.js", "./app.js");
await writeFile("site/index.html", html);
await cp("styles.css", "site/styles.css");
await cp("comment.css", "site/comment.css");
