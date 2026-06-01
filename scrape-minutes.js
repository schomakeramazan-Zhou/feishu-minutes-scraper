#!/usr/bin/env node

/**
 * 飞书妙记逐字稿抓取工具
 *
 * 用法:
 *   node scrape-minutes.js <minute-url-or-token>
 *
 * 示例:
 *   node scrape-minutes.js https://xxx.feishu.cn/minutes/xxxxxxxxx
 *   node scrape-minutes.js xxxxxxxxx
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

// ---- helpers ----

function extractToken(input) {
  const m = input.match(/\/minutes\/([a-zA-Z0-9]+)/);
  return m ? m[1] : input.trim();
}

function extractTenant(input) {
  const m = input.match(/https?:\/\/([^.]+)\.feishu\.cn/);
  return m ? m[1] : null;
}

function extractText(paragraph) {
  let text = '';
  for (const sentence of paragraph.sentences || []) {
    for (const content of sentence.contents || []) {
      text += content.content || '';
    }
  }
  return text;
}

function msToTimestamp(ms) {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `[${min}:${String(sec).padStart(2, '0')}]`;
}

// ---- main ----

async function main() {
  const input = process.argv[2];
  if (!input) {
    console.error('用法: node scrape-minutes.js <minute-url-or-token>');
    console.error('示例: node scrape-minutes.js https://xxx.feishu.cn/minutes/xxxxxxxxx');
    process.exit(1);
  }

  const token = extractToken(input);
  const tenant = extractTenant(input);
  const minutesUrl = tenant
    ? `https://${tenant}.feishu.cn/minutes/${token}`
    : null;

  console.log(`妙记 token: ${token}`);

  // collect intercepted API responses
  const apiResponses = [];

  const userDataDir = path.join(__dirname, 'browser-profile');
  const browser = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    channel: 'chromium',
  });

  const page = browser.pages()[0] || await browser.newPage();

  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('/minutes/api/')) {
      const ct = response.headers()['content-type'] || '';
      if (ct.includes('json')) {
        try {
          const body = await response.json();
          apiResponses.push({ url, body });
        } catch (_) { /* ignore non-json */ }
      }
    }
  });

  if (minutesUrl) {
    console.log(`打开妙记页面: ${minutesUrl}`);
    await page.goto(minutesUrl, { waitUntil: 'networkidle', timeout: 60000 });
  } else {
    // need tenant — try common ones or let user login first
    console.log('未提供完整 URL（无法推断租户域名），请手动打开妙记页面');
    console.log('等待你在浏览器中打开妙记页面...');
    // wait for a minutes/api call to appear
    await page.waitForResponse(
      (r) => r.url().includes('/minutes/api/') && r.url().includes('status'),
      { timeout: 120000 }
    );
  }

  // ---- extract data ----

  const statusRes = apiResponses.find((r) => r.url.includes('/status'));
  const subtitlesRes = apiResponses.find((r) => r.url.includes('subtitles_v2'));
  const speakersRes = apiResponses.find((r) => r.url.includes('/speakers'));
  const pidsRes = apiResponses.find((r) => r.url.includes('paragraph-ids'));

  if (!subtitlesRes || !speakersRes) {
    console.error('未捕获到 subtitles_v2 或 speakers 响应，请确认已打开妙记页面。');
    console.error(`已捕获的 API: ${apiResponses.map((r) => r.url).join('\n  ')}`);
    await browser.close();
    process.exit(1);
  }

  const paragraphs = subtitlesRes.body.data.paragraphs || [];
  const p2s = speakersRes.body.data.paragraph_to_speaker || {};
  const speakerMap = speakersRes.body.data.speaker_info_map || {};

  // build results
  const results = paragraphs.map((p) => ({
    pid: p.pid,
    startMs: parseInt(p.start_time) || 0,
    speaker: speakerMap[p2s[p.pid]]?.user_name || '未知',
    text: extractText(p),
  }));

  // ---- output ----

  const exportOptions = statusRes?.body?.data?.export_options;
  if (exportOptions && !exportOptions.enable) {
    console.log('⚠️  export_options.enable = false，API 导出被禁用（这正是本工具要绕过的限制）');
  }

  let output = '';
  // metadata
  if (pidsRes) {
    const totalParagraphs = pidsRes.body.data?.list?.length || paragraphs.length;
    const lastP = pidsRes.body.data?.list?.[pidsRes.body.data.list.length - 1];
    const durationMs = lastP ? parseInt(lastP.stop_time) : 0;
    output += `【段落数】${totalParagraphs}\n`;
    output += `【时长】约 ${Math.round(durationMs / 60000)} 分钟\n`;
  }
  const speakers = [...new Set(results.map((r) => r.speaker))];
  output += `【说话人】${speakers.join(', ')}\n`;
  output += `\n${'='.repeat(60)}\n\n`;

  for (const r of results) {
    output += `${msToTimestamp(r.startMs)} ${r.speaker}: ${r.text}\n\n`;
  }

  // save to file
  const outFile = `transcript-${token}.txt`;
  fs.writeFileSync(outFile, output, 'utf-8');
  console.log(`\n逐字稿已保存至: ${outFile}`);
  console.log(`共 ${results.length} 个段落`);

  // also print to stdout
  console.log('\n--- 逐字稿预览（前 500 字符）---\n');
  console.log(output.slice(0, 500));

  await browser.close();
}

main().catch((err) => {
  console.error('运行失败:', err);
  process.exit(1);
});
