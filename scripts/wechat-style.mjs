/**
 * 微信公众号文章内联样式模板
 * 微信编辑器不支持 <style> 标签和 class 属性，必须使用内联 CSS
 */

// 基础样式变量
const COLORS = {
  text: "#1a1a2e",
  textSecondary: "#666666",
  accent: "#2563eb",
  bg: "#ffffff",
  codeBg: "#f6f8fa",
  blockquoteBorder: "#2563eb",
  blockquoteBg: "#f0f7ff",
  tableBorder: "#e5e7eb",
  tableHeaderBg: "#f9fafb",
};

const FONT =
  '-apple-system, BlinkMacSystemFont, "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif';
const CODE_FONT =
  '"JetBrains Mono", "Fira Code", Consolas, "Courier New", monospace';

// 各标签的内联样式
export const styles = {
  // 文章容器
  wrapper: `font-family: ${FONT}; font-size: 16px; color: ${COLORS.text}; line-height: 1.8; letter-spacing: 0.02em; word-break: break-word; padding: 0;`,

  // 标题
  h1: `font-size: 24px; font-weight: 700; color: ${COLORS.text}; margin: 32px 0 16px 0; padding-bottom: 8px; border-bottom: 1px solid ${COLORS.tableBorder};`,
  h2: `font-size: 20px; font-weight: 700; color: ${COLORS.text}; margin: 28px 0 12px 0; padding-bottom: 6px; border-bottom: 1px solid ${COLORS.tableBorder};`,
  h3: `font-size: 18px; font-weight: 600; color: ${COLORS.text}; margin: 24px 0 8px 0;`,
  h4: `font-size: 16px; font-weight: 600; color: ${COLORS.text}; margin: 20px 0 8px 0;`,

  // 段落
  p: `margin: 12px 0; line-height: 1.8;`,

  // 链接
  a: `color: ${COLORS.accent}; text-decoration: none; border-bottom: 1px solid ${COLORS.accent};`,

  // 强调
  strong: `font-weight: 600; color: ${COLORS.text};`,
  em: `font-style: italic;`,

  // 行内代码
  code: `font-family: ${CODE_FONT}; font-size: 14px; background-color: ${COLORS.codeBg}; color: #d63384; padding: 2px 6px; border-radius: 3px;`,

  // 代码块
  pre: `background-color: ${COLORS.codeBg}; border-radius: 6px; padding: 16px; overflow-x: auto; margin: 16px 0; border: 1px solid ${COLORS.tableBorder};`,
  preCode: `font-family: ${CODE_FONT}; font-size: 13px; line-height: 1.6; color: ${COLORS.text}; background: none; padding: 0;`,

  // 引用
  blockquote: `margin: 16px 0; padding: 12px 16px; background-color: ${COLORS.blockquoteBg}; border-left: 4px solid ${COLORS.blockquoteBorder}; color: ${COLORS.textSecondary};`,
  blockquoteP: `margin: 4px 0; line-height: 1.6;`,

  // 列表
  ul: `margin: 12px 0; padding-left: 24px;`,
  ol: `margin: 12px 0; padding-left: 24px;`,
  li: `margin: 6px 0; line-height: 1.8;`,

  // 图片
  img: `max-width: 100%; height: auto; border-radius: 4px; margin: 16px auto; display: block;`,

  // 表格
  table: `width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;`,
  th: `background-color: ${COLORS.tableHeaderBg}; padding: 10px 12px; border: 1px solid ${COLORS.tableBorder}; text-align: left; font-weight: 600;`,
  td: `padding: 10px 12px; border: 1px solid ${COLORS.tableBorder};`,

  // 分割线
  hr: `border: none; border-top: 1px solid ${COLORS.tableBorder}; margin: 24px 0;`,

  // 文章尾部
  footer: `margin-top: 32px; padding-top: 16px; border-top: 1px solid ${COLORS.tableBorder}; font-size: 14px; color: ${COLORS.textSecondary}; text-align: center;`,
};

/**
 * 为 HTML 标签添加内联样式
 */
export function applyStyles(html) {
  let result = html;

  // 替换标签，添加内联样式
  const replacements = [
    [/<h1>/g, `<h1 style="${styles.h1}">`],
    [/<h2>/g, `<h2 style="${styles.h2}">`],
    [/<h3>/g, `<h3 style="${styles.h3}">`],
    [/<h4>/g, `<h4 style="${styles.h4}">`],
    [/<p>/g, `<p style="${styles.p}">`],
    [/<a /g, `<a style="${styles.a}" `],
    [/<strong>/g, `<strong style="${styles.strong}">`],
    [/<em>/g, `<em style="${styles.em}">`],
    [/<blockquote>/g, `<blockquote style="${styles.blockquote}">`],
    [/<blockquote>\s*<p style="[^"]*">/g, `<blockquote style="${styles.blockquote}"><p style="${styles.blockquoteP}">`],
    [/<ul>/g, `<ul style="${styles.ul}">`],
    [/<ol>/g, `<ol style="${styles.ol}">`],
    [/<li>/g, `<li style="${styles.li}">`],
    [/<img /g, `<img style="${styles.img}" `],
    [/<table>/g, `<table style="${styles.table}">`],
    [/<th>/g, `<th style="${styles.th}">`],
    [/<td>/g, `<td style="${styles.td}">`],
    [/<hr>/g, `<hr style="${styles.hr}">`],
    [/<hr ?\/?>/g, `<hr style="${styles.hr}">`],
    // 代码块：先处理 pre > code，再处理行内 code
    [/<pre><code/g, `<pre style="${styles.pre}"><code style="${styles.preCode}"`],
    // 行内 code（排除已在 pre 中的）
  ];

  for (const [pattern, replacement] of replacements) {
    result = result.replace(pattern, replacement);
  }

  // 行内 code 需要特殊处理：不替换 pre 内的 code
  result = result.replace(
    /(?<!<pre[^>]*>[\s\S]*?)<code>(?![\s\S]*?<\/pre>)/g,
    `<code style="${styles.code}">`
  );

  // 用更简单的方式：替换所有没有 style 的 code 标签
  result = result.replace(
    /<code>(?![^<]*style=)/g,
    `<code style="${styles.code}">`
  );

  return result;
}

/**
 * 生成文章尾部（阅读原文提示）
 */
export function generateFooter(blogUrl) {
  if (!blogUrl) return "";
  return `<section style="${styles.footer}">
    <p style="margin: 4px 0;">📖 <a style="${styles.a}" href="${blogUrl}">阅读原文</a> | 博客原文排版更佳</p>
  </section>`;
}
