#!/usr/bin/env node
/*
 * Run the pdf2longimg PDF.js + Canvas path from a local 127.0.0.1 page.
 *
 * Usage:
 *   node scripts/pdf2longimg-local-runner.js \
 *     --pdf input.pdf \
 *     --out output.png \
 *     --pdf2longimg-dir /path/to/pdf2longimg \
 *     --scale 3 \
 *     --format png
 *
 * Requirements:
 * - Node.js
 * - playwright resolvable from the current Node environment
 * - pdf2longimg repo or unpacked extension directory containing lib/pdf.min.js
 *   and lib/pdf.worker.min.js
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const http = require("http");

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const key = argv[i];
    if (!key.startsWith("--")) throw new Error(`Unexpected argument: ${key}`);
    const name = key.slice(2);
    const value = argv[i + 1];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for ${key}`);
    args[name] = value;
    i++;
  }
  return args;
}

function usage() {
  return [
    "usage: node scripts/pdf2longimg-local-runner.js --pdf input.pdf --out output.png --pdf2longimg-dir DIR [--scale 3] [--format png]",
    "",
    "DIR must contain lib/pdf.min.js and lib/pdf.worker.min.js from https://github.com/kaixindelele/pdf2longimg."
  ].join("\n");
}

function assertFile(filePath, label) {
  if (!filePath) throw new Error(`${label} is required`);
  if (!fs.existsSync(filePath)) throw new Error(`${label} not found: ${filePath}`);
  if (!fs.statSync(filePath).isFile()) throw new Error(`${label} is not a file: ${filePath}`);
}

function assertDir(dirPath, label) {
  if (!dirPath) throw new Error(`${label} is required`);
  if (!fs.existsSync(dirPath)) throw new Error(`${label} not found: ${dirPath}`);
  if (!fs.statSync(dirPath).isDirectory()) throw new Error(`${label} is not a directory: ${dirPath}`);
}

function findChromeExecutable() {
  const candidates = [];
  if (process.env.BROWSER_EXECUTABLE_PATH) candidates.push(process.env.BROWSER_EXECUTABLE_PATH);

  if (process.platform === "darwin") {
    candidates.push(
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      path.join(os.homedir(), "Applications/Google Chrome.app/Contents/MacOS/Google Chrome"),
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"
    );
  } else if (process.platform === "win32") {
    const roots = [process.env.PROGRAMFILES, process.env["PROGRAMFILES(X86)"], process.env.LOCALAPPDATA].filter(Boolean);
    for (const root of roots) {
      candidates.push(
        path.join(root, "Google", "Chrome", "Application", "chrome.exe"),
        path.join(root, "Microsoft", "Edge", "Application", "msedge.exe")
      );
    }
  } else {
    candidates.push(
      "/usr/bin/google-chrome",
      "/usr/bin/google-chrome-stable",
      "/usr/bin/chromium",
      "/usr/bin/chromium-browser",
      "/usr/bin/microsoft-edge"
    );
  }

  return candidates.find(Boolean) && candidates.find((candidate) => fs.existsSync(candidate));
}

function makePage(pdf2longimgDir) {
  const libDir = path.join(pdf2longimgDir, "lib");
  const pdfJs = path.join(libDir, "pdf.min.js");
  const worker = path.join(libDir, "pdf.worker.min.js");
  assertFile(pdfJs, "pdf.min.js");
  assertFile(worker, "pdf.worker.min.js");

  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pdf2longimg-runner-"));
  fs.mkdirSync(path.join(root, "lib"));
  fs.copyFileSync(pdfJs, path.join(root, "lib", "pdf.min.js"));
  fs.copyFileSync(worker, path.join(root, "lib", "pdf.worker.min.js"));

  fs.writeFileSync(path.join(root, "index.html"), `<!doctype html>
<html lang="zh-CN">
<meta charset="utf-8">
<title>pdf2longimg local runner</title>
<input id="fileInput" type="file" accept="application/pdf">
<select id="formatSelect"><option value="png">PNG</option><option value="jpeg">JPEG</option></select>
<select id="scaleSelect"><option value="1">1x</option><option value="2">2x</option><option value="3">3x</option></select>
<button id="startBtn">Start</button>
<button id="downloadBtn" disabled>Download</button>
<pre id="status"></pre>
<script src="/lib/pdf.min.js"></script>
<script src="/convert.js"></script>`);

  fs.writeFileSync(path.join(root, "convert.js"), `
pdfjsLib.GlobalWorkerOptions.workerSrc = "/lib/pdf.worker.min.js";
const fileInput = document.getElementById("fileInput");
const formatSelect = document.getElementById("formatSelect");
const scaleSelect = document.getElementById("scaleSelect");
const startBtn = document.getElementById("startBtn");
const downloadBtn = document.getElementById("downloadBtn");
const statusEl = document.getElementById("status");
let currentPdf = null;
let finalBlobUrl = null;
function status(message) {
  statusEl.textContent = message;
  window.__pdf2longimgStatus = message;
}
function readFileAsync(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}
fileInput.addEventListener("change", async () => {
  try {
    const file = fileInput.files[0];
    const data = await readFileAsync(file);
    currentPdf = await pdfjsLib.getDocument(data).promise;
    status("Loaded " + file.name + ": " + currentPdf.numPages + " pages");
  } catch (error) {
    window.__pdf2longimgDone = { ok: false, error: String(error && error.message || error) };
    status("Load failed: " + window.__pdf2longimgDone.error);
  }
});
startBtn.addEventListener("click", async () => {
  if (!currentPdf) return status("No PDF loaded");
  startBtn.disabled = true;
  downloadBtn.disabled = true;
  window.__pdf2longimgDone = null;
  if (finalBlobUrl) URL.revokeObjectURL(finalBlobUrl);
  finalBlobUrl = null;
  try {
    const scale = Number(scaleSelect.value);
    const format = formatSelect.value;
    const mimeType = format === "jpeg" ? "image/jpeg" : "image/png";
    const quality = format === "jpeg" ? 0.86 : 1.0;
    const pageCount = currentPdf.numPages;
    const dims = [];
    let maxWidth = 0;
    let totalHeight = 0;
    for (let i = 1; i <= pageCount; i++) {
      status("Measuring page " + i + " / " + pageCount + "...");
      const page = await currentPdf.getPage(i);
      const viewport = page.getViewport({ scale });
      const width = Math.ceil(viewport.width);
      const height = Math.ceil(viewport.height);
      dims.push({ page, viewport, width, height });
      maxWidth = Math.max(maxWidth, width);
      totalHeight += height;
    }
    const finalCanvas = document.createElement("canvas");
    finalCanvas.width = maxWidth;
    finalCanvas.height = totalHeight;
    const finalCtx = finalCanvas.getContext("2d");
    finalCtx.fillStyle = "#fff";
    finalCtx.fillRect(0, 0, maxWidth, totalHeight);
    let y = 0;
    for (let i = 0; i < dims.length; i++) {
      const item = dims[i];
      status("Rendering page " + (i + 1) + " / " + pageCount + "...");
      const pageCanvas = document.createElement("canvas");
      pageCanvas.width = item.width;
      pageCanvas.height = item.height;
      const pageCtx = pageCanvas.getContext("2d");
      pageCtx.fillStyle = "#fff";
      pageCtx.fillRect(0, 0, item.width, item.height);
      await item.page.render({ canvasContext: pageCtx, viewport: item.viewport }).promise;
      finalCtx.drawImage(pageCanvas, Math.floor((maxWidth - item.width) / 2), y);
      y += item.height;
      pageCanvas.width = 1;
      pageCanvas.height = 1;
    }
    status("Encoding long image...");
    const blob = await new Promise((resolve) => finalCanvas.toBlob(resolve, mimeType, quality));
    if (!blob) throw new Error("Canvas toBlob returned null, likely due to browser canvas limits");
    finalBlobUrl = URL.createObjectURL(blob);
    downloadBtn.disabled = false;
    downloadBtn.dataset.filename = "notebooklm-doraemon-longimg." + (format === "jpeg" ? "jpg" : "png");
    window.__pdf2longimgDone = { ok: true, format, scale, width: maxWidth, height: totalHeight, bytes: blob.size, pages: pageCount };
    status("Done: " + maxWidth + " x " + totalHeight + ", " + (blob.size / 1024 / 1024).toFixed(2) + " MB");
  } catch (error) {
    window.__pdf2longimgDone = { ok: false, error: String(error && error.message || error) };
    status("Convert failed: " + window.__pdf2longimgDone.error);
  } finally {
    startBtn.disabled = false;
  }
});
downloadBtn.addEventListener("click", () => {
  if (!finalBlobUrl) return;
  const a = document.createElement("a");
  a.href = finalBlobUrl;
  a.download = downloadBtn.dataset.filename || "notebooklm-doraemon-longimg.png";
  document.body.appendChild(a);
  a.click();
  a.remove();
});
`);
  return root;
}

function serve(root) {
  const contentTypes = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8"
  };
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(new URL(req.url, "http://127.0.0.1").pathname);
    const safePath = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, "");
    const filePath = path.join(root, safePath === "/" ? "index.html" : safePath);
    if (!filePath.startsWith(root)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      res.writeHead(200, { "Content-Type": contentTypes[path.extname(filePath)] || "application/octet-stream" });
      res.end(data);
    });
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve({ server, port: server.address().port })));
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.pdf) throw new Error("--pdf is required");
  if (!args.out) throw new Error("--out is required");
  if (!args["pdf2longimg-dir"]) throw new Error("--pdf2longimg-dir is required");

  const pdfPath = path.resolve(args.pdf);
  const outputPath = path.resolve(args.out);
  const pdf2longimgDir = path.resolve(args["pdf2longimg-dir"]);
  const scale = args.scale || "3";
  const format = args.format || "png";

  if (!["png", "jpeg"].includes(format)) throw new Error("--format must be png or jpeg");
  assertFile(pdfPath, "--pdf");
  assertDir(pdf2longimgDir, "--pdf2longimg-dir");

  let chromium;
  try {
    ({ chromium } = require("playwright"));
  } catch (error) {
    throw new Error("playwright is not available in this Node environment");
  }

  const root = makePage(pdf2longimgDir);
  const { server, port } = await serve(root);
  let browser;
  try {
    const executablePath = findChromeExecutable();
    browser = await chromium.launch({
      headless: true,
      executablePath,
      args: ["--disable-dev-shm-usage"]
    });
    const context = await browser.newContext({ acceptDownloads: true });
    const page = await context.newPage();
    page.setDefaultTimeout(180000);
    await page.goto(`http://127.0.0.1:${port}/index.html`);
    await page.selectOption("#formatSelect", format);
    await page.selectOption("#scaleSelect", String(scale));
    await page.setInputFiles("#fileInput", pdfPath);
    await page.waitForFunction(() => window.__pdf2longimgStatus && window.__pdf2longimgStatus.startsWith("Loaded"), null, { timeout: 60000 });
    await page.click("#startBtn");
    await page.waitForFunction(() => window.__pdf2longimgDone, null, { timeout: 600000 });
    const result = await page.evaluate(() => window.__pdf2longimgDone);
    if (!result.ok) throw new Error(result.error);
    const downloadPromise = page.waitForEvent("download", { timeout: 120000 });
    await page.click("#downloadBtn");
    const download = await downloadPromise;
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    await download.saveAs(outputPath);
    console.log(JSON.stringify({ ...result, outputPath }, null, 2));
  } finally {
    if (browser) await browser.close();
    server.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error.message ? `${error.message}\n\n${usage()}` : String(error));
  process.exit(1);
});
