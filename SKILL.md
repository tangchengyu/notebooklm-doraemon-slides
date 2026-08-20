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
- 通过 `pdf2longimg` 浏览器扩展转换出的高清长图。

完整任务以“PDF 演示文档和长图都已保存且非空”为完成条件。不要只停在上传 PDF、生成 NotebookLM
来源或浏览器里出现预览。

## 何时读取参考流程

执行该工作流前，读取 [references/workflow.md](references/workflow.md)。该文件包含：

- 知乎文章中使用的改进版提示词；
- NotebookLM/Gemini Notebook 的生成与导出检查点；
- `kaixindelele/pdf2longimg` 浏览器扩展安装、转换和质量验证流程；
- 失败时的重试边界。

## 必要约束

- 用户必须提供一个可访问的 PDF 文件；如果对话附件没有本地路径，先请用户重新上传或提供路径。
- 先验证 NotebookLM/Gemini Notebook 登录状态。需要 Pro/Gemini 高级能力、账号地区或网页登录时，直接说明阻塞点，不要伪造产物。
- 优先使用本机可用的 `notebooklm` CLI；CLI 缺少演示文档生成/下载能力时，使用 Chrome/浏览器控制进入 NotebookLM 网页完成同等操作。
- 长图转换必须优先使用 `pdf2longimg` 浏览器扩展或其仓库中的 PDF.js + Canvas 拼接代码，而不是直接用 Python、ImageMagick 或其他 PDF 渲染库替代。只有扩展/仓库代码都无法使用，并且用户同意降级时，才使用其他本地渲染作为 fallback。
- 对 PDF、下载目录、浏览器下载文件做非空校验；长图还要确认尺寸合理，不要把失败页、空白图或低清截图当成结果。
