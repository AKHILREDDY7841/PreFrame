import playwright from "file:///C:/Users/pc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.js";
import { mkdir } from "node:fs/promises";
import assert from "node:assert/strict";

const image = "C:/Users/pc/AppData/Local/Temp/codex-file-preview-h9te4z/WhatsApp Image 2026-09-22 at 12.03.46 PM.jpeg";
const output = "C:/Users/pc/Documents/Codex/2026-09-22/referenced-chatgpt-conversation-this-is-an/outputs";
await mkdir(output, { recursive: true });
const browser = await playwright.chromium.launch({ headless: true, executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("http://127.0.0.1:4174", { waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  if (errors.length) throw new Error(`browser initialization errors: ${errors.join("; ")}`);
  assert.equal(await page.locator(".element").count(), 10, "expected nine kinds and one repeated dialogue block");
  const visible = await page.locator("#editor").innerText();
  assert.match(visible, /తెలుగు/); assert.match(visible, /مرحبا/); assert.match(visible, /日本語入力/);
  await page.locator("#image-input").setInputFiles(image);
  await page.waitForFunction(() => document.querySelector("#benchmark-result")?.textContent?.includes("KB"));
  const benchmark = await page.locator("#benchmark-result").innerText();
  assert.match(benchmark, /KB.*KB/);
  await page.pdf({ path: `${output}/preframe-prompt-00-multilingual-proof.pdf`, format: "A4", printBackground: true, margin: { top: "10mm", bottom: "10mm", left: "10mm", right: "10mm" } });
  assert.deepEqual(errors, [], `browser console errors: ${errors.join("; ")}`);
  console.log(JSON.stringify({ benchmark, elements: await page.locator(".element").evaluateAll((items) => [...new Set(items.map((item) => item.dataset.element))]) }, null, 2));
} finally { await browser.close(); }
