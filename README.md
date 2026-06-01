# 飞书妙记逐字稿抓取工具 / Feishu Minutes Transcript Scraper

[中文](#中文) | [English](#english)

---

## 中文

从飞书妙记网页端提取完整逐字稿 —— 绕过官方 API 的 `export_options.enable` 权限限制。

### 为什么需要这个工具？

飞书妙记的官方 API（`/vc +notes`）导出逐字稿时，如果妙记创建者禁用了导出选项（`export_options.enable = false`），API 会返回 **HTTP 403**。但用户在浏览器中**可以看到逐字稿**，说明数据存在于服务器上，只是 API 权限层阻止了导出。

这个工具用 Playwright 模拟浏览器访问，拦截页面渲染时调用的内部 API，直接从 HTTP 响应中提取原始逐字稿数据。

### 为什么这个项目对 AI 生态系统很重要？

在 AI 驱动的开发工作流中，**上下文就是一切**。飞书妙记承载着团队最核心的知识资产——会议讨论、决策过程、技术方案评审。但这个知识孤岛一直与 AI 工具链割裂：

- **Codex / Claude Code 等 AI 编程助手**：需要项目上下文来生成精准代码，但无法感知团队在飞书会议中讨论过的架构决策、需求变更、bug 根因分析
- **ChatGPT / GPT 自定义 Agent**：擅长分析和总结，但缺少结构化的会议语料输入——逐字稿是最原始、最完整的知识载体
- **RAG 知识库**：需要持续摄入高质量的团队对话数据来保持时效性，但飞书官方 API 的导出限制让自动化管道中断

这个工具填补了飞书生态与 AI 工具链之间的最后一公里：

```
飞书妙记 → [本工具] → 结构化逐字稿 → Codex 上下文 / ChatGPT 分析 / RAG 入库
```

实际应用场景：

- **喂给 Codex / Claude Code**：将会议中讨论的技术方案作为 prompt context，让 AI 写出的代码更贴合团队真实意图
- **接入 ChatGPT GPTs**：搭建自定义 Agent，自动对每场会议生成执行摘要、技术债务清单、需求跟踪矩阵
- **构建 RAG 管道**：把逐字稿切片向量化后存入知识库，让后续的 AI 对话能回溯历史讨论，避免重复沟通
- **MCP Server 集成**：将此工具封装为 MCP 工具，让 Claude Code 等客户端在编程过程中直接拉取相关会议记录作为上下文

**核心价值：把飞书会议的知识沉淀打通到整个 AI 工具链，让 ChatGPT、Codex、RAG 系统都能消费团队的真实对话数据，实现跨工具的 AI 效率提升。**

### 安装

```bash
git clone https://github.com/schomakeramazan-Zhou/feishu-minutes-scraper.git
cd feishu-minutes-scraper
npm install
```

### 用法

```bash
# 通过完整 URL
node scrape-minutes.js https://xxx.feishu.cn/minutes/xxxxxxxxx

# 或只提供 token（会打开浏览器等你手动导航到妙记页面）
node scrape-minutes.js xxxxxxxxx
```

**首次运行**会打开 Chromium 浏览器窗口，需要扫码登录飞书账号。登录态会保存在 `browser-profile/` 目录中，后续运行无需重复登录。

### 输出

脚本会在当前目录生成 `transcript-{token}.txt` 文件，格式如下：

```
【段落数】36
【时长】约 33 分钟
【说话人】说话人1 - 会议室, 张三

============================================================

[0:00] 说话人1 - 会议室: 他可能还不知道是个什么东西...

[1:04] 张三: 之前经常会有这样的问题...
```

同时也会在终端打印预览。

### 原理

飞书妙记页面加载时调用以下内部 API（`{tenant}.feishu.cn/minutes/api/`）：

| API | 用途 |
|-----|------|
| `subtitles/paragraph-ids` | 获取所有段落 ID 列表 |
| `subtitles_v2` | 获取全部段落逐字稿内容（一次调用，无需分页） |
| `speakers` | 获取说话人信息及段落-说话人映射 |
| `status` | 获取妙记状态（导出权限、AI 产物状态等） |

这些内部 API 使用 **浏览器 Cookie 鉴权**而非 OAuth token，因此不受 lark-cli 的 API 权限限制。

### 与 lark-cli 的配合

| 场景 | 推荐方式 |
|------|---------|
| 搜索妙记、获取基础信息 | lark-cli（`minutes +search`） |
| 获取 AI 总结/待办/章节 | lark-cli（`vc +notes`） |
| 逐字稿导出 | 先用 lark-cli，403 则用本工具 |
| 下载音视频文件 | lark-cli（`minutes +download`） |

### 注意事项

- **仅支持 user 身份**：无法用 bot token 访问这些内部 API
- **说话人可能匿名**：ASR 声纹识别生成的 `说话人 N - 会议室名` 格式
- **内部 API 无官方文档**：这些端点是飞书前端私有接口，随时可能变更
- **首次需要扫码登录**：使用 Playwright persistent context 保存 cookie

---

## English

Extract complete transcripts from Feishu Minutes (飞书妙记) web pages — bypassing the official API's `export_options.enable` permission restriction.

### Why this tool?

Feishu's official API (`/vc +notes`) returns **HTTP 403** when the minute creator has disabled export (`export_options.enable = false`). However, users **can still view the transcript** in their browser, meaning the data exists on Feishu's servers — the API permission layer is the only barrier.

This tool uses Playwright to simulate a browser session, intercepts the internal APIs called during page rendering, and extracts raw transcript data directly from HTTP responses.

### Why this matters to the AI ecosystem

In AI-driven development workflows, **context is everything**. Feishu Minutes holds a team's most critical knowledge assets — meeting discussions, architectural decisions, technical reviews. But this knowledge silo has been disconnected from the AI toolchain:

- **Codex / Claude Code**: Need project context to generate precise code, but can't access architectural decisions, requirement changes, or root-cause analyses discussed in Feishu meetings
- **ChatGPT / Custom GPT Agents**: Excel at summarization but lack structured meeting corpus input — raw transcripts are the richest knowledge carrier
- **RAG pipelines**: Require continuous ingestion of high-quality team conversations, but Feishu's official API export restrictions break automation

This tool bridges the last mile between the Feishu ecosystem and the AI toolchain:

```
Feishu Minutes → [this tool] → Structured Transcript → Codex Context / ChatGPT Analysis / RAG Ingestion
```

Real-world workflows:

- **Feed into Codex / Claude Code**: Use meeting technical discussions as prompt context so AI-generated code aligns with the team's actual intent
- **Power ChatGPT GPTs**: Build custom agents that auto-generate executive summaries, tech-debt lists, and requirement traceability matrices from every meeting
- **Build RAG pipelines**: Chunk and vectorize transcripts for knowledge bases, enabling AI to reference historical discussions and eliminate redundant communication
- **MCP Server integration**: Wrap this tool as an MCP tool so Claude Code and other clients can pull relevant meeting context during coding sessions

**Core value: Unlock Feishu meeting knowledge for the entire AI toolchain. Let ChatGPT, Codex, and RAG systems consume real team conversation data — driving cross-tool AI efficiency.**

### Install

```bash
git clone https://github.com/schomakeramazan-Zhou/feishu-minutes-scraper.git
cd feishu-minutes-scraper
npm install
```

### Usage

```bash
# With a full URL
node scrape-minutes.js https://xxx.feishu.cn/minutes/xxxxxxxxx

# Or with just the token (a browser will open — navigate to the minute page manually)
node scrape-minutes.js xxxxxxxxx
```

**First run** opens a Chromium window for QR-code login. The session is persisted in `browser-profile/`, so subsequent runs skip login.

### Output

The script generates a `transcript-{token}.txt` file in the current directory:

```
【段落数 / Paragraphs】36
【时长 / Duration】~33 min
【说话人 / Speakers】Speaker 1 - Room, Zhang San

============================================================

[0:00] Speaker 1 - Room: He probably doesn't even know what this is yet...

[1:04] Zhang San: We've had this kind of problem before...
```

A preview is also printed to the terminal.

### How it works

When a Feishu Minutes page loads, it calls the following internal APIs (`{tenant}.feishu.cn/minutes/api/`):

| API | Purpose |
|-----|---------|
| `subtitles/paragraph-ids` | Get all paragraph IDs |
| `subtitles_v2` | Get full transcript content (single call, no pagination) |
| `speakers` | Get speaker info & paragraph-to-speaker mapping |
| `status` | Get minute status (export permissions, AI artifacts, etc.) |

These internal APIs authenticate via **browser cookies** rather than OAuth tokens, so lark-cli's permission model does not apply.

### Pairing with lark-cli

| Task | Recommended approach |
|------|---------------------|
| Search minutes, get basic info | lark-cli (`minutes +search`) |
| Get AI summary/todos/chapters | lark-cli (`vc +notes`) |
| Export transcript | Try lark-cli first; fallback to this tool on 403 |
| Download audio/video | lark-cli (`minutes +download`) |

### Caveats

- **User identity only**: Bot tokens cannot access these internal APIs
- **Anonymous speakers**: ASR voiceprint recognition may produce `Speaker N - Room Name` format
- **No official documentation**: These endpoints are Feishu's private frontend APIs and may change without notice
- **QR login on first run**: Uses Playwright persistent context to store cookies

---

## License

MIT
