# NotebookLM 哆啦A梦论文小课堂工作流

## 来源依据

- 知乎文章：`https://zhuanlan.zhihu.com/p/1975730596534830124`
- PDF 转长图扩展：`https://github.com/kaixindelele/pdf2longimg`
- NotebookLM 后台 CLI：`https://github.com/teng-lin/notebooklm-py`

知乎文章的核心方法是：上传一篇论文 PDF 到 NotebookLM/Gemini Notebook，使用一个极短提示词生成漫画风格的论文小课堂演示文档。文章明确建议使用“改进版”提示词，并提醒中文文字正确性是关键。

`pdf2longimg` 是一个本地 Chrome/Edge 扩展，用 PDF.js 解析 PDF、Canvas 拼接成长图，支持 PNG/JPEG 和 1x-3x 清晰度。README 建议页数过多或倍率过高时注意文件大小，单次转换建议不超过 50 页，推荐 2.0x 作为清晰度和体积的平衡。

`notebooklm-py` 是非官方 NotebookLM Python/CLI 客户端。实测 `0.8.1` 支持创建 notebook、上传文件、`generate slide-deck`、`download slide-deck`，适合在 macOS 上避开前台 Chrome 自动化。它的认证文件和 master token 都等同登录凭据，必须留在本机用户目录，不要读取、展示或提交。

## 输入与输出

输入：

- 用户在对话中上传或提供路径的论文/资料 PDF。

默认输出目录：

- 如果用户指定目录，保存到用户指定目录；
- 否则保存到当前任务 workspace 的 `outputs` 目录；
- 文件名使用 PDF 文件名或用户给定主题名清洗后生成。

输出文件：

- `<topic>-notebooklm-doraemon-slides.pdf`
- `<topic>-notebooklm-doraemon-longimg.png`，默认高质量 PNG；
- 如扩展只能下载 JPEG，则保存为 `<topic>-notebooklm-doraemon-longimg.jpg`。

## 预检

1. 定位 PDF 文件，验证它存在、扩展名为 `.pdf`、文件大小非零。必要时用本机可用工具读取页数。
2. 检查 `notebooklm` CLI：

   ```bash
   notebooklm --help
   notebooklm generate slide-deck --help
   notebooklm download slide-deck --help
   notebooklm auth check --test --passive --json
   ```

   如果 CLI 支持 `generate slide-deck` / `download slide-deck`，优先走后台 CLI 路径。
   如果认证文件不存在，只有在用户明确同意后才运行浏览器 cookie 导入，例如：

   ```bash
   notebooklm -p codex-bg login --browser-cookies chrome
   notebooklm -p codex-bg auth check --test --passive --json
   ```

   在 macOS 上，导入 Chrome cookie 可能触发钥匙串权限弹窗；需要用户批准这一次解密。不要打印或复制
   `~/.notebooklm/profiles/*/storage_state.json`、master token 或 cookie 内容。
   如果认证失败、超时、跳转登录或提示地区/权限不可用，停止并请用户完成 NotebookLM 登录或 Pro/Gemini 权限确认。
   如果旧 CLI 被重定向到 `https://notebook.google/` 或出现 `CSRF token not found in HTML`，这是 CLI 访问主机/地区路由问题；升级或改用已登录的 Chrome 访问 `https://notebook.google.com/`，不要继续反复重试旧 CLI。

3. 如果 CLI 不支持演示文档生成和 PDF 下载，使用浏览器控制：

   - 优先通过 `tool_search` 查找 Chrome 或 in-app Browser 控制工具；
   - 优先打开 `https://notebook.google.com/`；若不可用，再尝试 `https://notebooklm.google.com/`；
   - 使用已登录账号创建 notebook、上传 PDF、生成演示文档、导出 PDF。
   - 在 Windows Chrome 中，如果自动文件上传返回 `Not allowed`，让用户在 `chrome://extensions` 里打开浏览器控制扩展的 `Allow access to file URLs`，然后重试；或者让用户在当前 NotebookLM 页面手动上传 PDF 后继续。

4. 检查 `pdf2longimg` 扩展是否可用。若未安装，优先使用 GitHub 仓库加载未打包扩展：

   ```bash
   git clone https://github.com/kaixindelele/pdf2longimg "<workspace>/work/vendor/pdf2longimg"
   ```

   然后在 Chrome/Edge 扩展页开启开发者模式并加载该文件夹。需要用户手动确认浏览器安全提示时，停下来让用户操作。

## notebooklm-py 后台流程

macOS 上首选这条路径；除首次导入 Chrome cookie 可能需要钥匙串授权外，创建、上传、生成、下载都可在后台终端完成，不需要占用用户前台浏览器。

如果 skill 自带 runner 可用，使用：

