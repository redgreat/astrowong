#!/usr/bin/env node

/**
 * 微信公众号自动同步脚本
 * 用法: node scripts/wechat-publish.mjs <markdown-file-path> [<markdown-file-path2>...]
 *
 * 环境变量:
 *   WECHAT_APP_ID     - 公众号 AppID
 *   WECHAT_APP_SECRET - 公众号 AppSecret
 *   BLOG_BASE_URL     - 博客基础 URL（可选，用于生成"阅读原文"链接）
 *
 * 功能:
 *   1. 解析 Markdown 文件的 frontmatter 和正文
 *   2. 将 Markdown 转换为微信兼容的 HTML（带内联 CSS）
 *   3. 上传文章中的图片到微信素材库
 *   4. 调用草稿箱 API 创建草稿
 */

import { readFileSync, existsSync } from "fs";
import { resolve, dirname, extname, basename } from "path";
import { fileURLToPath } from "url";

// 动态导入依赖（CI 环境中按需安装）
let matter, marked, axios, FormData;
try {
  matter = (await import("gray-matter")).default;
  marked = await import("marked");
  axios = (await import("axios")).default;
  FormData = (await import("form-data")).default;
} catch (e) {
  console.error("❌ 缺少依赖，请先运行: npm install gray-matter marked axios form-data");
  process.exit(1);
}

import { applyStyles, generateFooter, styles } from "./wechat-style.mjs";

// ============================================================
// 配置
// ============================================================

const WECHAT_APP_ID = process.env.WECHAT_APP_ID;
const WECHAT_APP_SECRET = process.env.WECHAT_APP_SECRET;
const BLOG_BASE_URL = process.env.BLOG_BASE_URL || "https://me.wongcw.cn";

const WECHAT_API_BASE = "https://api.weixin.qq.com/cgi-bin";

// ============================================================
// 微信 API 封装
// ============================================================

/**
 * 获取 access_token
 */
async function getAccessToken() {
  const url = `${WECHAT_API_BASE}/token?grant_type=client_credential&appid=${WECHAT_APP_ID}&secret=${WECHAT_APP_SECRET}`;
  const res = await axios.get(url);

  if (res.data.errcode) {
    throw new Error(`获取 access_token 失败: ${res.data.errcode} - ${res.data.errmsg}`);
  }

  console.log("✅ 获取 access_token 成功");
  return res.data.access_token;
}

/**
 * 上传正文图片到微信（临时素材，用于正文内嵌图片）
 * 返回微信 URL
 */
async function uploadContentImage(accessToken, imagePath) {
  const url = `${WECHAT_API_BASE}/media/uploadimg?access_token=${accessToken}`;

  const form = new FormData();
  form.append("media", readFileSync(imagePath), {
    filename: basename(imagePath),
    contentType: getContentType(imagePath),
  });

  const res = await axios.post(url, form, {
    headers: form.getHeaders(),
  });

  if (res.data.errcode) {
    throw new Error(`上传图片失败: ${res.data.errcode} - ${res.data.errmsg}`);
  }

  console.log(`  📷 图片已上传: ${basename(imagePath)} → ${res.data.url}`);
  return res.data.url;
}

/**
 * 上传封面图到微信（永久素材）
 * 返回 media_id
 */
async function uploadThumbMedia(accessToken, imagePath) {
  const url = `${WECHAT_API_BASE}/material/add_material?access_token=${accessToken}&type=image`;

  const form = new FormData();
  form.append("media", readFileSync(imagePath), {
    filename: basename(imagePath),
    contentType: getContentType(imagePath),
  });

  const res = await axios.post(url, form, {
    headers: form.getHeaders(),
  });

  if (res.data.errcode) {
    throw new Error(`上传封面图失败: ${res.data.errcode} - ${res.data.errmsg}`);
  }

  console.log(`  🖼️  封面图已上传: media_id = ${res.data.media_id}`);
  return res.data.media_id;
}

/**
 * 创建草稿
 */
