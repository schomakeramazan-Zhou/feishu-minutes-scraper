# 飞书妙记逐字稿抓取工具 / Feishu Minutes Transcript Scraper

[中文](#中文) | [English](#english)

---

## 中文

从飞书妙记网页端提取完整逐字稿 —— 绕过官方 API 的 `export_options.enable` 权限限制。

### 为什么需要这个工具？

飞书妙记的官方 API（`/vc +notes`）导出逐字稿时，如果妙记创建者禁用了导出选项（`export_options.enable = false`），API 会返回 **HTTP 403**。但用户在浏览器中**可以看到逐字稿**，说明数据存在于服务器上，只是 API 权限层阻止了导出。

这个工具用 Playwright 模拟浏览器访问，拦截页面渲染时调用的内部 API，直接从 HTTP 响应中提取原始逐字稿数据。

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
