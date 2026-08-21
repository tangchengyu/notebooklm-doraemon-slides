#!/usr/bin/env node
/*
 * Run the NotebookLM slide-deck workflow through notebooklm-py without driving
 * a foreground browser.
 *
 * Authentication is intentionally external to this script. Prepare it with:
 *   notebooklm -p <profile> login --browser-cookies chrome
 * or any other notebooklm-py auth method, then run this script.
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const DEFAULT_PROMPT =
  "参考《哆啦A梦》的漫画风格，绘制哆啦A梦教大雄学习这篇论文的核心内容，中文对白，彩色画面，特别注意中文文字生成的正确性。";

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const key = argv[i];
    if (!key.startsWith("--")) throw new Error(`Unexpected argument: ${key}`);
    const name = key.slice(2);
    if (name === "skip-auth-test" || name === "help") {
      args[name] = true;
      continue;
    }
    const value = argv[i + 1];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for ${key}`);
    args[name] = value;
    i++;
  }
  return args;
}

function usage() {
  return [
    "usage: node scripts/notebooklm-py-background-runner.js --pdf input.pdf --out-dir outputs [options]",
    "",
    "options:",
    "  --topic NAME                  base output/notebook title",
    "  --profile NAME                notebooklm-py profile name",
    "  --notebooklm-bin PATH         notebooklm CLI path (default: notebooklm)",
    "  --prompt-file PATH            custom prompt file",
    "  --language CODE               NotebookLM language code (default: zh_Hans)",
    "  --timeout SECONDS             slide generation timeout (default: 1800)",
    "  --interval SECONDS            polling interval (default: 10)",
    "  --pdf-out PATH                output PDF path",
    "  --longimg-out PATH            optional long-image output path",
    "  --pdf2longimg-dir DIR         required with --longimg-out",
    "  --scale 1|2|3                 long-image scale (default: 3)",
    "  --format png|jpeg             long-image format (default: png)",
    "  --skip-auth-test              skip passive notebooklm auth check"
  ].join("\n");
}

function assertFile(filePath, label) {
  if (!filePath) throw new Error(`${label} is required`);
  if (!fs.existsSync(filePath)) throw new Error(`${label} not found: ${filePath}`);
  if (!fs.statSync(filePath).isFile()) throw new Error(`${label} is not a file: ${filePath}`);
}

function sanitizeName(value) {
  return String(value || "notebooklm-doraemon")
    .replace(/\.[Pp][Dd][Ff]$/, "")
    .replace(/[^\p{L}\p{N}._-]+/gu, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 120) || "notebooklm-doraemon";
}

function notebooklmArgs(profile, rest) {
  return profile ? ["-p", profile, ...rest] : rest;
}

function runJson(bin, args, label, options = {}) {
  const result = spawnSync(bin, args, {
    cwd: options.cwd || process.cwd(),
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024
  });
  if (result.status !== 0) {
    const stderr = (result.stderr || "").trim();
    const stdout = (result.stdout || "").trim();
    throw new Error(`${label} failed (${result.status}): ${stderr || stdout || "no output"}`);
  }
  const stdout = (result.stdout || "").trim();
  if (!stdout) return {};
  try {
    return JSON.parse(stdout);
  } catch (error) {
    throw new Error(`${label} did not return JSON: ${stdout.slice(0, 1000)}`);
  }
}

function runPlain(bin, args, label, options = {}) {
  const result = spawnSync(bin, args, {
    cwd: options.cwd || process.cwd(),
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024
  });
  if (result.status !== 0) {
    const stderr = (result.stderr || "").trim();
    const stdout = (result.stdout || "").trim();
    throw new Error(`${label} failed (${result.status}): ${stderr || stdout || "no output"}`);
  }
  return (result.stdout || "").trim();
}

function writePromptFile(args) {
  if (args["prompt-file"]) {
    const promptFile = path.resolve(args["prompt-file"]);
    assertFile(promptFile, "--prompt-file");
    return promptFile;
  }
  const promptFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "notebooklm-prompt-")), "prompt.txt");
  fs.writeFileSync(promptFile, args.prompt || DEFAULT_PROMPT);
  return promptFile;
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    console.log(usage());
    return;
  }
  if (!args.pdf) throw new Error("--pdf is required");
  if (!args["out-dir"] && !args["pdf-out"]) throw new Error("--out-dir or --pdf-out is required");

  const pdfPath = path.resolve(args.pdf);
  assertFile(pdfPath, "--pdf");
  const notebooklmBin = args["notebooklm-bin"] || "notebooklm";
  const profile = args.profile || "";
  const outDir = path.resolve(args["out-dir"] || path.dirname(args["pdf-out"]));
  fs.mkdirSync(outDir, { recursive: true });

  const topic = sanitizeName(args.topic || path.basename(pdfPath));
  const notebookTitle = `${topic} 论文小课堂`;
  const pdfOut = path.resolve(args["pdf-out"] || path.join(outDir, `${topic}-notebooklm-doraemon-slides.pdf`));
  const language = args.language || "zh_Hans";
  const timeout = args.timeout || "1800";
  const interval = args.interval || "10";
  const promptFile = writePromptFile(args);

  if (!args["skip-auth-test"]) {
    runJson(
      notebooklmBin,
      notebooklmArgs(profile, ["auth", "check", "--test", "--passive", "--json"]),
      "auth check"
    );
  }

  const created = runJson(
    notebooklmBin,
    notebooklmArgs(profile, ["create", notebookTitle, "--json"]),
    "create notebook"
  );
  const notebookId = created.notebook && created.notebook.id;
  if (!notebookId) throw new Error("create notebook returned no notebook id");

  const source = runJson(
    notebooklmBin,
    notebooklmArgs(profile, [
      "source",
      "add",
      pdfPath,
      "-n",
      notebookId,
      "--type",
      "file",
      "--title",
      args["source-title"] || topic,
      "--request-timeout",
      args["upload-timeout"] || "180",
      "--json"
    ]),
    "add source"
  );

  const generated = runJson(
    notebooklmBin,
    notebooklmArgs(profile, [
      "generate",
      "slide-deck",
      "-n",
      notebookId,
      "--prompt-file",
      promptFile,
      "--format",
      args["deck-format"] || "detailed",
      "--length",
      args.length || "default",
      "--language",
      language,
      "--wait",
      "--timeout",
      timeout,
      "--interval",
      interval,
      "--json"
    ]),
    "generate slide deck"
  );

  const downloaded = runJson(
    notebooklmBin,
    notebooklmArgs(profile, [
      "download",
      "slide-deck",
      "-n",
      notebookId,
      pdfOut,
      "--format",
      "pdf",
      "--latest",
      "--force",
      "--json"
    ]),
    "download slide deck"
  );

  let longImage = null;
  if (args["longimg-out"]) {
    if (!args["pdf2longimg-dir"]) throw new Error("--pdf2longimg-dir is required with --longimg-out");
    const runner = path.join(__dirname, "pdf2longimg-local-runner.js");
    const output = runPlain(
      process.execPath,
      [
        runner,
        "--pdf",
        pdfOut,
        "--out",
        path.resolve(args["longimg-out"]),
        "--pdf2longimg-dir",
        path.resolve(args["pdf2longimg-dir"]),
        "--scale",
        args.scale || "3",
        "--format",
        args.format || "png"
      ],
      "convert long image"
    );
    longImage = JSON.parse(output);
  }

  console.log(JSON.stringify({
    ok: true,
    profile: profile || null,
    notebook: created.notebook,
    source: source.source,
    generation: generated,
    download: downloaded,
    pdf: {
      path: pdfOut,
      bytes: fs.statSync(pdfOut).size
    },
    longImage
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  console.error("");
  console.error(usage());
  process.exit(1);
});