async function addDraft(accessToken, article) {
  const url = `${WECHAT_API_BASE}/draft/add?access_token=${accessToken}`;

  const res = await axios.post(url, {
    articles: [article],
  });

  if (res.data.errcode) {
    throw new Error(`创建草稿失败: ${res.data.errcode} - ${res.data.errmsg}`);
  }

  console.log(`✅ 草稿创建成功: media_id = ${res.data.media_id}`);
  return res.data.media_id;
}

// ============================================================
// Markdown 处理
// ============================================================

/**
 * 解析 Markdown 文件
 */
function parseMarkdownFile(filePath) {
  const content = readFileSync(filePath, "utf-8");
  const { data: frontmatter, content: body } = matter(content);
  return { frontmatter, body };
}

/**
 * Markdown → 微信兼容 HTML
 */
function markdownToWechatHtml(markdownBody, mdFilePath) {
  // 配置 marked
  const renderer = new marked.Renderer();

  // 自定义图片渲染（标记本地图片路径，后续替换）
  renderer.image = function ({ href, title, text }) {
    const alt = text || title || "";
    // 标记图片，后续统一处理上传
    return `<img src="${href}" alt="${alt}" style="${styles.img}" />`;
  };

  // 自定义链接渲染（微信中外链会被屏蔽，改为文本展示）
  renderer.link = function ({ href, title, text }) {
    // 微信公众号文章中外链不可点击，仅显示文字
    return `<span style="${styles.a}">${text}</span>`;
  };

  marked.setOptions({
    renderer,
    gfm: true,
    breaks: false,
  });

  let html = marked.parse(markdownBody);

  // 应用内联样式
  html = applyStyles(html);

  // 包裹容器
  html = `<section style="${styles.wrapper}">${html}</section>`;

  return html;
}

/**
 * 处理 HTML 中的图片：上传本地图片到微信，替换 URL
 */
async function processImages(html, accessToken, mdFilePath) {
  const imgRegex = /<img[^>]+src="([^"]+)"[^>]*>/g;
  const matches = [...html.matchAll(imgRegex)];

  let result = html;

  for (const match of matches) {
    const originalSrc = match[1];
    let localPath = null;

    // 判断是否为本地路径
    if (originalSrc.startsWith("http://") || originalSrc.startsWith("https://")) {
      // 远程图片：下载后上传（简化处理，跳过）
      console.log(`  ⏭️  跳过远程图片: ${originalSrc}`);
      continue;
    }

    // 处理 @/assets/ 别名路径
    if (originalSrc.startsWith("@/assets/") || originalSrc.startsWith("@/")) {
      localPath = resolve("src", originalSrc.replace("@/", ""));
    }
    // 处理相对路径
    else if (originalSrc.startsWith("../../")) {
      localPath = resolve(dirname(mdFilePath), originalSrc);
    }
    // 处理 /public 路径
    else if (originalSrc.startsWith("/")) {
      localPath = resolve("public", originalSrc.slice(1));
    }

    if (localPath && existsSync(localPath)) {
      try {
        const wechatUrl = await uploadContentImage(accessToken, localPath);
        result = result.replace(originalSrc, wechatUrl);
      } catch (err) {
        console.warn(`  ⚠️  图片上传失败 ${localPath}: ${err.message}`);
      }
    } else if (localPath) {
      console.warn(`  ⚠️  图片文件不存在: ${localPath}`);
    }
  }

  return result;
}

/**
 * 获取或创建默认封面图
 */
