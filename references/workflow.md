# NotebookLM 哆啦A梦论文小课堂工作流

## 来源依据

- 知乎文章：`https://zhuanlan.zhihu.com/p/1975730596534830124`
- PDF 转长图扩展：`https://github.com/kaixindelele/pdf2longimg`

知乎文章的核心方法是：上传一篇论文 PDF 到 NotebookLM/Gemini Notebook，使用一个极短提示词生成漫画风格的论文小课堂演示文档。文章明确建议使用“改进版”提示词，并提醒中文文字正确性是关键。

`pdf2longimg` 是一个本地 Chrome/Edge 扩展，用 PDF.js 解析 PDF、Canvas 拼接成长图，支持 PNG/JPEG 和 1x-3x 清晰度。README 建议页数过多或倍率过高时注意文件大小，单次转换建议不超过 50 页，推荐 2.0x 作为清晰度和体积的平衡。

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

   ```powershell
   notebooklm list --json
   notebooklm --help
   ```

   如果认证失败、超时、跳转登录或提示地区/权限不可用，停止并请用户完成 NotebookLM 登录或 Pro/Gemini 权限确认。

3. 如果 CLI 不支持演示文档生成和 PDF 下载，使用浏览器控制：

   - 优先通过 `tool_search` 查找 Chrome 或 in-app Browser 控制工具；
   - 打开 `https://notebooklm.google.com/`；
   - 使用已登录账号创建 notebook、上传 PDF、生成演示文档、导出 PDF。

4. 检查 `pdf2longimg` 扩展是否可用。若未安装，优先使用 GitHub 仓库加载未打包扩展：

   ```powershell
   git clone https://github.com/kaixindelele/pdf2longimg "<workspace>\work\vendor\pdf2longimg"
   ```

   然后在 Chrome/Edge 扩展页开启开发者模式并加载该文件夹。需要用户手动确认浏览器安全提示时，停下来让用户操作。

## NotebookLM 生成

优先使用 NotebookLM/Gemini Notebook 的演示文档或 Slides 能力，而不是普通摘要报告。具体命令可能随 `notebooklm` CLI 版本变化，所以先查看 `notebooklm --help`、`notebooklm generate --help` 和 `notebooklm download --help`，再选择实际可用的子命令。

典型流程：

1. 创建 notebook，名称包含主题和“论文小课堂”。
2. 上传 PDF 作为来源，等待 NotebookLM 处理完成。
3. 在演示文档/Slides 生成入口输入改进版提示词：

   ```text
   参考《哆啦A梦》的漫画风格，绘制哆啦A梦教大雄学习这篇论文的核心内容，中文对白，彩色画面，特别注意中文文字生成的正确性。
   ```

4. 等待生成完成。文章经验是十几分钟左右；实际执行时可设置 10-20 分钟等待窗口。
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