```bash
node scripts/notebooklm-py-background-runner.js \
  --pdf "<input.pdf>" \
  --out-dir "<outputs>" \
  --topic "<topic>" \
  --profile codex-bg \
  --notebooklm-bin notebooklm \
  --pdf2longimg-dir "<path-to-pdf2longimg>" \
  --longimg-out "<topic>-notebooklm-doraemon-longimg.png" \
  --language zh_Hans \
  --timeout 1800 \
  --interval 10 \
  --scale 3 \
  --format png
```

手动命令等价流程：

```bash
notebooklm -p codex-bg create "<topic> 论文小课堂" --json
notebooklm -p codex-bg source add "<input.pdf>" -n "<notebook-id>" --type file --title "<topic>" --request-timeout 180 --json
notebooklm -p codex-bg generate slide-deck -n "<notebook-id>" --prompt-file "<prompt.txt>" --format detailed --length default --language zh_Hans --wait --timeout 1800 --interval 10 --json
notebooklm -p codex-bg download slide-deck -n "<notebook-id>" "<slides.pdf>" --format pdf --latest --force --json
```

实测要点：

- `zh_Hans` 是简体中文语言码；不要假设 `zh` 可用。
- Slide Deck 生成常见耗时约 10-25 分钟；用 `--wait --timeout 1800 --interval 10` 轮询即可，不要重复触发生成。
- 若等待命令超时，先用 `download slide-deck --dry-run` 或 `download slide-deck --latest` 查已有 artifact；确认没有结果后再决定是否重试生成。
- `auth check --test --passive --json` 可做后台健康检查；`--passive` 不刷新或改写认证文件，适合任务开始前探测。
- 用独立 profile，例如 `codex-bg`，可以避免污染用户默认 `notebooklm-py` 上下文。
- 如果要真正长期无人值守，`notebooklm-py` 还支持 master-token 认证；这同样是敏感凭据，只能在用户明确授权并理解风险后配置。

## Windows/Chrome 跑通要点

在 Windows + Chrome 环境下，以下行为很常见：

- Chrome 127+ 的 App-Bound Encryption 可能导致 `notebooklm login --browser-cookies chrome` 无法读取 Chrome cookie。浏览器网页登录可用时，直接使用 Chrome 页面工作流。
- NotebookLM 页面可能显示为 `notebook.google.com`，而不是旧的 `notebooklm.google.com`。以实际可用页面为准。
- “Add sources” 顶部按钮有时不会打开文件选择器；空 notebook 中间区域的 `add a source` 按钮会打开包含 `Upload files` 的来源弹窗。
- 上传完成后等待左侧来源的 `progressbar` 消失，再生成 Slide Deck。
- Slide Deck 生成可能需要 10-25 分钟；只轮询状态，不要重复点击 Generate。
- NotebookLM 的 PDF 下载可能被 Chrome 下载器或第三方下载插件接管，浏览器自动化不一定能捕获 download 事件。下载后检查系统 Downloads 目录的最新 PDF，并复制/重命名到目标输出目录。

## macOS/Chrome 跑通要点

在 macOS + Chrome 环境下，以下行为很常见：

- 浏览器控制扩展可能需要在 `chrome://extensions` 详情页打开 `Allow access to file URLs`，否则文件上传可能被拒绝。
- 第一次通过 ChatGPT/Codex 控制 Chrome、文件选择器或屏幕时，macOS 可能弹出自动化、屏幕录制或辅助功能权限提示。需要用户批准与当前任务直接相关的权限；不需要的应用权限不要顺手允许。
- 系统文件选择器中，路径包含 `_`、`^`、空格或非 ASCII 字符时，AppleScript `keystroke` 可能改写字符。优先把完整路径写入剪贴板，再用 `Cmd+V` 粘贴。
- 某些前台应用会抢焦点，导致键盘或文件选择器操作落到错误窗口。先确认 Chrome 是前台应用；必要时隐藏干扰应用。
- NotebookLM 的 DOM、ARIA 或可见 DOM 抓取可能频繁超时。优先用截图确认页面状态，再用键盘导航或坐标点击；不要依赖大范围 DOM 遍历。
- `System Events click at` 在 Chrome Web 内容中可能只聚焦窗口而不触发真实页面点击。若坐标点击反复无效，可使用 CoreGraphics/浏览器 CUA 等真实鼠标事件；执行前先用明显按钮校准坐标。
- Slide Deck 生成完成后，右侧 Studio 底部会出现生成结果条目。先打开条目预览，再用顶部三点菜单选择 `Download PDF Document (.pdf)`。
- 下载后优先检查 `~/Downloads` 中最新 PDF，因为 NotebookLM 的下载文件名可能与目标文件名不同，例如主题自动清洗后的英文名。