async function getThumbMediaId(accessToken, frontmatter, mdFilePath) {
  // 优先使用 frontmatter 中指定的 ogImage
  if (frontmatter.ogImage) {
    let ogPath;
    if (frontmatter.ogImage.startsWith("../../")) {
      ogPath = resolve(dirname(mdFilePath), frontmatter.ogImage);
    } else if (frontmatter.ogImage.startsWith("@/")) {
      ogPath = resolve("src", frontmatter.ogImage.replace("@/", ""));
    } else {
      ogPath = resolve("public", frontmatter.ogImage);
    }

    if (existsSync(ogPath)) {
      return await uploadThumbMedia(accessToken, ogPath);
    }
  }

  // 使用默认 OG 图片
  const defaultOg = resolve("public", "astropaper-og.jpg");
  if (existsSync(defaultOg)) {
    return await uploadThumbMedia(accessToken, defaultOg);
  }

  throw new Error("未找到封面图，请在 frontmatter 中指定 ogImage 或确保 public/astropaper-og.jpg 存在");
}

// ============================================================
// 工具函数
// ============================================================

function getContentType(filePath) {
  const ext = extname(filePath).toLowerCase();
  const types = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
  };
  return types[ext] || "image/jpeg";
}

/**
 * 从 frontmatter 和文件路径生成博客 URL
 */
function getBlogUrl(frontmatter, mdFilePath) {
  // 从文件路径推断 URL
  const relPath = mdFilePath
    .replace(/^src\/data\/blog\//, "")
    .replace(/\.md$/, "");
  return `${BLOG_BASE_URL}/posts/${relPath}`;
}

// ============================================================
// 主流程
// ============================================================

async function publishToWechat(mdFilePath) {
  console.log(`\n📝 正在处理: ${mdFilePath}`);

  // 1. 解析 Markdown
  const { frontmatter, body } = parseMarkdownFile(mdFilePath);

  // 跳过草稿
  if (frontmatter.draft) {
    console.log("  ⏭️  跳过草稿文章");
    return;
  }

  console.log(`  📌 标题: ${frontmatter.title}`);

  // 2. 获取 access_token
  const accessToken = await getAccessToken();

  // 3. Markdown → HTML
  let html = markdownToWechatHtml(body, mdFilePath);

  // 4. 处理图片
  html = await processImages(html, accessToken, mdFilePath);

  // 5. 添加文章尾部
  const blogUrl = getBlogUrl(frontmatter, mdFilePath);
  html += generateFooter(blogUrl);

  // 6. 上传封面图
  const thumbMediaId = await getThumbMediaId(accessToken, frontmatter, mdFilePath);

  // 7. 创建草稿
  const article = {
    title: frontmatter.title,
    author: frontmatter.author || "wangcw",
    digest: frontmatter.description || "",
    content: html,
    thumb_media_id: thumbMediaId,
    content_source_url: blogUrl,
    need_open_comment: 0,
  };

  const mediaId = await addDraft(accessToken, article);
  console.log(`🎉 文章「${frontmatter.title}」已同步到微信公众号草稿箱！`);

  return mediaId;
}

// ============================================================
// 入口
// ============================================================

async function main() {
  // 检查环境变量
  if (!WECHAT_APP_ID || !WECHAT_APP_SECRET) {
    console.error("❌ 请设置环境变量 WECHAT_APP_ID 和 WECHAT_APP_SECRET");
    console.error("   本地测试: export WECHAT_APP_ID=xxx WECHAT_APP_SECRET=xxx");
    console.error("   GitHub Actions: 在 Settings → Secrets 中配置");
    process.exit(1);
  }

  // 获取要处理的文件列表
  const files = process.argv.slice(2).filter(f => f.endsWith(".md"));

  if (files.length === 0) {
    console.log("ℹ️  没有要处理的 Markdown 文件");
    process.exit(0);
  }

  console.log(`🚀 开始同步 ${files.length} 篇文章到微信公众号...`);

  let success = 0;
  let failed = 0;

  for (const file of files) {
    try {
      if (!existsSync(file)) {
        console.warn(`⚠️  文件不存在: ${file}`);
        failed++;
        continue;
      }
      await publishToWechat(file);
      success++;
    } catch (err) {
      console.error(`❌ 处理失败 ${file}: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n📊 同步完成: ${success} 成功, ${failed} 失败`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error("❌ 未知错误:", err);
  process.exit(1);
});
