# 無糧不聚兵

个人技术博客，基于 [Astro](https://astro.build/) 框架和 [AstroPaper](https://github.com/satnaing/astro-paper) 主题搭建。

## 快速开始

```bash
# 安装依赖
pnpm install

# 本地开发
pnpm run dev

# 构建
pnpm run build
```

## 发布新文章

```bash
# 使用发布脚本创建新文章
./scripts/new-post.sh "文章标题" "标签1,标签2" "文章描述"

# 编辑文章内容后，提交并推送
git add .
git commit -m "post: 文章标题"
git push
```

推送到 GitHub 后，Vercel 会自动构建并部署。

## 文章格式

文章使用 Markdown 格式，存放在 `src/data/blog/` 目录下，支持按年月组织子目录。

Frontmatter 模板：

```yaml
---
title: 文章标题
author: wangcw
pubDatetime: 2026-03-29T08:00:00+08:00
slug: article-slug
featured: false
draft: false
tags:
  - 标签
description: 文章描述
---
```

## License

MIT