## NotebookLM 生成

优先使用 NotebookLM/Gemini Notebook 的演示文档或 Slides 能力，而不是普通摘要报告。具体命令可能随 `notebooklm` CLI 版本变化，所以先查看 `notebooklm --help`、`notebooklm generate slide-deck --help` 和 `notebooklm download slide-deck --help`，再选择实际可用的子命令。

典型流程：

1. 创建 notebook，名称包含主题和“论文小课堂”。
2. 上传 PDF 作为来源，等待 NotebookLM 处理完成。
3. 在演示文档/Slides 生成入口输入改进版提示词：

   ```text
   参考《哆啦A梦》的漫画风格，绘制哆啦A梦教大雄学习这篇论文的核心内容，中文对白，彩色画面，特别注意中文文字生成的正确性。
   ```

4. 等待生成完成。文章经验和实测都可能到十几分钟以上；实际执行时设置 30 分钟等待窗口。
5. 导出 PDF 演示文档并保存为目标文件名。

如果用户提出公开发布、商业使用或规避版权风险，把提示词调整为“蓝白配色、未来道具、儿童科普漫画课堂风格的原创角色”，不要使用受保护角色名称。

## 质量检查

下载 PDF 后检查：

- 文件存在且非空；
- 页数大于 0；
- 不是登录页、错误页或空白页；
- 内容是漫画式演示文档，而不是普通摘要或文字报告。

如果中文大面积乱码或 NotebookLM 明确生成失败，最多重新生成 2 次。每次保持“特别注意中文文字生成的正确性”约束；不要无限重试。仍失败时保留失败说明和已下载文件，不声称完成。

## pdf2longimg 转长图

使用扩展的标准流程：

1. 点击浏览器工具栏的 `pdf2longimg` 扩展图标。
2. 选择刚导出的 NotebookLM PDF 演示文档。
3. 输出格式选择 PNG，清晰度优先 3x；如果页数较多、浏览器内存不足或转换失败，降到 2x。
4. 点击开始转换，等待拼接完成。
5. 下载长图并移动/重命名到目标输出路径。

如果 PDF 超过 50 页，优先让 NotebookLM 生成更短演示文档；如果用户坚持完整转换，分段转换后再合并长图，或在征得同意后使用本地 PDF 渲染工具降级处理。

如果扩展弹窗无法被自动化、下载事件被拦截，或需要稳定落盘，可使用 `pdf2longimg` 仓库中的 `lib/pdf.min.js` 与 `lib/pdf.worker.min.js` 创建本地临时页面，通过 `127.0.0.1` 打开后执行同样的 PDF.js + Canvas 逐页渲染和纵向拼接逻辑。不要使用 `file://` 页面；浏览器控制策略可能会阻止访问。此方案仍属于 `pdf2longimg` 前端转换路径，PDF 不会上传到第三方服务。

如果 Node.js 环境中可用 Playwright，优先使用本 skill 自带脚本稳定落盘：

```bash
node scripts/pdf2longimg-local-runner.js \
  --pdf "<slides.pdf>" \
  --out "<topic>-notebooklm-doraemon-longimg.png" \
  --pdf2longimg-dir "<path-to-pdf2longimg>" \
  --scale 3 \
  --format png
```

脚本会从 `pdf2longimg` 目录复制 `lib/pdf.min.js` 和 `lib/pdf.worker.min.js` 到临时目录，启动 `127.0.0.1` 本地页面，逐页渲染并纵向拼接后下载长图。若 3x 因浏览器 Canvas 限制失败，改用 2x；若 PNG 过大，再在说明中降到 JPEG。

本地临时页面应保持最小化：

- `<input type="file" accept="application/pdf">`
- 格式选择：PNG/JPEG；
- 倍率选择：1x/2x/3x；
- 逐页 `getPage(i)`、`page.render(...)` 到 canvas；
- 将页面 canvas 纵向绘制到最终 canvas；
- 用 `toBlob` 生成文件并提供下载链接。

## 长图验证

转换后检查：

- 图片文件存在且非空；
- 图片宽高合理，宽度不应只是缩略图宽度，高度应明显大于单页高度；
- 视觉上不是空白、下载失败页或浏览器截图；
- 对高质量要求，优先 PNG 3x；失败时说明实际使用的倍率。

可用本地图片库或系统工具读取宽高；需要视觉确认时使用 `view_image`。

## 最终回复

最终汇报包含：

- 输入 PDF；
- NotebookLM notebook 名称或 ID；
- PDF 演示文档保存路径；
- 长图保存路径、格式和倍率；
- 是否发生过降级、重试、权限阻塞或中文文字质量风险。
