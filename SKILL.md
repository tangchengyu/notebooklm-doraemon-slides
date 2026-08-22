---
name: notebooklm-doraemon-slides
description: >
  当用户在对话中提供论文或资料 PDF，并希望用 NotebookLM/Gemini Notebook
  生成哆啦A梦论文小课堂风格的中文演示文档，再把 PDF 演示文档通过 pdf2longimg
  浏览器扩展转换成高清长图时使用。
---

# NotebookLM 哆啦A梦论文小课堂

## 目标

把用户提供的论文或资料 PDF 变成一套可分享的中文漫画式演示文档，并落盘两个结果：

- NotebookLM/Gemini Notebook 生成并导出的 PDF 演示文档；
- 通过 `pdf2longimg` 浏览器扩展或同仓库 PDF.js/Canvas 路径转换出的高清长图。

完整任务以“PDF 演示文档和长图都已保存且非空”为完成条件。不要只停在上传 PDF、生成 NotebookLM
来源或浏览器里出现预览。

## 何时读取参考流程

执行该工作流前，读取 [references/workflow.md](references/workflow.md)。该文件包含：

- 知乎文章中使用的改进版提示词；
- NotebookLM/Gemini Notebook 的生成与导出检查点；
- `kaixindelele/pdf2longimg` 浏览器扩展安装、转换和质量验证流程；
- Windows/macOS Playwright MCP、Chrome/浏览器自动化、权限弹窗和下载目录检查经验；
- `teng-lin/notebooklm-py` 后台 CLI 路径与认证边界；
- 失败时的重试边界。

如需尽量不占用用户前台浏览器，优先运行 [scripts/notebooklm-py-background-runner.js](scripts/notebooklm-py-background-runner.js)。它调用
`notebooklm-py` CLI 创建 notebook、上传 PDF、等待来源处理完成、生成 Slide Deck、下载 PDF，并可串接本地长图转换。

如需稳定地把导出的 PDF 转成长图，优先运行 [scripts/pdf2longimg-local-runner.js](scripts/pdf2longimg-local-runner.js)，它复用
`pdf2longimg` 仓库中的 PDF.js 与 Canvas 拼接代码，通过 `127.0.0.1` 本地页面落盘 PNG/JPEG。

## 必要约束

- 用户必须提供一个可访问的 PDF 文件；如果对话附件没有本地路径，先请用户重新上传或提供路径。
- 先验证 NotebookLM/Gemini Notebook 登录状态。需要 Pro/Gemini 高级能力、账号地区或网页登录时，直接说明阻塞点，不要伪造产物。
- macOS 和 Windows 都优先使用本机可用且支持 `generate slide-deck` / `download slide-deck` 的 `notebooklm-py` CLI 后台流程；Windows 上先运行 `notebooklm auth check --test --passive --json`。只要返回 `status=ok` 且 `checks.token_fetch=true`，就优先使用后台 CLI；只有认证失败、地区门禁或 CLI 功能缺失时，才切回 Playwright MCP / Chrome / 浏览器页面流程。不要因为 Windows Chrome cookie 常被系统加密就跳过已经可用的 CLI 登录态。
- 需要页面回退时，优先使用 Playwright MCP 或已连接的 Chrome 控制当前已登录 NotebookLM 页面，避免重新打开 `--fresh` 隔离浏览器窗口；`--fresh` 不继承用户日常浏览器的 Cookie、扩展、VPN 和代理环境。
- `~/.notebooklm/profiles/*/storage_state.json`、master token 和浏览器 cookie 是 bearer credentials；只有用户明确同意时才从浏览器导入，不要读取、打印、复制到仓库或放入输出产物。
- 长图转换必须优先使用 `pdf2longimg` 浏览器扩展或其仓库中的 PDF.js + Canvas 拼接代码，而不是直接用 Python、ImageMagick 或其他 PDF 渲染库替代。只有扩展/仓库代码都无法使用，并且用户同意降级时，才使用其他本地渲染作为 fallback。
- 对 PDF、下载目录、浏览器下载文件做非空校验；长图还要确认尺寸合理，不要把失败页、空白图或低清截图当成结果。
