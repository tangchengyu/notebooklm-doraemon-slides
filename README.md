<p align="center">
  <a href="#中文">中文</a> |
  <a href="#english">English</a>
</p>

# NotebookLM Doraemon Slides Skill

## 中文

这是一个用于把论文或资料 PDF 转成漫画式中文演示文档和高清长图的 Codex Skill。

工作流：

1. 将用户提供的 PDF 上传到 NotebookLM/Gemini Notebook。
2. 使用改进版中文提示词生成哆啦A梦论文小课堂风格的 Slide Deck。
3. 导出 NotebookLM 生成的 PDF 演示文档。
4. 使用 `pdf2longimg` 的 PDF.js + Canvas 拼接流程，把 PDF 转成高清长图。
5. 校验 PDF 和长图是否非空、尺寸合理、内容不是错误页或空白图。

### 安装

将本仓库克隆到你的 skills 目录：

```powershell
git clone https://github.com/tangchengyu/notebooklm-doraemon-slides "$env:USERPROFILE\.codex\skills\notebooklm-doraemon-slides"
```

### 使用

在对话中提供一个 PDF 文件，并显式调用：

```text
$notebooklm-doraemon-slides
```

默认会生成：

- `<topic>-notebooklm-doraemon-slides.pdf`
- `<topic>-notebooklm-doraemon-longimg.png`

### 依赖

- NotebookLM/Gemini Notebook 可用账号，通常需要 Pro 权限。
- 本地可用的 `notebooklm` CLI，或可操作的浏览器会话。
- Chrome/Edge 浏览器。
- `pdf2longimg` 浏览器扩展或其本地 PDF.js + Canvas 拼接代码。

### 版权提示

默认提示词会引用“哆啦A梦”风格，适合个人学习和实验。若用于公开发布、商业用途或需要降低版权风险，请改用原创角色描述，例如“蓝白配色、未来道具、儿童科普漫画课堂风格的原创角色”。

## English

This is a Codex Skill for turning a paper or reference PDF into a Chinese comic-style slide deck and a high-resolution long image.

Workflow:

1. Upload the provided PDF to NotebookLM/Gemini Notebook.
2. Generate a Doraemon-style paper classroom Slide Deck with the improved Chinese prompt.
3. Export the generated NotebookLM deck as PDF.
4. Convert the PDF into a high-resolution long image with the `pdf2longimg` PDF.js + Canvas stitching workflow.
5. Verify that the PDF and image are non-empty, correctly sized, and not error or blank outputs.

### Installation

Clone this repository into your skills directory:

```powershell
git clone https://github.com/tangchengyu/notebooklm-doraemon-slides "$env:USERPROFILE\.codex\skills\notebooklm-doraemon-slides"
```

### Usage

Provide a PDF in the conversation and invoke:

```text
$notebooklm-doraemon-slides
```

Default outputs:

- `<topic>-notebooklm-doraemon-slides.pdf`
- `<topic>-notebooklm-doraemon-longimg.png`

### Requirements

- A NotebookLM/Gemini Notebook account with the required generation capability, commonly Pro.
- A working local `notebooklm` CLI, or an automatable browser session.
- Chrome or Edge.
- The `pdf2longimg` browser extension or its local PDF.js + Canvas stitching code.

### Copyright Note

The default prompt references a Doraemon-like style and is best suited for personal learning and experimentation. For public release, commercial use, or lower IP risk, use an original-character prompt such as "blue-and-white palette, futuristic gadgets, original characters in a children's science comic classroom style."
