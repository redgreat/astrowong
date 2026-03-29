#!/bin/bash
# ===========================================
# 博客快速发布脚本
# 用法: ./scripts/new-post.sh "文章标题" "tag1,tag2" "文章描述"
# 示例: ./scripts/new-post.sh "Docker入门指南" "Docker,DevOps" "Docker 的基本概念和常用命令"
# ===========================================

set -e

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 参数校验
if [ -z "$1" ]; then
  echo -e "${YELLOW}用法: $0 \"文章标题\" \"tag1,tag2\" \"文章描述\"${NC}"
  echo -e "${BLUE}示例: $0 \"Docker入门指南\" \"Docker,DevOps\" \"Docker 的基本概念和常用命令\"${NC}"
  exit 1
fi

TITLE="$1"
TAGS="${2:-随笔}"
DESC="${3:-$TITLE}"
DATE=$(date +%Y-%m-%dT%H:%M:%S+08:00)
YEAR=$(date +%Y)
MONTH=$(date +%m)

# 生成 slug：将空格替换为连字符，转小写，移除特殊字符
SLUG=$(echo "$TITLE" | tr ' ' '-' | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9\-]//g' | sed 's/--*/-/g' | sed 's/^-//;s/-$//')

# 如果 slug 为空（纯中文标题），使用日期作为 slug
if [ -z "$SLUG" ]; then
  SLUG=$(date +%Y%m%d-%H%M%S)
fi

BLOG_DIR="src/data/blog/${YEAR}/${MONTH}"
FILE="${BLOG_DIR}/${SLUG}.md"

# 获取项目根目录
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

# 创建目录
mkdir -p "$BLOG_DIR"

# 生成 frontmatter 中的 tags
TAG_LIST=""
IFS=',' read -ra TAG_ARRAY <<< "$TAGS"
for tag in "${TAG_ARRAY[@]}"; do
  tag=$(echo "$tag" | xargs)  # trim whitespace
  TAG_LIST="${TAG_LIST}  - ${tag}\n"
done

# 创建文章
cat > "$FILE" << EOF
---
title: ${TITLE}
author: wangcw
pubDatetime: ${DATE}
slug: ${SLUG}
featured: false
draft: false
tags:
$(printf '%b' "$TAG_LIST")description: ${DESC}
---

在这里开始写你的文章...

EOF

echo ""
echo -e "${GREEN}✅ 文章已创建: ${FILE}${NC}"
echo ""
echo -e "${BLUE}📝 下一步:${NC}"
echo -e "   1. 编辑文章:  ${YELLOW}code ${FILE}${NC}"
echo -e "   2. 本地预览:  ${YELLOW}pnpm run dev${NC}"
echo -e "   3. 发布上线:  ${YELLOW}git add . && git commit -m 'post: ${TITLE}' && git push${NC}"
echo ""
